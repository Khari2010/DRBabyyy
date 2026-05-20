# Board Overhaul — Design Spec

**Date:** 2026-05-20
**Status:** Designed, awaiting review
**Target ship:** Before the trip starts; sibling to the just-shipped scavenger + end-day work
**Predecessor spec:** `docs/superpowers/specs/2026-05-20-end-day-wheel-takeover-design.md` (some of its UX decisions are now superseded — see §10)

## 1. Purpose

Overhaul `/leaderboard` (the Board) so that it serves the crew's two real uses of the page:

- **Glance at standings during the day** — who's leading, who hasn't started, who has pending vouches.
- **Run the day-close ceremony together at breakfast** — every crew member on their own phone, individually revealing the day's loser + punishment in a synchronized moment.

The Board today does enough to be live but it lacks legibility (small grey text for verification status, no zero-score players, inconsistent name policy) and the day-close flow was designed assuming a single shared device. This spec reframes the ceremony as a *per-phone, server-synchronised reveal* and tightens the row layout for at-a-glance use.

## 2. Decisions locked during brainstorm

| Topic | Decision |
|---|---|
| Names on the Board | **Holiday names only** on all surfaces (rows, live feed, history, drill-down). Legal names retire to admin/login only. |
| Zero-score players | **Show all crew**, sort by score desc, zero-scorers sit at the bottom with muted styling. |
| Verified visualization | **Two-number chip** per row: `3 of 4 verified`. Replaces the small grey `4 claims · 0 🛡` line. |
| Player drill-down | **Tap a row → BottomSheet** showing that player's day claims, vouches, scavenger finds, foul history. |
| "You" affordance | Small **`you` pill** next to your own name on your row. |
| Day header | Subtle subtitle under "Leaderboard": `N of M crew playing · K claims today`. |
| End Day button on Board | **Removed.** The action lives only on `/admin` (the canonical home). |
| Rollover ceremony | **Per-phone, individually triggered Reveal** with server-determined result. Each crew member taps Reveal when ready; their wheel animates to the predetermined forfeit. Replay-friendly (button stays). |
| Day advance | **Admin-only**, explicit, on `/admin`. Lock and advance are now two separate steps. |
| Wheel preview during the day | **Yes** — collapsible "What's on the wheel" card on the Board. Default collapsed. |
| Polish items | All 5 from the handover review: skip activity query when logged out, loading skeleton, foul tap target, last-row border, `useMemo` for history. |

## 3. Architecture overview

### 3.1 Lifecycle of a day (new model)

```
   Day N opens             Crew claims, vouches, fouls           Admin locks day on /admin             Each crew member taps Reveal           Admin advances on /admin
       │                            │                                       │                                       │                                    │
       ▼                            ▼                                       ▼                                       ▼                                    ▼
   gameState              entries.dailyKey                      rollover row patched                      WheelOfFortune anim on               gameState advances
   currentDayNumber=N     === currentDailyKey                   with loserSlug +                          that phone lands on the              N → N+1 and a
                          (writes allowed)                      forfeitId +                               server-picked forfeit                placeholder rollover
                                                                forfeitLabel +                                                                  for N+1 inserts
                                                                spunAt
                                                                (writes locked)
```

Compared to today, the trigger is now split: **lockDay** and **advance** are separate explicit steps, with the per-phone reveal sitting between them.

### 3.2 Why server-side forfeit picking

Today `WheelOfFortune.jsx` picks a random forfeit client-side and calls `rollovers.recordForfeit` with the result. Under the new model, the forfeit must be **the same on every phone** so the synchronised reveal works.

The cleanest way: pick the forfeit server-side at `lockDay` time, store it on the rollover row, and have `WheelOfFortune` accept a `target` prop so each phone animates to the same landing slot. No per-device randomness, no race between phones to record the result.

This deprecates `rollovers.recordForfeit` from the client path. It can stay as a backstop for the `deduct` forfeit (see §4.3) but the spin-to-record flow goes away.

### 3.3 Reusable components

| Component | Status |
|---|---|
| `WheelOfFortune.jsx` | Modified — accepts a `targetForfeitId` prop and animates to land on it. |
| `RevealFlow.jsx` | Modified — Stage 1 (banner) + Stage 2 (scoreboard) + Stage 3 (wheel) survive but with the new deterministic wheel. The deduct-picker sub-flow still belongs to the loser only. |
| `EndDayTakeover.jsx` | Repurposed — opens when *any* crew member taps Reveal on the Board, not just on admin's End Day. |
| `BottomSheet.jsx` | Reused for the new player drill-down sheet. |

## 4. Convex changes

### 4.1 Split `rollovers.trigger` into `lockDay` and `advance`

Current `rollovers.trigger` does three things atomically: (a) compute loser, (b) patch the closing-day rollover, (c) advance `gameState` to N+1 and insert a placeholder. The new flow needs these split:

```ts
// convex/rollovers.ts

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
      .withIndex("by_day_number", q => q.eq("dayNumber", closingDay))
      .first();
    if (existing?.closedAt) throw new Error("day already locked");

    // Compute loser (lowest score among non-disputed entries, ties broken by earliest claim)
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", q => q.eq("dailyKey", closingKey))
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

    // Server picks the forfeit
    const { id: forfeitId, label: forfeitLabel } = pickForfeit();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        loserSlug, forfeitId, forfeitLabel, spunAt: now, closedAt: now,
      });
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        loserSlug,
        forfeitId,
        forfeitLabel,
        spunAt: now,
        closedAt: now,
      });
    }
    // Note: gameState is NOT advanced here.
  },
});

export const advance = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    // Kickoff path: pre-trip → Day 1
    if (!state.gamesLive) {
      const now = Date.now();
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

    // Normal advance: requires current day be locked
    const current = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", q => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!current?.closedAt) throw new Error("lock the day first");

    const newDay = state.currentDayNumber + 1;
    const newDailyKey = `day-${newDay}`;
    const now = Date.now();
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

`pickForfeit()` is a server-side helper in `convex/rollovers.ts` that does a uniform random pick across the forfeits roster. The roster source stays at `src/data/forfeits.js` and Convex imports it directly — same pattern `convex/entries.ts` already uses for `src/data/scavenger.js`. Uniform random across all entries (including `deduct`).

`rollovers.trigger` is **kept** for backward compatibility on `/admin` only (it now just calls `lockDay` + `advance` in sequence — preserves the "trigger rollover" affordance for emergency atomic close).

### 4.2 Hard-lock guards — revise

The hard-lock guards I just shipped check `entry.dailyKey !== state.currentDailyKey`. Under the new model `gameState` doesn't advance until `advance`, so the existing check would silently allow vouches/disputes during the lock → reveal → advance window.

Revise the guard to use a dedicated `closedAt` field on the rollover row as the lock signal. **Why a new field instead of reusing `loserSlug`:** empty-day locks leave `loserSlug` undefined (no claims = no loser), but the day still needs to be locked against retroactive vouching.

**Schema change:** add `closedAt: v.optional(v.number())` to the `rollovers` table. Set it inside `lockDay` (always, even for empty days, alongside `spunAt`). Add a `by_daily_key` index on `rollovers` (needed for the guard's lookup).

Revised guard (applies to both `entries.vouch` and `entries.dispute`) — belt-and-braces: `closedAt` catches the lock→reveal→advance window for fresh locks; the `dailyKey` mismatch catches historical days that pre-date this spec (no `closedAt` on the row but gameState has long since advanced past them).

```ts
const state = await getGameState(ctx);
const rollover = await ctx.db
  .query("rollovers")
  .withIndex("by_daily_key", q => q.eq("dailyKey", entry.dailyKey))
  .first();
const locked = !!rollover?.closedAt
  || (state && entry.dailyKey !== state.currentDailyKey);
if (locked) {
  throw new Error("day is locked");
}
```

### 4.3 `recordForfeit` — keep for the deduct case, drop from the spin flow

The `deduct` forfeit is interactive: the loser picks a target who loses 50 points. Under the new model, the picker still runs on the loser's phone (Stage 3 of `RevealFlow`), and it still calls `entries.applyForfeitDeduct` to record the target. That mutation stays.

`rollovers.recordForfeit` is dropped from the client spin path — the forfeit is already baked in at `lockDay` time. We can either delete the mutation outright or keep it as a no-op for backward compat. Recommendation: **delete it**; the rollover row already has the forfeit fields populated at lockDay time, so any caller would be redundant.

### 4.4 Updated idempotency

The current idempotency check ("rollover for `closingDay + 1` already exists") still works for `advance` (don't advance twice) but not for `lockDay`. For `lockDay`, the existing "already locked" check (`existing?.loserSlug` in §4.1) is the idempotency guard — same shape, different field.

## 5. UI changes

### 5.1 Row layout

```
┌──────────────────────────────────────────────────────────┐
│ 🥇  🧑‍🎤  DOM             [you]              +56          │
│         3 of 4 verified                                  │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ 🥈  🧑‍🎤  ZAY                                +32          │
│         2 of 2 verified                                  │
└──────────────────────────────────────────────────────────┘
┌── muted ────────────────────────────────────────────────┐
│     🧑‍🎤  ROBE                               +0           │
│         no claims yet                                    │
└──────────────────────────────────────────────────────────┘
```

- **Holiday name** in bold (large), no legal-name sub
- **Two-number chip** for verified status: a small pill below the name with `N of M verified` (greyed for 0/0)
- **`you` pill** appears only on the logged-in player's row
- **Zero-scorers** muted: reduced opacity (~50%), `no claims yet` instead of the verified chip, no medal
- **Whole row is tappable** to open the drill-down sheet (see §5.2)
- **Foul button** stays where it is but gets the iOS-safe tap target (44pt min)

### 5.2 Player drill-down (BottomSheet)

Tap any row → BottomSheet slides up with that player's day (or holiday — depends on active tab? **decision: scoped to active tab** — Today tab → today's claims, Holiday tab → all-time claims).

Sheet content:

```
─────────────────────────
🌴 DOM's Day 1
─────────────────────────
Claims
  +25 🔍 Old domino tile           verified
  +15 🎤 Sing in Public            pending
  +15 🎤 Sing in Public            verified
  +1  💆 Give Massage              pending

Received
  Vouched by ZAY × 2
  Vouched by BIG × 1

Fouls
  (none today)
─────────────────────────
```

Sheet width follows the existing `BottomSheet` primitive. ESC and backdrop click dismiss as standard. No mutation actions inside the sheet for v1 (read-only) — vouching still happens from the live feed.

### 5.3 Section header

```
       DAY 1
   Leaderboard
4 of 6 crew playing · 8 claims today
```

The participation + claims line is derived from the daily query rows. Updates live.

### 5.4 Day Summary card (replaces the pending-reveal banner)

When the current day's rollover is locked but not advanced (`rollover.closedAt` set, `gameState.currentDayNumber` still the closed day), the Board shows a **Day Summary card** at the top of the SectionBand — visible to **everyone logged in**, not just admin.

```
┌──────────────────────────────────────────────────────────┐
│ ✨  DAY 1 — closed                                       │
│ The crew is gathered. Tap to reveal the punishment.     │
│                                                          │
│    [   🎰  Reveal punishment   ▶   ]                     │
└──────────────────────────────────────────────────────────┘
```

Tapping the button opens the existing `EndDayTakeover` overlay (full-screen, dark backdrop, animates the `RevealFlow` stages).

**Key behaviours:**
- Card appears the moment `rollover.loserSlug` is set (i.e., right after admin taps Lock Day on /admin — pushed to every phone via Convex's reactive query)
- The Reveal button **stays available** even after the user has revealed once — they can re-spin to relive the moment
- Once admin advances to Day N+1, the card disappears (the new day's rollover is unresolved; the closed day is now in the History section)

### 5.5 EndDayTakeover changes

The takeover I just shipped is mostly correct, but two behaviours change:

1. **Auto-open is removed.** It opens only when the Board's "Reveal punishment" button is tapped, not when admin triggers End Day.
2. **`isAdmin` gate is removed.** Anyone logged in can open it.
3. **Wheel is deterministic.** The mounted `<RevealFlow rollover={...} />` reads `rollover.forfeitId` and `rollover.forfeitLabel` (already set by `lockDay`). It calls `<WheelOfFortune targetForfeitId={rollover.forfeitId} onResult={...} />`. The `onResult` callback no longer calls `recordForfeit` — it just toggles the card to Stage 3 review state. For `deduct`, the `DeductPicker` flow runs only on the loser's phone (gated by `session.slug === rollover.loserSlug`).

### 5.6 WheelOfFortune changes

Modify `src/components/games/WheelOfFortune.jsx`:

- Add a `targetForfeitId` prop
- Compute the final rotation angle so the wheel lands on the slot matching `targetForfeitId` (currently the angle is random)
- Keep the spin duration (4.5s) and easing — the animation is the same, just deterministic

Old call sites that pass no `targetForfeitId` should fall back to random — but after this spec ships, the only call site is `RevealFlow.jsx` and it always passes one.

### 5.7 /admin changes

Replace the single "Manual rollover (fallback)" button with two distinct buttons:

```
┌──────────────────────────────────────────────────────────┐
│ Game state                                               │
│ ● LIVE · Day 1                                           │
│                                                          │
│   [ 🔒 Lock Day 1 ]            ← step 1                  │
│   [ ▶ Start Day 2 ]            ← step 2 (disabled        │
│                                  until Day 1 is locked)  │
│                                                          │
│   [ ↩ Undo last rollover ]                               │
└──────────────────────────────────────────────────────────┘
```

When `gamesLive=false`, the second button reads `Start the games` (kickoff path).

The buttons can both reuse `ActionButton`. State-derived disabling: `Start Day N+1` only enabled when the current day's rollover has `loserSlug` set.

### 5.8 What's on the wheel — collapsible preview card on Board

A new card under the leaderboard / above the live feed, default collapsed:

```
┌──────────────────────────────────────────────────────────┐
│ 🎰 What's on the wheel                            ▼       │
└──────────────────────────────────────────────────────────┘
```

Expanded:

```
┌──────────────────────────────────────────────────────────┐
│ 🎰 What's on the wheel                            ▲       │
├──────────────────────────────────────────────────────────┤
│ ❄️  Cold shower (1 min)                                   │
│ 🌶️  Eat a chili                                           │
│ 💋  Kiss the next stranger                                │
│ 💸  Deduct 50 from someone                                │
│ … (full list from src/data/forfeits.js)                   │
└──────────────────────────────────────────────────────────┘
```

State is local (uncontrolled, `useState(false)`). Localstorage optional — not needed for v1.

### 5.9 Polish items (no design decisions)

1. **`activity` query** — gate behind `loggedIn`: pass `"skip"` when there's no session token, instead of firing unconditionally.
2. **Loading skeleton** — render a shimmer row (placeholder card with grey blocks) while `daily`/`holiday` are `undefined`. Stop the "No claims yet" flash.
3. **Foul button tap target** — bump padding to satisfy iOS 44pt (`padding: "10px 14px"`, `fontSize: 12`).
4. **Last-row border** — pass an `isLast` flag (or use `:last-child` via styled-component-like inline) to `BoardRow` and the History row, drop `borderBottom` on the final row.
5. **`history` `useMemo`** — wrap the filter+sort in `useMemo(() => allRollovers.filter(...).sort(...), [allRollovers])`.

## 6. UX flow — full day-close ceremony

1. **Mid-day:** crew claims challenges and vouches each other on the Board. Daily standings update live.
2. **Breakfast time, day N done:** admin opens `/admin`, taps **Lock Day N**. Server picks loser + forfeit and patches the rollover row.
3. **All phones update reactively:** the Board shows the new **Day N Summary card** at the top. The hard-lock now blocks any further vouches/disputes on Day N entries.
4. **Each crew member taps `🎰 Reveal punishment ▶` on their own phone:**
   - `EndDayTakeover` opens full-screen on that device
   - Stage 1: "Day N — Closed" with crew stats. Tap "Reveal scores ▼".
   - Stage 2: scoreboard reveal, loser highlighted in coral. Tap "Open the wheel ▶".
   - Stage 3: `WheelOfFortune` mounts with `targetForfeitId` set. The wheel spins for 4.5s and lands on the server-determined forfeit.
   - If forfeit is `deduct` and `session.slug === rollover.loserSlug`: `DeductPicker` renders so the loser chooses a target. Other phones see the eventual result reactively.
   - Otherwise: the forfeit label and icon show ("Cold shower (1 min)" etc.).
5. **After the wheel:** the takeover's close button appears ("Take it like a champ ✕"). Dismiss returns to the Board.
6. **The Reveal button stays on the Day N Summary card** — anyone can tap it again to re-spin (same answer, replay vibe).
7. **Later in the morning:** admin taps **Start Day N+1** on `/admin`. `gameState` advances. The Day N Summary card disappears from the Board (Day N now in History). Day N+1 starts with empty entries.

## 7. Edge cases

| Case | Behaviour |
|---|---|
| Admin taps Lock Day twice | `lockDay` throws "day already locked" (existing rollover has `closedAt`). Idempotent on second attempt. |
| Admin taps Start Day without locking | `advance` throws "lock the day first" (rollover lacks `closedAt`). |
| Crew member with no session opens the Board | No `isAdmin` query fires (skipped). No summary card visible (the card requires `loggedIn` — same gate as the live feed today). |
| Wheel result is `deduct` but the loser hasn't opened it yet | Other phones see "Waiting for {loser} to pick…" placeholder until the loser's deduct mutation lands. |
| Empty day (no entries) gets locked | `lockDay` succeeds. `closedAt` is set so the lock applies; `loserSlug`/`forfeitId` stay undefined. Summary card renders "No claims today — no loser" and shows no Reveal button. Edge case but graceful. |
| User switches tabs (Today ↔ Holiday) while drill-down is open | Sheet stays open. Re-renders content for the new tab when reopened. |
| Player profile data missing for a slug in the live feed | Existing fallback to slug-as-name; we'll switch this to the holiday name everywhere via `useHolidayNameMap` already used by `RevealFlow`. |
| Drift between client wheel slot ordering and server forfeit roster | Wheel uses a deterministic slot order keyed by forfeit ID, not array position. Adding/removing forfeits doesn't desync past rollovers. |

## 8. Backward compatibility / migration

- Existing rollover rows from before this spec: untouched. Old rows without `forfeitId` simply don't appear in the History "Punishments" section (they already don't, since `recordForfeit` was optional).
- Hard-lock guards already shipped use `entry.dailyKey !== state.currentDailyKey`. This spec **augments** that check with the rollover-based one (§4.2) — both signals contribute, so pre-existing rollover rows from before this spec stay locked via the `dailyKey` mismatch. The vouch/dispute tests added in Tasks 1-2 still pass; new tests cover the lock→reveal→advance window.
- `rollovers.trigger` stays in the API as a thin wrapper around `lockDay → advance` for backwards-compat callers (specifically, the existing `/admin` "trigger" button keeps working until we replace it with the two-button UI). After this spec ships, no client code calls `trigger` directly.
- `rollovers.recordForfeit` is removed. No production callers remain after this spec.

## 9. Out of scope (deferred)

- Auto-rollover at midnight DR time. Manual close only.
- Push notifications when the day locks.
- Per-user "has revealed" tracking. Replay-friendly by design; not gating anything on it.
- Editing or weighting the forfeit roster. Roster lives in `src/data/forfeits.js` as today; updates are a code change.
- Synchronised wheel-spin animation (i.e., every phone spinning at the literal same millisecond). The result is shared; the moment of tap is personal.
- Hiding the iOS in-app browser chrome (PWA / add-to-home).

## 10. What this UNDOES from the previous end-day-takeover spec

The earlier spec at `docs/superpowers/specs/2026-05-20-end-day-wheel-takeover-design.md` shipped with these decisions that are now superseded:

| Previous decision | New decision |
|---|---|
| End Day button on the Board (admin-only) | Removed from Board. Lives only on `/admin`. |
| Takeover opens automatically on admin's End Day tap | Takeover opens when *anyone* taps the Day Summary card's Reveal button. |
| Pending-reveal banner is admin-only | Day Summary card replaces the banner; visible to **everyone** logged in. |
| `rollovers.trigger` is the atomic close (lock + advance) | Split into `lockDay` (admin) + `advance` (admin), with the reveal in between. |
| Wheel result is client-side random; `recordForfeit` records it | Wheel result is server-determined at `lockDay`; `recordForfeit` is removed. |
| Hard-lock checks `entry.dailyKey !== state.currentDailyKey` | Hard-lock checks `rollover.closedAt` on the entry's day (new field; covers empty-day locks). |
| `/admin` button relabelled "Manual rollover (fallback)" | `/admin` gets two clean buttons: **Lock Day N** and **Start Day N+1**. The "fallback" framing is dropped. |

The `EndDayTakeover` component itself survives — it's repurposed for the per-phone Reveal trigger.

## 11. Implementation notes — bundles for the plan

The work decomposes into 5 bundles. Suggested ship order:

**Bundle A — Polish sweep (5 items, no design risk)**
- Ship the 5 polish items from §5.9. Each is a small commit. Independent of everything else.

**Bundle B — Row improvements**
- Holiday-name-everywhere (Board, Live Feed, History — uses existing `useHolidayNameMap`)
- Show all crew including zero-scorers (muted)
- Two-number `verified` chip
- `you` pill on own row
- Section header subtitle (participation + claims count)

**Bundle C — Player drill-down**
- Tappable rows
- New `PlayerDayDrawer.jsx` (BottomSheet wrapping a per-player view)
- Scoped to active tab (Today vs Holiday)

**Bundle D — Rollover flow rewrite (biggest)**
- Convex: `lockDay`, `advance`, revised hard-lock guards, `pickForfeit` helper, drop `recordForfeit`
- `WheelOfFortune` accepts `targetForfeitId`
- `RevealFlow` reads forfeit from rollover row
- `EndDayTakeover` opens on Reveal tap, no `isAdmin` gate
- New `DaySummaryCard.jsx` on the Board replaces the pending-reveal banner
- `/admin` split into Lock Day + Start Day buttons
- Convex tests: update hard-lock tests, update idempotency tests, add `lockDay`+`advance` tests

**Bundle E — What's on the wheel preview**
- Collapsible card on Board reading from `forfeits.js`
- No backend changes

**Recommended ship order:** A → B → C → D → E. A and B are independent and low-risk; C builds on B's row layout; D is the most invasive and benefits from the rest being green; E is decoration that can ship last (or even be cut).

The plan doc will lay out tasks within each bundle.
