# Day-by-Day Itinerary Redesign Plan

**Goal:** Make the day-by-day section feel native on phone — clearer "now", easier to scan, and useful in the middle of an actual day.

**Phases:**
1. TODAY pill + day-of-week labels (pure UI, ~5 mins)
2. Vertical accordion replacing horizontal carousel (mobile UX win)
3. Time-of-day buckets within a day (no backend)
4. Real activity images at card top (asset reuse)
5. RSVP per activity item (new Convex table)
6. Cost summary per day (pure derived UI)

Order is impact-first: each phase ships something usable on its own.

---

## Phase 1 — TODAY pill + day-of-week labels

**Files:** `src/components/YourItineraryHome.jsx`

- Add a `TODAY` micro-pill on the chip whose index === `currentTripDayIndex(DAYS)`, and on the matching DayCard header.
- Change chip + card header to show day-of-week alongside date. The `DAYS` data has `dow` (e.g. "Mon", "Tue"). Show stacked on chips, and big in card header.
- A thin coral hairline along the left of today's expanded card.

**Commit:** `feat(itinerary): TODAY pill + day-of-week labels`

---

## Phase 2 — Vertical accordion

**Files:** `src/components/YourItineraryHome.jsx`

Replace the horizontal scroll-carousel with a vertical list of collapsible day rows:
- Today: expanded by default
- Others: one-line summary (date · dow · title · presence dot)
- Tap any row → that row expands, others collapse
- Keep the existing DayDetails + items + DayCommentThread for the expanded row

**Commit:** `feat(itinerary): vertical accordion replaces horizontal carousel`

---

## Phase 3 — Time-of-day buckets within a day

**Files:** `src/components/YourItineraryHome.jsx`

In the expanded day, group `day.items` into buckets:
- **Morning** — time starts with 06–11 (or string "AM")
- **Afternoon** — 12–17 (or "Day")
- **Evening** — 18–22 (or "Eve")
- **Late** — 23+, "Late", or "Night"

Render each bucket with a small label. Items without a time stay in a generic group at the top.

**Commit:** `feat(itinerary): time-of-day buckets within day`

---

## Phase 4 — Real activity images

**Files:** `src/components/YourItineraryHome.jsx`, possibly `src/data/itinerary.js`

`DAYS[i]` already has a hero image key (e.g. `heroBeach`, `heroColonial` per HomePage.jsx). Map those keys to `public/images/...` files and render at the card top (square, ~120px tall, rounded). Fall back to the coloured block if no image is mapped.

If no image inventory exists, leave the colored block but add a hero-style background blur using the `DAY_COLORS` accent.

**Commit:** `feat(itinerary): hero image at top of each day card`

---

## Phase 5 — RSVP per activity item

**Files:** `convex/schema.ts`, `convex/itemRsvps.ts`, `convex/itemRsvps.test.ts`, `src/components/YourItineraryHome.jsx`

New table:
```ts
itemRsvps: defineTable({
  dayDate: v.string(),
  itemKey: v.string(),  // e.g. "0", "1", ...indices into day.items
  playerSlug: v.string(),
  status: v.union(v.literal("in"), v.literal("out")),
  updatedAt: v.number(),
}).index("by_day_and_item", ["dayDate", "itemKey"])
  .index("by_player_day", ["playerSlug", "dayDate"]),
```

Mutation `setItemRsvp({token, dayDate, itemKey, status})` upserts.
Query `rsvpsForDay({dayDate})` returns `{itemKey: {in: [slugs], out: [slugs]}}`.

UI:
- Two pills per item: **I'm in** (green) / **Skipping** (grey)
- Show count of "in" voters next to item (e.g. "5 in")

**Commits (3):**
1. `feat(convex): itemRsvps table`
2. `feat(convex): itemRsvps mutations + query + tests`
3. `feat(itinerary): RSVP pills per activity item`

---

## Phase 6 — Cost summary per day

**Files:** `src/components/YourItineraryHome.jsx`

If `day.items` has items with `cost` (string like `"£70-90pp"`) or `day.cost` exists, render a small pill near the day header. Just surface the raw string — don't try to math.

If multiple costs, list them comma-separated.

**Commit:** `feat(itinerary): cost summary pill on day card`

---

## Phase 7 — Deploy

```bash
npx convex deploy -y
git push origin main
```
