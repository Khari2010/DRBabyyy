// Relative-time formatter for the wall: "Xs", "Xm", "Xh", "Yesterday", "MMM D".
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatRelative(timestampMs, now = Date.now()) {
  const diff = Math.max(0, now - timestampMs);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  const d = new Date(timestampMs);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
