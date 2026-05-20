# End-Day Button + Wheel Takeover — Design Spec

**Date:** 2026-05-20
**Status:** Designed, awaiting review
**Target ship:** Sibling to the scavenger hunt; before the first day-end of the trip

## 1. Purpose

Move the day-rollover trigger from the hidden `/admin` page onto the Board page itself, reframe it as an explicit **End Day** action, and give the daily loser a **full-screen wheel takeover** for the forfeit reveal. Today the same flow exists but is split across `/admin` (rollover trigger) and an inline `RevealFlow` card on the Board — this consolidates the moment so the whole crew gathers around one screen.

## 2. Decisions locked during brainstorm

| Topic | Decision |
|---|---|
| Permission | **Admin only** — keeps the existing `requireAdmin` gate on `rollovers.trigger`. The End Day button is hidden for non-admins. |
| Day locking | **Hard lock** — once a day is rolled over, vouches and disputes on entries from that `dailyKey` are rejected at the mutation layer. The loser is final the moment the button hits. |
| Wheel location | **Full-screen takeover** — End Day → a modal/route over the Board that shows scoreboard reveal → wheel spin → forfeit recorded, then dismisses back to the Board with the forfeit visible in history. |
| Reuse | Existing `rollovers.trigger`, `rollovers.recordForfeit`, `WheelOfFortune`, `RevealFlow` are all reused. This is mostly UX rewiring + one new mutation guard. |
| Out of scope | Auto-midnight close, scheduled jobs, per-day push notifications. |

## 3. Architecture

The existing pieces already do most of the work:

- `convex/rollovers.ts → trigger` mutation — admin-only; computes totals, identifies loser, advances `gameState`. Untouched.
- `convex/rollovers.ts → recordForfeit` mutation — admin-only; patches the rollover row with the forfeit. Untouched.
- `src/components/WheelOfFortune.jsx` — SVG slice wheel, 4.5s spin, fires `onResult(forfeit)`. Untouched.
- `src/components/RevealFlow.jsx` — three-stage card (Day Closed → Scoreboard → Wheel). **Repurposed** as the inner content of the new takeover, not rendered inline on the Board.

New work:
- **End Day button** on the Board (admin only, gated on `gameState.gamesLive === true` and no pending rollover for current day).
- **Full-screen takeover component** that wraps `RevealFlow` and presents it as a modal route or overlay covering the page.
- **Hard-lock guards** on `entries.vouch` and `entries.dispute` mutations — reject if the entry's `dailyKey !== gameState.currentDailyKey`.

## 4. Convex changes

### `entries.vouch` and `entries.dispute` — hard-lock guard

Both mutations currently allow any active entry to be vouched or disputed. Add a guard at the top of each handler (after the session check, before the count update):

```ts
const state = await getGameState(ctx);
if (state && entry.dailyKey !== state.currentDailyKey) {
  throw new Error("day is locked");
}
```

This is a 3-line additive change per mutation. The `gameState` row is already cached on most callers, so the read is cheap.

Existing tests for `vouch`/`dispute` should still pass because they all run inside a single `dailyKey` window. **One new test per mutation** should cover the lock case:

```ts
it("rejects vouching after the day rolls over", async () => {
  // Seed: kai claims a challenge on day-1; rollover advances to day-2;
  // khari tries to vouch the kai entry → rejection.
});
```

### No schema changes

The `rollovers` table already records `loserSlug`, `forfeitId`, `forfeitLabel`, `spunAt`. The Board already queries `rollovers.get` and `rollovers.listAll`.

## 5. UI changes

### `src/routes/LeaderboardPage.jsx` (the Board)

Add an **End Day** button in the header strip (right of the Today/Holiday tabs) visible only when:
- player is admin (use existing `api.admin.isAdmin` query)
- `gameState.gamesLive === true`
- the current day has at least one entry (don't allow closing an empty day)

Tap the button → confirm sheet → call `rollovers.trigger` → open the takeover (see below).

### New component: `src/components/EndDayTakeover.jsx`

Full-screen overlay (z-index above the BottomNav, like the existing `BottomSheet` overlay layer):
- Background: solid `C.dark` with subtle texture
- Content: re-uses `RevealFlow` directly, passing the just-closed rollover row as the prop
- Dismiss: only when stage 3 (the wheel) has recorded a forfeit — the takeover otherwise refuses to close, so the crew can't accidentally exit mid-reveal

Internally the takeover subscribes to `api.rollovers.get` with the day number that just closed (returned from `rollovers.trigger` if we extend it to return the new rollover ID, otherwise queried by `state.currentDayNumber - 1`).

### Existing `RevealFlow` card on the Board

Remove the inline render. The takeover replaces it. The pending-reveal banner on the Board can stay as a soft prompt for admins ("Day N is unresolved — open the wheel") that re-opens the takeover when tapped, in case the original session was lost.

### `src/routes/AdminPage.jsx`

Keep the `rollovers.trigger` button on `/admin` as a hidden backup, but mark it as "Manual rollover (fallback)" with a note pointing to the Board's End Day action. Or remove it entirely — but a backup is cheap insurance for the trip.

## 6. UX flow

1. Admin opens Board on day 1, sees Day 1 scoreboard.
2. End of day: admin taps **End Day** (top right of the Board header).
3. Confirm sheet — "End Day 1? This locks all claims and reveals the loser." → [Cancel] [End Day]
4. On confirm: `rollovers.trigger` runs → gameState advances to Day 2.
5. Takeover opens covering the entire screen.
6. Stage 1: "✨ Day 1 — Closed" with a "Reveal scores ▼" CTA.
7. Stage 2: scoreboard reveals row by row, loser highlighted in coral. CTA: "Open the wheel ▶".
8. Stage 3: wheel mounts, loser spins, `recordForfeit` fires on result.
9. Forfeit displayed full-screen ("Take it like a champ" CTA dismisses).
10. Takeover closes → Board now shows Day 2 leaderboard with the new rollover in the History section.

## 7. Edge cases

| Case | Behaviour |
|---|---|
| Admin taps End Day twice (network flake / impatience) | `rollovers.trigger` should be idempotent on the same `closingKey`. Currently it re-patches the existing rollover row, so a second call is safe but advances the day twice — **investigate**. If non-idempotent, add an "already closed" guard inside the mutation. |
| Vouches arriving in-flight when End Day fires | If the vouch transaction commits *before* `trigger` runs, it's counted. If after, the new hard-lock guard rejects it. Inconsistent only on the millisecond boundary. |
| Empty day (no claims) | The button should be disabled — no loser to identify. Gate on `entries-for-currentDailyKey.length > 0`. |
| Stage-3 wheel spin interrupted (browser close / refresh) | Pending reveal banner on the Board re-opens the takeover next mount. `rollovers.get(dayNumber - 1)` returns `{ loserSlug, forfeitId: undefined }` → takeover lands on stage 3 directly. |
| Admin loses internet mid-flow | Mutations queue or fail. Toast on failure. No partial state because the gameState advance happens atomically inside `trigger`. |
| Non-admin somehow holds an End Day URL | `requireAdmin` server-side blocks them. UI also hides the button. Defence in depth. |

## 8. Out of scope (deferred)

- Auto-rollover at midnight DR time. The existing memory says "Daily board — accumulates until midnight Dominican Republic time, then locks" — that's still aspirational. For v1 we rely on a person tapping End Day.
- Push notifications to the loser before the reveal.
- Multi-day undo (the existing `rollovers.undoLast` already handles a single-step undo via `/admin`).

## 9. Memory updates needed on ship

- `project_leaderboard_design.md` already describes the "everyone sits together and one person clicks reveal" pattern. Update it to say the trigger lives on the Board (not `/admin`).

## 10. Implementation notes for the plan

The build is small. Estimated tasks:
1. Add hard-lock guard to `entries.vouch` (+ test).
2. Add hard-lock guard to `entries.dispute` (+ test).
3. Optionally make `rollovers.trigger` idempotent or guarded against double-close (+ test).
4. Build `EndDayTakeover` component (wraps `RevealFlow` in a full-screen overlay).
5. Add End Day button + confirm sheet on `LeaderboardPage`.
6. Remove inline `RevealFlow` from the Board; replace with pending-reveal banner that re-opens the takeover.
7. Add "Fallback" label to the Admin page's manual rollover button.
8. Smoke pass — manual flow on the dev deployment.

A separate plan doc can be written when we're ready to build. This spec is intentionally lighter than the scavenger spec because most components already exist; the real work is rewiring.
