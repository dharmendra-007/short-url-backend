export function generateDateRange(startDate) {
  const dates = [];
  const today = new Date();

  function formatDateInIST(date) {
    const options = {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "2-digit"
    };
    const parts = new Intl.DateTimeFormat("en-IN", options).formatToParts(date);
    const month = parts.find(p => p.type === "month").value;
    const day = parts.find(p => p.type === "day").value;
    return `${month} ${day}`;  // Month first, then day
  }

  let current = new Date(startDate);
  if (isNaN(current)) return dates;

  while (current <= today) {
    dates.push(formatDateInIST(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}