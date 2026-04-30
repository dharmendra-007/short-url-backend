import ejs from "ejs"

const baseLayout = ({ title, preheader, body }) => `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 12px;color:#6b7280;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">ShortUrl</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;">${title}</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">${preheader}</p>
        ${body}
      </div>
    </div>
  </body>
</html>
`

const verificationTemplate = baseLayout({
  title: "Verify your email",
  preheader: "Use the one-time code below to verify your ShortUrl account.",
  body: `
    <div style="display:inline-block;padding:16px 24px;border-radius:12px;background:#111827;color:#ffffff;font-size:32px;letter-spacing:8px;font-weight:700;">
      <%= otp %>
    </div>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">
      This code expires in 10 minutes.
    </p>
  `,
})

const welcomeTemplate = baseLayout({
  title: "Welcome to ShortUrl",
  preheader: "Your account is ready. Verify your email to unlock the dashboard, link creation, and analytics.",
  body: `
    <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">
      Hi <strong><%= name %></strong>, welcome aboard. Start by verifying your email so you can create and manage links.
    </p>
  `,
})

const passwordResetTemplate = baseLayout({
  title: "Reset your password",
  preheader: "Use the secure link below to choose a new password. It expires in 15 minutes.",
  body: `
    <a href="<%= resetUrl %>" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;">
      Reset password
    </a>
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#6b7280;word-break:break-all;">
      If the button does not work, copy this URL: <br />
      <%= resetUrl %>
    </p>
  `,
})

const dailyStatsTemplate = baseLayout({
  title: "Your daily ShortUrl stats",
  preheader: "Here is your automated daily summary for the links you manage.",
  body: `
    <div style="display:grid;gap:12px;">
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="font-size:14px;color:#6b7280;">Total links</div>
        <div style="font-size:24px;font-weight:700;"><%= totalLinks %></div>
      </div>
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="font-size:14px;color:#6b7280;">Total clicks</div>
        <div style="font-size:24px;font-weight:700;"><%= totalClicks %></div>
      </div>
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="font-size:14px;color:#6b7280;">Clicks today</div>
        <div style="font-size:24px;font-weight:700;"><%= todaysClicks %></div>
      </div>
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="font-size:14px;color:#6b7280;">Top link</div>
        <div style="font-size:16px;font-weight:700;word-break:break-all;"><%= topLinkUrl %></div>
      </div>
    </div>
  `,
})

function render(template, data) {
  return ejs.render(template, data)
}

export function renderVerificationEmail({ name, otp }) {
  return render(verificationTemplate, { name, otp })
}

export function renderWelcomeEmail({ name }) {
  return render(welcomeTemplate, { name })
}

export function renderPasswordResetEmail({ resetUrl }) {
  return render(passwordResetTemplate, { resetUrl })
}

export function renderDailyStatsEmail({ totalLinks, totalClicks, todaysClicks, topLinkUrl }) {
  return render(dailyStatsTemplate, { totalLinks, totalClicks, todaysClicks, topLinkUrl })
}

