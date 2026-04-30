import crypto from "crypto"

export function generateOtp(length = 6) {
  const min = 10 ** (length - 1)
  const max = 10 ** length - 1
  return String(Math.floor(min + Math.random() * (max - min)))
}

export function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

