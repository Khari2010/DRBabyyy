# Max Flow State Vote — Design Spec

**Date:** 2026-05-20
**Status:** Designed, awaiting review
**Target ship:** Before the trip starts; lands alongside the board-overhaul work
**Predecessor specs:**
- `docs/superpowers/specs/2026-05-20-board-overhaul-design.md` (this spec extends the lockDay/advance lifecycle introduced there)
- `docs/superpowers/specs/2026-05-20-end-day-wheel-takeover-design.md` (the EndDayTakeover overlay this spec re-uses)

## 1. Purpose

Add a daily crew vote for the person who reached "Max Flow State" that day. The vote runs in parallel with the existing day-close ceremony, awards the winner **+10 points**, a daily crown 👑, and the title "Max Flow State". Lifetime wins are tallied on player drill-down sheets and profile pages.

Flow State is a positive counterpart to the existing loser/forfeit ceremony — the same ritual moment now produces both a loser (server-picked forfeit on the wheel) and a winner (crew-voted crown).

## 2. Decisions locked during brainstorm

| Topic | Decision |
|---|---|
| Payoff | **+10 points** + daily crown 👑 + title "Max Flow State" + lifetime tally |
| When vote opens | **Only after lockDay** — vote is closed during the playing day |
| When vote closes | **When every player has voted** (auto), or **admin force-close** on /admin |
| Ceremony interleave | **Silent parallel** — wheel reveal and Flow State vote run alongside each other; crown announces in the same EndDayTakeover overlay after vote resolves |
| Vote mechanics | **One vote per player**, **self-vote allowed**, highest count wins |
| Re-vote | Allowed while voting is open (upsert), prohibited after resolution |
| Ties | **Admin breaks the tie** on /admin — picks the winner from the tied set |
| Eligibility (votee) | **Everyone**, including the day's loser |
| Eligibility (voter) | **Every player** in the `players` table — no participation gate |
| Crown persistence | Crown 👑 on today's Board row + lifetime "Flow State wins" tally on drill-down + profile + past winners visible in Board history |
| Award materialisation | Insert one `entries` row of new `type: 'flowWin'` — points flow through the existing leaderboard scoring path |

## 3. Architecture overview

### 3.1 Day-close lifecycle (extends the board-overhaul lifecycle)

```
   Day N open                Admin locks day                  Parallel during ceremony                          Admin advances
       │                            │                ┌────────────────────────┴────────────────────────┐               │
       │                            │                │                                                 │               │
       ▼                            ▼                ▼                                                 ▼               ▼
   Claims/vouches/         rollovers row patched   Existing reveal:                       NEW Flow State track:    advance() gated
   fouls/scavenger         with loser + forfeit    each phone taps Reveal,                each phone casts one     on flowWinnerSlug
   writes allowed                                  wheel animates to                      vote. Once all votes     being set; otherwise
                                                   server-picked forfeit                  in (or admin force-      refuses with a clear
                                                                                          closes), winner is       error so /admin shows
                                                                                          computed                 "resolve Flow State first"
                                                                                          (admin tie-breaks
                                                                                          if needed)
```

### 3.2 Invariants

- Voting is **closed** before lockDay and **closed** after advance — both gates enforced server-side.
- A voter can change their vote at any time while voting is open. After resolution, votes are immutable.
- "All crew voted" = every player in the current `players` table has a `flowVotes` row for the current `dailyKey`.
- The +10 award is materialised as a single `entries` row of `type: 'flowWin'`, `subjectSlug: winner`, `dailyKey: closing-day`, `points: 10`. Same scoring path as challenges and scavenger — no new leaderboard code.
- The `rollovers.advance` mutation gains one new precondition: `flowWinnerSlug` must be set on the same row.
- Tie state is recorded explicitly on the rollover row (`flowTieCandidates`), not derived on read. Makes "admin needs to act" a queryable signal.

### 3.3 Phase machine (single source of truth from `getFlowVoteState`)

```
                            ┌─────────────────────────────┐
                            ▼                             │
   closed ───lockDay───▶ voting ───all-voted (or force)──▶ resolved
                            │                             ▲
                            │           pick                │
                            ▼           winner             │
                          tied ──── adminBreakFlowTie ─────┘
```

- `closed` — pre-lockDay or post-advance. UI shows nothing.
- `voting` — vote card visible on Board + waiting state in EndDayTakeover.
- `tied` — vote card flips to "Tied: admin is picking". Force-close with 0 votes also lands here (candidates = all crew).
- `resolved` — crown appears on Board + crown stage in takeover.

## 4. Convex changes

### 4.1 Schema additions

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

### 4.2 Schema edits

`rollovers` — add:

```ts
flowWinnerSlug: v.optional(v.string()),
flowResolvedAt: v.optional(v.number()),
flowTieCandidates: v.optional(v.array(v.string())),
flowForcedClose: v.optional(v.boolean()),
```

`entries.type` union — add `v.literal("flowWin")` alongside `"challenge" | "negative" | "scavenger"`. A `flowWin` row carries `points: 10`, `subjectSlug: winner`, `dailyKey: closing-day`, `appliedBySlug: undefined`. It has no vouch/dispute semantics — vouchCount/disputeCount are zero and ignored by UI.

### 4.3 New file `convex/flowVotes.ts`

| Function | Kind | Notes |
|---|---|---|
| `castFlowVote(token, voteeSlug)` | mutation | Requires session. Refuses if day not locked, if already resolved, or if `voteeSlug` isn't a known player. Upserts by `(dailyKey, voterSlug)`. After upsert, if every player has voted → calls internal `resolveFlowWinner`. |
| `clearFlowVote(token)` | mutation | Deletes the caller's vote if voting is open. Used when a player wants to retract. |
| `getFlowVoteState(token)` | query | Returns `{ phase, myVoteSlug, tally: Record<slug, number>, candidates?: string[], winnerSlug?: string, votedCount, totalCrew }` for the current day. Single source of truth for all Flow State UI. |
| `getFlowHistory()` | query | Past days' winners + per-player lifetime win count. Used by drill-down sheet, profile page, and Board history. |
| `resolveFlowWinner(rolloverId)` | internal helper | Tallies votes for the day. If single max → write `flowWinnerSlug` + `flowResolvedAt` + insert `entries` flowWin row. If tied → write `flowTieCandidates`, do *not* insert the entries row. |

### 4.4 Edits in `convex/admin.ts` (or wherever admin-only mutations live)

| Function | Notes |
|---|---|
| `adminBreakFlowTie(token, voteeSlug)` | Admin-only. Verifies `voteeSlug` is in `flowTieCandidates`. Finalises: clears `flowTieCandidates`, writes `flowWinnerSlug` + `flowResolvedAt`, inserts the `entries` flowWin row. |
| `adminForceCloseFlowVote(token)` | Admin-only. Calls the same `resolveFlowWinner` path. If zero votes exist, `flowTieCandidates` is set to **all crew** so admin can pick. Always sets `flowForcedClose: true` on the rollover. |

### 4.5 Edits in `convex/rollovers.ts`

`advance` mutation — add precondition: refuse unless the current rollover row has `flowWinnerSlug` set. Error message must be machine-readable so the /admin UI can render an actionable hint ("Resolve Flow State first").

## 5. UI surfaces

### 5.1 Board card — `src/components/FlowStateVoteCard.jsx` (new)

Rendered on `/leaderboard` between the day header and the standings table, gated on `phase !== "closed"`.

States:

- **`voting`, you haven't voted** — title "Vote: Max Flow State today", crew chips listing every player (holiday names; own row pill marked `you`). Tap a chip → `castFlowVote`. Subtitle counter: `N of M voted`.
- **`voting`, you've voted** — same card, your pick highlighted with a check, subtitle "Tap to change". Counter unchanged.
- **`tied`** — card flips to "Tied: admin is picking" with the tied holiday names listed. No interaction.

When `phase === "resolved"` the card disappears (crown moves onto the standings row, see 5.3).

### 5.2 Ceremony moment — `src/components/EndDayTakeover.jsx` (edit)

The existing takeover gains one new final stage after the wheel-and-forfeit reveal.

- While `phase` is `voting` or `tied` → "Waiting on Flow State vote" holding card + live counter (mirrors the Board card counter).
- When `phase` becomes `resolved` → crown stage animates. Simple scale-in + sparkle on the winner's holiday name + the "Max Flow State" label. No second wheel.

The takeover is replay-friendly like today: closing and re-entering re-reads `phase` + `flowWinnerSlug` from server and renders the appropriate stage.

If the user closes the takeover mid-vote, the Board card remains live so they can still vote from there.

### 5.3 Crown on the Board row (post-resolution)

Winner's row on the standings gains a 👑 prefix on their holiday name and a small "Max Flow State" pill. Visible until day advances. The board-overhaul spec's history view (past-day recap rows) gains the same crown next to the winning holiday name for each closed day.

### 5.4 Player drill-down sheet + profile page

Both surfaces (already specified in board-overhaul §player drill-down and the player-login-profile-pages spec) gain a new stat: **`Flow State wins: N`**. Populated by `getFlowHistory()`. Tapping the stat (optional, not blocking for v1) could show the list of days won.

### 5.5 Admin tie-break + force-close — `/admin` (edit)

When the current rollover row has `flowTieCandidates` set, /admin shows a card above the existing Lock/Advance controls:

> **Tie: pick the Max Flow State winner**
> [chip] [chip] [chip]

Tapping a chip calls `adminBreakFlowTie`. Card disappears, Advance enables.

A separate **"Force close Flow State vote"** button is visible whenever `phase === "voting"`, regardless of tie state. Confirms via existing admin-confirm pattern. Calls `adminForceCloseFlowVote`.

Advance button stays disabled (with a "Resolve Flow State first" hint) until the rollover has `flowWinnerSlug` set.

## 6. Edge cases

| Case | Behaviour |
|---|---|
| Voter changes their mind | `castFlowVote` is an upsert by `(dailyKey, voterSlug)`. No history kept. |
| Voter clears their vote | `clearFlowVote` removes the row. If that vote was the last needed to auto-resolve, voting simply stays open. |
| New player added mid-trip | "All voted" uses the current `players` table. A new player added after lockDay can still vote until they do (or admin force-closes). No retroactive votes on past days. |
| Admin breaks tie, regrets the pick | Tie-break is final once written. No undo button. (Matches "decisions resolve" feel of the app; admin can patch via Convex dashboard in disaster scenarios.) |
| Force-close with zero votes | Falls into the tied-admin-picks branch with `flowTieCandidates = all crew`. Stops a silent "no winner" state from blocking advance. |
| Force-close with one vote | That vote wins outright. |
| Day reopened (admin manually rolls back) | Out of scope. Forward-only, same posture as the board-overhaul spec. |
| Replay / re-enter takeover | Crown reveal stage reads `phase` + `flowWinnerSlug` from server, animates on entry. Same replay model as the wheel. |
| Voting before lockDay | `castFlowVote` refuses with `"day not locked"`. UI never renders the card pre-lock. |
| Voting after advance | `castFlowVote` refuses with `"day already advanced"`. UI never renders the card post-advance. |
| Multiple votes per voter | Prevented at data layer by upsert. No UI exposure. |
| Vote for unknown player | `castFlowVote` validates `voteeSlug` exists in `players`. Prevents stale/malicious clients writing junk. |

## 7. Testing

Following existing `convex/*.test.ts` patterns:

- **`convex/flowVotes.test.ts`** (new) — cast / upsert / clear / refuse-before-lock / refuse-after-advance / auto-resolve-on-last-vote / tie detection / invalid votee rejection.
- **`convex/rollovers.test.ts`** (extend) — `advance` refuses when `flowWinnerSlug` is missing; succeeds once set; force-close with zero votes lands in tied-admin-picks.
- **`convex/admin.test.ts`** (extend) — `adminBreakFlowTie` rejects non-admins and rejects voteeSlug not in candidates; `adminForceCloseFlowVote` requires admin; force-close + admin pick fully resolves.
- **`convex/leaderboard.test.ts`** (extend) — an `entries` row of `type: 'flowWin'` counts +10 toward subject's score; appears correctly in history reads.

Component-level: visual verification of `FlowStateVoteCard` states and the new EndDayTakeover crown stage during manual run-through (no jsx unit-test infra in the repo today).

## 8. Out of scope (for this spec)

- Reasons / commentary attached to votes — kept off for v1; can be added later if the crew misses it.
- "Most Flow State this trip" parallel leaderboard — lifetime tally is the seed; if it earns its own board surface later, that's a follow-on spec.
- Vote anonymity — votes are stored with `voterSlug`; surfaces show only the aggregate tally. No UI exposes "who voted for whom" today, but the data is there for an admin reveal if ever wanted.
- Undo for admin tie-break — explicit non-feature.
- Auto-rolling tie-break (e.g. "if tied two days running, both share") — not modelled.

## 9. Open questions

None at spec-write time. All conceptual questions resolved during brainstorm.
