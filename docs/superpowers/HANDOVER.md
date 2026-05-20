# HANDOVER

**Last updated:** 2026-05-20, pre-Day-1 kickoff
**Live URL:** https://dr-babyyy.vercel.app/
**Convex prod:** `limitless-peacock-239.eu-west-1.convex.cloud`

This is the single canonical handover. Earlier dated handovers were collapsed into this on 2026-05-20.

---

## Right now (verified against prod just before the crew arrives)

- `gameState`: **LIVE · Day 1** · `currentDailyKey: "day-1"`
- Khari: Today +56 (5 claims), Holiday 0 — practice filter working
- Tahira: Today -40 (fouled), Holiday 0 — practice filter working
- All 8 crew rendered with their holiday names; zero-score rows muted
- `WheelPreviewCard` collapsible mounted on `/leaderboard`
- `/admin` shows split buttons: `🔒 Lock Day 1` + `▶ Start Day 2`
- Tests: 408/408 ✅ · build clean

## Day-1-night live ceremony (the path that matters tonight)

```
Day 1 open                Admin /admin → Lock Day              Crew sees DaySummaryCard           Flow vote resolves     Admin → Start Day 2
    │                            │                            on /leaderboard                          │                          │
    ▼                            ▼                                  │                                  ▼                          ▼
claims/vouches/        rollovers.lockDay():                         ▼                          All voted OR              rollovers.advance():
fouls/scavenger        - computes loser              Tap Reveal → EndDayTakeover takes over:    admin force-close         - requires closedAt + flowWinnerSlug
writes allowed         - picks forfeit server-side    Day Closed → Scoreboard → Wheel           → flowWinnerSlug          - bumps gameState
                       - sets closedAt + forfeitId   (deterministic via target prop)            set on rollover row       - inserts day-2 placeholder
                                                     → Flow State Crown → Slot reveal (day-2)
```

Day 1 is **practice** — entries excluded from Holiday total via `PRACTICE_DAILY_KEYS = new Set(["day-1"])` in `convex/leaderboard.ts`.

## What's shipped (consolidated, across all instances)

**Backend / data**
- 52 canonical challenges (8 trip-specific new, 11 retired, `spanish-convo` 50→30) — sourced from `convex/_seedData/challenges.ts`, served by `api.challenges.listActive`
- Rollover split: `lockDay` + `advance` + `trigger` (back-compat shim) + `recordForfeit` (deprecated)
- Hard-lock on `rollover.closedAt` (with `dailyKey` fallback) in `entries.vouch/dispute`
- Day-1 practice filter (`PRACTICE_DAILY_KEYS` in `convex/leaderboard.ts`)
- Daily scavenger data + `isDailyScavengerActive()` switch + scoring branch in `entries.claimScavenger`
- Flow State backend: `castFlowVote`, `clearFlowVote`, `getFlowVoteState`, `getFlowHistory`, `adminBreakFlowTie`, `adminForceCloseFlowVote`, tie auto-resolve

**Frontend**
- Board Overhaul Bundles A–E: polish, holiday-name rows, verified pills, you-pill, PlayerDayDrawer drill-down, DaySummaryCard, WheelPreviewCard
- End Day moved off the Board, onto `/admin` as **Lock Day + Start Day N+1**
- `EndDayTakeover` 5-stage ceremony: Closed banner → Scoreboard → Wheel (deterministic) → Flow Crown → Daily Scavenger slot reveal
- `FlowStateVoteCard` on Board; lifetime 👑 tally on PlayerDayDrawer + PlayerPage
- Admin tie-break + force-close cards

## What's NOT done (deduped across handovers)

| Priority | Item | Notes |
|---|---|---|
| 🔜 MED | Posting wall + PWA push | Design spec + plan written, **zero code** |
| 🔜 LOW | Games page overhaul + Phase 2 | Plans drafted, intentionally untracked |
| 🔜 LOW | Drop `trigger` wrapper + `recordForfeit` | ~24 test fixtures depend on `trigger`; deferred as zero-value churn |
| 🔜 LOW | Adan's daily scavenger v2 | Parked spec — `project_scavenger_rework_parked.md` |

## Trip itinerary

| Day | Date | Activity |
|---|---|---|
| 1 (practice) | Wed 20 May | Resort settling, dinner tonight |
| 2 | Thu 21 May | Saona Island (boat day) |
| 3 | Fri 22 May | Boat party |
| 4 | Sat 23 May | Coco Bongo |

## Coordination rules (Khari runs multiple Claude instances)

1. `git fetch && git pull` before any edit. Files drift under you.
2. No PRs, no feature branches — straight to `main`.
3. `trigger` wrapper is intentional. Don't remove without updating ~24 test fixtures.
4. `recordForfeit` is dead code but kept; safe to delete once you grep and confirm no callers remain.
5. Vercel hooks auto-suggest the `nextjs` skill — this is Vite, ignore.
6. Watch for stale vitest processes if `npm test` hangs.

## Key file pointers

**Backend:**
- `convex/schema.ts` — tables + `closedAt`, `by_daily_key` index, Flow State fields
- `convex/rollovers.ts` — `lockDay`, `advance`, `trigger` (compat), `recordForfeit` (dead)
- `convex/flowVotes.ts` — vote mutations + queries + `finaliseFlowResolution` helper
- `convex/admin.ts` — tie-break + force-close
- `convex/entries.ts` — hard-lock guards
- `convex/leaderboard.ts` — `PRACTICE_DAILY_KEYS` filter

**Frontend:**
- `src/data/dailyScavenger.js` — day-2/3/4 picks
- `src/components/FlowStateVoteCard.jsx` — Board card
- `src/components/RevealFlow.jsx` — 5-stage ceremony
- `src/components/EndDayTakeover.jsx` — full-screen wrapper
- `src/components/DaySummaryCard.jsx` — post-lock Board state
- `src/components/WheelPreviewCard.jsx` — collapsible "what's on the wheel"
- `src/components/PlayerDayDrawer.jsx` — drill-down + 👑 stat
- `src/routes/AdminPage.jsx` — Lock + Start split
- `src/routes/LeaderboardPage.jsx` — vote card + preview + summary mounts

## Specs & plans (under `docs/superpowers/`)

**Specs:** board-overhaul · max-flow-state-vote · daily-scavenger-rework · challenges-list-update · end-day-wheel-takeover · posting-wall · scavenger-hunt

**Plans:** board-polish-sweep · board-row-improvements · board-player-drilldown · board-rollover-rewrite · max-flow-state-vote · daily-scavenger-rework · challenges-list-update · rollover-rewrite · posting-wall · games-page-overhaul (untracked) · games-page-phase-2 (untracked)

## Start-of-session checklist

```bash
cd /Users/khari/Documents/GitHub/DRBabyyy
git fetch && git pull
git status
git log --oneline -15
npm test
```

Then read `MEMORY.md` for context that isn't in the repo.

## Live fallback if anything breaks tonight

- If End Day ceremony stalls: in Convex dashboard, manually call `rollovers.trigger` (the back-compat shim still works end-to-end with a synthetic flow winner).
- If a player can't claim: check `gameState.gamesLive` is still true and `currentDayNumber === 1`.
- If a vouch silently fails: check `rollover.closedAt` isn't set for the day in question.
