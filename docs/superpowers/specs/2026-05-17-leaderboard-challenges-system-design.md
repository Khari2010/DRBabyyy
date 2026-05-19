# Leaderboard & Challenges System — Design Spec

**Date:** 2026-05-17
**Status:** Designed, awaiting review
**Target ship:** First phase live before breakfast 2026-05-18 (trip start)

## 1. Purpose

Build an in-app challenge/forfeit/leaderboard system the group uses while on the trip. Players log into their player page, click challenges they completed, watch their points update on a shared reactive leaderboard, and gather each morning for a group "rollover" reveal that locks the previous day, names the daily loser, and runs the existing wheel to assign that loser's forfeit.

The system must also let players propose new challenges in-app, which admins draft (assign points/category) and the group then approves by majority vote.

## 2. Decisions locked during brainstorm

| Topic | Decision |
|---|---|
| Claim flow | Instant points on tap → `🛡 verified` after 1 vouch from any other player, or `disputed` (points removed) after 2 dispute taps. Verified state is final — disputes can't override. |
| Negative-point flow | Witness-applied. Any player can log a foul on any other player's page. Same verify/dispute rules. No self-vouch/self-dispute. |
| Forfeit assignment | At rollover, the daily lowest scorer is required to spin the existing wheel (`src/data/forfeits.js`, 14 items). |
| Rollover | Manual button on `/admin`. Co-admins: **Khari + Kai**. First rollover tomorrow morning starts the games; each subsequent rollover locks the previous day, reveals the loser + spins the wheel. |
| Live gate | `gameState.gamesLive` is `false` until the first rollover. All claim mutations reject while false. |
| Suggestion flow | Suggester types title only → admin (Khari/Kai) assigns points + category → group votes → **5 of 8 yes** auto-promotes the suggestion to a live challenge row; **5 of 8 no** auto-rejects. |
| Grouping | Player UI groups challenges by **difficulty**, not by category: Easy (1–15pts) / Medium (20–50pts) / Wild (70+pts). Category is retained on each row for icon/colour affinity but not used as primary navigation. |
| Tiebreaker | Higher `verifiedCount` wins ties on the leaderboard; then earliest first-claim timestamp. |
| Source of truth | `CHALLENGES` migrates from `src/data/challenges.js` into a Convex `challenges` table, seeded once. `FORFEITS` and `NEGATIVE_POINTS` stay in code (never user-editable). |
| Claim frequency | Unlimited claims per challenge per day (e.g. multiple "Down a drink" claims allowed). |

## 3. Architecture

Approach selected: **Approach B — Convex tables, fully reactive.**

- All shared state (challenges, claims, vouches/disputes, suggestions, votes, rollovers, admin roles, game state) lives in Convex.
- React components subscribe via Convex reactive queries; cross-phone updates land within ~50ms.
- All write paths go through server-side mutations that enforce authorisation, anti-self-vouch, dispute thresholds, admin-only actions, and the `gamesLive` gate.
- Leaderboard totals are computed live (`sum(entries.points WHERE status != 'disputed'`), scoped by `dailyKey` for the daily board. No cached score table — volume is too small (8 players × ~7 days) to justify it.

## 4. Convex schema

Added to `convex/schema.ts`:

### `challenges`
Master list of challenges. Seeded from `src/data/challenges.js`, then becomes the source of truth so approved suggestions can join.

| Field | Type | Notes |
|---|---|---|
| `challengeId` | string | Stable slug e.g. `"kiss-someone"`. Unique. |
| `title` | string | |
| `icon` | string | Emoji |
| `points` | number | Base points (positive) |
| `bonus` | optional string | Free-text e.g. `"+50 crowd, +50 money"` |
| `category` | string | `social`/`drinks`/`fitness`/`content`/`wild`/`squad`/`chill` — retained for visual affinity |
| `difficulty` | `"easy"`/`"medium"`/`"wild"` | Derived from points at insert/draft time; stored for stable filtering |
| `status` | `"active"`/`"retired"` | |
| `createdBySlug` | optional string | Null for seeded; set when promoted from a suggestion |
| `approvedAt` | optional number | |

Indexes: `by_challenge_id`, `by_status`.

### `entries`
Unified table for both positive claims and negative-point applications.

| Field | Type | Notes |
|---|---|---|
| `type` | `"challenge"`/`"negative"` | Discriminator |
| `subjectSlug` | string | Whose score moves |
| `appliedBySlug` | optional string | For negatives: who logged it. Null on self-claims. |
| `challengeId` | optional string | FK when `type === "challenge"` |
| `negativeId` | optional string | FK when `type === "negative"` (code-side `NEGATIVE_POINTS`) |
| `points` | number | Signed; snapshot at create time |
| `bonusKey` | optional string | e.g. `"crowd"`, `"money"`, `"crowd+money"` |
| `status` | `"active"`/`"verified"`/`"disputed"` | |
| `vouchCount` | number | |
| `disputeCount` | number | |
| `dailyKey` | string | `"day-1"`, `"day-2"`... — assigned from `gameState.currentDailyKey` at create |
| `createdAt` | number | |
| `resolvedAt` | optional number | Set when transitioning out of `"active"` |

Indexes: `by_subject`, `by_daily_key`, `by_status`.

### `entryReactions`
One row per (entry, player) — enforces no double-vote.

| Field | Type | Notes |
|---|---|---|
| `entryId` | `Id<"entries">` | |
| `playerSlug` | string | |
| `reaction` | `"vouch"`/`"dispute"` | |
| `at` | number | |

Indexes: `by_entry_and_player`, `by_entry`.

### `suggestions`
Crowd-sourced new challenges going through the title → admin → vote pipeline.

| Field | Type | Notes |
|---|---|---|
| `proposerSlug` | string | |
| `title` | string | |
| `icon` | optional string | Suggester may pick; admin can override |
| `points` | optional number | Admin fills |
| `category` | optional string | Admin fills |
| `difficulty` | optional string | Admin fills (derived) |
| `status` | `"proposed"`/`"voting"`/`"approved"`/`"rejected"` | |
| `yesCount` | number | |
| `noCount` | number | |
| `resultingChallengeId` | optional string | FK once promoted to a live challenge |
| `createdAt` | number | |
| `draftedAt` | optional number | |
| `resolvedAt` | optional number | |

Indexes: `by_status`.

### `suggestionVotes`
One row per (suggestion, voter).

| Field | Type | Notes |
|---|---|---|
| `suggestionId` | `Id<"suggestions">` | |
| `voterSlug` | string | |
| `vote` | `"yes"`/`"no"` | |
| `at` | number | |

Indexes: `by_suggestion_and_voter`.

### `rollovers`
Each rollover = one row; source of truth for which day we're on.

| Field | Type | Notes |
|---|---|---|
| `dayNumber` | number | 1, 2, 3... |
| `dailyKey` | string | `"day-1"` |
| `triggeredBySlug` | string | khari or kai |
| `triggeredAt` | number | |
| `loserSlug` | optional string | Null on the first kickoff rollover |
| `forfeitId` | optional string | Null until wheel result recorded |
| `forfeitLabel` | optional string | Snapshot |
| `spunAt` | optional number | |

Indexes: `by_day_number`.

### `gameState`
Singleton row.

| Field | Type | Notes |
|---|---|---|
| `gamesLive` | boolean | `false` until first rollover. All claim mutations reject when false. |
| `currentDayNumber` | number | `0` pre-trip, then 1, 2... |
| `currentDailyKey` | string | `"pre-trip"`, then `"day-1"`, `"day-2"`... |
| `updatedAt` | number | |

### `adminRoles`
| Field | Type | Notes |
|---|---|---|
| `playerSlug` | string | Seeded with `khari` and `kai` |

Indexes: `by_slug`.

## 5. Mutations & queries inventory

```
convex/
  schema.ts             ← edit: add 7 new tables
  challenges.ts         ← new: listActive, retire(adminOnly)
  entries.ts            ← new: claim, vouch, dispute, logNegative
  suggestions.ts        ← new: create, draft(adminOnly), vote, reject(adminOnly)
  rollovers.ts          ← new: trigger(adminOnly), recordForfeit, undoLast(adminOnly)
  leaderboard.ts        ← new: getDaily, getHoliday, getRecentActivity
  admin.ts              ← edit existing: add isAdmin helper
  seedChallenges.ts     ← new: seedChallenges, seedAdmins, seedGameState
  _seedData/
    challenges.ts       ← new: snapshot of current CHALLENGES array
```

### Key mutation rules (server-enforced)

- **`entries.claim`** rejects when `gameState.gamesLive === false`. Writes `dailyKey` from `gameState.currentDailyKey`.
- **`entries.vouch` / `entries.dispute`** reject if `playerSlug === entry.subjectSlug` (no self-vote). Reject if a row already exists in `entryReactions` for `(entryId, playerSlug)`. On `vouchCount >= 1` while status is `"active"`, set status `"verified"`. On `disputeCount >= 2` while status is `"active"`, set status `"disputed"`. Once verified, dispute path is closed.
- **`entries.logNegative`** identical to `claim` but `type = "negative"`, `appliedBySlug = caller`, points snapshotted from `NEGATIVE_POINTS` code constant.
- **`suggestions.create`** anyone (logged-in); status `"proposed"`.
- **`suggestions.draft`** admin-only; transitions `"proposed"` → `"voting"`. Sets points, category, difficulty.
- **`suggestions.vote`** rejects self-vote and double-vote. On reaching 5 yes → status `"approved"`, inserts new `challenges` row, sets `resultingChallengeId`. On 5 no → status `"rejected"`.
- **`suggestions.reject`** admin-only from `"proposed"` or `"voting"`.
- **`rollovers.trigger`** admin-only. If `gamesLive === false`: sets `gamesLive = true`, `currentDayNumber = 1`, inserts kickoff rollover row (no loser, no forfeit). Else: computes loser as lowest sum on `currentDailyKey` (excluding disputed entries), inserts rollover row with `loserSlug`, then bumps `currentDayNumber` and `currentDailyKey`.
- **`rollovers.recordForfeit`** rejects if `forfeitId` already set on that rollover (can't re-spin to dodge).
- **`rollovers.undoLast`** admin-only. Restores previous `gameState` snapshot; deletes the most recent rollover row.

### Queries

- `challenges.listActive` — reactive list of active challenges.
- `leaderboard.getDaily(dailyKey)` — `{slug, total, claimCount, verifiedCount}[]` sorted by total desc, then verifiedCount desc, then earliest first-claim asc.
- `leaderboard.getHoliday` — same shape, no dailyKey filter.
- `leaderboard.getRecentActivity(limit)` — recent entries with their challenge/negative metadata and current reaction state.
- `suggestions.list` — grouped by status for the `/suggestions` page.
- `gameState.get` — singleton lookup. Drives the live gate and current day on every page.
- `admin.isAdmin(slug)` — boolean check; gates `/admin` page.

## 6. Frontend file inventory

```
src/routes/
  PlayerPage.jsx            ← edit: add Challenges tabs (Easy/Medium/Wild),
                               Pending review section,
                               "Log a foul" button on others' pages.
  LeaderboardPage.jsx       ← new: daily/holiday tabs + recent activity strip
  SuggestionsPage.jsx       ← new: propose, admin drafting, voting UI
  AdminPage.jsx             ← new: rollover button, drafting queue, edge actions
  PunishmentRevealPage.jsx  ← new: 3-stage reveal + wheel
src/components/
  ChallengeCard.jsx         ← new
  ClaimModal.jsx            ← new: base claim + bonus toggles
  FoulModal.jsx             ← new: log negative on someone else
  EntryRow.jsx              ← new: used in leaderboard activity + history
  WheelSpinner.jsx          ← existing — wrap for punishment page
src/lib/
  useGameState.js           ← new hook: gamesLive, currentDayNumber, isAdmin
src/data/
  challenges.js             ← reduced to a one-time snapshot used by seed only.
                              All runtime reads switch to the Convex query.
```

## 7. UI flows

### Claim flow

1. Player visits `/<slug>`, sees Easy/Medium/Wild tabs.
2. Taps a challenge card → `ClaimModal` opens with base points + optional bonus toggles.
3. Confirms → `entries.claim` mutation. Score updates instantly across all phones.

### Vouch / dispute flow

The `/leaderboard` page has a **Recent activity** strip:
```
🔵 Camara just claimed: 5 Shots at Once (+20)   [✓ I saw it]   [✗ Didn't happen]
```
- ✓ → `entries.vouch`. After 1 vouch the entry is `verified` (🛡 badge).
- ✗ → `entries.dispute`. After 2 disputes the entry is `disputed` (greyed, struck-through, excluded from leaderboard).

### Negative-point (foul) flow

On any other player's `/<slug>` page, a "Log a foul" button surfaces the 4 negative actions. Tap → `entries.logNegative`. Same verify/dispute mechanics.

### Suggestion flow

`/suggestions` shows 4 sections grouped by status: Proposed, Voting, Approved (live), Rejected.
- Any player taps "Suggest a challenge" → submits a title.
- Admin sees pending drafts on `/admin`, fills in points + category, sends to vote.
- Group votes yes/no; 5 votes either way auto-resolves.
- Approved suggestions instantly join the live `challenges` table.

### Rollover flow

Khari/Kai on `/admin` taps **"Trigger rollover"** → confirm dialog → `rollovers.trigger` mutation. Server handles state. UI auto-navigates the admin to `/punishment-reveal` for that day.

### Punishment reveal flow

`/punishment-reveal?day=N` — read-only, dramatic, designed for one screen viewed by the group.

1. **Stage 1 — Day Recap.** Aggregate stats card.
2. **Stage 2 — Daily Scoreboard.** Names drop in highest-to-lowest; last name is the loser.
3. **Stage 3 — Wheel.** Existing wheel component, pre-loaded with `FORFEITS`. Loser spins. Result is locked via `rollovers.recordForfeit` and shown on a final result card.

Edge cases:
- **Day 1 (first rollover):** Reveal page shows a "Games are now LIVE" kickoff screen instead of the 3-stage flow. No wheel.
- **Wheel lands on "Deduct points from someone":** Reveal shows an inline player picker; chosen target receives a system-applied negative entry (not disputable, since it came from a fair spin).
- **Loser is offline:** Wheel can still spin; result is recorded; forfeit happens whenever they're back with the group.

## 8. Migration / seed

```
1. Add the 7 tables to convex/schema.ts.
2. Copy current CHALLENGES array into convex/_seedData/challenges.ts (snapshot).
3. Create convex/seedChallenges.ts with seedChallenges, seedAdmins, seedGameState.
4. npx convex dev --once   # push schema + functions
5. npx convex run seedChallenges:seedChallenges
6. npx convex run seedChallenges:seedAdmins
7. npx convex run seedChallenges:seedGameState
```

After migration, `src/data/challenges.js` is reduced to a re-export of the seed snapshot for any code still importing it during the cutover; runtime reads switch to the Convex reactive query.

## 9. Test plan

Mirror the existing `convex/*.test.ts` pattern (uses `convex-test`).

- **`entries.test.ts`** — claim writes correctly; self-vouch rejected; self-dispute rejected; 1 vouch → verified; 2 disputes → disputed; same player can't react twice; negative entry mechanics identical; claim rejected when `gamesLive === false`.
- **`suggestions.test.ts`** — state machine transitions; self-vote rejected; double-vote rejected; 5 yes auto-promotes + creates `challenges` row; 5 no auto-rejects; admin-only draft + reject enforced.
- **`rollovers.test.ts`** — non-admin rejected; first rollover unlocks `gamesLive` and sets day 1; subsequent rollovers compute loser correctly; `recordForfeit` rejects if already spun; `undoLast` restores state.
- **`leaderboard.test.ts`** — disputed entries excluded from sums; tiebreaker uses verifiedCount then first-claim timestamp; daily filter respects `dailyKey`.

## 10. Phased build order

Each phase ships something usable even if the next isn't done.

1. **Schema + migration** — tables, seed, admin roles, gameState. No UI changes. Database is ready.
2. **Player claim + leaderboard (read-only)** — `ClaimModal`, `LeaderboardPage`, reactive feed. Group can earn points. No vouching yet.
3. **Vouch + dispute + recent activity strip** — social verification layer.
4. **Negative points** — `FoulModal` on others' pages.
5. **Admin + rollover** — `AdminPage`, rollover button, gameState transitions.
6. **Suggestions** — full propose → draft → vote → live pipeline.
7. **Punishment reveal page + wheel integration** — 3-stage reveal flow + wheel binding.

Phases 1–2 are the minimum to be usable for tomorrow's breakfast start. Phases 3–7 can land during the trip.

## 11. Risks & open considerations

- **Pre-trip claims:** prevented by `gamesLive === false` gate on `entries.claim`. No fake early claims possible.
- **Admin lockout:** if both Khari and Kai are offline, no rollover can happen. Mitigation: `npx convex run` from any laptop is still an escape hatch.
- **Edit history / audit trail:** not tracked beyond `entries`/`entryReactions` rows. If a dispute later turns out to be wrong, no built-in undo aside from admin's `undoLast`. Acceptable for v1.
- **Claim frequency cap:** intentionally none. If small-value farming becomes annoying, revisit post-trip.
- **"Deduct points" forfeit picker:** baked into reveal flow per Section 7 edge case. Inserts a system-applied negative.

---

**Next step:** create the implementation plan via the `superpowers:writing-plans` skill once this spec is approved.
