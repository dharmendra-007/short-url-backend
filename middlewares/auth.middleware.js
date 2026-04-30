import { getUser } from "../services/auth.service.js"

export async function restrictToLogedinUserOnly(req , res , next) {
  try {
    const userUid = req.cookies?.userT
  
    if (!userUid){
      return res.status(401).json({
        success : false,
        message : "access denied. no token provided."
      })
    }
  
    const user = getUser(userUid)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again."
      })
    }
    req.userInfo = user
    next() 
  } catch (error) {
    res.status(500).json({
      success : false,
      message : "something went wrong. please try again!"
    })
  }
}

export async function restrictToVerifiedUser(req, res, next) {
  try {
    const token = req.cookies?.userT
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "access denied. no token provided."
      })
    }

    const user = getUser(token)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again."
      })
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email to continue.",
        requiresVerification: true,
      })
    }

    req.userInfo = user
    next()
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "something went wrong. please try again!"
    })
  }
}
