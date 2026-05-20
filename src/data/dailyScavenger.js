// Daily scavenger picks. dailyKey → ordered list of 4 itemIds, one per category
// (food, plant, animal, object). Items must exist in src/data/scavenger.js.
// Day 1 is intentionally absent — Day 1 is the practice round with the old open
// mechanic. The daily mechanic activates from Day 2 onward.
export const DAILY_SCAVENGER = {
  "day-2": ["tres-leches",  "sea-grape",    "starfish",      "sand-dollar"],
  "day-3": ["rum-coconut",  "hibiscus",     "tropical-fish", "conch-shell"],
  "day-4": ["mamajuana",    "cactus-fruit", "hummingbird",   "maracas"],
};

export function dailyItemsFor(dailyKey) {
  return DAILY_SCAVENGER[dailyKey] ?? null;
}

export function isDailyScavengerActive(dailyKey) {
  return dailyKey !== "day-1" && dailyKey in DAILY_SCAVENGER;
}
