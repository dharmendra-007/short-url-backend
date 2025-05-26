import { nanoid } from 'nanoid';
import URL from '../models/url.model.js'
import { getUser } from '../services/auth.service.js';

export async function handleGenerateNewShortURL(req, res) {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({
      success: false,
      message: "url is required"
    })

    const token = req.cookies?.userT;
    let userId = null;

    if (token) {
      const user = getUser(token);
      if (user && user._id) {
        userId = user._id;
      }
    }

    const shortID = nanoid(8)
    const newUrl = await URL.create({
      shortId: shortID.toLowerCase(),
      redirectUrl: url,
      visitHistory: [],
      createdBy: userId
    })

    return res.status(201).json({
      success: true,
      id: newUrl.shortId
    })

  } catch (error) {
    console.error("Error while creating short URL:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later!",
    });
  }
}

export async function handleRedirect(req, res) {
  try {
    const shortId = req.params.shortId
    const entry = await URL.findOneAndUpdate(
      { shortId , 
        isActive : true
      },
      {
        $push: {
          visitHistory: {
            timestamp: Date.now()
          }
        }
      },
      { new: true }
    )

    if (!entry) {
      return res.status(400).json({
        success: false,
        message: "short url does not exist!"
      })
    }

    res.redirect(entry.redirectUrl)
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).json({
      success: false,
      message: "something went wrong. please try again later !"
    })
  }
}

export async function handleGetAnalytics(req, res) {
  try {
    const shortId = req.params.shortId
    const result = await URL.findOne({ shortId })

    if (!result) {
      res.status(400).json({
        success: false,
        message: "short url does not exist!"
      })
    }

    return res.status(200).json({
      totalClicks: result.visitHistory.length
    })
  } catch (error) {
    console.error("Analytics error: ", error);
    res.status(500).json({
      success: false,
      message: "something went wrong. please try again later !"
    })
  }
}

export async function handleGetUserUrl(req, res) {
  try {
    const user = req.userInfo

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const search = req.query.search || ""
    const skip = (page - 1) * limit

    const searchFilter = {
      createdBy: user._id,
      $or: [
        { shortId: { $regex: search, $options: "i" } },
        { redirectUrl: { $regex: search, $options: "i" } },
      ]
    }

    const sortBy = req.query.sortBy || 'createdAt'
    const setOrder = req.query.setOrder === 'asc' ? 1 : -1
    const totalUrls = await URL.countDocuments(searchFilter)
    const totalPages = Math.ceil(totalUrls / limit)

    const sortObj = {}
    sortObj[sortBy] = setOrder

    if (user == null) {
      res.status(200).json({
        success: false,
        message: "unauthorized"
      })
    }

    let result = await URL.find(searchFilter).sort(sortObj)

    if (limit !== -1) {
      result = await URL.find(searchFilter).sort(sortObj).skip(skip).limit(limit)
    }


    res.status(200).json({
      success: true,
      message: "urls fetched successfully.",
      currentPage: page,
      totalPages,
      totalUrls,
      result
    })
  } catch (erroe) {
    res.status(500).json({
      success: false,
      message: "something went wrong. please try again!"
    })
  }
}

export async function handleGetStats(req, res) {
  try {
    const user = req.userInfo;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(now.getDate() - 14)

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart.getTime() - oneDay);
    const lastWeekStart = new Date(now - 7 * oneDay);

    const userLinks = await URL.find({ createdBy: user._id });

    const totalLinks = userLinks.length;

    const linksLastWeek = userLinks.filter(link => {
      const createdAt = new Date(link.createdAt);
      return createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo;
    }).length;

    const linksThisWeek = userLinks.filter(link => {
      const createdAt = new Date(link.createdAt);
      return createdAt >= sevenDaysAgo && createdAt <= now;
    }).length;

    const totalClicks = userLinks.reduce((acc, link) => acc + link.visitHistory.length, 0);

    const topFiveUrls = await URL.aggregate([
      {
        $addFields: {
          clicks: { $size: "$visitHistory" },
        },
      },
      {
        $sort: {
          clicks: -1,
        },
      },
      {
        $limit: 5,
      },
    ]);

    const topPerformer = topFiveUrls[0]
    const topFiveUrlsWithPercentage = topFiveUrls.map((url) => ({
      ...url,
      clickPercent: url.clicks == 0 ? 0 : ((url.clicks / totalClicks) * 100).toFixed(2)
    }))

    const lastFiveUrls = await URL.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $addFields: {
          clicks: { $size: "$visitHistory" },
        },
      },
    ]);

    const clicksLastWeek = userLinks.reduce((acc, link) => {
      const weeklyClicks = link.visitHistory.filter(v => {
        const ts = new Date(v.timestamp);
        return ts >= fourteenDaysAgo && ts < sevenDaysAgo;
      }).length;
      return acc + weeklyClicks;
    }, 0);

    const conversionRate = await URL.aggregate([
      {
        $facet: {
          currentPeriod: [
            // Unwind visitHistory and filter last 7 days
            { $unwind: "$visitHistory" },
            { $match: { "visitHistory.timestamp": { $gte: sevenDaysAgo } } },
            { $group: { _id: "$visitHistory.visitorId" } }, // unique visitors
            {
              $group: {
                _id: null,
                totalUniqueVisitors: { $sum: 1 }
              }
            },
            {
              $lookup: {
                from: "urls",
                pipeline: [
                  { $unwind: "$conversions" },
                  { $match: { "conversions.timestamp": { $gte: sevenDaysAgo } } },
                  { $count: "totalConversions" }
                ],
                as: "conversionData"
              }
            },
            { $unwind: { path: "$conversionData", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                totalUniqueVisitors: 1,
                totalConversions: { $ifNull: ["$conversionData.totalConversions", 0] },
                conversionRate: {
                  $cond: [
                    { $eq: ["$totalUniqueVisitors", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$conversionData.totalConversions", "$totalUniqueVisitors"] },
                        100
                      ]
                    }
                  ]
                }
              }
            }
          ],

          previousPeriod: [
            // Unwind visitHistory and filter previous 7-14 days
            { $unwind: "$visitHistory" },
            {
              $match: {
                "visitHistory.timestamp": {
                  $gte: fourteenDaysAgo,
                  $lt: sevenDaysAgo
                }
              }
            },
            { $group: { _id: "$visitHistory.visitorId" } }, // unique visitors
            {
              $group: {
                _id: null,
                totalUniqueVisitors: { $sum: 1 }
              }
            },
            {
              $lookup: {
                from: "urls",
                pipeline: [
                  { $unwind: "$conversions" },
                  {
                    $match: {
                      "conversions.timestamp": {
                        $gte: fourteenDaysAgo,
                        $lt: sevenDaysAgo
                      }
                    }
                  },
                  { $count: "totalConversions" }
                ],
                as: "conversionData"
              }
            },
            { $unwind: { path: "$conversionData", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                totalUniqueVisitors: 1,
                totalConversions: { $ifNull: ["$conversionData.totalConversions", 0] },
                conversionRate: {
                  $cond: [
                    { $eq: ["$totalUniqueVisitors", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$conversionData.totalConversions", "$totalUniqueVisitors"] },
                        100
                      ]
                    }
                  ]
                }
              }
            }
          ]
        }
      },
      // Combine current and previous to calculate % change
      {
        $project: {
          current: { $arrayElemAt: ["$currentPeriod", 0] },
          previous: { $arrayElemAt: ["$previousPeriod", 0] }
        }
      },
      {
        $project: {
          totalUniqueVisitors: { $ifNull: ["$current.totalUniqueVisitors", 0] },
          totalConversions: { $ifNull: ["$current.totalConversions", 0] },
          conversionRate: { $ifNull: ["$current.conversionRate", 0] },

          totalUniqueVisitorsChange: {
            $cond: [
              { $eq: ["$previous.totalUniqueVisitors", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$current.totalUniqueVisitors", "$previous.totalUniqueVisitors"] },
                      "$previous.totalUniqueVisitors"
                    ]
                  },
                  100
                ]
              }
            ]
          },

          totalConversionsChange: {
            $cond: [
              { $eq: ["$previous.totalConversions", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$current.totalConversions", "$previous.totalConversions"] },
                      "$previous.totalConversions"
                    ]
                  },
                  100
                ]
              }
            ]
          },

          conversionRateChange: {
            $cond: [
              { $eq: ["$previous.conversionRate", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$current.conversionRate", "$previous.conversionRate"] },
                      "$previous.conversionRate"
                    ]
                  },
                  100
                ]
              }
            ]
          }
        }
      }
    ]);

    const todaysClicks = userLinks.reduce((acc, link) => {
      return acc + link.visitHistory.filter(v => v.timestamp >= todayStart.getTime()).length;
    }, 0);

    const yesterdaysClicks = userLinks.reduce((acc, link) => {
      return acc + link.visitHistory.filter(v =>
        v.timestamp >= yesterdayStart.getTime() && v.timestamp < todayStart.getTime()
      ).length;
    }, 0);

    const calcChange = (current, previous) =>
      previous === 0 ? (current > 0 ? 100 : 0) : (((current - previous) / previous) * 100).toFixed(2);

    const activeLinks = await URL.countDocuments({ createdBy: user._id, isActive: true })

    res.status(200).json({
      success: true,
      message: "Analytics fetched successfully",
      totalLinks,
      linksLastWeek,
      linksChange: linksThisWeek - linksLastWeek,
      activeLinks,
      totalClicks,
      clicksLastWeek,
      clicksChange: calcChange(totalClicks, clicksLastWeek),
      todaysClicks,
      yesterdaysClicks,
      todayClickChange: calcChange(todaysClicks, yesterdaysClicks),
      topPerformer,
      topFiveUrlsWithPercentage,
      lastFiveUrls,
      conversionRate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching analytics"
    });
  }
}

export async function handleDeleteUrl(req , res) {
  try {
    const id = req.params.id
    const deletedUrl = await URL.findOneAndDelete({ _id: id });

    if (!deletedUrl) {
      return res.status(404).json({
        success: false,
        message: "URL not found!",
      });
    }

    res.status(200).json({
      success : true,
      message : "url deleted successfully!"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "something went wrong. please try again!"
    })
  }
}

export async function handleChangeStatus(req , res) {
  try {
    const id = req.params.id
    const url = await URL.findById(id)

    if(!url){
      res.status(400).json({
        success : false,
        message : "url does not exist"
      })
    }

    url.isActive = !url.isActive
    await url.save()

    res.status(200).json({
      success : true,
      message : "url status chnaged successfully"
    })
  } catch (error) {
    res.status(500).json({
      success : false,
      message : "something went wrong"
    })
  }
}