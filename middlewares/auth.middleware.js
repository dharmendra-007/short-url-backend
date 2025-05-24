import { getUser } from "../services/auth.service.js"

export async function restrictToLogedinUserOnly(req , res , next) {
  const userUid = req.cookies?.uid

  if (!userUid){
    return res.status(401).json({
      success : false,
      message : "access denied. no token provided."
    })
  }

  const user = getUser(userUid)
  req.userInfo = user
  next() 
}