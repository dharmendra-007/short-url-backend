import URL from "../models/url.model.js"
import User from "../models/user.model.js"
import EmailDeliveryLog from "../models/emailDeliveryLog.model.js"
import { sendMail } from "../services/mailer.service.js"
import { renderDailyStatsEmail } from "../helper/emailTemplates.js"

function formatShortUrl(shortId) {
  const baseUrl = process.env.PUBLIC_SHORT_URL || process.env.FRONTEND_URL || process.env.SHORT_URL_BASE || "http://localhost:3000"
  return `${baseUrl.replace(/\/$/, "")}/${shortId}`
}

async function getDailySummaryForUser(user) {
  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const links = await URL.find({ createdBy: user._id })
  const totalLinks = links.length
  const totalClicks = links.reduce((sum, link) => sum + link.visitHistory.length, 0)
  const todaysClicks = links.reduce((sum, link) => sum + link.visitHistory.filter((visit) => visit.timestamp >= since.getTime()).length, 0)
  const topLink = links
    .map((link) => ({ shortId: link.shortId, clicks: link.visitHistory.length }))
    .sort((a, b) => b.clicks - a.clicks)[0]

  return {
    totalLinks,
    totalClicks,
    todaysClicks,
    topLink,
  }
}

async function sendDailySummary(user) {
  const summary = await getDailySummaryForUser(user)
  const subject = `Your ShortUrl stats for ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`
  const html = renderDailyStatsEmail({
    totalLinks: summary.totalLinks,
    totalClicks: summary.totalClicks,
    todaysClicks: summary.todaysClicks,
    topLinkUrl: summary.topLink ? formatShortUrl(summary.topLink.shortId) : "No links yet",
  })
  const text = [
    `Hello ${user.name}`,
    `Total links: ${summary.totalLinks}`,
    `Total clicks: ${summary.totalClicks}`,
    `Clicks today: ${summary.todaysClicks}`,
    `Top link: ${summary.topLink ? formatShortUrl(summary.topLink.shortId) : "No links yet"}`,
  ].join("\n")

  await sendMail({ to: user.email, subject, html, text })
  user.statsEmailLastSentAt = new Date()
  await user.save()

  await EmailDeliveryLog.create({
    email: user.email,
    user: user._id,
    emailType: "daily-stats",
    status: "sent",
    meta: summary,
  })
}

async function withConcurrency(items, limit, worker) {
  const queue = [...items]
  const running = new Set()

  async function runNext() {
    if (!queue.length) return
    const item = queue.shift()
    const task = Promise.resolve(worker(item))
      .catch((error) => error)
      .finally(() => running.delete(task))
    running.add(task)
    if (running.size >= limit) {
      await Promise.race(running)
    }
    await runNext()
  }

  const starters = Array.from({ length: Math.min(limit, queue.length) }, () => runNext())
  await Promise.all(starters)
  await Promise.allSettled(running)
}

export async function handleSendDailyStats(req, res) {
  try {
    const cronHeader = req.headers["x-vercel-cron"]
    if (!cronHeader && process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const users = await User.find({
      emailVerified: true,
    })

    const eligibleUsers = []
    for (const user of users) {
      if (user.statsEmailLastSentAt && user.statsEmailLastSentAt >= todayStart) {
        continue
      }
      const linkCount = await URL.countDocuments({ createdBy: user._id })
      if (linkCount > 0) eligibleUsers.push(user)
      else {
        await EmailDeliveryLog.create({
          email: user.email,
          user: user._id,
          emailType: "daily-stats",
          status: "skipped",
          errorMessage: "user has no links",
        })
      }
    }

    const sent = []
    const failed = []

    await withConcurrency(eligibleUsers, 3, async (user) => {
      try {
        await sendDailySummary(user)
        sent.push(user.email)
      } catch (error) {
        failed.push(user.email)
        await EmailDeliveryLog.create({
          email: user.email,
          user: user._id,
          emailType: "daily-stats",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        })
      }
    })

    return res.status(200).json({
      success: true,
      message: "Daily stats email job completed",
      sent,
      failed,
      totalEligible: eligibleUsers.length,
    })
  } catch (error) {
    console.error("daily stats cron error:", error)
    return res.status(500).json({
      success: false,
      message: "something went wrong while sending stats",
    })
  }
}
