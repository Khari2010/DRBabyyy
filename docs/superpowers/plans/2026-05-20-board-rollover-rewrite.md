# Board Rollover Rewrite + Wheel Preview — Implementation Plan (Bundles D + E)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the rollover lifecycle rewrite from the Board Overhaul spec — split `trigger` into `lockDay` + `advance`, make the wheel deterministic with a server-picked forfeit, drive the day-close ceremony off a Board summary card visible to all crew, and split `/admin` into the canonical two-button flow. Plus the small Bundle E "What's on the wheel" preview.

**Architecture:** Additive backend first (new mutations alongside old `trigger`), then wheel + reveal determinism (graceful fallback so legacy callers don't break), then the UI rewire on top. Final cleanup removes the now-unused `trigger`/`recordForfeit`. Bundle E preview card ships last and is independent.

**Tech Stack:** Convex (mutations, queries, TDD via `convex-test`), React 18, Vite. No new deps.

**Reference:** Spec at `docs/superpowers/specs/2026-05-20-board-overhaul-design.md` §4, §5.4–5.7. Flow State spec at `docs/superpowers/specs/2026-05-20-max-flow-state-vote-design.md` — `advance` gates on `flowWinnerSlug` per that spec. This is **Bundles D + E** of five (Polish ✅ → Row ✅ → Drill-down ✅ → **Rollover + Wheel preview**).

---

## Coordination notes (read before starting)

Khari's parallel agents have shipped the Flow State backend + UI on top of the **old** rollover model (atomic `trigger`). The work is interleaved with mine in git history. To minimise conflicts, this plan is **phased**:

| Phase | Tasks | Files touched | Collision risk |
|---|---|---|---|
| **1. Backend additive** | T1–T4 | `convex/{rollovers,entries,schema}.ts` + tests | **Low** — Khari's Flow State work didn't touch these files |
| **2. Wheel + Reveal determinism** | T5–T6 | `WheelOfFortune.jsx`, `RevealFlow.jsx` | **Low** — neither was touched by Flow State |
| **3. UI rewire** | T7–T11 | `LeaderboardPage.jsx`, `AdminPage.jsx`, `EndDayTakeover.jsx`, new `DaySummaryCard.jsx`, `PlayerDayDrawer.jsx` | **HIGH** — these are exactly the files Khari's parallel agents have been editing. **PAUSE between Phase 2 and Phase 3** and verify those files are stable before continuing |
| **4. Cleanup** | T12 | `convex/rollovers.ts` | Low — only safe to run after Phase 3 callers have migrated |
| **5. Bundle E** | T13 | `LeaderboardPage.jsx` + new `WheelPreviewCard.jsx` | Medium — touches LeaderboardPage but only additively |

The plan can stop after any task and resume later. Phase 1 and Phase 2 can ship immediately. Phase 3 should wait until you confirm no agents are mid-edit in those files.

---

## File Structure

**Created:**
- `src/components/DaySummaryCard.jsx` (Phase 3, T7)
- `src/components/WheelPreviewCard.jsx` (Bundle E, T13)

**Modified (backend):**
- `convex/schema.ts` (T1) — `closedAt` field + `by_daily_key` index on `rollovers`
- `convex/rollovers.ts` (T2, T3, T12) — `lockDay`, `advance`, `pickForfeit` helper, eventually drop `trigger` + `recordForfeit`
- `convex/rollovers.test.ts` (T2, T3, T12) — new tests
- `convex/entries.ts` (T4) — revised hard-lock guards
- `convex/entries.test.ts` (T4) — updated lock tests

**Modified (UI):**
- `src/components/games/WheelOfFortune.jsx` (T5) — accept `target` prop
- `src/components/RevealFlow.jsx` (T6) — read forfeit from rollover row when present
- `src/routes/LeaderboardPage.jsx` (T9, T13) — remove End Day button + confirm, replace banner with `DaySummaryCard`, mount wheel preview
- `src/routes/AdminPage.jsx` (T8) — split into Lock Day + Start Day N+1
- `src/components/EndDayTakeover.jsx` (T10) — open via DaySummaryCard, drop admin gate
- `src/components/PlayerDayDrawer.jsx` (T11) — add Flow State wins stat

**Untouched but worth knowing:**
- `convex/flowVotes.ts` — Khari's parallel work; this plan integrates with it via the `advance` precondition
- `convex/admin.ts` — Khari added `adminBreakFlowTie` / `adminForceCloseFlowVote`; this plan doesn't touch admin.ts
- `convex/_seedData/challenges.ts` — exports `NEGATIVE_POINTS_CONST`; unchanged
- `src/data/forfeits.js` — the forfeit roster; we import it server-side in T3

---

# Phase 1 — Backend additive (low collision risk)

## Task 1: Schema — add `closedAt` field + `by_daily_key` index to `rollovers`

**Files:**
- Modify: `convex/schema.ts:118-127`

**Context:** The new lock model uses a `closedAt` timestamp on the rollover row as the "day is locked" signal — works for empty days (no loserSlug) where the old check would fail. Also need a `by_daily_key` index so the hard-lock guards in `entries.ts` can look up "is this entry's day closed" without scanning the whole table.

- [ ] **Step 1: Update the rollovers schema block**

Find the existing block:

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
  }).index("by_day_number", ["dayNumber"]),
```

Replace with:

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
    closedAt: v.optional(v.number()),
    // Flow State fields (existing, defined elsewhere in this file may already cover these):
  })
    .index("by_day_number", ["dayNumber"])
    .index("by_daily_key", ["dailyKey"]),
```

**IMPORTANT:** Khari's Flow State work has already added `flowWinnerSlug`, `flowResolvedAt`, `flowTieCandidates`, `flowForcedClose` to this same block. **Do not delete those.** If they're present, keep them all and just add `closedAt` plus the new index. If the block diverges from the snippet above due to existing Flow State fields, preserve all of them.

- [ ] **Step 2: Verify the schema compiles**

Run: `npx convex codegen` (if installed) or `npm run build`
Expected: succeeds, no schema errors.

- [ ] **Step 3: Run existing convex tests**

Run: `npm test`
Expected: all pre-existing tests still pass (the additive field + index doesn't break anything).

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "$(cat <<'EOF'
feat(rollovers): add closedAt field + by_daily_key index

closedAt is the new explicit "day is locked" signal. Covers
empty-day locks where loserSlug stays undefined. by_daily_key
lets entries.vouch/dispute look up the rollover for an entry's
day in O(1) for the revised hard-lock guard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `lockDay` and `advance` mutations alongside existing `trigger`

**Files:**
- Modify: `convex/rollovers.ts:1-95` (append new exports; leave `trigger` intact)
- Modify: `convex/rollovers.test.ts` (append new tests inside new describe blocks)

**Context:** Split the closing flow into two explicit admin steps. `lockDay` patches the rollover row with `loserSlug` + `closedAt` (forfeit picking lands in T3). `advance` advances `gameState` after both `closedAt` AND `flowWinnerSlug` are set. The existing `trigger` mutation stays in place for backward compatibility until Phase 4. Both new mutations are additive — no callers exist yet.

- [ ] **Step 1: Write failing tests**

In `convex/rollovers.test.ts`, append at the end of the file (after the closing `});` of the last `describe` block):

```ts
describe("rollovers.lockDay", () => {
  it("patches the rollover row with loserSlug + closedAt without advancing gameState", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // kickoff → Day 1

    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "camara", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });

    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });

    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(1); // NOT advanced
    expect(state?.currentDailyKey).toBe("day-1");

    const row = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    expect(row?.loserSlug).toBe("camara");
    expect(row?.closedAt).toBeTypeOf("number");
  });

  it("locks empty days with closedAt but no loserSlug", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });

    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const row = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    expect(row?.closedAt).toBeTypeOf("number");
    expect(row?.loserSlug).toBeUndefined();
  });

  it("rejects a second lock on the same day", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.lockDay, { token: "tok-khari" }))
      .rejects.toThrow(/day already locked/);
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.lockDay, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
  });
});

describe("rollovers.advance", () => {
  it("kickoff: pre-trip → Day 1", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.gamesLive).toBe(true);
    expect(state?.currentDayNumber).toBe(1);
  });

  it("refuses to advance until the current day is locked", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" }); // kickoff
    await expect(t.mutation(api.rollovers.advance, { token: "tok-khari" }))
      .rejects.toThrow(/lock the day first/);
  });

  it("advances after lockDay (without flow gating, since flow gating is integrated via flowWinnerSlug on the rollover row)", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" }); // kickoff
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });

    // Manually set flowWinnerSlug to simulate Flow State resolved; this stand-in is
    // safe because the precondition is "flowWinnerSlug set on the rollover row".
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers")
        .filter((q) => q.eq(q.field("dayNumber"), 1)).first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });

    await t.mutation(api.rollovers.advance, { token: "tok-khari" });

    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(2);
  });

  it("refuses to advance when flowWinnerSlug is not set", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    // flowWinnerSlug intentionally NOT patched
    await expect(t.mutation(api.rollovers.advance, { token: "tok-khari" }))
      .rejects.toThrow(/resolve Flow State first/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/rollovers.test.ts -t "rollovers.lockDay|rollovers.advance"`
Expected: FAIL — `api.rollovers.lockDay` and `api.rollovers.advance` don't exist yet.

- [ ] **Step 3: Add the mutations**

Edit `convex/rollovers.ts`. After the existing `const nextDayRollover = ...; if (nextDayRollover) throw ...;` block inside `trigger`, the file structure is fine. Append two new exports at the end of the file (after the existing `undoLast` export):

```ts
export const lockDay = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    if (!state.gamesLive) throw new Error("games not live");

    const closingKey = state.currentDailyKey;
    const closingDay = state.currentDayNumber;

    const existing = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", closingDay))
      .first();
    if (existing?.closedAt) throw new Error("day already locked");

    // Compute loser.
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", closingKey))
      .collect();
    const totals = new Map<string, number>();
    for (const e of entries) {
      if (e.status === "disputed") continue;
      totals.set(e.subjectSlug, (totals.get(e.subjectSlug) ?? 0) + e.points);
    }
    let loserSlug: string | undefined;
    let loserTotal = Infinity;
    for (const [slug, total] of totals.entries()) {
      if (total < loserTotal) {
        loserSlug = slug;
        loserTotal = total;
      }
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { loserSlug, closedAt: now });
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        loserSlug,
        closedAt: now,
      });
    }
  },
});

export const advance = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const now = Date.now();

    // Kickoff path: pre-trip → Day 1
    if (!state.gamesLive) {
      await ctx.db.patch(state._id, {
        gamesLive: true,
        currentDayNumber: 1,
        currentDailyKey: "day-1",
        updatedAt: now,
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1,
        dailyKey: "day-1",
        triggeredBySlug: playerSlug,
        triggeredAt: now,
      });
      return;
    }

    const current = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!current?.closedAt) throw new Error("lock the day first");
    if (!current.flowWinnerSlug) throw new Error("resolve Flow State first");

    const newDay = state.currentDayNumber + 1;
    const newDailyKey = `day-${newDay}`;
    await ctx.db.patch(state._id, {
      currentDayNumber: newDay,
      currentDailyKey: newDailyKey,
      updatedAt: now,
    });
    await ctx.db.insert("rollovers", {
      dayNumber: newDay,
      dailyKey: newDailyKey,
      triggeredBySlug: playerSlug,
      triggeredAt: now,
    });
  },
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run convex/rollovers.test.ts`
Expected: all rollovers tests pass (including the existing `trigger` ones — `trigger` is still untouched).

Then full suite: `npm test`
Expected: all pre-existing tests + 6 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts
git commit -m "$(cat <<'EOF'
feat(rollovers): split close ceremony into lockDay + advance

lockDay computes the loser and patches the rollover row with
closedAt; doesn't advance gameState. advance is gated on
closedAt AND flowWinnerSlug (Flow State resolved). The existing
trigger mutation stays in place for backward compatibility
until callers migrate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Server-side forfeit picker inside `lockDay`

**Files:**
- Modify: `convex/rollovers.ts` (extend `lockDay` to pick + persist a forfeit)
- Modify: `convex/rollovers.test.ts` (extend the lockDay tests)

**Context:** With all phones rendering the same wheel result, the forfeit must be determined server-side at lockDay time. Reuse `src/data/forfeits.js` as the roster (same pattern as scavenger items in `convex/entries.ts`).

- [ ] **Step 1: Extend lockDay tests**

In `convex/rollovers.test.ts`, find the `describe("rollovers.lockDay", () => { ... })` block. Inside it, append:

```ts
  it("server-picks a forfeit and stores forfeitId + forfeitLabel + spunAt", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const row = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    expect(typeof row?.forfeitId).toBe("string");
    expect(typeof row?.forfeitLabel).toBe("string");
    expect(typeof row?.spunAt).toBe("number");
  });

  it("does not pick a forfeit on empty days (no loser)", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    // no entries
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const row = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    expect(row?.closedAt).toBeTypeOf("number");
    expect(row?.loserSlug).toBeUndefined();
    expect(row?.forfeitId).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/rollovers.test.ts -t "server-picks a forfeit"`
Expected: FAIL — `forfeitId` is undefined after lockDay.

- [ ] **Step 3: Add `pickForfeit` helper + integrate into lockDay**

Edit `convex/rollovers.ts`. At the top of the file, after the existing `import { requireSession, requireAdmin, getGameState } from "./helpers";` line, add:

```ts
import { FORFEITS } from "../src/data/forfeits.js";

function pickForfeit() {
  const i = Math.floor(Math.random() * FORFEITS.length);
  return FORFEITS[i];
}
```

Inside the `lockDay` handler, find the existing block:

```ts
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { loserSlug, closedAt: now });
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        loserSlug,
        closedAt: now,
      });
    }
```

Replace with:

```ts
    const now = Date.now();
    // Empty day = no loser = no forfeit. Otherwise pick a forfeit server-side
    // so every phone's wheel animates to the same answer.
    const forfeit = loserSlug ? pickForfeit() : undefined;
    const lockPatch: Record<string, any> = {
      loserSlug,
      closedAt: now,
    };
    if (forfeit) {
      lockPatch.forfeitId = forfeit.id;
      lockPatch.forfeitLabel = forfeit.label;
      lockPatch.spunAt = now;
    }
    if (existing) {
      await ctx.db.patch(existing._id, lockPatch);
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        ...lockPatch,
      });
    }
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts
git commit -m "$(cat <<'EOF'
feat(rollovers): server-side forfeit picker inside lockDay

Uniform random across src/data/forfeits.js. Persists
forfeitId + forfeitLabel + spunAt on the rollover row so every
phone's wheel can animate to the same result. Empty days skip
the pick (no loser → no forfeit).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Revise hard-lock guards on `entries.vouch` and `entries.dispute`

**Files:**
- Modify: `convex/entries.ts` (lines around vouch + dispute guards)
- Modify: `convex/entries.test.ts` (add lock-via-closedAt tests)

**Context:** The current guard checks `entry.dailyKey !== state.currentDailyKey`. Under the new model, lockDay happens BEFORE gameState advances, so the old check leaves a window where day N's entries are unlocked. Use belt-and-braces: lock if EITHER `closedAt` is set on the rollover row OR the entry's day is in the past.

- [ ] **Step 1: Write failing tests**

In `convex/entries.test.ts`, find the `describe("entries.vouch", () => { ... })` block. Inside it, append:

```ts
  it("rejects vouching after lockDay (gameState still at the same day)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      // GameState IS currently on day-1, but day-1's rollover is closed
      await ctx.db.insert("gameState", {
        gamesLive: true,
        currentDayNumber: 1,
        currentDailyKey: "day-1",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1",
        triggeredBySlug: "khari", triggeredAt: Date.now(),
        closedAt: Date.now(),
      });
      entryId = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
    });
    await expect(t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId }))
      .rejects.toThrow(/day is locked/);
  });
```

In the same file, find the `describe("entries.dispute", () => { ... })` block. Inside it, append the mirror test (same shape, `t.mutation(api.entries.dispute, ...)` instead of `vouch`, expect same `/day is locked/`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/entries.test.ts -t "rejects vouching after lockDay"`
Expected: FAIL — old guard doesn't fire because `entry.dailyKey === state.currentDailyKey`.

- [ ] **Step 3: Revise the guards**

Edit `convex/entries.ts`. Inside the `vouch` handler, find:

```ts
    const state = await getGameState(ctx);
    if (state && entry.dailyKey !== state.currentDailyKey) {
      throw new Error("day is locked");
    }
```

Replace with:

```ts
    const state = await getGameState(ctx);
    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", entry.dailyKey))
      .first();
    const locked = !!rollover?.closedAt
      || (state && entry.dailyKey !== state.currentDailyKey);
    if (locked) {
      throw new Error("day is locked");
    }
```

Inside the `dispute` handler, find the equivalent block:

```ts
    const state = await getGameState(ctx);
    if (state && entry.dailyKey !== state.currentDailyKey) {
      throw new Error("day is locked");
    }
```

Replace with the identical revised block:

```ts
    const state = await getGameState(ctx);
    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", entry.dailyKey))
      .first();
    const locked = !!rollover?.closedAt
      || (state && entry.dailyKey !== state.currentDailyKey);
    if (locked) {
      throw new Error("day is locked");
    }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run convex/entries.test.ts`
Expected: all entries tests pass, including the two new ones.

Then full suite: `npm test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "$(cat <<'EOF'
feat(entries): hard-lock via rollover.closedAt (belt-and-braces)

Adds the rollover.closedAt check alongside the existing
dailyKey-mismatch check so vouch/dispute is blocked in the
lockDay → reveal → advance window where gameState hasn't yet
ticked. Pre-existing rollovers without closedAt stay locked
via the original dailyKey check.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 2 — Wheel + Reveal determinism (low collision risk)

## Task 5: `WheelOfFortune` accepts a `target` prop

**Files:**
- Modify: `src/components/games/WheelOfFortune.jsx`

**Context:** Today the wheel picks `targetIndex` randomly inside `spin()`. To make all phones land on the same forfeit, the parent passes `target` (a forfeit ID). When provided, the wheel animates to the matching slice. Without `target`, fall back to random (preserves backward compatibility).

- [ ] **Step 1: Add the `target` prop with random fallback**

Find the existing component signature:

```jsx
export default function WheelOfFortune({ onResult } = {}) {
```

Replace with:

```jsx
export default function WheelOfFortune({ onResult, target } = {}) {
```

Find the existing `spin` function body:

```jsx
  const spin = () => {
    if (spinning) return;
    setResult(null);
    const targetIndex = Math.floor(Math.random() * FORFEITS.length);
    pendingIndex.current = targetIndex;
    setRotation((prev) => {
      const targetMod = ((-targetIndex * SLICE_DEG) % 360 + 360) % 360;
      const currentMod = ((prev % 360) + 360) % 360;
      const delta = ((targetMod - currentMod) + 360) % 360;
      return prev + 360 * SPIN_REVOLUTIONS + delta;
    });
    setSpinning(true);
  };
```

Replace with:

```jsx
  const spin = () => {
    if (spinning) return;
    setResult(null);
    // Deterministic landing when `target` is provided; otherwise random.
    let targetIndex;
    if (target) {
      targetIndex = FORFEITS.findIndex((f) => f.id === target);
      if (targetIndex < 0) targetIndex = 0; // fallback: unknown target → slice 0
    } else {
      targetIndex = Math.floor(Math.random() * FORFEITS.length);
    }
    pendingIndex.current = targetIndex;
    setRotation((prev) => {
      const targetMod = ((-targetIndex * SLICE_DEG) % 360 + 360) % 360;
      const currentMod = ((prev % 360) + 360) % 360;
      const delta = ((targetMod - currentMod) + 360) % 360;
      return prev + 360 * SPIN_REVOLUTIONS + delta;
    });
    setSpinning(true);
  };
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/games/WheelOfFortune.jsx
git commit -m "$(cat <<'EOF'
feat(wheel): accept target prop for deterministic spin

When target (a forfeit ID) is provided, the wheel animates to
that slice deterministically. Without target, falls back to
random so existing callers keep working. Enables synchronised
multi-phone reveals where the forfeit is picked server-side.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `RevealFlow` reads forfeit from the rollover row when present

**Files:**
- Modify: `src/components/RevealFlow.jsx`

**Context:** Today, Stage 3 mounts `<WheelOfFortune onResult={onSpinResult} />` where `onSpinResult` calls `recordForfeit`. Under the new model the forfeit is already on the rollover row at lockDay time, so we pass `target={rollover.forfeitId}` to make the wheel land there, and skip the `recordForfeit` call (the row already has it). Legacy rows without `forfeitId` fall through to the old behaviour for one release cycle (Phase 4 drops `recordForfeit`).

- [ ] **Step 1: Update RevealFlow Stage 3**

In `src/components/RevealFlow.jsx`, find Stage 3 (the block that mounts `<WheelOfFortune ...>`):

```jsx
          ) : (
            <WheelOfFortune onResult={onSpinResult} />
          )}
```

Replace with:

```jsx
          ) : (
            <WheelOfFortune
              target={rollover.forfeitId}
              onResult={rollover.forfeitId ? () => {} : onSpinResult}
            />
          )}
```

`target={rollover.forfeitId}` — undefined for legacy rows (falls through to random); set for new rows (deterministic).

`onResult` — for legacy rows still records via `recordForfeit`. For new rows, the row already has the forfeit; the no-op handler avoids the duplicate write.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/RevealFlow.jsx
git commit -m "$(cat <<'EOF'
feat(reveal): use rollover.forfeitId for deterministic wheel

When the rollover row already has a forfeit (set by lockDay),
the wheel spins deterministically to that slice and we skip
recordForfeit. Legacy rows without forfeitId still spin random
and record client-side. Enables the per-phone synchronous
reveal moment.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 3 — UI rewire (HIGH collision risk — pause before starting)

> **STOP and confirm with the user before starting Phase 3.** All five tasks below touch files that Khari's parallel Flow State UI agents have been editing: `LeaderboardPage.jsx`, `AdminPage.jsx`, `EndDayTakeover.jsx`, `PlayerDayDrawer.jsx`. Re-read each file before applying changes and adapt the find/replace blocks to the actual current state.

## Task 7: Create `DaySummaryCard` component

**Files:**
- Create: `src/components/DaySummaryCard.jsx`

**Context:** Renders on the Board between the day header and the standings card whenever there's a locked-but-not-advanced day. Shows day number, "X — closed" copy, and a "Reveal punishment ▶" button that opens the EndDayTakeover for that day. Visible to **everyone** logged in (not just admin).

- [ ] **Step 1: Create the file**

Create `src/components/DaySummaryCard.jsx`:

```jsx
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

export default function DaySummaryCard({ dayNumber, hasLoser, onReveal }) {
  return (
    <div style={{
      background: C.dark,
      color: C.white,
      borderRadius: RADIUS.md,
      padding: "16px 18px",
      marginBottom: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontWeight: 900,
        fontSize: 11,
        letterSpacing: 3,
        textTransform: "uppercase",
        opacity: 0.8,
      }}>
        ✨ Day {dayNumber} — closed
      </div>
      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontSize: 14,
        opacity: 0.9,
      }}>
        {hasLoser
          ? "The crew is gathered. Tap to reveal the punishment."
          : "No claims today — no loser, no wheel."}
      </div>
      {hasLoser && (
        <button
          type="button"
          onClick={onReveal}
          style={{
            marginTop: 4,
            padding: "12px 20px",
            borderRadius: RADIUS.md,
            background: C.coralDeep,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          🎰 Reveal punishment ▶
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: clean (component unused for one commit, mounted in T9).

- [ ] **Step 3: Commit**

```bash
git add src/components/DaySummaryCard.jsx
git commit -m "$(cat <<'EOF'
feat(board): add DaySummaryCard component

Renders a "Day N — closed" card on the Board with a Reveal
punishment button that opens the takeover. Visible to everyone
logged in. Empty-day variant hides the reveal CTA. Wired to
LeaderboardPage in a later commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Split `/admin` into Lock Day N + Start Day N+1

**Files:**
- Modify: `src/routes/AdminPage.jsx` (the existing rollover action block)

**Context:** Currently `/admin` has a single "Manual rollover (fallback)" button calling `rollovers.trigger`. Replace with two distinct buttons that call the new `lockDay` and `advance` mutations. Pre-trip (`gamesLive=false`) collapses both into a single "Start the games" CTA that calls `advance` (the kickoff path).

**IMPORTANT:** Read `src/routes/AdminPage.jsx` fresh before editing — Khari has added a tie-break + force-close card from the Flow State spec, which sits NEAR these buttons. Keep all of that intact; only edit the rollover-trigger block.

- [ ] **Step 1: Add the new mutations + handlers**

Near the top of the component (alongside the existing `const trigger = useMutation(api.rollovers.trigger);`), add:

```jsx
  const lockDay = useMutation(api.rollovers.lockDay);
  const advance = useMutation(api.rollovers.advance);
```

Add two new handlers (alongside the existing `handleRollover`):

```jsx
  const handleLockDay = async () => {
    if (!window.confirm(`Lock Day ${state.currentDayNumber}? This computes the loser, picks the forfeit, and opens the Reveal flow on the Board.`)) return;
    try {
      await lockDay({ token });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdvance = async () => {
    const label = state.gamesLive
      ? `Start Day ${state.currentDayNumber + 1}? This advances past today.`
      : "Start the games (Day 1)?";
    if (!window.confirm(label)) return;
    try {
      await advance({ token });
      if (state.gamesLive) navigate("/leaderboard");
    } catch (err) {
      alert(err.message);
    }
  };
```

- [ ] **Step 2: Replace the single button with two buttons**

Find the existing `<ActionButton onClick={handleRollover} variant="primary">...</ActionButton>` (likely accompanied by a paragraph of helper text). Replace the entire button + its surrounding wrapper logic with:

```jsx
            {state.gamesLive ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ActionButton onClick={handleLockDay} variant="primary">
                  🔒 Lock Day {state.currentDayNumber}
                </ActionButton>
                <ActionButton onClick={handleAdvance} variant="primary">
                  ▶ Start Day {state.currentDayNumber + 1}
                </ActionButton>
              </div>
            ) : (
              <ActionButton onClick={handleAdvance} variant="primary">
                Start the games
              </ActionButton>
            )}
```

The pre-trip path (`!state.gamesLive`) just calls `advance` directly — kickoff is one step. Live state shows both buttons.

If you want the helper text updated too: the existing paragraph above the button (currently saying something like "Fallback — End Day lives on the Board now") should be replaced with:

```jsx
            <div style={{ ...BODY, fontSize: 13, marginBottom: 14 }}>
              {state.gamesLive
                ? "Two-step close: Lock today's scores (picks the loser and forfeit), then advance after Flow State is resolved."
                : "Tap to kick off Day 1 and unlock claiming."}
            </div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/routes/AdminPage.jsx
git commit -m "$(cat <<'EOF'
feat(admin): split rollover into Lock Day + Start Day N+1

/admin now reflects the two-step close ceremony: Lock Day runs
the new rollovers.lockDay (computes loser, picks forfeit,
opens the Reveal flow on the Board); Start Day N+1 runs
rollovers.advance once Flow State is resolved. Pre-trip path
remains a single "Start the games" CTA.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: LeaderboardPage — remove End Day button, replace banner with DaySummaryCard

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** The End Day button + confirm sheet on the Board are obsolete now that lockDay lives on /admin. The pending-reveal banner is replaced by `DaySummaryCard`. The takeover wiring moves to "open via summary card's Reveal button" instead of "open via End Day success."

**IMPORTANT:** Re-read `LeaderboardPage.jsx` fresh — Khari has mounted the FlowStateVoteCard + crown on the Board. Don't disturb that mounting. Only remove the End Day button block, the BottomSheet confirm sheet, the `endDayConfirm`/`endDayPending` state, the `canEndDay`/`handleEndDay` logic, and replace the pending banner.

- [ ] **Step 1: Remove End Day button, confirm sheet, and related state**

Delete the following from `LeaderboardPage.jsx`:
- The `const trigger = useMutation(api.rollovers.trigger);` line
- The `const [endDayConfirm, setEndDayConfirm] = useState(false);` line
- The `const [endDayPending, setEndDayPending] = useState(false);` line
- The `const canEndDay = !!isAdmin && gamesLive && currentDayEntryCount > 0 && !endDayPending;` line
- The entire `const handleEndDay = async () => { ... };` function
- The conditional End Day button inside the tab-pill `<Reveal>` block (the `{canEndDay && (<button ...>End Day {currentDayNumber}</button>)}` block)
- The entire `<BottomSheet open={endDayConfirm} ...>...</BottomSheet>` block near the bottom of the return JSX

Also remove these imports that become unused:
- `useMutation` from `convex/react` (only `useQuery` should remain — check for other usages first; if `useMutation` is still used elsewhere, keep it)
- `BottomSheet` (if no other BottomSheet usage in this file — check first)
- `showToast` (if no other showToast usage in this file — check first)

If unsure whether to delete an import, `grep` the file for the name; remove the import only if it has zero remaining usages.

- [ ] **Step 2: Replace pending-reveal banner with DaySummaryCard**

Add the import at the top (alongside other component imports):

```jsx
import DaySummaryCard from "../components/DaySummaryCard.jsx";
```

Find the existing pending-reveal banner block. It currently reads:

```jsx
        {isAdmin && pendingReveal && lastClosed && (
          <Reveal>
            <button
              type="button"
              onClick={() => {
                setTakeoverDay(lastClosed.dayNumber);
                setTakeoverOpen(true);
              }}
              style={{
                width: "100%",
                marginBottom: 16,
                padding: "14px 18px",
                ...
              }}
            >
              <span>Day {lastClosed.dayNumber} is unresolved — open the wheel</span>
              <span aria-hidden="true">▶</span>
            </button>
          </Reveal>
        )}
```

Replace with:

```jsx
        {loggedIn && lastClosed?.closedAt && !lastClosed?.forfeitId === false && (
          <Reveal>
            <DaySummaryCard
              dayNumber={lastClosed.dayNumber}
              hasLoser={!!lastClosed.loserSlug}
              onReveal={() => {
                setTakeoverDay(lastClosed.dayNumber);
                setTakeoverOpen(true);
              }}
            />
          </Reveal>
        )}
```

Wait — that condition has a typo. Use this instead:

```jsx
        {loggedIn && lastClosed?.closedAt && (
          <Reveal>
            <DaySummaryCard
              dayNumber={lastClosed.dayNumber}
              hasLoser={!!lastClosed.loserSlug}
              onReveal={() => {
                setTakeoverDay(lastClosed.dayNumber);
                setTakeoverOpen(true);
              }}
            />
          </Reveal>
        )}
```

Gate: any logged-in user sees the card when there's a closed-but-not-advanced day. `closedAt` is the new lock signal; the card disappears automatically once advance ticks gameState forward and `lastClosed` points elsewhere.

- [ ] **Step 3: Verify build + tests**

Run: `npm run build && npm test`
Expected: build clean; tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
refactor(board): remove End Day button, mount DaySummaryCard

End Day lives on /admin now. The Board shows DaySummaryCard
when the current day's rollover has closedAt set and gameState
hasn't advanced. Card is visible to everyone (not admin-only)
so the whole crew sees the reveal CTA on their phone at
breakfast.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `EndDayTakeover` — drop the admin gate (already none, but verify) and confirm it opens via the summary card

**Files:**
- Modify: `src/components/EndDayTakeover.jsx` (if needed)

**Context:** `EndDayTakeover` was originally admin-only via the calling code. After Task 9, the call site is `DaySummaryCard.onReveal` which is visible to everyone — so no in-component gate is needed. Verify the component has no `isAdmin` check baked in. If it does, remove it.

**IMPORTANT:** Khari's `feat(flow-state): crown stage in day-close ceremony` commit added a crown stage. Don't disturb that.

- [ ] **Step 1: Read the file**

Read `src/components/EndDayTakeover.jsx`. Search for any `isAdmin` reference.

- [ ] **Step 2: Remove `isAdmin` gates if present**

If `isAdmin` is referenced inside the component, remove the gate. If no such reference exists, this task is a no-op verification.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit (only if changes were made)**

If changes:

```bash
git add src/components/EndDayTakeover.jsx
git commit -m "$(cat <<'EOF'
refactor(takeover): drop isAdmin gate, opens via DaySummaryCard

Anyone logged in can open the takeover via the Board's
DaySummaryCard now. Admin-only was a previous-spec assumption.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If no changes were needed, document as such and skip the commit.

---

## Task 11: `PlayerDayDrawer` — add Flow State wins stat

**Files:**
- Modify: `src/components/PlayerDayDrawer.jsx`

**Context:** Now that Flow State backend is shipped (`getFlowHistory` exists, returning `{ pastWinners, lifetimeWinCount }` or similar), the drill-down can show a lifetime "Flow State wins: N" stat. Always show the lifetime count regardless of tab — it's a profile-level stat, not a daily one.

- [ ] **Step 1: Read the current state of `PlayerDayDrawer.jsx`**

Confirm the file structure. The component currently has Claims, Vouches received, Fouls sections.

- [ ] **Step 2: Query getFlowHistory and render the stat**

Near the existing `useQuery(api.players.getPlayerDay, ...)` call, add:

```jsx
  const flowHistory = useQuery(
    api.flowVotes.getFlowHistory,
    open && slug ? {} : "skip",
  );
  const flowWins = flowHistory?.lifetimeWinCount?.[slug] ?? 0;
```

(If `getFlowHistory`'s return shape differs from `{ lifetimeWinCount: Record<slug, number> }`, adapt the indexing accordingly — read `convex/flowVotes.ts` to confirm.)

In the JSX, AFTER the existing header block (the avatar + name + dayLabel div) and BEFORE the `<SectionTitle>Claims</SectionTitle>`, add:

```jsx
      {flowHistory && flowWins > 0 && (
        <div style={{
          marginTop: 12,
          padding: "8px 12px",
          background: `${C.gold}22`,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 12,
          color: C.dark,
          letterSpacing: 0.3,
        }}>
          👑 Flow State wins: {flowWins}
        </div>
      )}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlayerDayDrawer.jsx
git commit -m "$(cat <<'EOF'
feat(drilldown): show Flow State lifetime wins

Adds a small 👑 pill to the player drill-down showing the
lifetime count of Max Flow State wins, sourced from
flowVotes.getFlowHistory. Hidden when zero.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 4 — Cleanup

## Task 12: Remove `rollovers.trigger` and `recordForfeit`

**Files:**
- Modify: `convex/rollovers.ts`
- Modify: `convex/rollovers.test.ts`

**Context:** After Phase 3, no callers remain for `trigger` or `recordForfeit`. Drop them. The corresponding tests get deleted too.

**IMPORTANT:** Before starting, `grep -rn "rollovers.trigger\|rollovers.recordForfeit" src/ convex/` to verify zero callers. If any remain, fix them first (Phase 3 was supposed to remove them all).

- [ ] **Step 1: Confirm no callers**

Run: `grep -rn "rollovers.trigger\|rollovers.recordForfeit" src/ convex/`
Expected: only the export definitions themselves should appear. If any callers remain, STOP and fix them before continuing.

- [ ] **Step 2: Remove the exports**

In `convex/rollovers.ts`, delete:
- The entire `export const trigger = mutation({ ... });` block
- The entire `export const recordForfeit = mutation({ ... });` block

- [ ] **Step 3: Remove their tests**

In `convex/rollovers.test.ts`, delete:
- The entire `describe("rollovers.trigger", () => { ... });` block
- The entire `describe("rollovers.recordForfeit", () => { ... });` block

Note: tests that reference `trigger` ONLY as a way to seed state (e.g. to advance to Day 1 before testing something else) need to be updated to use `advance` instead.

- [ ] **Step 4: Update test seed patterns**

In `convex/rollovers.test.ts`, find every `t.mutation(api.rollovers.trigger, { token: ... })` call OUTSIDE the deleted describe blocks. Replace each with `t.mutation(api.rollovers.advance, { token: ... })` (the kickoff path of `advance` is equivalent to the kickoff path of the old `trigger`).

If a test used `trigger` to BOTH kickoff AND close Day 1, replace with `advance` (kickoff) + `lockDay` + manual flowWinnerSlug patch + `advance` (closing). This is the new explicit ceremony.

- [ ] **Step 5: Update other test files that use `trigger`**

`grep -rn "api.rollovers.trigger" convex/` — find any test outside `rollovers.test.ts` that still calls it. Update each to use `advance` (kickoff) or `lockDay + manual patch + advance` (close).

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts
git commit -m "$(cat <<'EOF'
chore(rollovers): drop trigger + recordForfeit

All callers migrated to lockDay + advance + server-determined
forfeit. The old atomic trigger and the client-side
recordForfeit are no longer reachable. Tests that used trigger
to seed state now use advance (kickoff) or the full
lockDay + advance ceremony.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 5 — Bundle E: Wheel preview card on the Board

## Task 13: Add a collapsible "What's on the wheel" card

**Files:**
- Create: `src/components/WheelPreviewCard.jsx`
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** A small card on the Board listing the forfeits that could land. Default collapsed. Tap header to expand. Reads from `src/data/forfeits.js`. Builds suspense / anchors the stakes.

- [ ] **Step 1: Create the card**

Create `src/components/WheelPreviewCard.jsx`:

```jsx
import { useState } from "react";
import { FORFEITS } from "../data/forfeits.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

export default function WheelPreviewCard() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: C.white,
      borderRadius: RADIUS.md,
      border: `1px solid ${C.sandDark}`,
      marginBottom: 16,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "transparent",
          border: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 14,
          color: C.dark,
          cursor: "pointer",
        }}
      >
        <span>🎰 What's on the wheel</span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          borderTop: `1px solid ${C.sandDark}`,
          padding: "12px 16px",
        }}>
          {FORFEITS.map((f) => (
            <div key={f.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 0",
              fontFamily: "Nunito, sans-serif",
              fontSize: 13,
              color: C.dark,
            }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount on the Board**

In `src/routes/LeaderboardPage.jsx`, add the import:

```jsx
import WheelPreviewCard from "../components/WheelPreviewCard.jsx";
```

Render the card inside the existing first `<SectionBand>` block, AFTER the tabs and BEFORE the leaderboard card. The exact position: between the tab-pill `<Reveal>` block and the leaderboard `<Reveal><Card padding={0}...>` block. Wrap in a `<Reveal>` for consistency:

```jsx
        <Reveal>
          <WheelPreviewCard />
        </Reveal>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean. Bundle grows by ~1 KB.

- [ ] **Step 4: Commit**

```bash
git add src/components/WheelPreviewCard.jsx src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): What's on the wheel preview card

Collapsible card listing all forfeits, mounted between the
leaderboard tabs and the standings card. Default collapsed.
Reads from src/data/forfeits.js. Builds suspense / anchors
the stakes during the playing day.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review summary (run after each phase ships)

After each phase:
- `npm run build` clean
- `npm test` all green
- Visual smoke on the dev server for UI tasks

## After this plan ships

The Board Overhaul spec is complete. Out-of-scope deferrals from earlier specs (auto-midnight close, per-user "has revealed" tracking, undo for admin tie-break, push notifications) remain deferred. The scavenger-rework spec (Adan's daily-categorical idea, parked) is a separate initiative.
