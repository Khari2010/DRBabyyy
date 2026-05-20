# Max Flow State Vote — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily crew vote for who reached "Max Flow State". Winner gets +10 points, a daily crown 👑, the title "Max Flow State", and a lifetime wins tally on drill-down + profile.

**Architecture:** New `flowVotes` table holds one row per `(dailyKey, voterSlug)`. The existing `rollovers` row gains four optional fields: `flowWinnerSlug`, `flowResolvedAt`, `flowTieCandidates`, `flowForcedClose`. A new `entries` row of `type: "flowWin"` carries the +10 award, flowing through the existing leaderboard aggregator with zero new scoring code. UI is one new card (`FlowStateVoteCard`), one new stage inside `EndDayTakeover`, plus small additions to Board / Admin / Player pages.

**Tech Stack:** Convex 1.39 (TypeScript), `convex-test` + vitest, React 18, react-router-dom 7, Vite. No new deps.

**Reference:** Spec at `docs/superpowers/specs/2026-05-20-max-flow-state-vote-design.md`.

---

## Prerequisites

This plan is written against the **post board-overhaul** lifecycle in which `rollovers.trigger` has been split into `rollovers.lockDay` and `rollovers.advance` (board-overhaul spec §4.1). At the time this plan was written, that split had not yet landed (`convex/rollovers.ts` still exports a single `trigger` mutation).

Before starting Task 7 (the `advance` gate), confirm:

```bash
grep -E "^export const (lockDay|advance)" convex/rollovers.ts
```

Both should be defined. If they aren't, complete the board-overhaul Rollover Rewrite bundle first. Tasks 1–6 of this plan are independent of the split and can land in any order.

---

## File Structure

**Backend (Convex)**

| File | What |
|---|---|
| `convex/schema.ts` | **modify** — add `flowVotes` table, extend `rollovers` with 4 optional fields, add `"flowWin"` to `entries.type` union |
| `convex/flowVotes.ts` | **create** — `castFlowVote`, `clearFlowVote`, `getFlowVoteState`, `getFlowHistory`, plus an internal helper `resolveFlowWinner` |
| `convex/flowVotes.test.ts` | **create** — covers happy path, refusals, auto-resolve, tie detection, history |
| `convex/rollovers.ts` | **modify** — add `flowWinnerSlug` precondition to `advance` |
| `convex/rollovers.test.ts` | **modify** — add gate-coverage cases for `advance` |
| `convex/admin.ts` | **modify** — add `adminBreakFlowTie` and `adminForceCloseFlowVote` |
| `convex/admin.test.ts` | **modify** — add coverage for both admin mutations |

`convex/leaderboard.ts` requires **no change**. Its aggregator already sums `entries.points` for non-disputed rows regardless of `type`; a `flowWin` row drops in for free. We still add one assertion to `leaderboard.test.ts` so a future refactor doesn't silently exclude it.

**Frontend (React)**

| File | What |
|---|---|
| `src/components/FlowStateVoteCard.jsx` | **create** — the Board card with `voting` / `tied` / hidden states |
| `src/components/EndDayTakeover.jsx` | **modify** — add a final crown reveal stage after the wheel/forfeit stage |
| `src/routes/LeaderboardPage.jsx` | **modify** — mount `FlowStateVoteCard`, add 👑 to today's winner row, surface lifetime tally in drill-down sheet, render winner in history rows |
| `src/routes/AdminPage.jsx` | **modify** — tie-break card (conditional) + force-close button (conditional) |
| `src/routes/PlayerPage.jsx` | **modify** — add `Flow State wins: N` stat block |

No new files outside the ones marked **create**. No new dependencies.

---

## Task 1: Schema — add table + extend rollovers + extend entries union

**Files:**
- Modify: `convex/schema.ts`

**Context:** All schema changes land in one commit so the typegen runs once and downstream code can rely on the new shape.

- [ ] **Step 1: Edit `convex/schema.ts`**

Find the `rollovers: defineTable({...})` block. Replace it with:

```ts
  rollovers: defineTable({
    dayNumber: v.number(),
    dailyKey: v.string(),
    triggeredBySlug: v.string(),
    triggeredAt: v.number(),
    loserSlug: v.optional(v.string()),
    forfeitId: v.optional(v.string()),
    forfeitLabel: v.optional(v.string()),
    spunAt: v.optional(v.number()),
    flowWinnerSlug: v.optional(v.string()),
    flowResolvedAt: v.optional(v.number()),
    flowTieCandidates: v.optional(v.array(v.string())),
    flowForcedClose: v.optional(v.boolean()),
  }).index("by_day_number", ["dayNumber"]),
```

Find the `entries: defineTable({...})` block. Replace the `type` field with:

```ts
    type: v.union(
      v.literal("challenge"),
      v.literal("negative"),
      v.literal("scavenger"),
      v.literal("flowWin"),
    ),
```

After the `itemRsvps` block (the last table), insert before the closing `});`:

```ts
  flowVotes: defineTable({
    dailyKey: v.string(),
    voterSlug: v.string(),
    voteeSlug: v.string(),
    at: v.number(),
  })
    .index("by_daily_key", ["dailyKey"])
    .index("by_daily_and_voter", ["dailyKey", "voterSlug"]),
```

- [ ] **Step 2: Regenerate Convex bindings**

Run: `npx convex codegen`
Expected: completes without errors. `convex/_generated/api.d.ts` updates to include the new field types.

- [ ] **Step 3: Run the full test suite to confirm no existing test broke**

Run: `npm test`
Expected: all existing tests still pass. (No new tests yet — we're just verifying the schema change is backwards-compatible.)

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(flow-state): schema for daily Max Flow State vote

- new flowVotes table indexed by dailyKey + (dailyKey, voterSlug)
- rollovers row gains flowWinnerSlug, flowResolvedAt, flowTieCandidates, flowForcedClose
- entries.type union gains 'flowWin' for the +10 award row"
```

---

## Task 2: `castFlowVote` happy path (TDD)

**Files:**
- Create: `convex/flowVotes.ts`
- Create: `convex/flowVotes.test.ts`

- [ ] **Step 1: Create the test file with a failing happy-path test**

Create `convex/flowVotes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedCrew(t: ReturnType<typeof convexTest>, currentDay = 1) {
  await t.run(async (ctx) => {
    for (const slug of ["khari", "kai", "camara"]) {
      await ctx.db.insert("players", { slug, passcodeHash: null });
      await ctx.db.insert("sessions", {
        playerSlug: slug,
        token: `tok-${slug}`,
        createdAt: Date.now(),
      });
    }
    await ctx.db.insert("adminRoles", { playerSlug: "khari" });
    await ctx.db.insert("gameState", {
      gamesLive: true,
      currentDayNumber: currentDay,
      currentDailyKey: `day-${currentDay}`,
      updatedAt: Date.now(),
    });
    // Day is locked: insert a rollover row with loserSlug set.
    await ctx.db.insert("rollovers", {
      dayNumber: currentDay,
      dailyKey: `day-${currentDay}`,
      triggeredBySlug: "khari",
      triggeredAt: Date.now(),
      loserSlug: "camara",
    });
  });
}

describe("flowVotes.castFlowVote", () => {
  it("inserts a vote for a valid votee while the day is locked", async () => {
    const t = convexTest(schema);
    await seedCrew(t);

    await t.mutation(api.flowVotes.castFlowVote, {
      token: "tok-kai",
      voteeSlug: "khari",
    });

    const votes = await t.run((ctx) =>
      ctx.db.query("flowVotes").collect(),
    );
    expect(votes.length).toBe(1);
    expect(votes[0].voterSlug).toBe("kai");
    expect(votes[0].voteeSlug).toBe("khari");
    expect(votes[0].dailyKey).toBe("day-1");
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- flowVotes`
Expected: FAIL — `api.flowVotes.castFlowVote` does not exist.

- [ ] **Step 3: Create `convex/flowVotes.ts` with minimum to pass**

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, getGameState } from "./helpers";

export const castFlowVote = mutation({
  args: { token: v.string(), voteeSlug: v.string() },
  handler: async (ctx, { token, voteeSlug }) => {
    const { playerSlug } = await requireSession(ctx, token);

    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    const dailyKey = state.currentDailyKey;

    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!rollover) throw new Error("no rollover for current day");
    if (!rollover.loserSlug) throw new Error("day not locked");
    if (rollover.flowWinnerSlug) throw new Error("day already resolved");

    const votee = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", voteeSlug))
      .unique();
    if (!votee) throw new Error("unknown votee");

    const existing = await ctx.db
      .query("flowVotes")
      .withIndex("by_daily_and_voter", (q) =>
        q.eq("dailyKey", dailyKey).eq("voterSlug", playerSlug),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { voteeSlug, at: Date.now() });
    } else {
      await ctx.db.insert("flowVotes", {
        dailyKey,
        voterSlug: playerSlug,
        voteeSlug,
        at: Date.now(),
      });
    }
  },
});
```

- [ ] **Step 4: Run test, confirm it passes**

Run: `npm test -- flowVotes`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add convex/flowVotes.ts convex/flowVotes.test.ts convex/_generated
git commit -m "feat(flow-state): castFlowVote happy path"
```

---

## Task 3: `castFlowVote` — refusals + upsert behaviour

**Files:**
- Modify: `convex/flowVotes.test.ts`

- [ ] **Step 1: Add the refusal + upsert tests below the existing test**

Append to the `describe("flowVotes.castFlowVote", ...)` block:

```ts
  it("upserts: a second vote from the same player replaces the first", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "camara" });
    const votes = await t.run((ctx) => ctx.db.query("flowVotes").collect());
    expect(votes.length).toBe(1);
    expect(votes[0].voteeSlug).toBe("camara");
  });

  it("allows self-vote", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "kai" });
    const votes = await t.run((ctx) => ctx.db.query("flowVotes").collect());
    expect(votes[0].voteeSlug).toBe("kai");
  });

  it("refuses when day is not locked", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
        await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      }
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
      });
      // rollover row WITHOUT loserSlug — day still open
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: Date.now(),
      });
    });
    await expect(t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" }))
      .rejects.toThrow(/day not locked/);
  });

  it("refuses when day is already resolved", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers").first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });
    await expect(t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" }))
      .rejects.toThrow(/day already resolved/);
  });

  it("refuses when votee is not a known player", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await expect(t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "ghost" }))
      .rejects.toThrow(/unknown votee/);
  });

  it("refuses with invalid session", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await expect(t.mutation(api.flowVotes.castFlowVote, { token: "bogus", voteeSlug: "khari" }))
      .rejects.toThrow(/invalid session/);
  });
```

- [ ] **Step 2: Run tests, expect them all to pass**

Run: `npm test -- flowVotes`
Expected: PASS — all six `castFlowVote` tests green (the implementation from Task 2 already covers these cases).

- [ ] **Step 3: Commit**

```bash
git add convex/flowVotes.test.ts
git commit -m "test(flow-state): castFlowVote refusals + upsert + self-vote"
```

---

## Task 4: `clearFlowVote` + `resolveFlowWinner` (single max → auto-resolve)

**Files:**
- Modify: `convex/flowVotes.ts`
- Modify: `convex/flowVotes.test.ts`

**Context:** When the last expected vote lands, `castFlowVote` should call `resolveFlowWinner` inline (no scheduling) and produce the winner immediately. We add the helper and wire it from `castFlowVote`. `clearFlowVote` is symmetric to `castFlowVote` and trivial.

- [ ] **Step 1: Add failing tests first**

Append to `convex/flowVotes.test.ts` inside the same `describe`:

```ts
  it("clearFlowVote removes the caller's vote", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    await t.mutation(api.flowVotes.clearFlowVote, { token: "tok-kai" });
    const votes = await t.run((ctx) => ctx.db.query("flowVotes").collect());
    expect(votes.length).toBe(0);
  });

  it("auto-resolves with a single max when every player has voted", async () => {
    const t = convexTest(schema);
    await seedCrew(t); // 3 players: khari, kai, camara
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-khari", voteeSlug: "kai" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-camara", voteeSlug: "kai" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    // After the third vote, kai has 2, khari has 1 → kai wins.
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBe("kai");
    expect(row?.flowResolvedAt).toBeDefined();
    // +10 entries row exists
    const entries = await t.run((ctx) => ctx.db.query("entries").collect());
    const award = entries.find((e) => e.type === "flowWin");
    expect(award).toBeDefined();
    expect(award?.subjectSlug).toBe("kai");
    expect(award?.points).toBe(10);
    expect(award?.dailyKey).toBe("day-1");
  });
```

- [ ] **Step 2: Run tests, confirm both fail**

Run: `npm test -- flowVotes`
Expected: FAIL — `clearFlowVote` is not defined; `flowWinnerSlug` is undefined after the last vote.

- [ ] **Step 3: Add `clearFlowVote` and the resolution helper**

Edit `convex/flowVotes.ts`. Add these imports at the top if missing:

```ts
import { mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
```

Add a non-exported helper above `castFlowVote`:

```ts
async function maybeResolveFlowWinner(
  ctx: { db: any },
  rollover: Doc<"rollovers">,
) {
  const dailyKey = rollover.dailyKey;
  const players = await ctx.db.query("players").collect();
  const votes = await ctx.db
    .query("flowVotes")
    .withIndex("by_daily_key", (q: any) => q.eq("dailyKey", dailyKey))
    .collect();
  if (votes.length < players.length) return;
  await finaliseFlowResolution(ctx, rollover, votes, /* forced */ false);
}

async function finaliseFlowResolution(
  ctx: { db: any },
  rollover: Doc<"rollovers">,
  votes: Array<Doc<"flowVotes">>,
  forced: boolean,
) {
  const tally = new Map<string, number>();
  for (const v of votes) {
    tally.set(v.voteeSlug, (tally.get(v.voteeSlug) ?? 0) + 1);
  }

  let topCount = 0;
  for (const c of tally.values()) if (c > topCount) topCount = c;

  let candidates: string[];
  if (topCount === 0) {
    // Force-close with zero votes — admin picks from all crew.
    const players = await ctx.db.query("players").collect();
    candidates = players.map((p: Doc<"players">) => p.slug);
  } else {
    candidates = [...tally.entries()]
      .filter(([, n]) => n === topCount)
      .map(([slug]) => slug);
  }

  if (candidates.length === 1) {
    const winner = candidates[0];
    await ctx.db.patch(rollover._id, {
      flowWinnerSlug: winner,
      flowResolvedAt: Date.now(),
      flowTieCandidates: undefined,
      ...(forced ? { flowForcedClose: true } : {}),
    });
    await ctx.db.insert("entries", {
      type: "flowWin",
      subjectSlug: winner,
      points: 10,
      status: "verified",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: rollover.dailyKey,
      createdAt: Date.now(),
    });
  } else {
    await ctx.db.patch(rollover._id, {
      flowTieCandidates: candidates,
      ...(forced ? { flowForcedClose: true } : {}),
    });
  }
}
```

Then update `castFlowVote` to call the resolver after writing the vote. Replace the existing handler body's tail:

```ts
    if (existing) {
      await ctx.db.patch(existing._id, { voteeSlug, at: Date.now() });
    } else {
      await ctx.db.insert("flowVotes", {
        dailyKey,
        voterSlug: playerSlug,
        voteeSlug,
        at: Date.now(),
      });
    }
    await maybeResolveFlowWinner(ctx, rollover);
  },
});
```

(Note: re-read `rollover` after upsert if you want, but Convex's snapshot is fine because we haven't patched the rollover row yet at this point. `maybeResolveFlowWinner` re-collects votes and re-queries players, so it sees the upsert.)

Append `clearFlowVote`:

```ts
export const clearFlowVote = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    const existing = await ctx.db
      .query("flowVotes")
      .withIndex("by_daily_and_voter", (q) =>
        q.eq("dailyKey", state.currentDailyKey).eq("voterSlug", playerSlug),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- flowVotes`
Expected: PASS — all eight flowVotes tests green.

- [ ] **Step 5: Commit**

```bash
git add convex/flowVotes.ts convex/flowVotes.test.ts
git commit -m "feat(flow-state): clearFlowVote + auto-resolve on last vote"
```

---

## Task 5: Tie detection on auto-resolve

**Files:**
- Modify: `convex/flowVotes.test.ts`

**Context:** `finaliseFlowResolution` from Task 4 already handles ties (sets `flowTieCandidates` without writing a winner). Add explicit coverage.

- [ ] **Step 1: Add failing-looking-but-actually-passing tests for ties**

Append:

```ts
  it("records flowTieCandidates instead of a winner when votes tie", async () => {
    const t = convexTest(schema);
    await seedCrew(t); // khari, kai, camara
    // 1 vote for khari, 1 for kai, 1 for camara → all tied at 1.
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-khari", voteeSlug: "kai" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "camara" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-camara", voteeSlug: "khari" });
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBeUndefined();
    expect(row?.flowTieCandidates?.sort()).toEqual(["camara", "kai", "khari"]);
    const award = await t.run((ctx) =>
      ctx.db.query("entries").filter((q) => q.eq(q.field("type"), "flowWin")).first(),
    );
    expect(award).toBeNull();
  });

  it("two-way tie records exactly the two candidates", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    // 2 votes for khari, 1 for kai. Wait — that's not a tie. Make it 1-1-1.
    // For a true two-way tie with 3 voters we need to ensure last vote creates tie.
    // Simpler: cast 2 for khari, 0 for everyone — but only 2 of 3 voters. Need all to vote.
    // Use a 4-crew setup instead.
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "didi", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "didi", token: "tok-didi", createdAt: Date.now() });
    });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-khari", voteeSlug: "kai" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-camara", voteeSlug: "khari" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-didi", voteeSlug: "kai" });
    // khari: 2, kai: 2 → two-way tie.
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowTieCandidates?.sort()).toEqual(["kai", "khari"]);
    expect(row?.flowWinnerSlug).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests**

Run: `npm test -- flowVotes`
Expected: PASS — both new tests green (resolver already handles ties).

- [ ] **Step 3: Commit**

```bash
git add convex/flowVotes.test.ts
git commit -m "test(flow-state): tie detection on auto-resolve"
```

---

## Task 6: `getFlowVoteState` + `getFlowHistory` queries

**Files:**
- Modify: `convex/flowVotes.ts`
- Modify: `convex/flowVotes.test.ts`

**Context:** These power every Flow State UI surface. `getFlowVoteState` returns the current day's phase + my vote + tally + winner/candidates. `getFlowHistory` returns past winners + lifetime per-player counts.

- [ ] **Step 1: Add failing test for `getFlowVoteState`**

Append to `convex/flowVotes.test.ts`:

```ts
describe("flowVotes.getFlowVoteState", () => {
  it("returns phase=closed when day is not locked", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
        await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      }
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: Date.now(),
      });
    });
    const s = await t.query(api.flowVotes.getFlowVoteState, { token: "tok-kai" });
    expect(s.phase).toBe("closed");
    expect(s.votedCount).toBe(0);
    expect(s.totalCrew).toBe(2);
  });

  it("returns phase=voting with tally + myVoteSlug after lockDay", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    const s = await t.query(api.flowVotes.getFlowVoteState, { token: "tok-kai" });
    expect(s.phase).toBe("voting");
    expect(s.myVoteSlug).toBe("khari");
    expect(s.tally.khari).toBe(1);
    expect(s.votedCount).toBe(1);
    expect(s.totalCrew).toBe(3);
  });

  it("returns phase=tied when candidates are set", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers").first();
      await ctx.db.patch(row!._id, { flowTieCandidates: ["khari", "kai"] });
    });
    const s = await t.query(api.flowVotes.getFlowVoteState, { token: "tok-kai" });
    expect(s.phase).toBe("tied");
    expect(s.candidates?.sort()).toEqual(["kai", "khari"]);
  });

  it("returns phase=resolved with winnerSlug", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers").first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });
    const s = await t.query(api.flowVotes.getFlowVoteState, { token: "tok-kai" });
    expect(s.phase).toBe("resolved");
    expect(s.winnerSlug).toBe("khari");
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- flowVotes`
Expected: FAIL — `getFlowVoteState` does not exist.

- [ ] **Step 3: Implement `getFlowVoteState`**

Append to `convex/flowVotes.ts`:

```ts
export const getFlowVoteState = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const state = await getGameState(ctx);
    if (!state) {
      return { phase: "closed" as const, myVoteSlug: null, tally: {}, votedCount: 0, totalCrew: 0 };
    }
    const players = await ctx.db.query("players").collect();
    const totalCrew = players.length;

    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();

    const votes = await ctx.db
      .query("flowVotes")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", state.currentDailyKey))
      .collect();

    const tally: Record<string, number> = {};
    for (const v of votes) tally[v.voteeSlug] = (tally[v.voteeSlug] ?? 0) + 1;

    let mySlug: string | null = null;
    if (token) {
      const session = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
      mySlug = session?.playerSlug ?? null;
    }
    const myVote = mySlug
      ? votes.find((v) => v.voterSlug === mySlug)?.voteeSlug ?? null
      : null;

    let phase: "closed" | "voting" | "tied" | "resolved";
    if (!rollover || !rollover.loserSlug) phase = "closed";
    else if (rollover.flowWinnerSlug) phase = "resolved";
    else if (rollover.flowTieCandidates && rollover.flowTieCandidates.length > 0) phase = "tied";
    else phase = "voting";

    return {
      phase,
      myVoteSlug: myVote,
      tally,
      votedCount: votes.length,
      totalCrew,
      candidates: rollover?.flowTieCandidates ?? undefined,
      winnerSlug: rollover?.flowWinnerSlug ?? undefined,
    };
  },
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- flowVotes`
Expected: PASS — all `getFlowVoteState` tests green.

- [ ] **Step 5: Add failing test for `getFlowHistory`**

Append:

```ts
describe("flowVotes.getFlowHistory", () => {
  it("returns past winners and lifetime tallies", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
      }
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 3, currentDailyKey: "day-3", updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: 1,
        flowWinnerSlug: "khari", flowResolvedAt: 1,
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 2, dailyKey: "day-2", triggeredBySlug: "khari", triggeredAt: 2,
        flowWinnerSlug: "kai", flowResolvedAt: 2,
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 3, dailyKey: "day-3", triggeredBySlug: "khari", triggeredAt: 3,
        flowWinnerSlug: "khari", flowResolvedAt: 3,
      });
    });
    const h = await t.query(api.flowVotes.getFlowHistory, {});
    expect(h.lifetime.khari).toBe(2);
    expect(h.lifetime.kai).toBe(1);
    expect(h.byDay.find((d) => d.dayNumber === 1)?.winnerSlug).toBe("khari");
    expect(h.byDay.find((d) => d.dayNumber === 2)?.winnerSlug).toBe("kai");
  });
});
```

- [ ] **Step 6: Implement `getFlowHistory`**

Append to `convex/flowVotes.ts`:

```ts
export const getFlowHistory = query({
  args: {},
  handler: async (ctx) => {
    const rollovers = await ctx.db.query("rollovers").collect();
    const lifetime: Record<string, number> = {};
    const byDay = [];
    for (const r of rollovers) {
      if (r.flowWinnerSlug) {
        lifetime[r.flowWinnerSlug] = (lifetime[r.flowWinnerSlug] ?? 0) + 1;
        byDay.push({ dayNumber: r.dayNumber, dailyKey: r.dailyKey, winnerSlug: r.flowWinnerSlug, resolvedAt: r.flowResolvedAt ?? 0 });
      }
    }
    byDay.sort((a, b) => a.dayNumber - b.dayNumber);
    return { lifetime, byDay };
  },
});
```

- [ ] **Step 7: Run tests**

Run: `npm test -- flowVotes`
Expected: PASS — all flowVotes tests green.

- [ ] **Step 8: Commit**

```bash
git add convex/flowVotes.ts convex/flowVotes.test.ts
git commit -m "feat(flow-state): getFlowVoteState + getFlowHistory queries"
```

---

## Task 7: Gate `rollovers.advance` on `flowWinnerSlug`

**Files:**
- Modify: `convex/rollovers.ts`
- Modify: `convex/rollovers.test.ts`

**Prerequisite check:** This task assumes `rollovers.advance` exists (from the board-overhaul Rollover Rewrite bundle). Confirm with:

```bash
grep -E "^export const advance" convex/rollovers.ts
```

If empty, complete the board-overhaul Rollover Rewrite first.

- [ ] **Step 1: Add the failing test**

Append to `convex/rollovers.test.ts` (or create a new `describe` block if one doesn't already exist for `advance`):

```ts
describe("rollovers.advance — Flow State gate", () => {
  it("refuses to advance when flowWinnerSlug is not set on the locked rollover", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    // Drive lifecycle to: day 1 open, then locked.
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" }); // assumes board-overhaul split landed
    // Day 1 rollover row now has loserSlug but no flowWinnerSlug.
    await expect(t.mutation(api.rollovers.advance, { token: "tok-khari" }))
      .rejects.toThrow(/flow.*not resolved|resolve flow state/i);
  });

  it("allows advance once flowWinnerSlug is set", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(2);
  });
});
```

If `setupAdmins` does not yet drive the lifecycle to a started game, adjust by calling whichever bootstrap the post-board-overhaul tests use.

- [ ] **Step 2: Run tests, confirm the first one fails**

Run: `npm test -- rollovers`
Expected: FAIL — `advance` allows progression without the flow winner.

- [ ] **Step 3: Add the gate in `convex/rollovers.ts`**

Inside the `advance` mutation handler, near the top after loading the closing-day rollover row, insert:

```ts
    if (!closingRollover.flowWinnerSlug) {
      throw new Error("Flow State not resolved — resolve flow state before advancing");
    }
```

(Use whichever variable name `advance` uses for the locked-day rollover; align with board-overhaul's implementation.)

- [ ] **Step 4: Run tests**

Run: `npm test -- rollovers`
Expected: PASS — both gate tests green; pre-existing `advance` tests need a quick patch to set `flowWinnerSlug` before calling `advance` (see Step 5).

- [ ] **Step 5: Update pre-existing `advance` tests to set the flow winner first**

Find any existing test calling `t.mutation(api.rollovers.advance, ...)` and, before that call, insert:

```ts
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers")
        .withIndex("by_day_number", (q) => q.eq("dayNumber", /* the closing day */))
        .first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });
```

Replace the dayNumber expression with whichever day the test is closing.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — all tests green.

- [ ] **Step 7: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts
git commit -m "feat(flow-state): gate rollovers.advance on flowWinnerSlug"
```

---

## Task 8: `adminBreakFlowTie`

**Files:**
- Modify: `convex/admin.ts`
- Modify: `convex/admin.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `convex/admin.test.ts`:

```ts
describe("admin.adminBreakFlowTie", () => {
  async function seedWithTie(t: ReturnType<typeof convexTest>) {
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai", "camara"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
        await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      }
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: Date.now(),
        loserSlug: "camara",
        flowTieCandidates: ["khari", "kai"],
      });
    });
  }

  it("admin picks a winner from the tied set", async () => {
    const t = convexTest(schema);
    await seedWithTie(t);
    await t.mutation(api.admin.adminBreakFlowTie, { token: "tok-khari", voteeSlug: "kai" });
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBe("kai");
    expect(row?.flowTieCandidates).toBeUndefined();
    const award = await t.run((ctx) =>
      ctx.db.query("entries").filter((q) => q.eq(q.field("type"), "flowWin")).first(),
    );
    expect(award?.subjectSlug).toBe("kai");
    expect(award?.points).toBe(10);
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await seedWithTie(t);
    await expect(t.mutation(api.admin.adminBreakFlowTie, { token: "tok-kai", voteeSlug: "khari" }))
      .rejects.toThrow(/admin only/);
  });

  it("rejects voteeSlug not in candidates", async () => {
    const t = convexTest(schema);
    await seedWithTie(t);
    await expect(t.mutation(api.admin.adminBreakFlowTie, { token: "tok-khari", voteeSlug: "camara" }))
      .rejects.toThrow(/not a tied candidate/);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- admin`
Expected: FAIL — `adminBreakFlowTie` is not defined.

- [ ] **Step 3: Implement in `convex/admin.ts`**

Append to `convex/admin.ts`:

```ts
import { getGameState } from "./helpers";

export const adminBreakFlowTie = mutation({
  args: { token: v.string(), voteeSlug: v.string() },
  handler: async (ctx, { token, voteeSlug }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!rollover) throw new Error("no rollover for current day");
    if (!rollover.flowTieCandidates || rollover.flowTieCandidates.length === 0) {
      throw new Error("no tie to break");
    }
    if (!rollover.flowTieCandidates.includes(voteeSlug)) {
      throw new Error("not a tied candidate");
    }
    await ctx.db.patch(rollover._id, {
      flowWinnerSlug: voteeSlug,
      flowResolvedAt: Date.now(),
      flowTieCandidates: undefined,
    });
    await ctx.db.insert("entries", {
      type: "flowWin",
      subjectSlug: voteeSlug,
      points: 10,
      status: "verified",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: rollover.dailyKey,
      createdAt: Date.now(),
    });
  },
});
```

(If `getGameState` is already imported elsewhere in the file, skip the duplicate import.)

- [ ] **Step 4: Run tests**

Run: `npm test -- admin`
Expected: PASS — all three tests green.

- [ ] **Step 5: Commit**

```bash
git add convex/admin.ts convex/admin.test.ts
git commit -m "feat(flow-state): adminBreakFlowTie"
```

---

## Task 9: `adminForceCloseFlowVote`

**Files:**
- Modify: `convex/admin.ts`
- Modify: `convex/flowVotes.ts` (export `finaliseFlowResolution`-equivalent for re-use, or duplicate the logic into admin.ts; pick whichever the repo prefers)
- Modify: `convex/admin.test.ts`

**Context:** Force-close runs the same resolution path as auto-resolve but ignores the "all voted" precondition, and stamps `flowForcedClose: true`. Cleanest: lift the resolver into a function the admin mutation can call.

- [ ] **Step 1: Export the resolver from `convex/flowVotes.ts`**

In `convex/flowVotes.ts`, change `async function finaliseFlowResolution(...)` to `export async function finaliseFlowResolution(...)`. Same body.

- [ ] **Step 2: Add failing test**

Append to `convex/admin.test.ts`:

```ts
describe("admin.adminForceCloseFlowVote", () => {
  async function seedLockedDay(t: ReturnType<typeof convexTest>) {
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai", "camara"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
        await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      }
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: Date.now(),
        loserSlug: "camara",
      });
    });
  }

  it("force-close with one vote: that vote wins outright", async () => {
    const t = convexTest(schema);
    await seedLockedDay(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    await t.mutation(api.admin.adminForceCloseFlowVote, { token: "tok-khari" });
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBe("khari");
    expect(row?.flowForcedClose).toBe(true);
  });

  it("force-close with zero votes: candidates = all crew", async () => {
    const t = convexTest(schema);
    await seedLockedDay(t);
    await t.mutation(api.admin.adminForceCloseFlowVote, { token: "tok-khari" });
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBeUndefined();
    expect(row?.flowTieCandidates?.sort()).toEqual(["camara", "kai", "khari"]);
    expect(row?.flowForcedClose).toBe(true);
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await seedLockedDay(t);
    await expect(t.mutation(api.admin.adminForceCloseFlowVote, { token: "tok-kai" }))
      .rejects.toThrow(/admin only/);
  });
});
```

- [ ] **Step 3: Run tests, confirm they fail**

Run: `npm test -- admin`
Expected: FAIL — `adminForceCloseFlowVote` not defined.

- [ ] **Step 4: Implement in `convex/admin.ts`**

Append to `convex/admin.ts`:

```ts
import { finaliseFlowResolution } from "./flowVotes";

export const adminForceCloseFlowVote = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!rollover) throw new Error("no rollover for current day");
    if (!rollover.loserSlug) throw new Error("day not locked");
    if (rollover.flowWinnerSlug) throw new Error("already resolved");
    const votes = await ctx.db
      .query("flowVotes")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", rollover.dailyKey))
      .collect();
    await finaliseFlowResolution(ctx, rollover, votes, /* forced */ true);
  },
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- admin`
Expected: PASS — all three tests green.

- [ ] **Step 6: Commit**

```bash
git add convex/admin.ts convex/admin.test.ts convex/flowVotes.ts
git commit -m "feat(flow-state): adminForceCloseFlowVote"
```

---

## Task 10: Leaderboard scoring assertion

**Files:**
- Modify: `convex/leaderboard.test.ts`

**Context:** The leaderboard aggregator already sums points regardless of `type`. We add one explicit assertion so a future refactor cannot silently exclude `flowWin` rows.

- [ ] **Step 1: Add a test**

Append to `convex/leaderboard.test.ts`:

```ts
describe("leaderboard scoring — flowWin", () => {
  it("includes flowWin rows in subject totals", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "khari", challengeId: "x",
        points: 5, status: "verified", vouchCount: 1, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
      await ctx.db.insert("entries", {
        type: "flowWin", subjectSlug: "khari",
        points: 10, status: "verified", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
    });
    const rows = await t.query(api.leaderboard.getDaily, { dailyKey: "day-1" });
    const khari = rows.find((r) => r.slug === "khari");
    expect(khari?.total).toBe(15);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- leaderboard`
Expected: PASS (aggregator already type-agnostic).

- [ ] **Step 3: Commit**

```bash
git add convex/leaderboard.test.ts
git commit -m "test(flow-state): assert flowWin rows count toward leaderboard total"
```

---

## Task 11: `FlowStateVoteCard` component (Board card)

**Files:**
- Create: `src/components/FlowStateVoteCard.jsx`

**Context:** Self-contained card. Reads `getFlowVoteState`, renders one of: hidden / voting / tied. The Board page mounts it in the next task.

- [ ] **Step 1: Create the component**

```jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PLAYERS } from "../data/players.js";
import { useSession } from "../lib/useSession.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";
import { RADIUS, BODY } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";

export default function FlowStateVoteCard() {
  const session = useSession();
  const state = useQuery(
    api.flowVotes.getFlowVoteState,
    session?.token ? { token: session.token } : {},
  );
  const cast = useMutation(api.flowVotes.castFlowVote);
  const holidayMap = useHolidayNameMap();

  if (!state || state.phase === "closed" || state.phase === "resolved") return null;

  if (state.phase === "tied") {
    return (
      <Card style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14, color: C.dark }}>
          Tied — admin is picking
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {state.candidates?.map((slug) => {
            const p = PLAYERS.find((x) => x.slug === slug);
            return <Pill key={slug} label={displayName(slug, holidayMap, p?.name)} />;
          })}
        </div>
      </Card>
    );
  }

  // phase === "voting"
  return (
    <Card style={{ padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14, color: C.dark }}>
          Vote: Max Flow State today
        </div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {state.votedCount} of {state.totalCrew} voted
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {PLAYERS.map((p) => {
          const picked = state.myVoteSlug === p.slug;
          const isMe = session?.slug === p.slug;
          return (
            <button
              key={p.slug}
              onClick={() => session?.token && cast({ token: session.token, voteeSlug: p.slug })}
              style={{
                border: picked ? `2px solid ${C.gold}` : `1px solid ${C.sandDark}`,
                background: picked ? `${C.gold}22` : "transparent",
                borderRadius: RADIUS.pill, padding: "6px 10px",
                fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 12, color: C.dark,
                display: "inline-flex", alignItems: "center", gap: 4,
                cursor: "pointer",
              }}
            >
              {picked && "✓ "}
              {displayName(p.slug, holidayMap, p.name)}
              {isMe && <span style={{ opacity: 0.6 }}>(you)</span>}
            </button>
          );
        })}
      </div>
      {state.myVoteSlug && (
        <div style={{ marginTop: 8, fontFamily: "Nunito, sans-serif", fontSize: 11, color: C.textBody }}>
          Tap to change your pick.
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Build to confirm imports resolve**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/FlowStateVoteCard.jsx
git commit -m "feat(flow-state): FlowStateVoteCard component"
```

---

## Task 12: Mount the vote card + crown + history on `/leaderboard`

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

- [ ] **Step 1: Import the card**

Add near the other component imports at the top of the file:

```jsx
import FlowStateVoteCard from "../components/FlowStateVoteCard.jsx";
```

- [ ] **Step 2: Mount it above the standings**

Find the JSX block that renders the standings table on the current-day tab. Insert `<FlowStateVoteCard />` directly above it. The card's `return null` path handles `closed` and `resolved` states, so it's safe to mount unconditionally.

- [ ] **Step 3: Add 👑 to the today-tab winner row**

Pull the current-day flow state alongside other queries:

```jsx
  const flowState = useQuery(
    api.flowVotes.getFlowVoteState,
    session?.token ? { token: session.token } : {},
  );
```

In `BoardRow`, accept a new `isFlowWinner` prop and prefix the displayed holiday name with `"👑 "` when it's true, plus render a `<Pill label="Max Flow State" />` next to the verified chip.

When iterating to render rows, set `isFlowWinner={row.slug === flowState?.winnerSlug}`.

- [ ] **Step 4: Surface the flow winner in history-tab rows**

The board-overhaul history tab already renders past days. Pull `getFlowHistory()` once:

```jsx
  const flowHistory = useQuery(api.flowVotes.getFlowHistory, {});
```

For each past-day row, look up the winner from `flowHistory.byDay` and append "👑 {holidayName}" beneath the loser line. If the day has no `winnerSlug`, render nothing extra.

- [ ] **Step 5: Surface lifetime tally in the player drill-down sheet**

The drill-down sheet (post-board-overhaul, `BottomSheet` content for a tapped row) gains one stat:

```jsx
<div>
  <div style={{ fontSize: 11, color: C.textBody }}>Flow State wins</div>
  <div style={{ fontSize: 18, fontWeight: 800 }}>
    {flowHistory?.lifetime?.[selectedSlug] ?? 0}
  </div>
</div>
```

(Drop next to the existing claim-count / verified stats.)

- [ ] **Step 6: Build + manual check**

Run: `npm run build`
Expected: build succeeds.

Run: `npm run dev` and:
1. Log in as a crew member.
2. With a locked day (manually patch `rollovers` row in the Convex dashboard to set `loserSlug` on the current day), confirm the vote card appears above the standings.
3. Vote → confirm counter updates and your pick highlights.
4. From the dashboard, set `flowWinnerSlug` on the rollover → confirm card disappears and 👑 appears next to the winner's name on the standings.
5. Switch to the history tab → confirm 👑 appears under the past day with a winner.

- [ ] **Step 7: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "feat(flow-state): mount vote card + crown + history on Board"
```

---

## Task 13: Crown stage inside `EndDayTakeover`

**Files:**
- Modify: `src/components/EndDayTakeover.jsx`

**Context:** Add a new final stage after the wheel/forfeit reveal. Shows a holding card while voting is open or tied; animates the crown landing on the winner when resolved.

- [ ] **Step 1: Read the existing component**

Open `src/components/EndDayTakeover.jsx` and locate the stage-machine — current stages run from `banner` → `scoreboard` → `wheel` (or similar; align with the actual names in the file).

- [ ] **Step 2: Pull the flow state**

Add at the top of the component:

```jsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
// (others already present)

  const flowState = useQuery(
    api.flowVotes.getFlowVoteState,
    session?.token ? { token: session.token } : {},
  );
```

- [ ] **Step 3: Append a `crown` stage to the stage machine**

After the existing terminal stage, add:

```jsx
{stage === "crown" && (
  <div style={{ textAlign: "center", padding: 24 }}>
    {flowState?.phase === "resolved" ? (
      <>
        <div style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 36, color: C.gold,
          animation: "scaleIn 600ms ease-out",
        }}>
          👑
        </div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 18, marginTop: 8 }}>
          {displayName(flowState.winnerSlug, holidayMap, undefined)}
        </div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody, marginTop: 4 }}>
          Max Flow State · +10
        </div>
      </>
    ) : flowState?.phase === "tied" ? (
      <>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 16 }}>
          Tied — admin is picking
        </div>
      </>
    ) : (
      <>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 16 }}>
          Waiting on Flow State vote
        </div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody, marginTop: 6 }}>
          {flowState?.votedCount ?? 0} of {flowState?.totalCrew ?? 0} voted
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Advance the stage machine to `crown` after the wheel stage**

In the existing stage-progression logic, when the wheel reveal completes, set the next stage to `"crown"` instead of closing the takeover. The takeover should stay open through `crown` and only allow dismiss after it (or — match the existing replay model: user can dismiss anytime, re-entering renders the appropriate stage from server state).

- [ ] **Step 5: Build + manual check**

Run: `npm run build`
Expected: build succeeds.

Run: `npm run dev`, open the takeover on a locked day:
1. With votes incomplete → shows the "Waiting on Flow State vote" card with live counter.
2. Manually patch `flowTieCandidates` in the dashboard → shows "Tied — admin is picking".
3. Manually patch `flowWinnerSlug` → 👑 animates in on that holiday name.
4. Close and re-open the takeover → re-renders the correct stage from server state.

- [ ] **Step 6: Commit**

```bash
git add src/components/EndDayTakeover.jsx
git commit -m "feat(flow-state): crown stage inside EndDayTakeover"
```

---

## Task 14: Admin tie-break card + force-close button on `/admin`

**Files:**
- Modify: `src/routes/AdminPage.jsx`

- [ ] **Step 1: Pull the flow state**

Inside the AdminPage component, add:

```jsx
import FlowStateVoteCard from "../components/FlowStateVoteCard.jsx"; // not used here, but reference
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

  const flowState = useQuery(
    api.flowVotes.getFlowVoteState,
    session?.token ? { token: session.token } : {},
  );
  const breakTie = useMutation(api.admin.adminBreakFlowTie);
  const forceClose = useMutation(api.admin.adminForceCloseFlowVote);
```

- [ ] **Step 2: Conditionally render the tie-break card**

Above the existing Lock / Advance controls:

```jsx
{flowState?.phase === "tied" && (
  <Card style={{ padding: 14, marginBottom: 12, border: `2px solid ${C.gold}` }}>
    <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14 }}>
      Tie: pick the Max Flow State winner
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
      {flowState.candidates?.map((slug) => {
        const p = PLAYERS.find((x) => x.slug === slug);
        return (
          <button
            key={slug}
            onClick={() => session?.token && breakTie({ token: session.token, voteeSlug: slug })}
            style={{
              border: `1px solid ${C.sandDark}`, borderRadius: RADIUS.pill,
              padding: "8px 14px", fontFamily: "Nunito, sans-serif",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            {displayName(slug, holidayMap, p?.name)}
          </button>
        );
      })}
    </div>
  </Card>
)}
```

- [ ] **Step 3: Conditionally render the force-close button**

Next to the Lock / Advance controls, when `flowState?.phase === "voting"`:

```jsx
{flowState?.phase === "voting" && (
  <button
    onClick={() => {
      if (confirm("Force close Flow State vote with the votes cast so far?")) {
        forceClose({ token: session.token });
      }
    }}
    style={{ /* match existing admin button styling */ }}
  >
    Force close Flow State vote
  </button>
)}
```

- [ ] **Step 4: Disable Advance with a hint when flow not resolved**

The existing Advance button needs a small change: disable + show a hint when `flowState?.phase !== "resolved"`:

```jsx
<button
  disabled={flowState?.phase !== "resolved"}
  title={flowState?.phase !== "resolved" ? "Resolve Flow State first" : undefined}
>
  Advance to next day
</button>
```

- [ ] **Step 5: Build + manual check**

Run: `npm run build`
Expected: build succeeds.

Run: `npm run dev`, log in as admin, lock the current day:
1. With no tie → no tie-break card, force-close button visible.
2. Patch `flowTieCandidates` → tie-break card appears with chips.
3. Tap a chip → tie-break card disappears, Advance enables.
4. Without setting `flowWinnerSlug` → Advance is disabled with the hover hint.

- [ ] **Step 6: Commit**

```bash
git add src/routes/AdminPage.jsx
git commit -m "feat(flow-state): admin tie-break card + force-close + advance gate"
```

---

## Task 15: Lifetime tally on `/player/:slug`

**Files:**
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Pull `getFlowHistory`**

In `PlayerPage`, add:

```jsx
  const flowHistory = useQuery(api.flowVotes.getFlowHistory, {});
  const flowWins = flowHistory?.lifetime?.[slug] ?? 0;
```

- [ ] **Step 2: Render the stat**

Insert next to other player stats:

```jsx
<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
  <div style={{ fontSize: 11, color: C.textBody, fontFamily: "Nunito, sans-serif" }}>
    Flow State wins
  </div>
  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Dela Gothic One', sans-serif", color: C.gold }}>
    👑 {flowWins}
  </div>
</div>
```

Position next to whichever stat block exists today (verified count, total points). Match its container/border style.

- [ ] **Step 3: Build + manual check**

Run: `npm run build`
Expected: build succeeds.

Run: `npm run dev`, visit `/player/khari` (or any slug). With no flow wins → shows `👑 0`. Insert a fake `entries` flowWin row in the Convex dashboard → tally bumps to 1 on the next render.

- [ ] **Step 4: Commit**

```bash
git add src/routes/PlayerPage.jsx
git commit -m "feat(flow-state): lifetime Flow State wins on player profile"
```

---

## Task 16: Full-suite green + manual smoke

**Files:**
- (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass — `flowVotes` (15+ cases), `admin` (with 6+ new cases), `rollovers` (with 2 new gate cases), `leaderboard` (with 1 new flowWin case), plus all 134+ pre-existing tests.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds with no warnings related to this feature.

- [ ] **Step 3: Manual smoke against the dev server**

Run: `npm run dev`. With at least 2 crew members logged in (e.g. via incognito + normal Chrome):
1. Open day → no vote card on Board.
2. Admin runs Lock Day on `/admin` → vote card appears on Board for everyone. EndDayTakeover (if open) shows "Waiting on Flow State vote".
3. Each crew member taps a chip on the card. Counter updates live.
4. After every player has voted with a clear winner → vote card disappears, 👑 appears on the winner's row, takeover crown stage animates.
5. Admin runs Advance on `/admin` → succeeds. Day rolls over. Board history now shows yesterday with 👑.
6. Visit `/player/<winner>` → lifetime "Flow State wins" shows at least 1.
7. (Tie path) On a fresh day, cast votes that tie → admin sees tie-break card on `/admin` → picks a winner → ceremony resolves.
8. (Force-close path) On a fresh day, only some crew vote → admin clicks Force close → resolves (or, if tied, falls into the tie-break flow).

- [ ] **Step 4: Document any rough edges**

If a manual case revealed a bug, file a follow-up task in `docs/superpowers/plans/` rather than patching here. Keep this plan's scope tight.

- [ ] **Step 5: Final commit (if any fixes)**

```bash
git add -A
git commit -m "chore(flow-state): post-smoke fixes"
```

(Skip if no fixes needed.)

---

## Self-Review

**Spec coverage:**
- Lifecycle (§3.1) → Task 7 (advance gate) + Tasks 4–5 (auto-resolve + tie detection). ✓
- Phase machine (§3.3) → Task 6 (`getFlowVoteState`). ✓
- Schema (§4.1, §4.2) → Task 1. ✓
- Convex API surface (§4.3) → Tasks 2, 3, 4, 5, 6 (cast/clear/state/history) + Tasks 8, 9 (admin). ✓
- Advance gate (§4.5) → Task 7. ✓
- Board card (§5.1) → Task 11 (component) + Task 12 (mount). ✓
- Crown stage in takeover (§5.2) → Task 13. ✓
- Crown on Board row (§5.3) → Task 12. ✓
- Lifetime tally on drill-down (§5.4) → Task 12. ✓
- Lifetime tally on profile (§5.4) → Task 15. ✓
- Admin tie-break + force-close + Advance gate UI (§5.5) → Task 14. ✓
- Edge cases (§6) — change-mind, clear, no-votes-force-close, one-vote-force-close, refusals, multi-vote prevention → covered by tests in Tasks 3, 4, 5, 6, 9. ✓
- Testing (§7) → spread across every Task 2–10. ✓

**Placeholder scan:** No "TBD" or "TODO"; every code step has executable content. Task 7's gate insertion references `closingRollover` — flagged in the step text as the variable post-board-overhaul will introduce. Task 13's stage-machine integration explicitly says "align with actual stage names in the file" because that file's internals depend on the board-overhaul status.

**Type/name consistency:**
- `flowWinnerSlug`, `flowResolvedAt`, `flowTieCandidates`, `flowForcedClose` — consistent across Tasks 1, 4, 6, 7, 8, 9.
- `finaliseFlowResolution` — defined private in Task 4, exported in Task 9 (called out explicitly).
- `getFlowVoteState` return shape — `{ phase, myVoteSlug, tally, votedCount, totalCrew, candidates?, winnerSlug? }` is consistent across Tasks 6, 11, 13, 14.

Plan is self-consistent and spec-complete.
