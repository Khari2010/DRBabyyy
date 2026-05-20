# Rollover Rewrite — Implementation Plan (Bundle D)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `rollovers.trigger` into `lockDay` + `advance` so the day-close ceremony has an intermediate "locked but not advanced" state. This unblocks Flow State voting (which only opens after lockDay) and lets the existing wheel ceremony resolve before the day rolls over.

**Architecture:** New `closedAt` field on the `rollovers` table acts as the lock signal. `lockDay` patches the closing-day rollover row with `loserSlug` + `closedAt`. `advance` is gated on `closedAt` being set on the current day's rollover, AND on `flowWinnerSlug` being set (the Flow State gate from the deferred T7 of the Flow State plan). The existing `trigger` mutation becomes a backward-compat wrapper calling `lockDay` then `advance` so the kickoff button and any stale clients keep working.

**Tech Stack:** Convex 1.39, `convex-test` + vitest, React 18, Vite. No new deps.

**Reference specs:**
- `docs/superpowers/specs/2026-05-20-board-overhaul-design.md` §3.1, §4.1, §4.2 — the lockDay/advance design and revised hard-lock guards
- `docs/superpowers/specs/2026-05-20-max-flow-state-vote-design.md` §4.5 — the Flow State advance gate

**Out of scope for this bundle (deferred to future):**
- Server-side forfeit picking (RevealFlow keeps using client-side WheelOfFortune + `rollovers.recordForfeit`)
- Per-phone deterministic reveal (each phone keeps spinning the same animated wheel, but only the loser's spin records the forfeit — unchanged from today)
- Removing the `trigger` wrapper — kept as backward-compat for now

---

## File Structure

**Backend (Convex)**

| File | What |
|---|---|
| `convex/schema.ts` | **modify** — add `closedAt: v.optional(v.number())` to `rollovers`, add `by_daily_key` index |
| `convex/rollovers.ts` | **modify** — add `lockDay` + `advance`; rewrite `trigger` as wrapper |
| `convex/rollovers.test.ts` | **modify** — add `lockDay` + `advance` coverage; existing `trigger` tests should keep passing |
| `convex/entries.ts` | **modify** — revise vouch/dispute hard-lock guards to use `closedAt` (with `dailyKey` mismatch as legacy fallback) |
| `convex/entries.test.ts` | **modify** — add coverage for `closedAt`-based lock |

**Frontend (React)**

| File | What |
|---|---|
| `src/routes/LeaderboardPage.jsx` | **modify** — End Day button calls `lockDay` instead of `trigger`; takeover opens on the now-locked-but-not-advanced day |
| `src/routes/AdminPage.jsx` | **modify** — add an explicit **Advance** button (separate from End Day), disabled with hint when current day isn't locked OR Flow State isn't resolved |

No new files. No new dependencies.

---

## Task 1: Schema — `closedAt` field + `by_daily_key` index on rollovers

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Edit `convex/schema.ts`**

Find the `rollovers: defineTable({...})` block. It currently has the Flow State fields added in the prior bundle. Add `closedAt` after `spunAt`:

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
    flowWinnerSlug: v.optional(v.string()),
    flowResolvedAt: v.optional(v.number()),
    flowTieCandidates: v.optional(v.array(v.string())),
    flowForcedClose: v.optional(v.boolean()),
  })
    .index("by_day_number", ["dayNumber"])
    .index("by_daily_key", ["dailyKey"]),
```

- [ ] **Step 2: Regen bindings**

Run: `npx convex codegen`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all existing tests pass. The schema additions are backwards-compatible.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(rollovers): closedAt field + by_daily_key index"
```

---

## Task 2: `rollovers.lockDay` mutation (TDD)

**Files:**
- Modify: `convex/rollovers.ts`
- Modify: `convex/rollovers.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `convex/rollovers.test.ts`:

```ts
describe("rollovers.lockDay", () => {
  it("sets loserSlug + closedAt on the closing day rollover; does NOT advance gameState", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    // Bootstrap to Day 1 via existing trigger (kickoff path)
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    // Seed entries so there's a clear loser
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "negative", subjectSlug: "camara", negativeId: "throw-up", appliedBySlug: "kai", points: -50, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(1); // NOT advanced
    const day1 = await t.run((ctx) =>
      ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first(),
    );
    expect(day1?.loserSlug).toBe("camara");
    expect(day1?.closedAt).toBeDefined();
  });

  it("refuses non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.lockDay, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
  });

  it("refuses when day is already locked", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.lockDay, { token: "tok-khari" }))
      .rejects.toThrow(/already locked/);
  });

  it("refuses when games are not live", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    // gameState exists from setupAdmins but gamesLive=false; no trigger yet
    await expect(t.mutation(api.rollovers.lockDay, { token: "tok-khari" }))
      .rejects.toThrow(/games not live/);
  });

  it("locks an empty day with no loserSlug", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    // No entries at all
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const day1 = await t.run((ctx) =>
      ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first(),
    );
    expect(day1?.closedAt).toBeDefined();
    expect(day1?.loserSlug).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, confirm failures**

Run: `npm test -- rollovers`
Expected: FAIL — `lockDay` is not defined.

- [ ] **Step 3: Implement `lockDay` in `convex/rollovers.ts`**

Add this new export. Place it AFTER the existing `trigger` mutation (we'll rewrite `trigger` in Task 4):

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

    // Compute loser (lowest score among non-disputed entries)
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
      if (total < loserTotal) { loserSlug = slug; loserTotal = total; }
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
```

- [ ] **Step 4: Run tests**

Run: `npm test -- rollovers`
Expected: PASS — all 5 `lockDay` tests + all pre-existing `trigger` tests still green.

- [ ] **Step 5: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts convex/_generated
git commit -m "feat(rollovers): lockDay mutation"
```

---

## Task 3: `rollovers.advance` mutation (TDD) — gated on closedAt AND flowWinnerSlug

**Files:**
- Modify: `convex/rollovers.ts`
- Modify: `convex/rollovers.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `convex/rollovers.test.ts`:

```ts
describe("rollovers.advance", () => {
  it("kickoff: pre-trip → Day 1 (no lock required)", async () => {
    const t = convexTest(schema);
    await setupAdmins(t); // gamesLive=false at this point
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.gamesLive).toBe(true);
    expect(state?.currentDayNumber).toBe(1);
    expect(state?.currentDailyKey).toBe("day-1");
    const rows = await t.run((ctx) => ctx.db.query("rollovers").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].dayNumber).toBe(1);
  });

  it("refuses to advance when current day is not locked", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" }); // kickoff → Day 1
    await expect(t.mutation(api.rollovers.advance, { token: "tok-khari" }))
      .rejects.toThrow(/lock the day first/);
  });

  it("refuses to advance when day is locked but Flow State is not resolved", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" }); // kickoff
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    // closedAt is set, but flowWinnerSlug is not
    await expect(t.mutation(api.rollovers.advance, { token: "tok-khari" }))
      .rejects.toThrow(/resolve flow state|flow.*not resolved/i);
  });

  it("advances when day is locked AND flowWinnerSlug is set", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(2);
    expect(state?.currentDailyKey).toBe("day-2");
    const rows = await t.run((ctx) => ctx.db.query("rollovers").collect());
    expect(rows.length).toBe(2);
    expect(rows.find((r) => r.dayNumber === 2)).toBeDefined();
  });

  it("refuses non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await expect(t.mutation(api.rollovers.advance, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
  });
});
```

- [ ] **Step 2: Run, confirm failures**

Run: `npm test -- rollovers`
Expected: FAIL — `advance` is not defined.

- [ ] **Step 3: Implement `advance` in `convex/rollovers.ts`**

Append:

```ts
export const advance = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const now = Date.now();

    // Kickoff: pre-trip → Day 1
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

    // Normal advance: requires current day be locked AND Flow State resolved
    const current = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!current?.closedAt) throw new Error("lock the day first");
    if (!current.flowWinnerSlug) {
      throw new Error("Flow State not resolved — resolve flow state before advancing");
    }

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

Run: `npm test -- rollovers`
Expected: PASS — all 5 `advance` tests + 5 `lockDay` tests + pre-existing `trigger` tests should still be green (since `trigger` hasn't changed yet).

If any pre-existing `trigger` test fails, STOP and report — the Flow State gate may be leaking through `trigger` somehow.

- [ ] **Step 5: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts convex/_generated
git commit -m "feat(rollovers): advance mutation + Flow State gate"
```

---

## Task 4: Rewrite `rollovers.trigger` as a backward-compat wrapper

**Files:**
- Modify: `convex/rollovers.ts`
- Modify: `convex/rollovers.test.ts`

**Context:** `trigger` is still being called by `LeaderboardPage.jsx`'s End Day button. To avoid breaking that path before Task 6 rewires the client, rewrite `trigger` to call `lockDay` + `advance` in sequence. But — `advance` now requires `flowWinnerSlug`, which `trigger`'s atomic-close semantics never set. So `trigger` needs to special-case: set a synthetic flow winner (the loser? the current player?), or use an internal bypass.

**Decision:** `trigger` sets `flowWinnerSlug = loserSlug` (placeholder, since there's no real vote in the legacy flow). This preserves existing test expectations and gives Flow State an explicit no-op semantics for the atomic path. The crown won't appear because the actual flow vote never happened. Mark with `flowForcedClose: true` to make the synthetic resolution obvious in data.

This is a temporary backward-compat shim. The proper fix is Task 6 (rewire LeaderboardPage).

- [ ] **Step 1: Replace `trigger` body**

Replace the existing `export const trigger = mutation({...})` block in `convex/rollovers.ts` with:

```ts
export const trigger = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const now = Date.now();

    // Kickoff path: same as advance()
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

    const closingKey = state.currentDailyKey;
    const closingDay = state.currentDayNumber;

    const nextDayRollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", closingDay + 1))
      .first();
    if (nextDayRollover) throw new Error("day already closed");

    // Compute loser (same logic as lockDay)
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
      if (total < loserTotal) { loserSlug = slug; loserTotal = total; }
    }

    // Patch existing rollover OR insert one — set closedAt + (synthetic) flowWinnerSlug.
    // The synthetic flow winner is the loser themselves, marked as forced-close, so the
    // crown UI does not render (no flow vote ever happened in this legacy atomic path).
    const existing = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", closingDay))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        loserSlug,
        closedAt: now,
        flowWinnerSlug: loserSlug ?? playerSlug,
        flowResolvedAt: now,
        flowForcedClose: true,
      });
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        loserSlug,
        closedAt: now,
        flowWinnerSlug: loserSlug ?? playerSlug,
        flowResolvedAt: now,
        flowForcedClose: true,
      });
    }

    // Advance
    const newDay = closingDay + 1;
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

Note: the synthetic `flowWinnerSlug` will also insert a `flowWin` entries row if we ran it through `finaliseFlowResolution`, but we deliberately DON'T do that here — the legacy atomic close should not award +10 to a phantom winner. The UI consumes `phase` from `getFlowVoteState`, which becomes "resolved" with a winnerSlug, but the Board's crown render reads from `rollover.flowWinnerSlug` only for the CURRENT day (not historical). Once `advance` rolls over, that row is no longer "current" so the crown emoji isn't shown on the Board.

However, the lifetime tally from `getFlowHistory` counts every rollover with `flowWinnerSlug`. To prevent the synthetic winner from polluting lifetime tallies, exclude `flowForcedClose: true` rows in `getFlowHistory`.

- [ ] **Step 2: Update `getFlowHistory` to skip forced-close rows**

Edit `convex/flowVotes.ts`. In `getFlowHistory`, change the loop:

```ts
    for (const r of rollovers) {
      if (r.flowWinnerSlug && !r.flowForcedClose) {
        lifetime[r.flowWinnerSlug] = (lifetime[r.flowWinnerSlug] ?? 0) + 1;
        byDay.push({ dayNumber: r.dayNumber, dailyKey: r.dailyKey, winnerSlug: r.flowWinnerSlug, resolvedAt: r.flowResolvedAt ?? 0 });
      }
    }
```

Wait — this would also skip *genuine* admin force-closes (admin clicked Force close → admin picked from candidates → that's a real winner). Adjust the discriminator: only skip rollovers where `flowForcedClose === true` AND `flowResolvedAt` was set in the same millisecond as `closedAt` (the unmistakable signature of the synthetic `trigger` shim) — actually, simpler: introduce a new boolean `flowSynthetic` set only by `trigger`. But that's another schema field.

Simpler still: leave `getFlowHistory` as-is. The synthetic winner is `loserSlug` — the day's loser also "winning" Flow State is a recognizable signal. In practice, after this bundle ships and Task 6 rewires LeaderboardPage to call `lockDay` instead of `trigger`, the legacy `trigger` path is dead — no new synthetic rows get created. So the pollution is a one-shot historical thing.

**Decision: do not modify `getFlowHistory`.** The trigger wrapper is temporary; once LeaderboardPage rewires, no new synthetic rows occur.

(Skip "Step 2" above. The trigger rewrite is the only change in this task.)

- [ ] **Step 3: Update pre-existing `trigger` tests**

Some pre-existing `trigger` tests in `convex/rollovers.test.ts` assert specific rollover row shapes. After the rewrite, those rows will have `closedAt`, `flowWinnerSlug`, `flowResolvedAt`, `flowForcedClose` set. Run the tests:

Run: `npm test -- rollovers`

If existing tests break, patch each one to also assert the new fields are present (e.g. `expect(day1?.closedAt).toBeDefined()`). Do NOT relax the existing expectations.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: full suite green.

- [ ] **Step 5: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts convex/_generated
git commit -m "refactor(rollovers): trigger now wraps lockDay+advance with synthetic flow winner"
```

---

## Task 5: Vouch/dispute hard-lock guards use `closedAt`

**Files:**
- Modify: `convex/entries.ts`
- Modify: `convex/entries.test.ts`

**Context:** Today's hard-lock guards (board overhaul spec §4.2) check `entry.dailyKey !== state.currentDailyKey`. Under the new lifecycle, gameState doesn't advance until `advance`, so during the lock → reveal → flow-vote → advance window, the existing check silently allows vouches. Revise to check `closedAt` on the entry's rollover row, with `dailyKey` mismatch as a legacy fallback.

- [ ] **Step 1: Add a failing test**

Append to `convex/entries.test.ts` (or wherever the vouch/dispute tests live — find the existing `vouch` test block):

```ts
describe("entries.vouch — closedAt lock", () => {
  it("refuses vouch on an entry whose day is locked (closedAt set), even before advance", async () => {
    const t = convexTest(schema);
    // Bootstrap players + admin + Day 1 open + an entry
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
        await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      }
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: Date.now(),
        closedAt: Date.now(), // <-- day locked, NOT advanced
      });
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "khari", challengeId: "x",
        points: 5, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
    });
    const entryId = await t.run(async (ctx) => (await ctx.db.query("entries").first())!._id);
    await expect(t.mutation(api.entries.vouch, { token: "tok-kai", entryId }))
      .rejects.toThrow(/locked|prior day|closed/i);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm test -- entries`
Expected: FAIL — vouch succeeds despite the day being locked.

- [ ] **Step 3: Update the vouch guard**

In `convex/entries.ts`, find the `vouch` mutation and the existing check. It looks roughly like:

```ts
const state = await getGameState(ctx);
if (entry.dailyKey !== state.currentDailyKey) {
  throw new Error("cannot vouch on a prior day");
}
```

Replace with:

```ts
const state = await getGameState(ctx);
if (!state) throw new Error("gameState not seeded");
// Prefer the closedAt signal — catches the lock→advance window.
const entryRollover = await ctx.db
  .query("rollovers")
  .withIndex("by_daily_key", (q) => q.eq("dailyKey", entry.dailyKey))
  .first();
if (entryRollover?.closedAt) {
  throw new Error("cannot vouch on a closed day");
}
// Legacy fallback: dailyKey mismatch (catches historical rows that pre-date closedAt).
if (entry.dailyKey !== state.currentDailyKey) {
  throw new Error("cannot vouch on a prior day");
}
```

Apply the same pattern to the `dispute` mutation.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: full suite green — the new test passes, and pre-existing vouch/dispute tests still pass (legacy fallback covers their setup).

- [ ] **Step 5: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "fix(entries): hard-lock vouch/dispute via closedAt, not just dailyKey"
```

---

## Task 6: LeaderboardPage End Day uses `lockDay` (not `trigger`)

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** End Day's job is now to *lock* the day and open the takeover — not to advance. Advance happens on `/admin` after Flow State resolves.

- [ ] **Step 1: Swap the mutation**

In `src/routes/LeaderboardPage.jsx`, find:

```jsx
const trigger = useMutation(api.rollovers.trigger);
```

Replace with:

```jsx
const lockDay = useMutation(api.rollovers.lockDay);
```

Then find the `handleEndDay` function (around line 234). Change the body's `await trigger(...)` call to `await lockDay(...)`.

The takeover still opens with `setTakeoverDay(closingDay); setTakeoverOpen(true);` — that's fine, the takeover reads from `rollovers.get` which sees the locked-but-not-advanced row.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual sanity (dev server)**

Run: `npm run dev`. As admin, with at least one entry on the current day:
1. Tap End Day → confirm sheet → confirm.
2. Takeover opens. Loser banner shows.
3. Check `/admin` — gameState.currentDayNumber should still be the closing day (not advanced).
4. The vote card should appear on the Board (because `phase` is now "voting").

- [ ] **Step 4: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "feat(board): End Day now locks the day (no auto-advance)"
```

---

## Task 7: Admin Advance button + gate hints

**Files:**
- Modify: `src/routes/AdminPage.jsx`

- [ ] **Step 1: Pull state + mutation**

Inside `AdminPage` near the other queries:

```jsx
const advance = useMutation(api.rollovers.advance);
const currentRollover = useQuery(
  api.rollovers.get,
  gameState?.currentDayNumber ? { dayNumber: gameState.currentDayNumber } : "skip",
);
```

`gameState` is available via `useGameState()` (already imported).

- [ ] **Step 2: Render the Advance button**

Near the existing day-control buttons (the "End Day" button area, or wherever `trigger` is currently used), add:

```jsx
{isAdmin && gameState?.gamesLive && (
  <Reveal>
    <button
      type="button"
      onClick={async () => {
        if (!token) return;
        if (!confirm(`Advance from Day ${gameState.currentDayNumber} to Day ${gameState.currentDayNumber + 1}?`)) return;
        try {
          await advance({ token });
        } catch (err) {
          alert(err.message);
        }
      }}
      disabled={!currentRollover?.closedAt || !currentRollover?.flowWinnerSlug}
      title={
        !currentRollover?.closedAt
          ? "Lock the day first (End Day on /leaderboard)"
          : !currentRollover?.flowWinnerSlug
          ? "Resolve Flow State first"
          : undefined
      }
      style={{
        marginBottom: 12,
        padding: "10px 14px",
        borderRadius: RADIUS.md,
        background: (!currentRollover?.closedAt || !currentRollover?.flowWinnerSlug) ? C.sandDark : C.dark,
        color: C.white,
        border: 0,
        fontFamily: "Nunito, sans-serif",
        fontWeight: 800,
        fontSize: 13,
        cursor: (!currentRollover?.closedAt || !currentRollover?.flowWinnerSlug) ? "not-allowed" : "pointer",
        opacity: (!currentRollover?.closedAt || !currentRollover?.flowWinnerSlug) ? 0.6 : 1,
      }}
    >
      Advance to Day {gameState.currentDayNumber + 1}
    </button>
  </Reveal>
)}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/routes/AdminPage.jsx
git commit -m "feat(admin): explicit Advance button with lock + flow-state gates"
```

---

## Task 8: Ceremony auto-progression to crown stage

**Files:**
- Modify: `src/components/RevealFlow.jsx`

**Context:** Today the crown stage requires a manual "Continue to Flow State 👑 ▶" tap. With the new lifecycle, the forfeit-recorded state means the wheel is done — auto-progress to stage 4.

- [ ] **Step 1: Auto-advance from stage 3 once forfeitId is recorded**

In `convex/RevealFlow.jsx`, add a `useEffect` near the top of the component:

```jsx
useEffect(() => {
  if (stage === 3 && rollover.forfeitId && rollover.forfeitId !== "deduct") {
    const id = setTimeout(() => setStage(4), 1800); // give the forfeit reveal animation time
    return () => clearTimeout(id);
  }
}, [stage, rollover.forfeitId]);
```

(Add `useEffect` to the React import at the top of the file if it's not already imported.)

- [ ] **Step 2: Remove the manual "Continue" button**

The button added in the Flow State plan's T13 can stay as a fallback for users who close and re-enter the takeover, OR it can be removed in favor of the auto-advance. Remove it for cleanness — the auto-advance handles the happy path, and re-entering the takeover with `forfeitId` already set still triggers the effect (the timer fires, then stage flips to 4).

Find and DELETE the block:

```jsx
<button
  type="button"
  onClick={() => setStage(4)}
  style={{
    marginTop: 20,
    padding: "12px 20px",
    borderRadius: RADIUS.md,
    background: C.gold,
    color: C.dark,
    ...
  }}
>
  Continue to Flow State 👑 ▶
</button>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/RevealFlow.jsx
git commit -m "feat(reveal): auto-advance to crown stage after forfeit lands"
```

---

## Task 9: Full smoke + suite green

**Files:** (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass (303+ from prior bundles, plus ~12 new tests from this bundle).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: End-to-end manual smoke**

Run: `npm run dev`. With 2+ crew (incognito + normal Chrome works):

1. As admin (khari), tap **End Day** on `/leaderboard` → takeover opens → wheel spins → forfeit lands → after ~1.8s the crown stage shows "Waiting on Flow State vote · 0 of N voted".
2. From each crew tab, tap a chip on the **FlowStateVoteCard** on `/leaderboard`. Counter updates live.
3. After every crew has voted with a clear winner → crown stage animates the winner → vote card disappears from the Board → 👑 prefix appears on the winner's row.
4. Go to `/admin` → **Advance** button is now enabled. Tap it → confirm → day rolls over to N+1.
5. Visit `/leaderboard` again — back to clean state (no vote card, no crown, History tab shows the prior day with both the loser and 👑 winner).
6. Visit `/player/<winner>` — lifetime Flow State wins shows at least 1.

**Tie path:**
1. End Day. Have two crew tied on votes. After all votes in, vote card shows "Tied — admin is picking". `/admin` shows the tie-break card. Pick a winner → crown stage animates → Advance enables.

**Force-close path:**
1. End Day. Some crew don't vote. On `/admin`, tap **Force close Flow State vote**. With one vote → that vote wins. With zero votes → admin picks from all crew.

- [ ] **Step 4: Commit any final fixes**

If smoke uncovered issues, fix them and commit. Otherwise skip.

```bash
git add -A
git commit -m "chore(rollovers): post-smoke fixes"
```

---

## Self-Review

**Spec coverage** (board-overhaul §3.1, §4.1, §4.2 + Flow State §4.5):
- lockDay mutation → Task 2 ✓
- advance mutation with flow-state gate → Task 3 ✓
- trigger as backward-compat wrapper → Task 4 ✓
- closedAt + by_daily_key index → Task 1 ✓
- Vouch/dispute guard revision → Task 5 ✓
- LeaderboardPage End Day uses lockDay → Task 6 ✓
- Admin Advance button + hints → Task 7 ✓
- Crown stage auto-advance → Task 8 (this also closes the "ceremony UX polish" item from the post-Flow-State punch list)
- Smoke → Task 9 ✓

**Out of scope (explicitly deferred):**
- Server-side forfeit picking — RevealFlow still uses `WheelOfFortune` + client recordForfeit.
- Per-phone deterministic reveal — wheel still spins locally per device; only the loser's device records the forfeit. Same as today.
- Removing the `trigger` wrapper — temporary backward-compat.

**Placeholder scan:** No "TBD", no "TODO". Every step has executable content or exact diff sites.

**Type/name consistency:**
- `lockDay`, `advance`, `closedAt`, `flowWinnerSlug` — consistent across Tasks 1–7.
- `flowForcedClose` semantics carried forward from the Flow State plan.

Plan is self-consistent and unblocks Flow State end-to-end.
