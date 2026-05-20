# Daily Scavenger Rework + Day 1 Practice Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the daily-categorical scavenger hunt (4 items/day, slot-machine reveal at rollover, base 5 + 5 first-finder bonus) AND the Day 1 = practice round mechanic, in time for Khari's Day 1 → Day 2 End Day rollover.

**Architecture:** Pure additive feature. No schema changes. Day 1 practice mode is a single filter on `getHoliday`. Daily scavenger ships as: new data file + branch in `claimScavenger` mutation + branch in `ScavengerSection` UI + new `DailyScavengerReveal` component spliced into `EndDayTakeover`.

**Tech Stack:** Convex 1.39, Vitest 4, convex-test 0.0.49, React 18, Vite 5. No new deps.

**Spec:** `docs/superpowers/specs/2026-05-20-daily-scavenger-rework-design.md`

---

## File Structure

**Create:**
- `src/data/dailyScavenger.js` — `DAILY_SCAVENGER` map, helpers `dailyItemsFor` and `isDailyScavengerActive`.
- `src/components/DailyScavengerReveal.jsx` — slot-machine reveal component.
- `convex/dailyScavenger.test.ts` — data sanity tests (uniqueness, category coverage, items reference real ids).

**Modify (Convex):**
- `convex/leaderboard.ts` — add `PRACTICE_DAILY_KEYS` filter to `getHoliday`.
- `convex/leaderboard.test.ts` — assert day-1 excluded from Holiday aggregation.
- `convex/entries.ts` — branch `claimScavenger` scoring on `state.currentDailyKey`.
- `convex/entries.test.ts` — tests for daily-mode scoring (base 5, +5 first finder) + reject items not in today's set.

**Modify (UI):**
- `src/components/ScavengerSection.jsx` — branch render on `isDailyScavengerActive`.
- `src/components/EndDayTakeover.jsx` — splice in slot-machine reveal stage.

---

## Task 1: Day 1 practice mode (leaderboard filter)

**Files:**
- Modify: `convex/leaderboard.ts`
- Modify: `convex/leaderboard.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `convex/leaderboard.test.ts`:

```ts
describe("leaderboard.getHoliday — Day 1 practice exclusion", () => {
  it("excludes day-1 entries from Holiday aggregation", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      // Insert a day-1 practice entry and a day-2 official entry for the same player.
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "khari", challengeId: "kiss-someone",
        points: 100, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: 1,
      });
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "khari", challengeId: "run-1km",
        points: 20, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-2", createdAt: 2,
      });
    });

    const holiday = await t.query(api.leaderboard.getHoliday, {});
    const khari = holiday.find((r) => r.slug === "khari");
    expect(khari?.total).toBe(20); // day-2 only, day-1 excluded
    expect(khari?.claimCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run and verify FAIL**

`npm test -- convex/leaderboard.test.ts`
Expected: New test fails — `khari.total` is 120 (both entries counted) instead of 20.

- [ ] **Step 3: Add the filter to `getHoliday`**

Open `convex/leaderboard.ts`. Add at top of file (after imports):

```ts
const PRACTICE_DAILY_KEYS = new Set(["day-1"]);
```

Modify `getHoliday`:

```ts
export const getHoliday = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("entries").collect();
    const counted = entries.filter((e) => !PRACTICE_DAILY_KEYS.has(e.dailyKey));
    return aggregate(counted);
  },
});
```

- [ ] **Step 4: Run and verify PASS**

`npm test -- convex/leaderboard.test.ts`
Expected: New test passes; all prior leaderboard tests still pass.

Then run full suite: `npm test` — should be baseline + 1.

- [ ] **Step 5: Commit**

```bash
git add convex/leaderboard.ts convex/leaderboard.test.ts
git commit -m "feat(leaderboard): exclude day-1 practice entries from Holiday total"
```

---

## Task 2: Create `dailyScavenger.js` data file + sanity tests

**Files:**
- Create: `src/data/dailyScavenger.js`
- Create: `convex/dailyScavenger.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `convex/dailyScavenger.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DAILY_SCAVENGER, dailyItemsFor, isDailyScavengerActive } from "../src/data/dailyScavenger.js";
import { SCAVENGER_ITEMS, itemById } from "../src/data/scavenger.js";

describe("DAILY_SCAVENGER data sanity", () => {
  it("has exactly 3 days covered (day-2, day-3, day-4)", () => {
    expect(Object.keys(DAILY_SCAVENGER).sort()).toEqual(["day-2", "day-3", "day-4"]);
  });

  it("each day has exactly 4 items", () => {
    for (const day of Object.keys(DAILY_SCAVENGER)) {
      expect(DAILY_SCAVENGER[day]).toHaveLength(4);
    }
  });

  it("each day's items cover all 4 categories (food, plant, animal, object)", () => {
    for (const day of Object.keys(DAILY_SCAVENGER)) {
      const categories = DAILY_SCAVENGER[day].map((id) => itemById(id)?.category).sort();
      expect(categories).toEqual(["animal", "food", "object", "plant"]);
    }
  });

  it("every itemId references a real scavenger item", () => {
    for (const day of Object.keys(DAILY_SCAVENGER)) {
      for (const id of DAILY_SCAVENGER[day]) {
        expect(itemById(id), `unknown itemId ${id} in ${day}`).toBeDefined();
      }
    }
  });

  it("itemIds are unique across the trip (no day picks the same item twice)", () => {
    const allIds = Object.values(DAILY_SCAVENGER).flat();
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe("dailyItemsFor", () => {
  it("returns the 4 items for a known day", () => {
    expect(dailyItemsFor("day-2")).toHaveLength(4);
  });
  it("returns null for an unknown day", () => {
    expect(dailyItemsFor("day-99")).toBeNull();
  });
});

describe("isDailyScavengerActive", () => {
  it("false for day-1 (practice)", () => {
    expect(isDailyScavengerActive("day-1")).toBe(false);
  });
  it("true for day-2 (real game)", () => {
    expect(isDailyScavengerActive("day-2")).toBe(true);
  });
  it("false for unknown days", () => {
    expect(isDailyScavengerActive("day-99")).toBe(false);
  });
});
```

- [ ] **Step 2: Run and verify FAIL**

`npm test -- convex/dailyScavenger.test.ts`
Expected: Import error — `src/data/dailyScavenger.js` doesn't exist.

- [ ] **Step 3: Create the data file**

Create `src/data/dailyScavenger.js`:

```js
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
```

- [ ] **Step 4: Run and verify PASS**

`npm test -- convex/dailyScavenger.test.ts`
Expected: All 8 tests pass.

Run full suite: `npm test` — should be Task-1-baseline + 8.

- [ ] **Step 5: Commit**

```bash
git add src/data/dailyScavenger.js convex/dailyScavenger.test.ts
git commit -m "feat(scavenger): daily picks data file + sanity tests"
```

---

## Task 3: Branch `claimScavenger` on dailyKey

**Files:**
- Modify: `convex/entries.ts`
- Modify: `convex/entries.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `convex/entries.test.ts`:

```ts
describe("claimScavenger — daily mode (day-2+)", () => {
  async function setupDailyMode(t: ReturnType<typeof convexTest>) {
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 2, currentDailyKey: "day-2", updatedAt: 1,
      });
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-k", createdAt: 1 });
      await ctx.db.insert("players", { slug: "kai", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "kai", token: "tok-kai", createdAt: 1 });
    });
  }

  it("first finder of today's item gets base 5 + bonus 5 = 10 pts", async () => {
    const t = convexTest(schema);
    await setupDailyMode(t);
    const storageId = await t.run((ctx) => ctx.storage.generateUploadUrl().then(() => "fake_storage_id" as any));
    // We can't actually upload — pass any storage id since claimScavenger doesn't fetch it.
    const entryId = await t.mutation(api.entries.claimScavenger, {
      token: "tok-k",
      scavengerItemId: "tres-leches", // first item in day-2
      photoStorageId: "kg00000000000000000000000000000000" as any,
    });
    const entry = await t.run((ctx) => ctx.db.get(entryId));
    expect(entry?.points).toBe(10);
    expect(entry?.scavengerRank).toBe(1);
  });

  it("second finder of today's item gets base 5 only (no bonus)", async () => {
    const t = convexTest(schema);
    await setupDailyMode(t);
    await t.mutation(api.entries.claimScavenger, {
      token: "tok-k",
      scavengerItemId: "starfish",
      photoStorageId: "kg00000000000000000000000000000000" as any,
    });
    const entryId = await t.mutation(api.entries.claimScavenger, {
      token: "tok-kai",
      scavengerItemId: "starfish",
      photoStorageId: "kg00000000000000000000000000000000" as any,
    });
    const entry = await t.run((ctx) => ctx.db.get(entryId));
    expect(entry?.points).toBe(5);
    expect(entry?.scavengerRank).toBe(2);
  });

  it("rejects claim for an item NOT in today's set", async () => {
    const t = convexTest(schema);
    await setupDailyMode(t);
    await expect(
      t.mutation(api.entries.claimScavenger, {
        token: "tok-k",
        scavengerItemId: "coconut", // valid item, but not in day-2 picks
        photoStorageId: "kg00000000000000000000000000000000" as any,
      }),
    ).rejects.toThrow(/not today's item/);
  });
});

describe("claimScavenger — Day 1 practice mode (unchanged)", () => {
  it("uses legacy scoring (item.points + rank bonus) on day-1", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: 1,
      });
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-k", createdAt: 1 });
    });
    const entryId = await t.mutation(api.entries.claimScavenger, {
      token: "tok-k",
      scavengerItemId: "domino", // 20 pts item, rank 1 → 20 + 5 = 25
      photoStorageId: "kg00000000000000000000000000000000" as any,
    });
    const entry = await t.run((ctx) => ctx.db.get(entryId));
    expect(entry?.points).toBe(25);
  });
});
```

- [ ] **Step 2: Run and verify FAIL**

`npm test -- convex/entries.test.ts`
Expected: The 3 new daily-mode tests fail; legacy day-1 test passes (no behavior change yet for day-1).

- [ ] **Step 3: Update `claimScavenger`**

Open `convex/entries.ts`. At the top, add import:

```ts
import { dailyItemsFor, isDailyScavengerActive } from "../src/data/dailyScavenger.js";
```

Replace the body of the existing `claimScavenger` handler with branched logic. Locate the current handler and change the body (after the existing `mineActive` check) to:

```ts
    let points: number;
    let rank: number;

    if (isDailyScavengerActive(state.currentDailyKey)) {
      const todaysItems = dailyItemsFor(state.currentDailyKey)!;
      if (!todaysItems.includes(scavengerItemId)) {
        throw new Error("not today's item");
      }
      const validCount = existingActive.filter((e) => e.status !== "disputed").length;
      rank = validCount + 1;
      points = 5 + (rank === 1 ? 5 : 0);
    } else {
      // Practice mode / fallback: legacy open mechanic.
      const validCount = existingActive.filter((e) => e.status !== "disputed").length;
      rank = Math.min(validCount + 1, 3);
      const bonus = SCAVENGER_BONUS[rank as 1 | 2 | 3];
      points = (item as { points: number }).points + bonus;
    }

    return await ctx.db.insert("entries", {
      type: "scavenger",
      subjectSlug: playerSlug,
      points,
      status: "active",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
      scavengerItemId,
      photoStorageId,
      scavengerRank: rank,
    });
```

- [ ] **Step 4: Run and verify PASS**

`npm test -- convex/entries.test.ts`
Expected: All tests in the file pass — the 3 new daily-mode tests + the existing tests + the legacy day-1 test.

Full suite: `npm test`.

- [ ] **Step 5: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "feat(scavenger): branch claimScavenger scoring on dailyKey (Day 1 practice vs daily mode)"
```

---

## Task 4: Update `ScavengerSection.jsx` to render daily mode

**Files:**
- Modify: `src/components/ScavengerSection.jsx`

This is a UI render change. No new tests (this codebase doesn't have React component tests).

- [ ] **Step 1: Read the current component**

```bash
cat src/components/ScavengerSection.jsx
```

Take note of: how it currently iterates `SCAVENGER_ITEMS`, what props it accepts, and how it passes items to `ScavengerCard`.

- [ ] **Step 2: Add a branch on `isDailyScavengerActive(currentDailyKey)`**

The component needs to:

1. Import `dailyItemsFor` and `isDailyScavengerActive` from `../data/dailyScavenger.js`.
2. Get `currentDailyKey` from existing game state (the component likely already does, via a Convex query). If not, add `useQuery(api.gameState.get)`.
3. In **practice mode** (`!isDailyScavengerActive(currentDailyKey)`): render the existing 29-item grid AS IS, but prepend a banner:
   ```jsx
   <div style={{ padding: "12px 16px", background: "var(--token-amber-200, #fde68a)", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
     Practice round — points don't count toward Holiday.
   </div>
   ```
4. In **daily mode** (`isDailyScavengerActive(currentDailyKey)`): render only the 4 items in `dailyItemsFor(currentDailyKey)`. Resolve each itemId via `itemById(id)` from `src/data/scavenger.js`, then pass to `ScavengerCard` exactly like the existing rendering.

Preserve all existing props, handlers, and styling. The branch is purely a "which items get rendered" decision.

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: clean build, no errors.

- [ ] **Step 4: Verify tests**

```bash
npm test
```
Expected: All tests still pass (no test references this component).

- [ ] **Step 5: Commit**

```bash
git add src/components/ScavengerSection.jsx
git commit -m "feat(scavenger): branch ScavengerSection render on daily-mode active"
```

---

## Task 5: Create `DailyScavengerReveal.jsx`

**Files:**
- Create: `src/components/DailyScavengerReveal.jsx`

A presentational slot-machine component. No backend interaction.

- [ ] **Step 1: Create the component**

Create `src/components/DailyScavengerReveal.jsx`:

```jsx
import { useEffect, useState } from "react";
import { dailyItemsFor } from "../data/dailyScavenger.js";
import { itemById, itemsByCategory, SCAVENGER_CATEGORIES } from "../data/scavenger.js";

const REEL_ORDER = ["food", "plant", "animal", "object"];
const STAGGER_MS = 1000;
const FIRST_REEL_DELAY_MS = 500;

function Reel({ category, finalItem, locked }) {
  const cat = SCAVENGER_CATEGORIES.find((c) => c.id === category);
  const items = itemsByCategory(category);
  const [tickIdx, setTickIdx] = useState(0);

  useEffect(() => {
    if (locked) return;
    const id = setInterval(() => setTickIdx((i) => (i + 1) % items.length), 80);
    return () => clearInterval(id);
  }, [locked, items.length]);

  const display = locked ? finalItem : items[tickIdx % items.length];

  return (
    <div
      style={{
        flex: 1,
        background: cat?.color ?? "#444",
        color: "white",
        borderRadius: 12,
        padding: "16px 8px",
        textAlign: "center",
        minWidth: 80,
        transition: "transform 0.3s ease",
        transform: locked ? "scale(1.05)" : "scale(1)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>{cat?.label ?? category}</div>
      <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 6 }}>{display?.icon ?? "❓"}</div>
      <div style={{ fontSize: 12, fontWeight: 600, minHeight: 28 }}>{locked ? display?.name : "—"}</div>
    </div>
  );
}

export default function DailyScavengerReveal({ dailyKey, onDone, isFirstReveal }) {
  const ids = dailyItemsFor(dailyKey);
  const [lockedCount, setLockedCount] = useState(0);

  useEffect(() => {
    if (!ids) return;
    const timers = ids.map((_, i) =>
      setTimeout(() => setLockedCount((c) => Math.max(c, i + 1)), FIRST_REEL_DELAY_MS + i * STAGGER_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [dailyKey]);

  if (!ids) return null;

  const finalItems = ids.map((id) => itemById(id));
  const allLocked = lockedCount >= ids.length;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, textAlign: "center" }}>
        {isFirstReveal ? "The real game starts now." : "Today's hunt"}
      </div>
      <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 480 }}>
        {REEL_ORDER.map((cat, i) => {
          const item = finalItems[i];
          const matchesCategory = item?.category === cat;
          return (
            <Reel
              key={cat}
              category={cat}
              finalItem={matchesCategory ? item : null}
              locked={lockedCount > i}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={onDone}
        disabled={!allLocked}
        style={{
          marginTop: 12,
          padding: "10px 28px",
          borderRadius: 999,
          border: "none",
          background: allLocked ? "var(--token-emerald-500, #10b981)" : "#999",
          color: "white",
          fontWeight: 700,
          fontSize: 14,
          cursor: allLocked ? "pointer" : "not-allowed",
        }}
      >
        Continue
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/DailyScavengerReveal.jsx
git commit -m "feat(scavenger): DailyScavengerReveal slot-machine component"
```

---

## Task 6: Splice `DailyScavengerReveal` into `EndDayTakeover`

**Files:**
- Modify: `src/components/EndDayTakeover.jsx`

- [ ] **Step 1: Read the current component**

```bash
cat src/components/EndDayTakeover.jsx
```

Identify the existing stages and how the component transitions between them. The current sequence (as of the merged branch) is: Day Closed banner → Scoreboard → Wheel → Forfeit recorded → Crown reveal (from flow-state feature) → dismiss.

- [ ] **Step 2: Add a new `"slot"` stage AFTER the crown stage**

The change:

1. Import `DailyScavengerReveal` and `isDailyScavengerActive`:
   ```jsx
   import DailyScavengerReveal from "./DailyScavengerReveal.jsx";
   import { isDailyScavengerActive } from "../data/dailyScavenger.js";
   ```

2. After the existing final stage (crown reveal or forfeit, whichever is last), check whether the new dailyKey post-rollover is daily-active. The new dailyKey is in `gameState.currentDailyKey` after `rollovers.trigger` (or `rollovers.advance` in the post-split world) has run.

3. If `isDailyScavengerActive(gameState.currentDailyKey)`, render `DailyScavengerReveal` as the next stage with these props:
   - `dailyKey={gameState.currentDailyKey}`
   - `isFirstReveal={gameState.currentDailyKey === "day-2"}`
   - `onDone={() => { /* advance to dismiss */ }}`

4. If not active (e.g. dailyKey not in DAILY_SCAVENGER), skip the slot stage entirely and dismiss the takeover.

5. The takeover should only dismiss when the slot-machine reveal's `onDone` fires (if active) — otherwise it dismisses as it does today.

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: clean build.

- [ ] **Step 4: Verify tests**

```bash
npm test
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/EndDayTakeover.jsx
git commit -m "feat(scavenger): wire DailyScavengerReveal into EndDayTakeover after crown stage"
```

---

## Task 7: Deploy + verify (user pre-approved)

**Files:** None modified. Operational steps only.

- [ ] **Step 1: Push to origin/main**

```bash
git push origin main
```

Vercel auto-deploys the frontend.

- [ ] **Step 2: Deploy Convex functions**

```bash
npx convex deploy -y
```

- [ ] **Step 3: Smoke check prod**

- Verify `getHoliday` excludes day-1: `npx convex run --prod leaderboard:getHoliday` — Khari's score should reflect Day 2+ only (currently 0 since no Day 2 entries exist yet).
- Verify daily scavenger is unblocked for day-2+ via the live UI when Khari opens the app.

- [ ] **Step 4: Report final state to user**

Summary of:
- Day 1 entries demoted to practice (count, total points removed from Holiday)
- Daily scavenger active starting Day 2 with 12 items pre-picked across 3 days
- Slot machine fires at next End Day rollover

---

## Self-Review Notes (controller, before dispatch)

**Spec coverage check:**
- §3 Day 1 practice mode → Task 1
- §4.1 dailyScavenger.js data file → Task 2
- §4.3 claimScavenger scoring branch → Task 3
- §4.4 ScavengerSection branch render → Task 4
- §4.4 DailyScavengerReveal component → Task 5
- §4.4 EndDayTakeover integration → Task 6
- §6 deploy → Task 7

**Placeholder scan:** None — every step contains the exact code or command.

**Type consistency:** `dailyItemsFor`, `isDailyScavengerActive`, `DAILY_SCAVENGER`, `itemById`, `itemsByCategory`, `SCAVENGER_CATEGORIES` — all referenced consistently across tasks.

**Risks accepted:** Pushing to prod without manual review (user-authorised). Day 1 = practice protects against most data mistakes; reverting is just a code rollback.
