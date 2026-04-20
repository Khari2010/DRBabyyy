import { FLIGHTS } from "../data/flights.js";

// Trip window (BST / UK local times). Start = earliest outbound; end-of-trip
// message kicks in once everyone's flown home (last return landing).
export const TRIP_START = new Date("2026-05-18T11:00:00+01:00");
export const TRIP_END = new Date("2026-05-30T00:00:00+01:00");

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseTripDate(str, hour = 0, minute = 0) {
  if (!str) return null;
  const [dayStr, monStr] = str.split(" ");
  const day = Number(dayStr);
  const month = MONTHS[monStr];
  if (Number.isNaN(day) || month === undefined) return null;
  return new Date(2026, month, day, hour, minute);
}

// Returns a Date for the player's outbound flight departure (UK local).
// Falls back to the group start date if the player has no flight yet.
export function getFlightDate(player) {
  if (!player) return TRIP_START;
  const out = FLIGHTS.find(
    (f) => f.type === "Outbound" && f.who.includes(player.name),
  );
  if (!out) return TRIP_START;
  const [h, m] = (out.depart || "11:00").split(":").map(Number);
  const d = parseTripDate(out.date, h || 11, m || 0);
  return d || TRIP_START;
}
