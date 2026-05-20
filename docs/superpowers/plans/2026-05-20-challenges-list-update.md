# Challenges List Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the live Convex challenges pool with Khari's finalised 52-challenge list — add 8 new entries, retire 11 stale ones, reprice 1 — and bring the styleguide + marketing surfaces into sync with the canonical list.

**Architecture:** Pure content edit plus two small migration mutations. Source of truth is the Convex `challenges` table (seeded from `convex/_seedData/challenges.ts`, read via `api.challenges.listActive`). The existing `seedChallenges` mutation already does insert-if-not-exists for additions. Retirement is soft (`status = "retired"`) via an extended `retireChallengeIds` internal mutation. Repricing is a new internal mutation `repriceChallenges`. The styleguide page (`src/data/challenges.js`) and marketing page (`src/routes/HomePage.jsx`) get rewritten to mirror the canonical list.

**Tech Stack:** Convex 1.39, Vitest 4, convex-test 0.0.49, React 18, Vite 5.

**Spec:** `docs/superpowers/specs/2026-05-20-challenges-list-update-design.md`

---

## File Structure

**Files to modify:**

- `convex/_seedData/challenges.ts` — remove 11 entries, add 8 entries, reprice `spanish-convo`. Final length: 52.
- `convex/seedChallenges.ts` — extend `retireChallengeIds.idsToRetire` from 1 to 12 ids; add new `repriceChallenges` internal mutation.
- `src/data/challenges.js` — replace `CHALLENGES` array with the full canonical 52-item list; add 4 categories (`beach`, `shopping`, `local`, `food`) to `CHALLENGE_CATEGORIES`.
- `src/routes/HomePage.jsx` — replace inline `CHALLENGES` (line 83) with the canonical 52-item list; sync inline `NEGATIVE_POINTS` and `FORFEITS` text to the canonical versions.

**Files to create:**

- `convex/seedChallenges.test.ts` — vitest tests for the extended `retireChallengeIds` and new `repriceChallenges` mutations, plus a data sanity check on `SEED_CHALLENGES`.

**Files not touched:**

- `convex/schema.ts` — no schema changes.
- `convex/challenges.ts` — public queries/mutations unchanged.
- `convex/entries.ts`, `convex/leaderboard.ts` — both reference `NEGATIVE_POINTS_CONST` but no negatives are changing.
- Scavenger hunt files — completely out of scope for this plan.

---

## Task 1: Test for extended `retireChallengeIds`

**Files:**
- Create: `convex/seedChallenges.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// convex/seedChallenges.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

const RETIRE_IDS = [
  "gianni-bike",
  "shower-with",
  "scavenger-hunt",
  "ocean-sunrise",
  "ocean-midnight",
  "swim-up-bar",
  "pinacolada-coconut",
  "tostones",
  "hair-braids",
  "crew-swim-up",
  "matching-dinner",
  "horseback-beach",
];

describe("seedChallenges.retireChallengeIds", () => {
  it("retires every id in the retirement list and leaves others active", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      // Insert each id-to-retire as an active challenge.
      for (const id of RETIRE_IDS) {
        await ctx.db.insert("challenges", {
          challengeId: id,
          title: id,
          icon: "❓",
          points: 10,
          category: "social",
          difficulty: "easy",
          status: "active",
        });
      }
      // Insert a control row that must NOT be retired.
      await ctx.db.insert("challenges", {
        challengeId: "control-keep-me",
        title: "Keep Me",
        icon: "✅",
        points: 10,
        category: "social",
        difficulty: "easy",
        status: "active",
      });
    });

    await t.mutation(internal.seedChallenges.retireChallengeIds, {});

    const rows = await t.run((ctx) => ctx.db.query("challenges").collect());
    for (const id of RETIRE_IDS) {
      const r = rows.find((x) => x.challengeId === id);
      expect(r?.status, `expected ${id} retired`).toBe("retired");
    }
    const control = rows.find((x) => x.challengeId === "control-keep-me");
    expect(control?.status).toBe("active");
  });

  it("is idempotent — running twice keeps things retired without errors", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "shower-with",
        title: "Shower",
        icon: "🚿",
        points: 100,
        category: "wild",
        difficulty: "wild",
        status: "active",
      });
    });
    await t.mutation(internal.seedChallenges.retireChallengeIds, {});
    await t.mutation(internal.seedChallenges.retireChallengeIds, {});
    const row = await t.run((ctx) =>
      ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", "shower-with"))
        .unique()
    );
    expect(row?.status).toBe("retired");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- convex/seedChallenges.test.ts`
Expected: FAIL on the "retires every id" test — only `gianni-bike` (the current sole id in `idsToRetire`) gets retired; the other 11 stay active.

- [ ] **Step 3: Extend `retireChallengeIds` in `convex/seedChallenges.ts`**

Replace the existing `idsToRetire` array (currently `["gianni-bike"]`) with the full list. Modify `convex/seedChallenges.ts:62-76`:

```ts
export const retireChallengeIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const idsToRetire = [
      "gianni-bike",
      "shower-with",
      "scavenger-hunt",
      "ocean-sunrise",
      "ocean-midnight",
      "swim-up-bar",
      "pinacolada-coconut",
      "tostones",
      "hair-braids",
      "crew-swim-up",
      "matching-dinner",
      "horseback-beach",
    ];
    for (const id of idsToRetire) {
      const existing = await ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", id))
        .unique();
      if (existing && existing.status === "active") {
        await ctx.db.patch(existing._id, { status: "retired" });
      }
    }
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- convex/seedChallenges.test.ts`
Expected: PASS for both tests in the `retireChallengeIds` describe block.

- [ ] **Step 5: Commit**

```bash
git add convex/seedChallenges.ts convex/seedChallenges.test.ts
git commit -m "feat(challenges): extend retireChallengeIds to cull 11 stale entries"
```

---

## Task 2: Test + implement `repriceChallenges`

**Files:**
- Modify: `convex/seedChallenges.ts`
- Modify: `convex/seedChallenges.test.ts`

- [ ] **Step 1: Append the failing test**

Append to `convex/seedChallenges.test.ts`:

```ts
describe("seedChallenges.repriceChallenges", () => {
  it("repriceChallenges sets spanish-convo to 30 and rederives difficulty", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "spanish-convo",
        title: "2-Minute Spanish Conversation",
        icon: "🗣️",
        points: 50,
        category: "local",
        difficulty: "medium",
        status: "active",
      });
    });

    await t.mutation(internal.seedChallenges.repriceChallenges, {});

    const row = await t.run((ctx) =>
      ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", "spanish-convo"))
        .unique()
    );
    expect(row?.points).toBe(30);
    expect(row?.difficulty).toBe("medium"); // 30 → medium per deriveDifficulty
  });

  it("repriceChallenges is a no-op when target id is absent", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(internal.seedChallenges.repriceChallenges, {}),
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- convex/seedChallenges.test.ts`
Expected: FAIL — `internal.seedChallenges.repriceChallenges` is undefined.

- [ ] **Step 3: Implement `repriceChallenges` in `convex/seedChallenges.ts`**

Add a new exported mutation. Place it at the end of `convex/seedChallenges.ts` (after `retireChallengeIds`). Also make sure `deriveDifficulty` is imported — it already is on line 4.

```ts
export const repriceChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const repricings: Array<{ id: string; points: number }> = [
      { id: "spanish-convo", points: 30 },
    ];
    for (const r of repricings) {
      const existing = await ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", r.id))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          points: r.points,
          difficulty: deriveDifficulty(r.points),
        });
      }
    }
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- convex/seedChallenges.test.ts`
Expected: PASS for both tests in the `repriceChallenges` describe block (alongside the still-passing Task 1 tests).

- [ ] **Step 5: Commit**

```bash
git add convex/seedChallenges.ts convex/seedChallenges.test.ts
git commit -m "feat(challenges): add repriceChallenges mutation for spanish-convo"
```

---

## Task 3: Update `SEED_CHALLENGES` data

**Files:**
- Modify: `convex/_seedData/challenges.ts`
- Modify: `convex/seedChallenges.test.ts`

- [ ] **Step 1: Append a data sanity test for SEED_CHALLENGES**

Append to `convex/seedChallenges.test.ts`:

```ts
import { SEED_CHALLENGES } from "./_seedData/challenges";

describe("SEED_CHALLENGES (data sanity)", () => {
  it("contains exactly 52 entries", () => {
    expect(SEED_CHALLENGES.length).toBe(52);
  });

  it("does not contain any retired challengeIds", () => {
    const retiredIds = new Set([
      "gianni-bike",
      "shower-with",
      "scavenger-hunt",
      "ocean-sunrise",
      "ocean-midnight",
      "swim-up-bar",
      "pinacolada-coconut",
      "tostones",
      "hair-braids",
      "crew-swim-up",
      "matching-dinner",
      "horseback-beach",
    ]);
    const seedIds = new Set(SEED_CHALLENGES.map((c) => c.challengeId));
    for (const id of retiredIds) {
      expect(seedIds.has(id), `seed should not include ${id}`).toBe(false);
    }
  });

  it("contains all 8 new challenges with the correct points", () => {
    const expected: Record<string, number> = {
      "fake-proposal": 150,
      "sanatana-shot": 25,
      "julio-tiktok": 35,
      "grumpy-couple-smile": 60,
      "tabo-bar-shot": 60,
      "sports-bar-pool": 15,
      "gym-first": 10,
      "close-sports-bar": 50,
    };
    for (const [id, points] of Object.entries(expected)) {
      const row = SEED_CHALLENGES.find((c) => c.challengeId === id);
      expect(row, `missing ${id}`).toBeDefined();
      expect(row?.points, `wrong points for ${id}`).toBe(points);
    }
  });

  it("has spanish-convo at 30 points (repriced from 50)", () => {
    const row = SEED_CHALLENGES.find((c) => c.challengeId === "spanish-convo");
    expect(row?.points).toBe(30);
  });

  it("has unique challengeIds", () => {
    const ids = SEED_CHALLENGES.map((c) => c.challengeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- convex/seedChallenges.test.ts`
Expected: FAIL on the count test (currently 55, not 52), the "no retired ids" test (the retired ids are still present), the "all 8 new" test (none exist), and the spanish-convo points test (currently 50).

- [ ] **Step 3: Edit `convex/_seedData/challenges.ts`**

Three changes to `SEED_CHALLENGES`:

**a) Remove these 11 entries:**

Delete the lines for `shower-with` (line 46) and `scavenger-hunt` (line 49) from the carried-over block. Delete these from the DR-specific block: `ocean-sunrise` (line 52), `ocean-midnight` (line 53), `swim-up-bar` (line 55), `pinacolada-coconut` (line 57), `tostones` (line 62), `hair-braids` (line 66), `crew-swim-up` (line 68), `matching-dinner` (line 69), `horseback-beach` (line 71).

**b) Reprice `spanish-convo` from 50 to 30:**

Line 59 should change from `points: 50` to `points: 30`.

**c) Append the 8 new challenges in a new trip-specific section:**

After the last DR-specific entry (`every-bar`), add:

```ts
  // ── Trip-specific (added 2026-05-20) ────────────────────────────────
  { challengeId: "fake-proposal", title: "Fake Proposal", icon: "💍", points: 150, category: "wild" },
  { challengeId: "sanatana-shot", title: "Get Sanatana to Do a Shot with You", icon: "🥃", points: 25, category: "social" },
  { challengeId: "julio-tiktok", title: "Get Julio to Make a TikTok with You", icon: "🎬", points: 35, category: "content" },
  { challengeId: "grumpy-couple-smile", title: "Grumpy Couple Smile Together (photo)", icon: "👫", points: 60, category: "social" },
  { challengeId: "tabo-bar-shot", title: "At Tabo, 5+ at the Bar Shot With You", icon: "🍹", points: 60, category: "social" },
  { challengeId: "sports-bar-pool", title: "Challenge a Stranger to Pool (Sports Bar)", icon: "🎱", points: 15, bonus: "+15 if you win", category: "social" },
  { challengeId: "gym-first", title: "First Crew Member to the Gym (per day)", icon: "🏃", points: 10, category: "fitness" },
  { challengeId: "close-sports-bar", title: "Close the Sports Bar", icon: "🍻", points: 50, category: "wild" },
```

After this edit, `SEED_CHALLENGES.length === 52`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- convex/seedChallenges.test.ts`
Expected: PASS for all tests including the 5 new data sanity tests.

- [ ] **Step 5: Run the full Convex test suite for regressions**

Run: `npm test -- convex`
Expected: All tests pass. If `convex/leaderboard.test.ts` or `convex/entries.test.ts` break, it'll be because they reference one of the retired challengeIds — fix by switching the test fixture to a still-active challengeId like `kiss-someone`.

- [ ] **Step 6: Commit**

```bash
git add convex/_seedData/challenges.ts convex/seedChallenges.test.ts
git commit -m "feat(challenges): seed data — add 8, retire 11, reprice spanish-convo"
```

---

## Task 4: Update `src/data/challenges.js` to canonical 52-item list

**Files:**
- Modify: `src/data/challenges.js`

This file feeds the `/styleguide` route only — no live game traffic. The goal is to mirror `SEED_CHALLENGES` so the styleguide shows the same set the live game uses.

- [ ] **Step 1: Replace `CHALLENGES` and `CHALLENGE_CATEGORIES`**

Rewrite `src/data/challenges.js:4-57` (replacing `CHALLENGES` and `CHALLENGE_CATEGORIES`). The file's current `id` (number) scheme is preserved for stability with the styleguide layout — assign sequential numbers 1-52 in this order:

```js
export const CHALLENGES = [
  // Universal (Khari's final list, 32 entries)
  { id: 1, title: "Kiss Someone", icon: "💋", points: 100, category: "social" },
  { id: 2, title: "Sing in Public", icon: "🎤", points: 15, bonus: "+50 crowd, +50 money", category: "wild" },
  { id: 3, title: "Run 1km", icon: "🏃", points: 20, category: "fitness" },
  { id: 4, title: "5 Shots at Once", icon: "🥃", points: 20, category: "drinks" },
  { id: 5, title: "Get Someone to Buy You Drinks", icon: "🍹", points: 5, category: "social" },
  { id: 6, title: "Selfie with Stranger", icon: "🤳", points: 3, category: "social" },
  { id: 7, title: "Selfie with Someone Sleeping", icon: "😴", points: 3, bonus: "+30 get everyone", category: "squad" },
  { id: 8, title: "Wear Someone's Clothes (10 min)", icon: "👕", points: 15, category: "squad" },
  { id: 9, title: "30 Min Gym Workout", icon: "💪", points: 15, category: "fitness" },
  { id: 10, title: "Get Number / Insta / Snap", icon: "📱", points: 5, category: "social" },
  { id: 11, title: "Build Sand Sculpture", icon: "🏖️", points: 30, category: "beach" },
  { id: 12, title: "Stranger Gives You Money", icon: "💸", points: 75, category: "wild" },
  { id: 13, title: "Make a TikTok", icon: "📹", points: 2, category: "content" },
  { id: 14, title: "Stranger Joins TikTok", icon: "🎬", points: 20, category: "content" },
  { id: 15, title: "Cliff Jump", icon: "🪂", points: 100, category: "wild" },
  { id: 16, title: "Find Group Lookalike", icon: "👥", points: 70, category: "squad" },
  { id: 17, title: "Sleep Somewhere Else", icon: "🛏️", points: 100, category: "wild" },
  { id: 18, title: "Receive Compliments", icon: "😊", points: 7, category: "social" },
  { id: 19, title: "Get a Tan", icon: "☀️", points: 1, category: "beach" },
  { id: 20, title: "Hold Hands with Stranger", icon: "🤝", points: 15, category: "social" },
  { id: 21, title: "Down a Drink", icon: "🍺", points: 2, category: "drinks" },
  { id: 22, title: "Shot", icon: "🥂", points: 2, category: "drinks" },
  { id: 23, title: "Play Game with Stranger", icon: "🎲", points: 25, category: "social" },
  { id: 24, title: "Buy Souvenir", icon: "🎁", points: 4, category: "shopping" },
  { id: 25, title: "Matching Outfit Stranger", icon: "👯", points: 15, category: "social" },
  { id: 26, title: "Pic with 5 People 50+", icon: "📸", points: 50, category: "wild" },
  { id: 27, title: "Ask Something Embarrassing", icon: "😳", points: 35, category: "social" },
  { id: 28, title: "Scare Someone in Group", icon: "👻", points: 10, category: "squad" },
  { id: 29, title: "Try Something New", icon: "✨", points: 10, category: "wild" },
  { id: 30, title: "Give Massage", icon: "💆", points: 1, bonus: "per minute", category: "squad" },
  { id: 31, title: "Get a Tattoo", icon: "🖋️", points: 250, category: "wild" },
  { id: 32, title: "All Nighter (until midday)", icon: "🌙", points: 40, category: "wild" },

  // DR-specific (12 kept)
  { id: 33, title: "Mamajuana Shot", icon: "🍶", points: 10, category: "drinks" },
  { id: 34, title: "Try a Presidente", icon: "🍺", points: 2, category: "drinks" },
  { id: 35, title: "Bachata with a Local", icon: "💃", points: 50, category: "social" },
  { id: 36, title: "2-Minute Spanish Conversation", icon: "🗣️", points: 30, category: "local" },
  { id: 37, title: "Order Entirely in Spanish", icon: "🇩🇴", points: 10, category: "local" },
  { id: 38, title: "Eat La Bandera", icon: "🍛", points: 15, category: "food" },
  { id: 39, title: "Smoke a Dominican Cigar", icon: "🚬", points: 15, category: "local" },
  { id: 40, title: "Buy Larimar or Amber", icon: "💎", points: 25, category: "shopping" },
  { id: 41, title: "Negotiate Below 50% of Asking", icon: "🤝", points: 30, category: "shopping" },
  { id: 42, title: "Whole Crew in the Ocean", icon: "🌊", points: 30, category: "squad" },
  { id: 43, title: "Skinny Dip in the Ocean", icon: "🍑", points: 150, category: "wild" },
  { id: 44, title: "Hit Every Resort Bar in One Day", icon: "🍻", points: 50, category: "wild" },

  // Trip-specific (8 new, added 2026-05-20)
  { id: 45, title: "Fake Proposal", icon: "💍", points: 150, category: "wild" },
  { id: 46, title: "Get Sanatana to Do a Shot with You", icon: "🥃", points: 25, category: "social" },
  { id: 47, title: "Get Julio to Make a TikTok with You", icon: "🎬", points: 35, category: "content" },
  { id: 48, title: "Grumpy Couple Smile Together (photo)", icon: "👫", points: 60, category: "social" },
  { id: 49, title: "At Tabo, 5+ at the Bar Shot With You", icon: "🍹", points: 60, category: "social" },
  { id: 50, title: "Challenge a Stranger to Pool (Sports Bar)", icon: "🎱", points: 15, bonus: "+15 if you win", category: "social" },
  { id: 51, title: "First Crew Member to the Gym (per day)", icon: "🏃", points: 10, category: "fitness" },
  { id: 52, title: "Close the Sports Bar", icon: "🍻", points: 50, category: "wild" },
];

export const NEGATIVE_POINTS = [
  { action: "Throwing up", points: -50, icon: "🤮" },
  { action: "Going to bed before 11pm", points: -40, icon: "😴" },
  { action: "Debating chosen drinks", points: -10, icon: "🙄" },
  { action: "First to go to bed", points: -30, icon: "💤" },
  { action: "Forgot sunscreen (lobster mode)", points: -15, icon: "🦞" },
  { action: "Lost the all-inclusive bracelet", points: -20, icon: "📛" },
];

export const CHALLENGE_CATEGORIES = [
  { id: "social", label: "Social", icon: "🤝", blurb: "Win over strangers." },
  { id: "drinks", label: "Drinks", icon: "🍻", blurb: "Bar-side bravery." },
  { id: "fitness", label: "Fitness", icon: "💪", blurb: "Earn it physically." },
  { id: "content", label: "Content", icon: "📹", blurb: "Camera ready." },
  { id: "wild", label: "Wild", icon: "🔥", blurb: "High stakes only." },
  { id: "squad", label: "Squad", icon: "👯", blurb: "With the crew." },
  { id: "chill", label: "Chill", icon: "🌴", blurb: "Easy points." },
  { id: "beach", label: "Beach", icon: "🏖️", blurb: "Sand, sun, salt." },
  { id: "shopping", label: "Shopping", icon: "🛍️", blurb: "Score the swag." },
  { id: "local", label: "Local", icon: "🇩🇴", blurb: "Dominican texture." },
  { id: "food", label: "Food", icon: "🍴", blurb: "Eat the island." },
];
```

Leave the bottom of the file (`challengesByCategory` function and `export { FORFEITS, FORFEIT_LABELS } from "./forfeits.js"`) unchanged.

- [ ] **Step 2: Run the dev server and visit the styleguide**

```bash
npm run dev
```

Open `http://localhost:5173/styleguide` and confirm:
- All 52 challenges render as cards.
- The 4 new categories (`beach`, `shopping`, `local`, `food`) show with their labels and blurbs.
- No category renders as "unknown" (i.e. every challenge maps to a defined category).

Stop the dev server (Ctrl-C).

- [ ] **Step 3: Run tests for regressions**

Run: `npm test`
Expected: All tests pass. (No tests reference `src/data/challenges.js` directly, but a regression here would be a typo or trailing-comma syntax error that breaks compilation.)

- [ ] **Step 4: Commit**

```bash
git add src/data/challenges.js
git commit -m "feat(challenges): sync styleguide data to canonical 52-item list"
```

---

## Task 5: Sync `src/routes/HomePage.jsx` inline arrays

**Files:**
- Modify: `src/routes/HomePage.jsx`

The marketing page has three inline arrays at lines 83-133: `CHALLENGES` (34 entries), `NEGATIVE_POINTS` (4 entries with drifted text), and `FORFEITS` (14 entries with drifted text). All three need to mirror the canonical list.

- [ ] **Step 1: Replace inline `CHALLENGES` (lines 83-118)**

Replace the existing `CHALLENGES` array with the same 52-item list used in Task 4 (just without the `category` field, since HomePage doesn't use it). Keep numeric `id` sequence 1-52, same titles/icons/points/bonuses.

```js
const CHALLENGES = [
  { id: 1, title: "Kiss Someone", icon: "💋", points: 100 },
  { id: 2, title: "Sing in Public", icon: "🎤", points: 15, bonus: "+50 crowd, +50 money" },
  { id: 3, title: "Run 1km", icon: "🏃", points: 20 },
  { id: 4, title: "5 Shots at Once", icon: "🥃", points: 20 },
  { id: 5, title: "Get Someone to Buy You Drinks", icon: "🍹", points: 5 },
  { id: 6, title: "Selfie with Stranger", icon: "🤳", points: 3 },
  { id: 7, title: "Selfie with Someone Sleeping", icon: "😴", points: 3, bonus: "+30 get everyone" },
  { id: 8, title: "Wear Someone's Clothes (10 min)", icon: "👕", points: 15 },
  { id: 9, title: "30 Min Gym Workout", icon: "💪", points: 15 },
  { id: 10, title: "Get Number / Insta / Snap", icon: "📱", points: 5 },
  { id: 11, title: "Build Sand Sculpture", icon: "🏖️", points: 30 },
  { id: 12, title: "Stranger Gives You Money", icon: "💸", points: 75 },
  { id: 13, title: "Make a TikTok", icon: "📹", points: 2 },
  { id: 14, title: "Stranger Joins TikTok", icon: "🎬", points: 20 },
  { id: 15, title: "Cliff Jump", icon: "🪂", points: 100 },
  { id: 16, title: "Find Group Lookalike", icon: "👥", points: 70 },
  { id: 17, title: "Sleep Somewhere Else", icon: "🛏️", points: 100 },
  { id: 18, title: "Receive Compliments", icon: "😊", points: 7 },
  { id: 19, title: "Get a Tan", icon: "☀️", points: 1 },
  { id: 20, title: "Hold Hands with Stranger", icon: "🤝", points: 15 },
  { id: 21, title: "Down a Drink", icon: "🍺", points: 2 },
  { id: 22, title: "Shot", icon: "🥂", points: 2 },
  { id: 23, title: "Play Game with Stranger", icon: "🎲", points: 25 },
  { id: 24, title: "Buy Souvenir", icon: "🎁", points: 4 },
  { id: 25, title: "Matching Outfit Stranger", icon: "👯", points: 15 },
  { id: 26, title: "Pic with 5 People 50+", icon: "📸", points: 50 },
  { id: 27, title: "Ask Something Embarrassing", icon: "😳", points: 35 },
  { id: 28, title: "Scare Someone in Group", icon: "👻", points: 10 },
  { id: 29, title: "Try Something New", icon: "✨", points: 10 },
  { id: 30, title: "Give Massage", icon: "💆", points: 1, bonus: "per minute" },
  { id: 31, title: "Get a Tattoo", icon: "🖋️", points: 250 },
  { id: 32, title: "All Nighter (until midday)", icon: "🌙", points: 40 },
  { id: 33, title: "Mamajuana Shot", icon: "🍶", points: 10 },
  { id: 34, title: "Try a Presidente", icon: "🍺", points: 2 },
  { id: 35, title: "Bachata with a Local", icon: "💃", points: 50 },
  { id: 36, title: "2-Minute Spanish Conversation", icon: "🗣️", points: 30 },
  { id: 37, title: "Order Entirely in Spanish", icon: "🇩🇴", points: 10 },
  { id: 38, title: "Eat La Bandera", icon: "🍛", points: 15 },
  { id: 39, title: "Smoke a Dominican Cigar", icon: "🚬", points: 15 },
  { id: 40, title: "Buy Larimar or Amber", icon: "💎", points: 25 },
  { id: 41, title: "Negotiate Below 50% of Asking", icon: "🤝", points: 30 },
  { id: 42, title: "Whole Crew in the Ocean", icon: "🌊", points: 30 },
  { id: 43, title: "Skinny Dip in the Ocean", icon: "🍑", points: 150 },
  { id: 44, title: "Hit Every Resort Bar in One Day", icon: "🍻", points: 50 },
  { id: 45, title: "Fake Proposal", icon: "💍", points: 150 },
  { id: 46, title: "Get Sanatana to Do a Shot with You", icon: "🥃", points: 25 },
  { id: 47, title: "Get Julio to Make a TikTok with You", icon: "🎬", points: 35 },
  { id: 48, title: "Grumpy Couple Smile Together (photo)", icon: "👫", points: 60 },
  { id: 49, title: "At Tabo, 5+ at the Bar Shot With You", icon: "🍹", points: 60 },
  { id: 50, title: "Challenge a Stranger to Pool (Sports Bar)", icon: "🎱", points: 15, bonus: "+15 if you win" },
  { id: 51, title: "First Crew Member to the Gym (per day)", icon: "🏃", points: 10 },
  { id: 52, title: "Close the Sports Bar", icon: "🍻", points: 50 },
];
```

- [ ] **Step 2: Replace inline `NEGATIVE_POINTS` (lines 120-125)**

Sync text to the canonical version (currently "before 12" → should be "before 11pm"; "First to go bed" → "First to go to bed"; also add the two extra negatives so the marketing page matches the game):

```js
const NEGATIVE_POINTS = [
  { action: "Throwing up", points: -50, icon: "🤮" },
  { action: "Going to bed before 11pm", points: -40, icon: "😴" },
  { action: "Debating chosen drinks", points: -10, icon: "🙄" },
  { action: "First to go to bed", points: -30, icon: "💤" },
  { action: "Forgot sunscreen (lobster mode)", points: -15, icon: "🦞" },
  { action: "Lost the all-inclusive bracelet", points: -20, icon: "📛" },
];
```

- [ ] **Step 3: Replace inline `FORFEITS` (lines 127-133)**

Sync to the canonical `FORFEIT_LABELS` from `src/data/forfeits.js` (note: current HomePage strings drift — "Run naked around villa" should be "Run naked round the hotel", "Eat chili" should be "Eat a chili whole", "Waterboarded" should be "Waterboarded (10 sec)", "Opposite sex underwear" should be "Opposite sex underwear"):

```js
const FORFEITS = [
  "Skinny dipping", "Run naked round the hotel", "Jump in the pool fully clothed",
  "Wax", "Eat a chili whole", "Spanked by everyone", "Waterboarded (10 sec)",
  "Cold shower (1 min)", "Deduct points from someone", "90 second plank",
  "Opposite sex underwear", "21 questions hot seat", "Streaking at the beach",
  "Coin flip — double or nothing",
];
```

- [ ] **Step 4: Run the dev server and visit the home page**

```bash
npm run dev
```

Open `http://localhost:5173/` and scroll to the Challenges section. Confirm:
- 52 challenge cards render in the grid.
- The negative points list shows 6 entries with the canonical text.
- The forfeits list shows 14 entries with the canonical text.
- Layout doesn't blow up with the longer list (grid auto-wraps).

Stop the dev server (Ctrl-C).

- [ ] **Step 5: Run tests for regressions**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/routes/HomePage.jsx
git commit -m "feat(challenges): sync HomePage to canonical 52 challenges + negatives + forfeits"
```

---

## Task 6: Production deployment + migration

> **Halt before this task and confirm with Khari.** This task touches the live production Convex deployment (`limitless-peacock-239`) and the live Vercel site. Do not run migration mutations without explicit go-ahead. The trip's competitive phase has not started (`gameState.gamesLive` is `false`), so the blast radius is contained, but this is still real production state.

**Files:** None modified. Operational steps only.

- [ ] **Step 1: Push the branch and verify CI**

```bash
git push origin main
```

Watch GitHub Actions / Vercel build until both go green. The Vercel frontend will deploy with the updated `src/data/challenges.js` and `src/routes/HomePage.jsx`. The Convex functions deploy when `npx convex deploy` runs (next step) or via the linked auto-deploy if configured.

- [ ] **Step 2: Deploy Convex functions to production**

```bash
npx convex deploy
```

Expected: Success. The `seedChallenges`, `retireChallengeIds`, and new `repriceChallenges` mutations are now available on prod. The challenges DB state hasn't changed yet — only the function code.

- [ ] **Step 3: Run `retireChallengeIds` against production**

```bash
npx convex run --prod seedChallenges:retireChallengeIds
```

Expected: Success (no output). This retires the 11 stale entries plus `gianni-bike` (no-op since already retired).

Verify via the Convex dashboard or:

```bash
npx convex run --prod challenges:listActive
```

Expected: List length drops to 44 (55 − 11 retirements), and none of the retired ids appear.

- [ ] **Step 4: Run `repriceChallenges` against production**

```bash
npx convex run --prod seedChallenges:repriceChallenges
```

Expected: Success. `spanish-convo.points` is now 30, `difficulty` is `"medium"`.

Verify:

```bash
npx convex run --prod challenges:listActive
```

Look for `spanish-convo` in the output; confirm `points: 30`.

- [ ] **Step 5: Run `seedChallenges` against production to insert the 8 new entries**

```bash
npx convex run --prod seedChallenges:seedChallenges
```

Expected: Success. The 8 new entries (`fake-proposal`, `sanatana-shot`, `julio-tiktok`, `grumpy-couple-smile`, `tabo-bar-shot`, `sports-bar-pool`, `gym-first`, `close-sports-bar`) are inserted. Existing 44 active rows are untouched (insert-if-not-exists).

Verify:

```bash
npx convex run --prod challenges:listActive
```

Expected: List length is now 52.

- [ ] **Step 6: Live smoke test**

In a browser, visit (as an authenticated player):

- `https://dr-babyyy.vercel.app/` — confirm marketing page shows 52 challenges, 6 negatives, 14 forfeits.
- `https://dr-babyyy.vercel.app/styleguide` — confirm 52 challenges render with the 4 new categories.
- `https://dr-babyyy.vercel.app/player/khari?tab=challenges` — confirm the live game shows 52 challenges, with the 8 new ones present and `spanish-convo` at 30 points. Spot-check no retired ids appear (`shower-with`, `scavenger-hunt`, etc.).

- [ ] **Step 7: No commit needed — this task is operational**

If anything in the smoke test surfaces issues, address them as a follow-up commit on `main` rather than rolling back the migration (the data state is already correct).

---

## Self-Review Notes

**Spec coverage check:**
- §3.1 (8 additions) → Task 3 step 3c (seed data) + Task 4 (styleguide) + Task 5 (HomePage).
- §3.2 (11 retirements) → Task 1 (mutation) + Task 3 step 3a (seed data removal).
- §3.3 (spanish-convo reprice) → Task 2 (mutation) + Task 3 step 3b (seed data).
- §3.4-3.6 (kept lists, no-op negatives) → covered implicitly by Task 3 leaving them in.
- §4.1 (`_seedData/challenges.ts` changes) → Task 3.
- §4.2 (`seedChallenges.ts` migrations) → Tasks 1 + 2.
- §4.3 (`src/data/challenges.js`) → Task 4.
- §4.4 (`HomePage.jsx`) → Task 5.
- §4.5 (migration sequence) → Task 6.
- §6 risks: Task 3 step 5 (regression hunt for tests referencing retired ids), Task 6 step 3+4+5 verifications, Task 5 step 4 visual check covers HomePage layout risk.

**Naming consistency:**
- `retireChallengeIds`, `repriceChallenges`, `seedChallenges` — used identically in mutation definitions and CLI invocations.
- `idsToRetire` is the array name in both the test and the implementation.
- challengeIds (`fake-proposal`, `sanatana-shot`, etc.) used identically across seed, styleguide, and tests.

**Placeholder scan:** None. Every step contains the exact code or command.
