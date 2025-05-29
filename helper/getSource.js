export function getSource(referrer) {
  if (!referrer) return 'Direct'

  const lowerRef = referrer.toLowerCase()

  if (
    lowerRef.includes('facebook.com') ||
    lowerRef.includes('twitter.com') ||
    lowerRef.includes('x.com') ||        
    lowerRef.includes('instagram.com') ||
    lowerRef.includes('linkedin.com')
  ) {
    return 'Social Media';
  }

  if (
    lowerRef.includes('google.com') ||
    lowerRef.includes('bing.com') ||
    lowerRef.includes('yahoo.com') ||
    lowerRef.includes('duckduckgo.com')
  ) {
    return 'Search Engines';
  }

  if (
    lowerRef.includes('mail.google.com') ||
    lowerRef.includes('outlook.office.com') ||
    lowerRef.includes('mail.yahoo.com') ||
    lowerRef.includes('newsletter')
  ) {
    return 'Email';
  }

  return 'Other';
}