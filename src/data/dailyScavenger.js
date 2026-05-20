// Daily scavenger picks. dailyKey → ordered list of 4 itemIds, one per category
// (food, plant, animal, object). Items must exist in src/data/scavenger.js.
// All 4 trip days use the daily-categorical mechanic. Day 1 entries still
// score on the Daily board but are excluded from the Holiday total via
// PRACTICE_DAILY_KEYS in convex/leaderboard.ts.
export const DAILY_SCAVENGER = {
  "day-1": ["coconut",      "hibiscus",     "iguana",        "peso"],
  "day-2": ["tres-leches",  "sea-grape",    "starfish",      "sand-dollar"],
  "day-3": ["rum-coconut",  "bromeliad",    "tropical-fish", "conch-shell"],
  "day-4": ["mamajuana",    "cactus-fruit", "hummingbird",   "maracas"],
};

export function dailyItemsFor(dailyKey) {
  return DAILY_SCAVENGER[dailyKey] ?? null;
}

export function isDailyScavengerActive(dailyKey) {
  return dailyKey in DAILY_SCAVENGER;
}
