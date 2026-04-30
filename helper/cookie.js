export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === "production"

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  }
}

export function getLongLivedAuthCookieOptions() {
  return {
    ...getAuthCookieOptions(),
    maxAge: 10 * 365 * 24 * 60 * 60,
  }
}

