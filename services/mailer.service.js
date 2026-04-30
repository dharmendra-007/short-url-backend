import nodemailer from "nodemailer"

let transporter

function getTransporter() {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  return transporter
}

export async function sendMail({ to, subject, html, text }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Mail credentials are not configured")
  }

  return getTransporter().sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    html,
    text,
  })
}

