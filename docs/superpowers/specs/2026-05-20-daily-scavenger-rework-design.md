# Daily Scavenger Rework + Day 1 Practice Mode — Design Spec

**Date:** 2026-05-20
**Status:** Designed, autonomous-ship authorised by user (no review checkpoint)
**Target ship:** Before Day 1 → Day 2 rollover tonight

## 1. Purpose

Replace the current open 29-item scavenger hunt (parallel claims, decaying order bonus) with a **daily-categorical** mechanic:

- Each day, **one specific item from each of four categories** (Food / Plant / Animal / Object) is the day's target — 4 items total.
- Items are revealed at day rollover via a **slot-machine animation** appended to the End Day takeover ceremony.
- Admin pre-defines items per day in a hardcoded data file (`src/data/dailyScavenger.js`).
- Scoring is **Option C**: everyone who finds an item gets 5 pts; first finder gets +5 bonus.

Plus a **cross-cutting Day 1 practice mode**: all entries (challenges, scavenger, fouls) on Day 1 are practice — they appear on the Daily leaderboard for visibility but **do not count** toward the Holiday total. The "real" game starts at Day 1 → Day 2 rollover, which is also the first slot-machine reveal moment.

## 2. Decisions locked during brainstorm

| Topic | Decision |
|---|---|
| Reveal style | Slot-machine animation, 4 reels (one per category), each locking into the day's item |
| Items per day | 4 (1 per category) |
| Theming | DR/resort-findable items |
| Setup | Admin pre-defines all days' items up front in `src/data/dailyScavenger.js` |
| Photo evidence | Required (existing upload flow unchanged) |
| Un-found items | Expire silently at next rollover (no carry-over) |
| Scoring | Base 5 + 5 first-finder bonus (no decay beyond 1st) |
| Existing data | Hard cutover: Day 1 entries preserved as practice; open 29-item UI killed at Day 2 |
| Day 1 | Full practice round; ALL entry types excluded from Holiday total |
| Admin UI | Hardcoded data file (no admin UI for this trip — editorial edits in code) |
| Item pool | Existing 29-item list `src/data/scavenger.js` becomes the source pool; daily picks reference items by id |
| Autonomy | User explicitly delegated: "push yourself, I don't need to review" |

## 3. Day 1 = Practice — implementation

**Approach:** Hardcoded filter in `convex/leaderboard.ts`. No schema change, no per-entry flag.

- `getHoliday` query excludes entries where `dailyKey === "day-1"`.
- `getDaily` query unchanged — Day 1's daily board still functions normally so players can see practice scores.
- `getRecentActivity` unchanged — practice entries still appear in the activity feed (they're real entries, just not counted for Holiday).

Constant `PRACTICE_DAILY_KEYS = new Set(["day-1"])` at module top of `leaderboard.ts` documents the intent.

**Blast radius:** Khari's 4 existing Day 1 entries (sing-in-public x2, give-massage, scavenger domino) are silently demoted from the Holiday total starting the moment the deploy lands. Acceptable per user direction.

## 4. Daily Scavenger Rework — implementation

### 4.1 New data file

`src/data/dailyScavenger.js`:

```js
// Daily scavenger picks. dailyKey → ordered list of 4 itemIds, one per category
// (food, plant, animal, object). Items must exist in src/data/scavenger.js.
// Day 1 is intentionally absent — Day 1 is the practice round with the old open
// mechanic. Daily mechanic activates from Day 2 onward.
export const DAILY_SCAVENGER = {
  "day-2": ["tres-leches",  "sea-grape",   "starfish",      "sand-dollar"], // Saona day
  "day-3": ["rum-coconut",  "hibiscus",    "tropical-fish", "conch-shell"], // Boat-party day
  "day-4": ["mamajuana",    "cactus-fruit","hummingbird",   "maracas"],     // Coco Bongo finale
};

export function dailyItemsFor(dailyKey) {
  return DAILY_SCAVENGER[dailyKey] ?? null;
}

export function isDailyScavengerActive(dailyKey) {
  return dailyKey !== "day-1" && dailyKey in DAILY_SCAVENGER;
}
```

### 4.2 Item pool

The existing `src/data/scavenger.js` already has 29 well-themed DR/Punta Cana items. No curation needed — picks reference items from this pool. The pool stays as the editorial source.

### 4.3 Scoring change (`convex/entries.ts → claimScavenger`)

Branch the handler on `state.currentDailyKey`:

- **Day 1 (practice):** Use existing logic — open mechanic, item.points (5/10/20 tier) + decay bonus (1st +5, 2nd +3, 3rd+ 0). No change.
- **Day 2+ (daily mechanic):**
  1. Validate `scavengerItemId` is in `DAILY_SCAVENGER[state.currentDailyKey]`. Throw `"not today's item"` otherwise.
  2. Compute score: `5 + (rank === 1 ? 5 : 0)`. No decay beyond 1st.
  3. Persist entry as before with `scavengerRank` (still useful for activity display ordering).

### 4.4 UI changes

**`src/components/ScavengerSection.jsx`** — branch on `isDailyScavengerActive(currentDailyKey)`:

- **Practice mode (Day 1):** Existing 29-item grid stays. Show small banner: "Practice round — points don't count toward Holiday."
- **Daily mode (Day 2+):** Render only 4 cards (one per category) for today's items. Items not in today's pick are hidden entirely.

**`src/components/EndDayTakeover.jsx`** — add a new stage after the existing flow:

- Current stages: Day Closed banner → Scoreboard → Wheel → Forfeit → (main's flow-state Crown stage if shipped).
- New stage: **Slot-Machine Reveal**. Appears after Crown stage (or after Forfeit if Crown not present). Renders `DailyScavengerReveal` for the new day's items.

**`src/components/DailyScavengerReveal.jsx`** — new component:

- 4 reels stacked or side-by-side, one per category (Food / Plant / Animal / Object).
- Each reel spins through a few item icons (taken from `itemsByCategory(cat)`) and lands on the day's pick.
- Stagger: reel 1 lands at ~1.5s, reel 2 at ~2.5s, reel 3 at ~3.5s, reel 4 at ~4.5s.
- "Continue" button enabled after final reel locks. Pressing it dismisses the takeover.
- For "day-2" specifically (first time the slot machine fires), a small banner: "The real game starts now."

### 4.5 Slot-machine trigger logic

The slot-machine reveal stage shows the items for the day we just rolled INTO (i.e., the new `currentDailyKey` post-rollover). For the Day 1 → Day 2 rollover, that's Day 2's items.

Stage gate: `isDailyScavengerActive(state.currentDailyKey)`. If the new dailyKey isn't in `DAILY_SCAVENGER`, the slot-machine stage is skipped silently (defensive for any post-trip rollovers).

## 5. Files touched

**Create:**
- `src/data/dailyScavenger.js`
- `src/components/DailyScavengerReveal.jsx`
- `convex/dailyScavenger.test.ts` (data sanity tests)

**Modify (Convex):**
- `convex/leaderboard.ts` — add `PRACTICE_DAILY_KEYS` filter to `getHoliday`
- `convex/leaderboard.test.ts` — add test that day-1 entries excluded from Holiday
- `convex/entries.ts` — branch `claimScavenger` scoring on dailyKey
- `convex/entries.test.ts` — add tests for daily-mode scoring + invalid-item rejection

**Modify (UI):**
- `src/components/ScavengerSection.jsx` — branch render on `isDailyScavengerActive`
- `src/components/EndDayTakeover.jsx` — add slot-machine reveal stage

**Untouched:**
- `src/data/scavenger.js` — pool stays as-is (29 items)
- `convex/scavenger.ts` — queries unchanged
- `convex/schema.ts` — no schema changes
- `AdminScavengerQueue.jsx` — admin rejection still works against the existing photoStorageId

## 6. Migration / deploy

- No DB migration needed. No table changes. No data backfill.
- Deploy is `npx convex deploy` (functions + frontend via Vercel auto-deploy on `main` push).
- The change activates immediately — Khari's Day 1 entries silently drop from Holiday count; ScavengerSection still shows open mechanic until Day 2.
- At Day 1 → Day 2 rollover (Khari presses End Day): wheel → forfeit → slot machine reveals Day 2's items → Board now shows daily-mode UI.

## 7. Risks and notes

- **The first slot-machine spin is the marquee moment.** Khari/Adan should be in the same place when End Day is pressed tonight.
- **Item curation:** my picks (in §4.1) are based on the trip itinerary (Saona Day 2, boat party Day 3, Coco Bongo Day 4). If any feel off, easy 1-line edits to `dailyScavenger.js`.
- **Existing scavenger entries on Day 1:** Khari's `domino` find scored 25 pts under the old mechanic (item.points 20 + rank-1 bonus 5). It's preserved on the record — visible in activity, contributes to Day 1 daily board, but no longer counts toward Holiday.
- **`isDailyScavengerActive` gates UI but `claimScavenger` validates server-side:** Server is the source of truth — UI can't bypass validation by hiding/showing items.
- **No tests for the slot-machine component itself.** This codebase doesn't have React component tests. Visual verification is the user's eye on prod.
- **`gamesLive: true`:** Already true on prod. This entire feature is intended to ship while live. The Day 1 practice mode is the safety net.
