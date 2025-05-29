import { nanoid } from 'nanoid';
import URL from '../models/url.model.js'
import { getUser } from '../services/auth.service.js';
import { getSource } from '../helper/getSource.js';
import { UAParser } from 'ua-parser-js';
import mongoose from 'mongoose';
import { generateDateRange } from '../helper/generateDateRange.js';

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
      id: newUrl.shortId,
      newUrl
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
    const ip = req.ip
    const referrer = req.get('referer') || req.headers.referer;
    const parser = new UAParser(req.headers['user-agent']);
    const deviceType = parser.getDevice().type || "desktop";

    const entry = await URL.findOneAndUpdate(
      {
        shortId,
        isActive: true
      },
      {
        $push: {
          visitHistory: {
            timestamp: Date.now(),
            ip,
            deviceType,
            source: getSource(referrer)
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

    const clicksLastWeek = userLinks.reduce((acc, link) => {
      const weeklyClicks = link.visitHistory.filter(v => {
        const ts = new Date(v.timestamp);
        return ts >= fourteenDaysAgo && ts < sevenDaysAgo;
      }).length;
      return acc + weeklyClicks;
    }, 0);

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
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching analytics"
    });
  }
}

export async function handleDeleteUrl(req, res) {
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
      success: true,
      message: "url deleted successfully!"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "something went wrong. please try again!"
    })
  }
}

export async function handleChangeStatus(req, res) {
  try {
    const id = req.params.id
    const url = await URL.findById(id)

    if (!url) {
      res.status(400).json({
        success: false,
        message: "url does not exist"
      })
    }

    url.isActive = !url.isActive
    await url.save()

    res.status(200).json({
      success: true,
      message: "url status chnaged successfully"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "something went wrong"
    })
  }
}

export async function handleGetUrlAnalytics(req, res) {
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

export async function handleGetAnalytics(req, res) {
  try {
    const { period } = req.query
    const user = req.userInfo
    const userId = new mongoose.Types.ObjectId(String(user._id));
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const urls = await URL.find({ createdBy: user._id })

    let totalClicks = 0
    urls.forEach((url) => {
      totalClicks += url.visitHistory.length
    })

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    const currentPeriod = new Date(now);
    currentPeriod.setHours(0, 0, 0, 0);
    currentPeriod.setDate(currentPeriod.getDate() - (period - 1));

    const lastPeriod = new Date(currentPeriod)
    lastPeriod.setDate(lastPeriod.getDate() - parseInt(period))

    let clicksCurrentPeriod = 0
    urls.forEach((url) => {
      if (url.createdAt >= currentPeriod) {
        clicksCurrentPeriod += url.visitHistory.length
      }
    })

    let clicksLastPeriod = 0
    urls.forEach((url) => {
      if (url.createdAt >= lastPeriod && url.createdAt < currentPeriod) {
        clicksLastPeriod += url.visitHistory.length
      }
    })

    const allIps = urls.flatMap(url => url.visitHistory.map(v => v.ip))
    const uniqueIps = new Set(allIps)
    const uniqueVisitors = uniqueIps.size

    const currentIps = urls
      .filter(url => url.createdAt >= currentPeriod)
      .flatMap(url => url.visitHistory.map(v => v.ip))
    const currentUniqueIps = new Set(currentIps)
    const currentUniqueVisitors = currentUniqueIps.size

    const lastIps = urls
      .filter(url => url.createdAt >= lastPeriod && url.createdAt < currentPeriod)
      .flatMap(url => url.visitHistory.map(v => v.ip))
    const lastUniqueIps = new Set(lastIps)
    const lastUniqueVisitors = lastUniqueIps.size

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart.getTime() - oneDay);

    const todaysClicks = urls.reduce((acc, link) => {
      return acc + link.visitHistory.filter(v => v.timestamp >= todayStart.getTime()).length;
    }, 0);

    const yesterdaysClicks = urls.reduce((acc, link) => {
      return acc + link.visitHistory.filter(v =>
        v.timestamp >= yesterdayStart.getTime() && v.timestamp < todayStart.getTime()
      ).length;
    }, 0);

    const conversionRate = totalClicks == 0 ? 0 : ((uniqueVisitors / totalClicks) * 100).toFixed(2)
    const currentConversionRate = clicksCurrentPeriod == 0 ? 0 : ((currentUniqueVisitors / clicksCurrentPeriod) * 100).toFixed(2)
    const lastConversionRate = clicksLastPeriod == 0 ? 0 : ((lastUniqueVisitors / clicksLastPeriod) * 100).toFixed(2)

    const topFiveUrls = await URL.aggregate([
      {
        $match: {
          createdBy: userId,
          createdAt: { $gte: currentPeriod }
        }
      },
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

    const topFiveUrlsWithPercentage = topFiveUrls.map((url) => ({
      ...url,
      clickPercent: clicksCurrentPeriod == 0 ? 0 : ((url.clicks / clicksCurrentPeriod) * 100).toFixed(2)
    }))

    const DeviceInfoWithPercentage = await URL.aggregate([
      {
        $match: {
          createdBy: userId,
          createdAt: { $gte: currentPeriod }
        }
      },
      { $unwind: "$visitHistory" },
      {
        $group: {
          _id: "$visitHistory.deviceType",
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          data: { $push: { deviceType: "$_id", count: "$count" } }
        }
      },
      {
        $project: {
          _id: 0,
          data: {
            $map: {
              input: "$data",
              as: "item",
              in: {
                deviceType: "$$item.deviceType",
                count: "$$item.count",
                percentage: {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$$item.count", "$total"] },
                        100
                      ]
                    },
                    2
                  ]
                }
              }
            }
          }
        }
      }
    ]);


    const SourceInfoWithPercentage = await URL.aggregate([
      {
        $match: {
          createdBy: userId,
          createdAt: { $gte: currentPeriod }
        }
      },
      { $unwind: "$visitHistory" },
      { $match: { "visitHistory.source": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$visitHistory.source",
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          data: { $push: { source: "$_id", count: "$count" } }
        }
      },
      {
        $project: {
          _id: 0,
          data: {
            $map: {
              input: "$data",
              as: "item",
              in: {
                source: "$$item.source",
                count: "$$item.count",
                percentage: {
                  $round: [{
                    $multiply: [
                      { $divide: ["$$item.count", "$total"] },
                      100
                    ]
                  },
                    2
                  ]
                }
              }
            }
          }
        }

      }
    ]);

    const clickData = await URL.aggregate([
      {
        $match: {
          createdBy: userId,
          createdAt: { $gte: currentPeriod }
        }
      },
      { $unwind: "$visitHistory" },
      {
        $addFields: {
          visitDate: {
            $dateToString: {
              format: "%b %d",
              date: { $toDate: "$visitHistory.timestamp" },
              timezone: "Asia/Kolkata"
            }
          }
        }
      },
      {
        $group: {
          _id: "$visitDate",
          clicks: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const allDates = generateDateRange(currentPeriod)
    const clickMap = new Map(clickData.map(item => [item._id, item.clicks]));
    const dailyClicksData = allDates.map(date => ({
      date,
      clicks: clickMap.get(date) || 0
    }));

    const calcChange = (current, previous) =>
      previous === 0 ? (current > 0 ? 100 : 0) : (((current - previous) / previous) * 100).toFixed(2);

    return res.status(200).json({
      success: true,
      data: {
        totalClicks,
        clicksCurrentPeriod,
        clickChangePercentage: calcChange(clicksCurrentPeriod, clicksLastPeriod),
        uniqueVisitors,
        currentUniqueVisitors,
        changeUniqueVisitors: calcChange(currentUniqueVisitors, lastUniqueVisitors),
        todaysClicks,
        clicksChangeFromYesterday: calcChange(todaysClicks, yesterdaysClicks),
        conversionRate,
        currentConversionRate,
        changeConversionRate: calcChange(currentConversionRate, lastConversionRate),
        topFiveUrlsWithPercentage,
        DeviceInfoWithPercentage,
        SourceInfoWithPercentage,
        dailyClicksData
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again!",
      error: error.message
    });
  }
}