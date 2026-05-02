import bcrypt from "bcrypt"
import { randomBytes } from "crypto"
import User from "../models/user.model.js"
import { getUser, setUser } from "../services/auth.service.js"
import { sendMail } from "../services/mailer.service.js"
import { generateOtp, hashToken } from "../helper/otp.js"
import { getAuthCookieOptions } from "../helper/cookie.js"
import { renderPasswordResetEmail, renderVerificationEmail, renderWelcomeEmail } from "../helper/emailTemplates.js"

function safeUser(user) {
  if (!user) return null
  const plain = user.toObject ? user.toObject() : user
  delete plain.password
  delete plain.emailVerificationOtpHash
  delete plain.emailVerificationOtpExpiresAt
  delete plain.passwordResetTokenHash
  delete plain.passwordResetTokenExpiresAt
  return plain
}

async function sendVerificationEmail(user, otp) {
  const subject = "Verify your email address"
  const html = renderVerificationEmail({ name: user.name, otp })
  const text = `Your ShortUrl verification code is ${otp}. It expires in 10 minutes.`
  await sendMail({ to: user.email, subject, html, text })
}

async function sendWelcomeEmail(user) {
  const subject = "Welcome to ShortUrl"
  const html = renderWelcomeEmail({ name: user.name })
  const text = `Welcome to ShortUrl, ${user.name}. Verify your email to unlock the dashboard, link creation, and analytics.`
  await sendMail({ to: user.email, subject, html, text })
}

async function sendPasswordResetEmail(user, resetToken) {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000"
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`
  const subject = "Reset your ShortUrl password"
  const html = renderPasswordResetEmail({ resetUrl })
  const text = `Reset your ShortUrl password: ${resetUrl}`
  await sendMail({ to: user.email, subject, html, text })
}

async function issueVerificationOtp(user) {
  const otp = generateOtp()
  user.emailVerificationOtpHash = hashToken(otp)
  user.emailVerificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
  user.verificationEmailLastSentAt = new Date()
  await user.save()
  await sendVerificationEmail(user, otp)
}

async function verifyGoogleIdToken(idToken) {
  const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
  const tokenInfo = await tokenInfoResponse.json()

  if (!tokenInfoResponse.ok || tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
    return null
  }

  return tokenInfo
}

async function exchangeGoogleAuthCode(code, redirectUri) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth client configuration is missing")
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri || process.env.FRONTEND_URL || "http://localhost:3000",
      grant_type: "authorization_code",
    }).toString(),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok || !tokenData.id_token) {
    throw new Error(tokenData.error_description || tokenData.error || "Unable to exchange Google authorization code")
  }

  return tokenData.id_token
}

export async function handleUserSignUp(req, res) {
  try {
    const { name, email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with email already exist",
      })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: "local",
      emailVerified: false,
    })

    let mailError = null
    try {
      await issueVerificationOtp(newUser)
      await sendWelcomeEmail(newUser)
    } catch (error) {
      mailError = error
      console.error("signup mail error:", error)
    }

    return res.status(201).json({
      success: true,
      message: mailError
        ? "user registered successfully, but email delivery is temporarily unavailable"
        : "user registered successfully. verify your email to continue.",
      data: safeUser(newUser),
      requiresVerification: true,
    })
  } catch (error) {
    console.error("signup error : ", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again later!",
    })
  }
}

export async function handleUserLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "user does not exist. register to continue!",
      })
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message: "Use Google login for this account.",
      })
    }

    const isPasswordMatch = user.password ? await bcrypt.compare(password, user.password) : false
    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "incorrect password!",
      })
    }

    user.lastLoginAt = new Date()
    await user.save()

    const token = setUser(user)
    res.cookie("userT", token, {
      ...getAuthCookieOptions(),
      maxAge: rememberMe ? 10 * 365 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
    })

    return res.status(200).json({
      success: true,
      message: user.emailVerified ? "login successfull!" : "login successfull! Please verify your email.",
      user: safeUser(user),
      token,
    })
  } catch (error) {
    console.error("login error : ", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again later!",
    })
  }
}

export async function getCurrentUser(req, res) {
  try {
    const token = req.cookies?.userT

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      })
    }

    const user = getUser(token)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      })
    }

    return res.status(200).json({
      success: true,
      user,
    })
  } catch (error) {
    console.error("getCurrentUser error : ", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again!",
    })
  }
}

export async function handleLogout(req, res) {
  try {
    res.clearCookie("userT", getAuthCookieOptions())
    return res.status(200).json({
      success: true,
      message: "Logged out successfully!",
    })
  } catch (error) {
    console.error("Logout error : ", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again!",
    })
  }
}

export async function handleResendVerificationEmail(req, res) {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user does not exist",
      })
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "email is already verified",
      })
    }

    await issueVerificationOtp(user)
    return res.status(200).json({
      success: true,
      message: "verification code sent",
    })
  } catch (error) {
    console.error("verification resend error:", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again later!",
    })
  }
}

export async function handleUpdateVerificationEmail(req, res) {
  try {
    const { email } = req.body
    const token = req.cookies?.userT
    const payload = getUser(token)

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      })
    }

    const user = await User.findById(payload._id).select("+emailVerificationOtpHash +emailVerificationOtpExpiresAt")
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user does not exist",
      })
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "email is already verified",
      })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser && String(existingUser._id) !== String(user._id)) {
      return res.status(400).json({
        success: false,
        message: "User with email already exist",
      })
    }

    user.email = email
    await issueVerificationOtp(user)

    return res.status(200).json({
      success: true,
      message: "verification email updated",
      user: safeUser(user),
    })
  } catch (error) {
    console.error("update verification email error:", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again later!",
    })
  }
}

export async function handleVerifyEmail(req, res) {
  try {
    const { email, otp } = req.body
    const user = await User.findOne({ email }).select("+emailVerificationOtpHash +emailVerificationOtpExpiresAt")

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user does not exist",
      })
    }

    if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "verification code expired. resend a new code.",
      })
    }

    if (user.emailVerificationOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "verification code expired. resend a new code.",
      })
    }

    if (user.emailVerificationOtpHash !== hashToken(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "invalid verification code",
      })
    }

    user.emailVerified = true
    user.emailVerificationOtpHash = null
    user.emailVerificationOtpExpiresAt = null
    await user.save()

    const token = setUser(user)
    res.cookie("userT", token, getAuthCookieOptions())

    return res.status(200).json({
      success: true,
      message: "email verified successfully",
      user: safeUser(user),
      token,
    })
  } catch (error) {
    console.error("verify email error:", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again later!",
    })
  }
}

export async function handleRequestPasswordReset(req, res) {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      })
    }

    const resetToken = cryptoRandomToken()
    user.passwordResetTokenHash = hashToken(resetToken)
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()

    await sendPasswordResetEmail(user, resetToken)

    return res.status(200).json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
    })
  } catch (error) {
    console.error("password reset request error:", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again later!",
    })
  }
}

export async function handleResetPassword(req, res) {
  try {
    const { email, token, password } = req.body
    const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetTokenExpiresAt")
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user does not exist",
      })
    }

    if (!user.passwordResetTokenHash || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "reset token expired",
      })
    }

    if (user.passwordResetTokenHash !== hashToken(String(token))) {
      return res.status(400).json({
        success: false,
        message: "invalid reset token",
      })
    }

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    user.passwordResetTokenHash = null
    user.passwordResetTokenExpiresAt = null
    user.authProvider = "local"
    await user.save()

    return res.status(200).json({
      success: true,
      message: "password updated successfully",
    })
  } catch (error) {
    console.error("reset password error:", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again later!",
    })
  }
}

function cryptoRandomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex")
}

export async function handleGoogleAuth(req, res) {
  try {
    const { credential, code, redirectUri } = req.body
    const resolvedRedirectUri = req.get("origin") || redirectUri || process.env.FRONTEND_URL || "http://localhost:3000"

    if (!credential && !code) {
      return res.status(400).json({
        success: false,
        message: "Google credential or authorization code is required",
      })
    }

    let tokenInfo = null

    if (credential) {
      tokenInfo = await verifyGoogleIdToken(credential)
    } else if (code) {
      const idToken = await exchangeGoogleAuthCode(code, resolvedRedirectUri)
      tokenInfo = await verifyGoogleIdToken(idToken)
    }

    if (!tokenInfo) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google credential",
      })
    }

    let user = await User.findOne({ email: tokenInfo.email })

    if (!user) {
      user = await User.create({
        name: tokenInfo.name || tokenInfo.email.split("@")[0],
        email: tokenInfo.email,
        avatar: tokenInfo.picture || null,
        googleId: tokenInfo.sub,
        authProvider: "google",
        emailVerified: true,
      })
    } else {
      user.name = tokenInfo.name || user.name
      user.avatar = tokenInfo.picture || user.avatar
      user.googleId = tokenInfo.sub
      user.authProvider = "google"
      user.emailVerified = true
      await user.save()
    }

    const token = setUser(user)
    res.cookie("userT", token, getAuthCookieOptions())

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      user: safeUser(user),
      token,
    })
  } catch (error) {
    console.error("google auth error:", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong. please try again later!",
    })
  }
}
