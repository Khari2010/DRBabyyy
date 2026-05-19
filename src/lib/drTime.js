const DR_OFFSET_HOURS = -4;

export function drDayOfMonth(now = new Date()) {
  const shifted = new Date(now.getTime() + DR_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.getUTCDate();
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function drMonthName(now = new Date()) {
  const shifted = new Date(now.getTime() + DR_OFFSET_HOURS * 60 * 60 * 1000);
  return MONTH_NAMES[shifted.getUTCMonth()];
}

// Parse a date string like "18 May" into a numeric sort key: month * 100 + day
function parseDateKey(dateStr) {
  const parts = dateStr.trim().split(" ");
  const day = parseInt(parts[0], 10);
  const month = MONTH_NAMES.indexOf(parts[1]);
  return month * 100 + day;
}

export function currentTripDayIndex(days, now = new Date()) {
  if (!Array.isArray(days) || days.length === 0) return 0;
  const today = drDayOfMonth(now);
  const month = drMonthName(now);
  const todayStr = `${today} ${month}`;

  const idx = days.findIndex((d) => d.date === todayStr);
  if (idx >= 0) return idx;

  const todayKey = parseDateKey(todayStr);
  const firstKey = parseDateKey(days[0].date);
  const lastKey = parseDateKey(days[days.length - 1].date);

  if (todayKey < firstKey) return 0;
  if (todayKey > lastKey) return days.length - 1;

  let nearest = 0;
  for (let i = 0; i < days.length; i++) {
    if (parseDateKey(days[i].date) <= todayKey) nearest = i;
  }
  return nearest;
}
