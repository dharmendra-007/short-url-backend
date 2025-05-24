import { nanoid } from 'nanoid';
import URL from '../models/url.model.js'

export async function handleGenerateNewShortURL(req, res) {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({
      success : false,
      message : "url is required" 
    })

    const shortID = nanoid(8)
    const newUrl = await URL.create({
      shortId: shortID,
      redirectUrl: url,
      visitHistory: [],
      createdBy: req.userInfo?._id
    })
  
    return res.status(201).json({
      success : true,
      id: shortID
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
      { shortId },
      {
        $push: {
          visitHistory : {
            timestamp : Date.now()
          }
        }
      },
      {new : true}
    )

    if(!entry){
      res.status(400).json({
        success : false,
        message : "short url does not exist!"
      })
    }
  
    res.redirect(entry.redirectUrl)
} catch (error) {
  console.error("Redirect error:", error);
  res.status(500).json({
    success : false,
    message : "something went wrong. please try again later !"
  })
}
}

export async function handleGetAnalytics (req  , res){
try {
    const shortId = req.params.shortId
    const result = await URL.findOne({shortId})

    if(!result){
      res.status(400).json({
        success : false,
        message : "short url does not exist!"
      })
    }

    return res.status(200).json({
      totalClicks : result.visitHistory.length
    })
} catch (error) {
  console.error("Analytics error: ", error);
  res.status(500).json({
    success : false,
    message : "something went wrong. please try again later !"
  })
}
}