import jwt  from "jsonwebtoken"

export function setUser(user) {
  const payload = {
    _id : user._id,
    email: user.email,
    name : user.name
  }
  return jwt.sign(payload , process.env.JWT_SECRET)
}

export function getUser(token) {
  if(!token){
    return res.status(401).json({
      success : false,
      message : "Unauthorized"
    })
  }
  try {
    return jwt.verify(token , process.env.JWT_SECRET)
  } catch (error) {
    return res.status(401).json({
      success : false,
      message : "Session expired. Please login again."
    })
  }
}
