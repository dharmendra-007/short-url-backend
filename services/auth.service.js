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
    return jwt.verify(token , process.env.JWT_SECRET)
}
