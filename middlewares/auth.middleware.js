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
    req.userInfo = user
    next() 
  } catch (error) {
    res.status(500).json({
      success : false,
      message : "something went wrong. please try again!"
    })
  }
}