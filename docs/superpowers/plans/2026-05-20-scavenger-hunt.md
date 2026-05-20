# Scavenger Hunt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an open photo-evidence scavenger hunt that feeds the existing leaderboard, with admin post-hoc review and a 1st/2nd-finder order bonus.

**Architecture:** Extend the existing `entries` table with three optional fields (`scavengerItemId`, `photoStorageId`, `scavengerRank`) and add `"scavenger"` to the type union. Two new Convex mutations (`claimScavenger`, `rejectScavenger`), three new queries (`getMyFinds`, `getItemFinders`, plus extended `getRecentActivity`), six new React components, and wiring into `PlayerGamesPage` (tab) and `AdminPage` (review queue). Photos live in Convex's built-in `_storage`.

**Tech Stack:** Convex (backend + storage + reactive queries), React 18 + React Router, Vite, vitest + convex-test, design tokens from `src/data/design.js`.

**Spec:** `docs/superpowers/specs/2026-05-20-scavenger-hunt-design.md`.

---

## File map

**Created:**
- `convex/scavenger.ts` — new queries (`getMyFinds`, `getItemFinders`) + storage URL mutation
- `convex/scavenger.test.ts` — tests for the new queries
- `src/components/GamesTabBar.jsx` — tab switcher between Challenges and Scavenger
- `src/components/ScavengerSection.jsx` — main scavenger view
- `src/components/ScavengerCard.jsx` — individual item tile
- `src/components/ScavengerClaimSheet.jsx` — photo upload BottomSheet
- `src/components/PhotoLightbox.jsx` — full-screen photo viewer
- `src/components/AdminScavengerQueue.jsx` — admin review list
- `src/lib/compressImage.js` — client-side canvas compression utility

**Modified:**
- `convex/schema.ts` — extend `entries` table + new index
- `convex/entries.ts` — add `claimScavenger` and `rejectScavenger` mutations
- `convex/entries.test.ts` — tests for new mutations
- `convex/leaderboard.ts` — extend `getRecentActivity` resolver to handle scavenger entries
- `src/data/scavenger.js` — add `difficulty` + `points` to each of the 29 items
- `src/routes/PlayerGamesPage.jsx` — mount `GamesTabBar`, switch between sections by `?tab=`
- `src/routes/AdminPage.jsx` — mount `AdminScavengerQueue` section
- `src/components/EntryRow.jsx` — render photo thumbnail when entry type is `"scavenger"`

---

## Task 1: Extend `entries` schema

**Files:**
- Modify: `convex/schema.ts:38-58` (entries table)

- [ ] **Step 1: Edit `convex/schema.ts` — extend `type` union and add three optional fields + one index**

Locate the `entries: defineTable({` block and update it to:

```ts
  entries: defineTable({
    type: v.union(
      v.literal("challenge"),
      v.literal("negative"),
      v.literal("scavenger"),
    ),
    subjectSlug: v.string(),
    appliedBySlug: v.optional(v.string()),
    challengeId: v.optional(v.string()),
    negativeId: v.optional(v.string()),
    points: v.number(),
    bonusKey: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("verified"), v.literal("disputed")),
    vouchCount: v.number(),
    disputeCount: v.number(),
    dailyKey: v.string(),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    scavengerItemId: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    scavengerRank: v.optional(v.number()),
  })
    .index("by_subject", ["subjectSlug"])
    .index("by_daily_key", ["dailyKey"])
    .index("by_status", ["status"])
    .index("by_subject_and_daily_key", ["subjectSlug", "dailyKey"])
    .index("by_scavenger_item", ["scavengerItemId"]),
```

- [ ] **Step 2: Run typecheck / convex codegen**

Run: `npx convex dev --once`
Expected: regenerates `convex/_generated/*`, no schema errors.

- [ ] **Step 3: Run the existing test suite to confirm no regressions**

Run: `npm test`
Expected: all existing tests pass (none touch the new fields yet).

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(scavenger): extend entries schema with photo + rank fields"
```

---

## Task 2: Add difficulty + points to seed items

**Files:**
- Modify: `src/data/scavenger.js`

- [ ] **Step 1: Replace the `SCAVENGER_ITEMS` export with tier-tagged entries**

```js
export const SCAVENGER_ITEMS = [
  // Food
  { id: "coconut", category: "food", name: "Coconut still on the tree", icon: "🥥", difficulty: "easy", points: 5 },
  { id: "mango-stand", category: "food", name: "Fresh mango from a stand", icon: "🥭", difficulty: "easy", points: 5 },
  { id: "tostones", category: "food", name: "Tostones (fried plantain)", icon: "🍌", difficulty: "easy", points: 5 },
  { id: "presidente", category: "food", name: "Ice-cold Presidente beer", icon: "🍺", difficulty: "easy", points: 5 },
  { id: "mamajuana", category: "food", name: "Bottle of Mamajuana", icon: "🍶", difficulty: "medium", points: 10 },
  { id: "conch-fritter", category: "food", name: "Conch fritter", icon: "🦞", difficulty: "medium", points: 10 },
  { id: "tres-leches", category: "food", name: "Tres leches dessert", icon: "🍰", difficulty: "medium", points: 10 },
  { id: "rum-coconut", category: "food", name: "Rum poured into a coconut", icon: "🍹", difficulty: "medium", points: 10 },

  // Plant
  { id: "royal-palm", category: "plant", name: "Royal palm", icon: "🌴", difficulty: "easy", points: 5 },
  { id: "hibiscus", category: "plant", name: "Hibiscus flower", icon: "🌺", difficulty: "easy", points: 5 },
  { id: "banana-plant", category: "plant", name: "Banana plant", icon: "🍃", difficulty: "easy", points: 5 },
  { id: "bird-of-paradise", category: "plant", name: "Bird of paradise", icon: "🌸", difficulty: "medium", points: 10 },
  { id: "sea-grape", category: "plant", name: "Sea grape", icon: "🍇", difficulty: "medium", points: 10 },
  { id: "bromeliad", category: "plant", name: "Bromeliad in bloom", icon: "🌷", difficulty: "medium", points: 10 },
  { id: "cactus-fruit", category: "plant", name: "Cactus with fruit", icon: "🌵", difficulty: "wild", points: 20 },

  // Animal
  { id: "iguana", category: "animal", name: "Iguana sunbathing", icon: "🦎", difficulty: "easy", points: 5 },
  { id: "crab", category: "animal", name: "Crab on the beach", icon: "🦀", difficulty: "easy", points: 5 },
  { id: "stray-cat", category: "animal", name: "Stray cat with attitude", icon: "🐈", difficulty: "easy", points: 5 },
  { id: "pelican", category: "animal", name: "Pelican mid-dive", icon: "🐦", difficulty: "medium", points: 10 },
  { id: "tropical-fish", category: "animal", name: "Tropical fish (snorkel)", icon: "🐠", difficulty: "medium", points: 10 },
  { id: "hummingbird", category: "animal", name: "Hummingbird", icon: "🦜", difficulty: "medium", points: 10 },
  { id: "starfish", category: "animal", name: "Starfish (Saona Island)", icon: "⭐", difficulty: "wild", points: 20 },

  // Object
  { id: "peso", category: "object", name: "Dominican peso bill", icon: "💵", difficulty: "easy", points: 5 },
  { id: "conch-shell", category: "object", name: "Whole conch shell", icon: "🐚", difficulty: "medium", points: 10 },
  { id: "cigar", category: "object", name: "Hand-rolled cigar", icon: "🚬", difficulty: "medium", points: 10 },
  { id: "maracas", category: "object", name: "Pair of maracas", icon: "🪇", difficulty: "medium", points: 10 },
  { id: "domino", category: "object", name: "Old domino tile", icon: "🁫", difficulty: "wild", points: 20 },
  { id: "live-bachata", category: "object", name: "Live bachata band", icon: "🎶", difficulty: "wild", points: 20 },
  { id: "sand-dollar", category: "object", name: "Sand dollar", icon: "🪙", difficulty: "wild", points: 20 },
];
```

- [ ] **Step 2: Add an `itemById` helper export at the bottom of the file**

```js
const ITEM_INDEX = new Map(SCAVENGER_ITEMS.map((i) => [i.id, i]));
export function itemById(id) {
  return ITEM_INDEX.get(id);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/data/scavenger.js
git commit -m "feat(scavenger): tier + point values on 29 seed items"
```

---

## Task 3: `entries.claimScavenger` mutation — failing test

**Files:**
- Modify: `convex/entries.test.ts`

- [ ] **Step 1: Add a helper to insert scavenger gameState/session, then write the first failing test**

Append to `convex/entries.test.ts`:

```ts
describe("entries.claimScavenger", () => {
  it("inserts an entry with rank=1 and +5 bonus on first claim", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);

    const storageId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(["x"], { type: "image/jpeg" }));
    });

    await t.mutation(api.entries.claimScavenger, {
      token: "tok-kai",
      scavengerItemId: "coconut",
      photoStorageId: storageId,
    });

    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("scavenger");
    expect(rows[0].subjectSlug).toBe("kai");
    expect(rows[0].scavengerItemId).toBe("coconut");
    expect(rows[0].scavengerRank).toBe(1);
    expect(rows[0].points).toBe(10); // 5 base + 5 first-finder bonus
    expect(rows[0].status).toBe("active");
    expect(rows[0].photoStorageId).toBe(storageId);
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

Run: `npm test -- entries.test.ts -t "claimScavenger"`
Expected: FAIL with "api.entries.claimScavenger is not a function" or similar.

---

## Task 4: `entries.claimScavenger` mutation — minimal implementation

**Files:**
- Modify: `convex/entries.ts`

- [ ] **Step 1: Add the mutation at the bottom of `convex/entries.ts`**

```ts
import { SCAVENGER_ITEMS } from "../src/data/scavenger.js";

const SCAVENGER_BONUS = { 1: 5, 2: 3, 3: 0 } as const;

function scavengerItemById(id: string) {
  return SCAVENGER_ITEMS.find((i) => i.id === id);
}

export const claimScavenger = mutation({
  args: {
    token: v.string(),
    scavengerItemId: v.string(),
    photoStorageId: v.id("_storage"),
  },
  handler: async (ctx, { token, scavengerItemId, photoStorageId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const state = await getGameState(ctx);
    if (!state?.gamesLive) throw new Error("games not live");

    const item = scavengerItemById(scavengerItemId);
    if (!item) throw new Error("unknown item");

    const existingActive = await ctx.db
      .query("entries")
      .withIndex("by_scavenger_item", (q) => q.eq("scavengerItemId", scavengerItemId))
      .collect();

    const mineActive = existingActive.find(
      (e) => e.subjectSlug === playerSlug && e.status !== "disputed",
    );
    if (mineActive) throw new Error("already claimed");

    const validCount = existingActive.filter((e) => e.status !== "disputed").length;
    const rank = Math.min(validCount + 1, 3);
    const bonus = SCAVENGER_BONUS[rank as 1 | 2 | 3];

    await ctx.db.insert("entries", {
      type: "scavenger",
      subjectSlug: playerSlug,
      points: item.points + bonus,
      status: "active",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
      scavengerItemId,
      photoStorageId,
      scavengerRank: rank,
    });
  },
});
```

- [ ] **Step 2: Run the test — expect pass**

Run: `npm test -- entries.test.ts -t "claimScavenger"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "feat(scavenger): claimScavenger mutation with 1st-finder bonus"
```

---

## Task 5: `claimScavenger` — rank 2 and rank 3 paths

**Files:**
- Modify: `convex/entries.test.ts`

- [ ] **Step 1: Add tests for 2nd and 3rd+ finders**

Inside the existing `describe("entries.claimScavenger", ...)` block, append:

```ts
  it("gives rank=2 with +3 bonus to the second finder", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedGameLive(t);
    const sid1 = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));
    const sid2 = await t.run((ctx) => ctx.storage.store(new Blob(["b"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid1 });
    await t.mutation(api.entries.claimScavenger, { token: "tok-khari", scavengerItemId: "coconut", photoStorageId: sid2 });

    const rows = await t.run((ctx) =>
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", "khari")).collect(),
    );
    expect(rows[0].scavengerRank).toBe(2);
    expect(rows[0].points).toBe(8); // 5 + 3
  });

  it("gives rank=3 with no bonus to the third+ finder", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedSession(t, "adan", "tok-adan");
    await seedGameLive(t);
    const sid = () => t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-khari", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-adan", scavengerItemId: "coconut", photoStorageId: await sid() });

    const rows = await t.run((ctx) =>
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", "adan")).collect(),
    );
    expect(rows[0].scavengerRank).toBe(3);
    expect(rows[0].points).toBe(5); // base only
  });

  it("rejects duplicate active claim by the same player", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid });
    await expect(
      t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid }),
    ).rejects.toThrow("already claimed");
  });

  it("rejects when games are not live", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: false, currentDayNumber: 0, currentDailyKey: "pre-trip", updatedAt: Date.now(),
      });
    });
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid }),
    ).rejects.toThrow("games not live");
  });

  it("rejects unknown item id", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "no-such-thing", photoStorageId: sid }),
    ).rejects.toThrow("unknown item");
  });
```

- [ ] **Step 2: Run tests — all should pass against the implementation from Task 4**

Run: `npm test -- entries.test.ts -t "claimScavenger"`
Expected: all 5 tests in the describe block pass.

- [ ] **Step 3: Commit**

```bash
git add convex/entries.test.ts
git commit -m "test(scavenger): cover rank 2/3 + duplicate + gate + unknown item"
```

---

## Task 6: `entries.rejectScavenger` — failing test for slide-up

**Files:**
- Modify: `convex/entries.test.ts`

- [ ] **Step 1: Add a new describe block testing the slide-up behaviour**

```ts
describe("entries.rejectScavenger", () => {
  it("disputes the entry and slides later finders up one rank", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedSession(t, "adan", "tok-adan");
    await seedGameLive(t);
    // Make Khari (the rejecter) an admin.
    await t.run(async (ctx) => {
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
    });

    const sid = () => t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-khari", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-adan", scavengerItemId: "coconut", photoStorageId: await sid() });

    const kaiEntry = await t.run((ctx) =>
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", "kai")).first(),
    );
    expect(kaiEntry).not.toBeNull();

    await t.mutation(api.entries.rejectScavenger, {
      token: "tok-khari",
      entryId: kaiEntry!._id,
    });

    const all = await t.run((ctx) => ctx.db.query("entries").collect());
    const kaiAfter = all.find((e) => e.subjectSlug === "kai");
    const khariAfter = all.find((e) => e.subjectSlug === "khari");
    const adanAfter = all.find((e) => e.subjectSlug === "adan");

    expect(kaiAfter!.status).toBe("disputed");
    // Khari was rank 2 → slides up to rank 1, points 5 + 5 = 10.
    expect(khariAfter!.scavengerRank).toBe(1);
    expect(khariAfter!.points).toBe(10);
    // Adan was rank 3 → slides up to rank 2, points 5 + 3 = 8.
    expect(adanAfter!.scavengerRank).toBe(2);
    expect(adanAfter!.points).toBe(8);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm test -- entries.test.ts -t "rejectScavenger"`
Expected: FAIL with "api.entries.rejectScavenger is not a function".

---

## Task 7: `entries.rejectScavenger` — implementation

**Files:**
- Modify: `convex/entries.ts`

- [ ] **Step 1: Append the mutation below `claimScavenger`**

```ts
export const rejectScavenger = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);

    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.type !== "scavenger") throw new Error("not a scavenger entry");
    if (entry.status === "disputed") throw new Error("already rejected");
    if (!entry.scavengerItemId) throw new Error("entry missing scavengerItemId");

    await ctx.db.patch(entryId, { status: "disputed", resolvedAt: Date.now() });

    const item = scavengerItemById(entry.scavengerItemId);
    if (!item) return;

    const laterActive = await ctx.db
      .query("entries")
      .withIndex("by_scavenger_item", (q) => q.eq("scavengerItemId", entry.scavengerItemId))
      .collect();

    const toSlide = laterActive
      .filter((e) => e.status !== "disputed" && e._id !== entryId && e.createdAt > entry.createdAt)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const e of toSlide) {
      const oldRank = e.scavengerRank ?? 3;
      const newRank = Math.max(1, Math.min(3, oldRank - 1));
      if (newRank !== oldRank) {
        const newBonus = SCAVENGER_BONUS[newRank as 1 | 2 | 3];
        await ctx.db.patch(e._id, {
          scavengerRank: newRank,
          points: item.points + newBonus,
        });
      }
    }
  },
});
```

- [ ] **Step 2: Run the rejectScavenger test — expect pass**

Run: `npm test -- entries.test.ts -t "rejectScavenger"`
Expected: PASS.

- [ ] **Step 3: Run the full test suite for regressions**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "feat(scavenger): rejectScavenger mutation with slide-up rerank"
```

---

## Task 8: Scavenger queries — `getMyFinds`, `getItemFinders`, upload URL

**Files:**
- Create: `convex/scavenger.ts`
- Create: `convex/scavenger.test.ts`

- [ ] **Step 1: Write the failing test file**

```ts
// convex/scavenger.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seed(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug: "kai", passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: "kai", token: "tok", createdAt: Date.now() });
    await ctx.db.insert("gameState", {
      gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
    });
  });
}

describe("scavenger.getMyFinds", () => {
  it("returns only the requesting player's scavenger entries", async () => {
    const t = convexTest(schema);
    await seed(t);
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok", scavengerItemId: "coconut", photoStorageId: sid });
    const rows = await t.query(api.scavenger.getMyFinds, { token: "tok" });
    expect(rows.length).toBe(1);
    expect(rows[0].scavengerItemId).toBe("coconut");
  });
});

describe("scavenger.getItemFinders", () => {
  it("returns active finders for an item in creation order with photo urls", async () => {
    const t = convexTest(schema);
    await seed(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok2", createdAt: Date.now() });
    });
    const sid1 = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));
    const sid2 = await t.run((ctx) => ctx.storage.store(new Blob(["b"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok", scavengerItemId: "coconut", photoStorageId: sid1 });
    await t.mutation(api.entries.claimScavenger, { token: "tok2", scavengerItemId: "coconut", photoStorageId: sid2 });
    const finders = await t.query(api.scavenger.getItemFinders, { scavengerItemId: "coconut" });
    expect(finders.length).toBe(2);
    expect(finders[0].subjectSlug).toBe("kai");
    expect(finders[1].subjectSlug).toBe("khari");
    expect(finders[0].photoUrl).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- scavenger.test.ts`
Expected: FAIL with "api.scavenger is not a function" / module not found.

- [ ] **Step 3: Create `convex/scavenger.ts`**

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireSession(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMyFinds = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const rows = await ctx.db
      .query("entries")
      .withIndex("by_subject", (q) => q.eq("subjectSlug", playerSlug))
      .collect();
    return rows.filter((r) => r.type === "scavenger");
  },
});

export const getItemFinders = query({
  args: { scavengerItemId: v.string() },
  handler: async (ctx, { scavengerItemId }) => {
    const rows = await ctx.db
      .query("entries")
      .withIndex("by_scavenger_item", (q) => q.eq("scavengerItemId", scavengerItemId))
      .collect();
    const active = rows
      .filter((r) => r.status !== "disputed")
      .sort((a, b) => a.createdAt - b.createdAt);
    return await Promise.all(active.map(async (e) => ({
      _id: e._id,
      subjectSlug: e.subjectSlug,
      scavengerRank: e.scavengerRank,
      createdAt: e.createdAt,
      photoUrl: e.photoStorageId ? await ctx.storage.getUrl(e.photoStorageId) : null,
    })));
  },
});
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test -- scavenger.test.ts`
Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/scavenger.ts convex/scavenger.test.ts convex/_generated
git commit -m "feat(scavenger): getMyFinds + getItemFinders queries + upload url"
```

---

## Task 9: Extend `leaderboard.getRecentActivity` for scavenger labels

**Files:**
- Modify: `convex/leaderboard.ts` (around line 60–85 where label/labelIcon are resolved)

- [ ] **Step 1: Add scavenger import + branch in the resolver loop**

At the top of `convex/leaderboard.ts`, add:

```ts
import { SCAVENGER_ITEMS } from "../src/data/scavenger.js";
```

Then locate the existing block that fills `label`/`labelIcon` based on `e.type`. It currently looks like:

```ts
let label = "";
let labelIcon = "";
if (e.type === "challenge") {
  const challenge = challenges.find((c) => c.challengeId === e.challengeId);
  label = challenge?.title ?? e.challengeId;
  labelIcon = challenge?.icon ?? "";
} else {
  const neg = NEGATIVE_POINTS.find((n) => n.id === e.negativeId);
  label = neg?.action ?? e.negativeId;
  labelIcon = neg?.icon ?? "";
}
return { ...e, myReaction, label, labelIcon };
```

Replace with:

```ts
let label = "";
let labelIcon = "";
let photoUrl: string | null = null;
if (e.type === "challenge") {
  const challenge = challenges.find((c) => c.challengeId === e.challengeId);
  label = challenge?.title ?? e.challengeId ?? "";
  labelIcon = challenge?.icon ?? "";
} else if (e.type === "scavenger") {
  const item = SCAVENGER_ITEMS.find((i) => i.id === e.scavengerItemId);
  label = item?.name ?? e.scavengerItemId ?? "";
  labelIcon = item?.icon ?? "";
  if (e.photoStorageId) photoUrl = await ctx.storage.getUrl(e.photoStorageId);
} else {
  const neg = NEGATIVE_POINTS.find((n) => n.id === e.negativeId);
  label = neg?.action ?? e.negativeId ?? "";
  labelIcon = neg?.icon ?? "";
}
return { ...e, myReaction, label, labelIcon, photoUrl };
```

(If the surrounding function is not `async`, mark it `async`. If `map` is used, swap to `Promise.all(rows.map(async (e) => …))`.)

- [ ] **Step 2: Run the existing leaderboard tests**

Run: `npm test -- leaderboard.test.ts`
Expected: all existing tests still pass (the new branch is additive).

- [ ] **Step 3: Commit**

```bash
git add convex/leaderboard.ts
git commit -m "feat(scavenger): resolve label + photoUrl in getRecentActivity"
```

---

## Task 10: Photo compression utility

**Files:**
- Create: `src/lib/compressImage.js`

- [ ] **Step 1: Write the utility**

```js
// Resize a File/Blob to at most maxEdge px on its longest side and re-encode
// as JPEG at ~0.8 quality. Returns a Blob ready to upload.
export async function compressImage(file, maxEdge = 1280, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      quality,
    );
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/compressImage.js
git commit -m "feat(scavenger): client-side image compression util"
```

---

## Task 11: `PhotoLightbox` component

**Files:**
- Create: `src/components/PhotoLightbox.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useEffect } from "react";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

export default function PhotoLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!src) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <img
        src={src}
        alt={alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%", maxHeight: "90vh",
          borderRadius: RADIUS.md, objectFit: "contain",
        }}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute", top: 16, right: 16,
          width: 40, height: 40,
          background: C.white, color: C.dark, border: 0,
          borderRadius: RADIUS.pill, fontSize: 20, cursor: "pointer",
        }}
      >×</button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PhotoLightbox.jsx
git commit -m "feat(scavenger): PhotoLightbox primitive"
```

---

## Task 12: `GamesTabBar` component

**Files:**
- Create: `src/components/GamesTabBar.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useSearchParams } from "react-router-dom";
import { C } from "../data/colors.js";
import Pill from "./primitives/Pill.jsx";

const TABS = [
  { key: "challenges", label: "Challenges" },
  { key: "scavenger", label: "Scavenger" },
];

export default function GamesTabBar() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") === "scavenger" ? "scavenger" : "challenges";
  const setTab = (k) => {
    const next = new URLSearchParams(params);
    if (k === "challenges") next.delete("tab"); else next.set("tab", k);
    setParams(next, { replace: true });
  };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "16px 0 8px" }}>
      {TABS.map((t) => (
        <Pill
          key={t.key}
          active={active === t.key}
          accent={C.gold}
          onClick={() => setTab(t.key)}
          aria-pressed={active === t.key}
        >
          {t.label}
        </Pill>
      ))}
    </div>
  );
}

export function useGamesTab() {
  const [params] = useSearchParams();
  return params.get("tab") === "scavenger" ? "scavenger" : "challenges";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GamesTabBar.jsx
git commit -m "feat(scavenger): GamesTabBar with URL-param tab state"
```

---

## Task 13: `ScavengerCard` tile component

**Files:**
- Create: `src/components/ScavengerCard.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { C } from "../data/colors.js";
import { RADIUS, SHADOW, MICRO_LABEL } from "../data/design.js";
import { PLAYERS } from "../data/players.js";
import Avatar from "./primitives/Avatar.jsx";

const DIFFICULTY_COLOR = { easy: C.green, medium: C.gold, wild: C.coralDeep };
const MEDAL = { 1: "🥇", 2: "🥈" };

function findersStrip(finders, mySlug) {
  const others = finders.filter((f) => f.subjectSlug !== mySlug).slice(0, 3);
  if (others.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: -6, marginTop: 6 }}>
      {others.map((f) => {
        const p = PLAYERS.find((pp) => pp.slug === f.subjectSlug);
        return p ? <Avatar key={f._id} player={p} size="sm" /> : null;
      })}
    </div>
  );
}

export default function ScavengerCard({ item, mine, finders, mySlug, onTap }) {
  const status = !mine ? "unfound"
    : mine.status === "disputed" ? "rejected"
    : "found";
  const stripe = DIFFICULTY_COLOR[item.difficulty];
  const points = mine?.points ?? item.points;
  const medal = mine?.scavengerRank && MEDAL[mine.scavengerRank];

  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      style={{
        position: "relative",
        background: C.white,
        border: 0,
        borderRadius: RADIUS.lg,
        padding: "14px 12px",
        boxShadow: SHADOW.card,
        textAlign: "center",
        cursor: "pointer",
        opacity: status === "rejected" ? 0.55 : 1,
        filter: status === "rejected" ? "grayscale(80%)" : "none",
        borderTop: `2px solid ${stripe}`,
      }}
    >
      {status === "found" && mine.photoStorageId ? (
        <div style={{
          width: 56, height: 56, margin: "0 auto 8px",
          borderRadius: RADIUS.md, overflow: "hidden",
          background: C.sand,
        }}>
          {/* photoUrl is resolved by the parent through getMyFinds */}
          {mine.photoUrl
            ? <img src={mine.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 32, lineHeight: "56px" }}>{item.icon}</span>}
        </div>
      ) : (
        <div style={{ fontSize: 36, marginBottom: 8 }}>{item.icon}</div>
      )}

      <div style={{
        fontFamily: "Nunito, sans-serif", fontWeight: 800,
        fontSize: 12, color: C.dark, lineHeight: 1.2,
      }}>
        {item.name}
      </div>

      <div style={{ marginTop: 6 }}>
        <span style={{
          ...MICRO_LABEL,
          background: status === "found" ? C.green : `${stripe}15`,
          color: status === "found" ? C.white : stripe,
          padding: "2px 8px", borderRadius: RADIUS.pill,
        }}>
          {status === "found" ? `+${points}` : `${item.points}pt`}
        </span>
      </div>

      {medal && (
        <span style={{
          position: "absolute", top: -8, right: -8, fontSize: 24,
        }}>{medal}</span>
      )}

      {finders && findersStrip(finders, mySlug)}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScavengerCard.jsx
git commit -m "feat(scavenger): ScavengerCard tile with state-based rendering"
```

---

## Task 14: `ScavengerClaimSheet` — photo upload BottomSheet

**Files:**
- Create: `src/components/ScavengerClaimSheet.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { compressImage } from "../lib/compressImage.js";
import { showToast } from "../lib/useToast.js";
import { C } from "../data/colors.js";
import { RADIUS, HEADING, BODY, MICRO_LABEL } from "../data/design.js";
import BottomSheet from "./primitives/BottomSheet.jsx";

const DIFFICULTY_COLOR = { easy: C.green, medium: C.gold, wild: C.coralDeep };
const MEDAL = { 1: "🥇", 2: "🥈" };

export default function ScavengerClaimSheet({ item, onClose }) {
  const session = useSession();
  const token = session?.token;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const finders = useQuery(api.scavenger.getItemFinders, item ? { scavengerItemId: item.id } : "skip") ?? [];
  const activeCount = finders.length;
  const nextRank = Math.min(activeCount + 1, 3);
  const bonus = { 1: 5, 2: 3, 3: 0 }[nextRank];
  const willEarn = item ? item.points + bonus : 0;

  const generateUploadUrl = useMutation(api.scavenger.generateUploadUrl);
  const claim = useMutation(api.entries.claimScavenger);

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = async () => {
    if (!file || !token || !item) return;
    setSubmitting(true);
    try {
      const compressed = await compressImage(file);
      const url = await generateUploadUrl({ token });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: compressed,
      });
      if (!res.ok) throw new Error("upload failed");
      const { storageId } = await res.json();
      await claim({ token, scavengerItemId: item.id, photoStorageId: storageId });
      const medal = MEDAL[nextRank] ? ` · ${MEDAL[nextRank]} ${nextRank === 1 ? "1st" : "2nd"}!` : "";
      showToast({
        message: `+${willEarn} · ${item.name}${medal}`,
        icon: item.icon,
        durationMs: 4000,
      });
      onClose();
    } catch (err) {
      showToast({ message: err.message || "Claim failed", accent: C.coralDeep });
      setSubmitting(false);
    }
  };

  if (!item) return null;
  const stripe = DIFFICULTY_COLOR[item.difficulty];

  return (
    <BottomSheet open onClose={submitting ? () => {} : onClose}>
      <div style={{ padding: 20 }}>
        <div style={{ ...MICRO_LABEL, color: stripe, marginBottom: 4 }}>
          {item.difficulty} · {item.points}pt base
        </div>
        <h3 style={{ ...HEADING.h3, color: C.dark, margin: 0 }}>
          {item.icon} {item.name}
        </h3>
        <div style={{ ...BODY, marginTop: 8 }}>
          Rank available right now:{" "}
          <strong>
            {MEDAL[nextRank] ?? "#3+"} · +{willEarn} total
          </strong>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          style={{ display: "none" }}
        />

        {!preview ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              width: "100%", marginTop: 16,
              padding: "16px 12px", borderRadius: RADIUS.md,
              background: C.gold, color: C.white, border: 0,
              fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 15,
              cursor: "pointer",
            }}
          >📷 Take photo</button>
        ) : (
          <>
            <img
              src={preview}
              alt=""
              style={{
                width: "100%", marginTop: 16,
                borderRadius: RADIUS.md, aspectRatio: "1/1", objectFit: "cover",
              }}
            />
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null); inputRef.current?.click(); }}
              style={{
                marginTop: 8, background: "transparent", border: 0,
                color: C.textBody, fontFamily: "Nunito, sans-serif",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}
            >Retake</button>
            <button
              type="button"
              disabled={submitting}
              onClick={onSubmit}
              style={{
                width: "100%", marginTop: 12,
                padding: "16px 12px", borderRadius: RADIUS.md,
                background: submitting ? C.sandDark : C.dark,
                color: C.white, border: 0,
                fontFamily: "'Dela Gothic One', sans-serif", fontSize: 16,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Uploading…" : `Claim +${willEarn}`}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScavengerClaimSheet.jsx
git commit -m "feat(scavenger): ScavengerClaimSheet with camera + compression + claim"
```

---

## Task 15: `ScavengerSection`

**Files:**
- Create: `src/components/ScavengerSection.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { SCAVENGER_ITEMS, SCAVENGER_CATEGORIES } from "../data/scavenger.js";
import { C } from "../data/colors.js";
import { EYEBROW, HEADING, BODY, MICRO_LABEL, RADIUS } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";
import ScavengerCard from "./ScavengerCard.jsx";
import ScavengerClaimSheet from "./ScavengerClaimSheet.jsx";

export default function ScavengerSection() {
  const { gamesLive, currentDayNumber, currentDailyKey } = useGameState();
  const session = useSession();
  const mySlug = session?.slug;
  const mine = useQuery(api.scavenger.getMyFinds, session?.token ? { token: session.token } : "skip") ?? [];

  const [category, setCategory] = useState("all");
  const [active, setActive] = useState(null);

  const mineByItem = useMemo(() => {
    const m = new Map();
    for (const e of mine) {
      const prev = m.get(e.scavengerItemId);
      // prefer non-disputed over disputed
      if (!prev || (prev.status === "disputed" && e.status !== "disputed")) {
        m.set(e.scavengerItemId, e);
      }
    }
    return m;
  }, [mine]);

  const todayFinds = mine.filter((e) => e.dailyKey === currentDailyKey && e.status !== "disputed");
  const todayPoints = todayFinds.reduce((s, e) => s + e.points, 0);

  const visible = useMemo(() => {
    if (category === "all") return SCAVENGER_ITEMS;
    return SCAVENGER_ITEMS.filter((i) => i.category === category);
  }, [category]);

  if (!gamesLive) {
    return (
      <Card>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18 }}>
          The hunt opens with the games.
        </div>
        <div style={{ ...BODY, marginTop: 8 }}>
          Once Day 1 kicks off, this is where you'll log resort sightings.
        </div>
      </Card>
    );
  }

  return (
    <section style={{ margin: "16px 0" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...EYEBROW, color: C.gold, marginBottom: 4 }}>
          Day {currentDayNumber} · Hunt the resort
        </div>
        <div style={{ ...HEADING.h2, color: C.dark }}>What did you find?</div>
      </div>

      <div style={{
        background: `${C.gold}10`, border: `1px solid ${C.gold}25`,
        borderRadius: RADIUS.md, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
      }}>
        <span style={{ ...MICRO_LABEL, color: C.gold }}>Today</span>
        <span style={{
          fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18, color: C.green,
        }}>+{todayPoints}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {todayFinds.length} find{todayFinds.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <Pill active={category === "all"} accent={C.gold} onClick={() => setCategory("all")}>All</Pill>
        {SCAVENGER_CATEGORIES.map((c) => (
          <Pill
            key={c.id}
            active={category === c.id}
            accent={c.color}
            onClick={() => setCategory(c.id)}
          >
            {c.icon} {c.label}
          </Pill>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {visible.map((item) => (
          <ScavengerCard
            key={item.id}
            item={item}
            mine={mineByItem.get(item.id) ?? null}
            mySlug={mySlug}
            onTap={setActive}
          />
        ))}
      </div>

      {active && <ScavengerClaimSheet item={active} onClose={() => setActive(null)} />}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScavengerSection.jsx
git commit -m "feat(scavenger): ScavengerSection with category filter + tile grid"
```

---

## Task 16: Wire scavenger tab into `PlayerGamesPage`

**Files:**
- Modify: `src/routes/PlayerGamesPage.jsx`

- [ ] **Step 1: Add imports near the existing imports**

```js
import GamesTabBar, { useGamesTab } from "../components/GamesTabBar.jsx";
import ScavengerSection from "../components/ScavengerSection.jsx";
```

- [ ] **Step 2: Inside the `PlayerGamesPage` component, after `const { currentDailyKey } = useGameState();`, add:**

```js
const tab = useGamesTab();
```

- [ ] **Step 3: Replace the `<ChallengesSection />` line and its `<SectionBand>` wrapper with a conditional render that includes the tab bar above:**

Find:

```jsx
      <SectionBand bg="white" pad="40px 0" innerMaxWidth={520}>
        <Reveal>
          <ChallengesSection />
        </Reveal>
      </SectionBand>
```

Replace with:

```jsx
      <SectionBand bg="white" pad="32px 0 40px" innerMaxWidth={520}>
        <Reveal>
          <GamesTabBar />
        </Reveal>
        <Reveal>
          {tab === "scavenger" ? <ScavengerSection /> : <ChallengesSection />}
        </Reveal>
      </SectionBand>
```

- [ ] **Step 4: Run dev server, manually verify the tab switch**

Run: `npm run dev`
Open: `http://localhost:5173/player/<your-slug>?tab=scavenger`
Expected: scavenger tab is selected, scavenger section renders; flipping to challenges restores the challenges view; URL changes accordingly.

- [ ] **Step 5: Commit**

```bash
git add src/routes/PlayerGamesPage.jsx
git commit -m "feat(scavenger): mount tabbed Games view with Scavenger section"
```

---

## Task 17: `AdminScavengerQueue` component

**Files:**
- Create: `src/components/AdminScavengerQueue.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import { itemById } from "../data/scavenger.js";
import { C } from "../data/colors.js";
import { RADIUS, MICRO_LABEL } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";
import Avatar from "./primitives/Avatar.jsx";
import PhotoLightbox from "./PhotoLightbox.jsx";

const MEDAL = { 1: "🥇 1st", 2: "🥈 2nd" };

function rel(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Row({ entry, onReject }) {
  const item = itemById(entry.scavengerItemId);
  const player = PLAYERS.find((p) => p.slug === entry.subjectSlug);
  const [confirm, setConfirm] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <div style={{
      padding: "12px 14px", borderBottom: `1px solid ${C.sandDark}`,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        style={{
          width: 56, height: 56, padding: 0, border: 0,
          borderRadius: RADIUS.sm, overflow: "hidden",
          background: C.sand, cursor: entry.photoUrl ? "zoom-in" : "default",
        }}
      >
        {entry.photoUrl
          ? <img src={entry.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 28, lineHeight: "56px" }}>{item?.icon}</span>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 14, color: C.dark }}>
          {item?.icon} {item?.name ?? entry.scavengerItemId}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody,
          marginTop: 4,
        }}>
          {player && <Avatar player={player} size="sm" />}
          <span>{player?.name ?? entry.subjectSlug}</span>
          <span>·</span>
          <strong style={{ color: C.green }}>+{entry.points}</strong>
          {entry.scavengerRank && MEDAL[entry.scavengerRank] && (
            <span>· {MEDAL[entry.scavengerRank]}</span>
          )}
          <span>· {rel(entry.createdAt)}</span>
        </div>
        {confirm && (
          <div style={{ marginTop: 8, fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.dark }}>
            Reject this find? Slide-up will retract bonus points.
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => onReject(entry._id)}
                style={{
                  padding: "4px 10px", borderRadius: RADIUS.sm,
                  background: C.coralDeep, color: C.white, border: 0,
                  fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12,
                  cursor: "pointer",
                }}
              >Confirm</button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                style={{
                  padding: "4px 10px", borderRadius: RADIUS.sm,
                  background: C.sand, color: C.textBody, border: `1px solid ${C.sandDark}`,
                  fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12,
                  cursor: "pointer",
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>
      {!confirm && entry.status !== "disputed" && (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          style={{
            padding: "6px 12px", borderRadius: RADIUS.sm,
            background: C.coralDeep, color: C.white, border: 0,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11,
            letterSpacing: 0.5, textTransform: "uppercase",
            cursor: "pointer",
          }}
        >Reject</button>
      )}
      {lightbox && entry.photoUrl && (
        <PhotoLightbox src={entry.photoUrl} alt={item?.name} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

export default function AdminScavengerQueue() {
  const session = useSession();
  const token = session?.token;
  const [filter, setFilter] = useState("today");
  const reject = useMutation(api.entries.rejectScavenger);
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    token ? { token, limit: 200 } : "skip",
  ) ?? [];

  const scavengerRows = activity.filter((e) => e.type === "scavenger");
  const todays = scavengerRows.filter((e) => e.status !== "disputed" && e.dailyKey === (activity[0]?.dailyKey ?? ""));
  const all = scavengerRows.filter((e) => e.status !== "disputed");
  const rejected = scavengerRows.filter((e) => e.status === "disputed");
  const rows = filter === "today" ? todays : filter === "rejected" ? rejected : all;

  const onReject = async (id) => {
    if (!token) return;
    try {
      await reject({ token, entryId: id });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Pill active={filter === "today"} accent={C.coralDeep} onClick={() => setFilter("today")}>
          Today ({todays.length})
        </Pill>
        <Pill active={filter === "all"} accent={C.coralDeep} onClick={() => setFilter("all")}>
          All ({all.length})
        </Pill>
        <Pill active={filter === "rejected"} accent={C.coralDeep} onClick={() => setFilter("rejected")}>
          Rejected ({rejected.length})
        </Pill>
      </div>
      <Card padding={0} style={{ overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{
            padding: 24, textAlign: "center",
            fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody,
          }}>Nothing to review.</div>
        ) : (
          rows.map((e) => <Row key={e._id} entry={e} onReject={onReject} />)
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdminScavengerQueue.jsx
git commit -m "feat(scavenger): AdminScavengerQueue with filter + inline confirm + lightbox"
```

---

## Task 18: Mount the queue in `AdminPage`

**Files:**
- Modify: `src/routes/AdminPage.jsx`

- [ ] **Step 1: Add import near the existing imports**

```js
import AdminScavengerQueue from "../components/AdminScavengerQueue.jsx";
```

- [ ] **Step 2: Add a new section band in the JSX, slotted before or after existing admin sections (pick a reasonable position based on the file's current structure):**

```jsx
      <SectionBand bg="sand" pad="40px 0" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label="Admin · Photo audit"
            title="Scavenger photos"
            tagline="Tap a photo to inspect. Reject only what's faked or clearly wrong."
            accent={ACCENT}
            compact
          />
        </Reveal>
        <Reveal>
          <AdminScavengerQueue />
        </Reveal>
      </SectionBand>
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`
Open: `http://localhost:5173/admin` while logged in as an admin.
Expected: the new Scavenger photos section renders below other admin sections. Filter pills work. With no claims yet, "Nothing to review." is shown.

- [ ] **Step 4: Commit**

```bash
git add src/routes/AdminPage.jsx
git commit -m "feat(scavenger): mount AdminScavengerQueue on /admin"
```

---

## Task 19: `EntryRow` scavenger variant (photo thumbnail in live feed)

**Files:**
- Modify: `src/components/EntryRow.jsx`

- [ ] **Step 1: Inside `EntryRow`, before the existing avatar+label flex, branch on `entry.type === "scavenger"` to render a small thumbnail**

Locate the existing render:

```jsx
return (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderBottom: `1px solid ${C.sandDark}`,
    opacity: entry.status === "disputed" ? 0.5 : 1,
  }}>
    {subject && <Avatar player={subject} size="sm" />}
```

Add a thumbnail render just after the `Avatar` line:

```jsx
    {entry.type === "scavenger" && entry.photoUrl && (
      <img
        src={entry.photoUrl}
        alt=""
        style={{
          width: 36, height: 36, borderRadius: 8, objectFit: "cover",
        }}
      />
    )}
```

Also update the `label` computation to handle the scavenger case. Find the existing:

```js
const label = entry.type === "challenge"
  ? `claimed: ${challenge?.title ?? entry.challengeId} (${entry.points >= 0 ? "+" : ""}${entry.points})`
  : `got fouled: ${entry.negativeId} (${entry.points})`;
```

Replace with:

```js
const label = entry.type === "challenge"
  ? `claimed: ${challenge?.title ?? entry.challengeId} (${entry.points >= 0 ? "+" : ""}${entry.points})`
  : entry.type === "scavenger"
  ? `found: ${entry.label ?? entry.scavengerItemId} (+${entry.points})`
  : `got fouled: ${entry.negativeId} (${entry.points})`;
```

Also hide the vouch/dispute buttons for scavenger entries by extending the existing `canReact` guard. Find:

```js
const canReact = !!token && !entry.myReaction && entry.status === "active" && !isMine;
```

Replace with:

```js
const canReact = !!token && !entry.myReaction && entry.status === "active" && !isMine && entry.type !== "scavenger";
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`
Open the Board page after submitting a scavenger claim from the player page.
Expected: the live feed row shows a 36px thumbnail next to the avatar, label reads "found: Coconut (+10)", and no vouch/dispute buttons appear for scavenger rows.

- [ ] **Step 3: Commit**

```bash
git add src/components/EntryRow.jsx
git commit -m "feat(scavenger): photo thumb + scavenger label in EntryRow"
```

---

## Task 20: End-to-end sanity pass

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new scavenger tests in `entries.test.ts` and `scavenger.test.ts`.

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`
With games live (admin → trigger if needed), log in as a player:
1. Open `/player/<slug>`, see the new tab bar under the hero.
2. Click Scavenger tab; verify category filter works.
3. Tap a tile, take a photo (or pick a file on desktop), claim it — verify the toast fires and tile flips to "found" with the photo thumb.
4. Log in as a second player; claim the same item — verify the 2nd-finder bonus (toast shows 🥈, points are base + 3).
5. As admin, open `/admin`, see the new queue, reject the first claim — verify the 2nd finder slides up to 1st (their leaderboard total increases by 2 — 5→3 bonus becomes 5+5).

- [ ] **Step 3: Update the leaderboard memory once shipped**

Update `~/.claude/projects/-Users-khari-Documents-GitHub-DRBabyyy/memory/project_leaderboard_design.md` to scope the "no photo uploads" rule to challenges only. Scavenger now uses photos.

- [ ] **Step 4: Final commit if anything was tweaked during smoke testing**

```bash
git status
# only commit if there are unintended changes from manual testing
```

---

## Self-review notes (run before handing off)

- [x] Every spec section maps to a task: schema (T1), seed (T2), `claimScavenger` (T3–T5), `rejectScavenger` (T6–T7), queries (T8), `getRecentActivity` extension (T9), photo compression (T10), lightbox (T11), tab bar (T12), card (T13), claim sheet (T14), section (T15), `PlayerGamesPage` wire (T16), admin queue (T17–T18), `EntryRow` (T19), smoke (T20).
- [x] No placeholders — every code step shows the actual code.
- [x] Type consistency — `claimScavenger`/`rejectScavenger` signatures match between mutations, tests, and component call-sites. `scavengerItemId` / `photoStorageId` / `scavengerRank` names match across schema, mutations, queries, and components.
- [x] Out-of-scope items from §11 of the spec are left out by design (no notifications, no admin freshness badge, no per-day rotation, no suggestions flow).
