# Challenges List Update — Design Spec

**Date:** 2026-05-20
**Status:** Designed, awaiting review
**Target ship:** Before kickoff of the trip's competitive phase

## 1. Purpose

Reconcile the live challenges + negative-points pool with Khari's finalised list (35 universal challenges + 4 negatives, derived from his hotel-experience review on 2026-05-20). The current live pool is 55 challenges + 6 negatives, seeded from `convex/_seedData/challenges.ts`. This spec defines the additions, retirements, repricings, and the cross-surface sync needed so `/`, `/styleguide`, and the live `/player/:slug?tab=challenges` view all show the same canonical list.

This is a content edit. No new tables, no new mutations beyond a one-shot migration helper. No UI changes.

## 2. Decisions locked during brainstorm

| Topic | Decision |
|---|---|
| Source of truth | The Convex `challenges` table (seeded from `convex/_seedData/challenges.ts`). Frontend reads via `api.challenges.listActive`. |
| Removal mechanism | **Soft retire** — set `status = "retired"`. Filtered out by `listActive`. Preserves historical entries if any exist. |
| Sync targets | Three files need updating: the seed file, `src/data/challenges.js` (styleguide), and `src/routes/HomePage.jsx` (marketing). |
| Standalone "Scavenger Hunt" challenge | **Retired** — superseded by the dedicated Scavenger tab. The scavenger rework is OUT OF SCOPE for this spec (separate brainstorm). |
| Spanish convo overlap | The existing `spanish-convo` row gets **repriced 50 → 30**. No new challenge is added for it. |
| Negative points | No changes — keep all 6 (the 4 on Khari's final list plus `bad-sunburn` and `lost-bracelet`, which fit the trip context). |
| Pre-trip safety | `gameState.gamesLive === false` means `entries.claim` / `entries.logNegative` already reject. Adding/retiring/repricing rows pre-trip is safe; no live entries exist yet. |

## 3. Final canonical list

**Final challenge count: 52** (active in DB after migration). Negative count: 6 (unchanged).

### 3.1 Additions (8 new challenges)

All add to `SEED_CHALLENGES` and to the styleguide/marketing mirrors. `deriveDifficulty(points)` will assign the difficulty band automatically.

| challengeId | Title | Icon | Points | Bonus | Category |
|---|---|---|---|---|---|
| fake-proposal | Fake Proposal | 💍 | 150 | — | wild |
| sanatana-shot | Get Sanatana to Do a Shot with You | 🥃 | 25 | — | social |
| julio-tiktok | Get Julio to Make a TikTok with You | 🎬 | 35 | — | content |
| grumpy-couple-smile | Grumpy Couple Smile Together (photo) | 👫 | 60 | — | social |
| tabo-bar-shot | At Tabo, Get 5+ People at the Bar to Shot With You | 🍹 | 60 | — | social |
| sports-bar-pool | Challenge a Stranger to Pool at the Sports Bar | 🎱 | 15 | +15 if you win | social |
| gym-first | First Crew Member to the Gym (per day) | 🏃 | 10 | — | fitness |
| close-sports-bar | Close the Sports Bar (stay till it shuts) | 🍻 | 50 | — | wild |

### 3.2 Retirements (11 challengeIds)

| challengeId | Reason |
|---|---|
| shower-with | Cut from Khari's final list |
| scavenger-hunt | Superseded by the dedicated Scavenger tab |
| ocean-sunrise | Generic — no DR-specific anchor |
| ocean-midnight | Generic + night-swim safety concern |
| swim-up-bar | Trivial; overlaps `down-drink` |
| pinacolada-coconut | Generic vacation cliché |
| tostones | Redundant with `la-bandera` as the DR-food challenge |
| hair-braids | Touristy trope, not on vibe |
| crew-swim-up | Same archetype as `crew-ocean` |
| matching-dinner | High coordination cost, low payoff |
| horseback-beach | Not in the itinerary; requires separate booking |

Note: `gianni-bike` is already retired via the existing `retireChallengeIds` mutation in `convex/seedChallenges.ts` and is not in `SEED_CHALLENGES`.

### 3.3 Reprice (1 challengeId)

| challengeId | From | To |
|---|---|---|
| spanish-convo | 50 | 30 |

### 3.4 Kept DR-specific challenges (12)

These already exist in `SEED_CHALLENGES` and stay active. No changes other than the `spanish-convo` reprice above. Listed here so the canonical 52-item list is unambiguous.

`mamajuana`, `presidente`, `bachata-dance`, `spanish-convo` (repriced), `spanish-order`, `la-bandera`, `cigar`, `larimar`, `negotiate-half`, `crew-ocean`, `skinny-dip`, `every-bar`.

### 3.5 Universal challenges kept (32)

All entries from Khari's "Carried over" universal block stay active, except `shower-with` and `scavenger-hunt` (retired above) and `gianni-bike` (already retired).

### 3.6 Negative points (6 — no changes)

`throw-up`, `bed-pre-11`, `debate-drinks`, `first-to-bed`, `bad-sunburn`, `lost-bracelet`.

## 4. Implementation surface

### 4.1 `convex/_seedData/challenges.ts`

- Remove the 9 DR-block entries listed in §3.2 (everything except `shower-with` and `scavenger-hunt`, which are in the "carried over" block).
- Remove `shower-with` and `scavenger-hunt` from the carried-over block.
- Append the 8 new entries from §3.1 in a new "Trip-specific (added 2026-05-20)" section.
- Patch `spanish-convo` points from 50 to 30.
- `NEGATIVE_POINTS_CONST` — no changes.

After this edit, `SEED_CHALLENGES` length goes from 55 → 52 (55 − 11 retirements + 8 additions).

### 4.2 `convex/seedChallenges.ts`

Two changes:

1. **Extend the retirement list.** The existing `retireChallengeIds` mutation currently retires only `gianni-bike`. Extend `idsToRetire` to include the 11 ids from §3.2.
2. **Add a one-shot reprice mutation.** New `internalMutation` named `repriceChallenges` that patches `spanish-convo` from 50 → 30 (also rederives `difficulty` via `deriveDifficulty`). Generic shape so future repricings can reuse it:

```ts
const repricings: Array<{ id: string; points: number }> = [
  { id: "spanish-convo", points: 30 },
];
```

The existing `seedChallenges` mutation (insert-if-not-exists) handles the 8 additions on next run with no change.

### 4.3 `src/data/challenges.js` (styleguide)

Currently has 35 entries that match the *old* universal block (including the now-retired `gianni-bike`, `shower-with`). Replace the array with the final 52-item canonical list so the styleguide matches the live game. Categories: align with the seed file's categories (`beach`, `shopping`, `local`, `food` exist in seed but not in this file's `CHALLENGE_CATEGORIES`).

**Sub-decision:** Add the missing categories (`beach`, `shopping`, `local`, `food`) to `CHALLENGE_CATEGORIES` with labels/blurbs/icons matching their vibe, so all 52 challenges have a category that renders properly on the styleguide.

### 4.4 `src/routes/HomePage.jsx`

The inline `CHALLENGES` array (34 entries, hardcoded with numeric ids, no categories) needs the same content as `src/data/challenges.js`. Replace it inline (the HomePage doesn't import from `src/data/challenges.js` today — that's existing code smell, NOT being refactored in this spec).

Also: the inline `NEGATIVE_POINTS` and `FORFEITS` arrays on HomePage are minor drift from the canonical lists (e.g. `"Going to bed before 12"` vs the canonical `"Going to bed before 11pm"`). Bring them into sync as part of this change.

### 4.5 Migration sequence (production)

Order matters — additions before retirements would briefly show the old list mixed with new. Order:

1. Deploy the code changes (Convex functions + frontend) to Vercel + Convex (`limitless-peacock-239`).
2. Run `internal.seedChallenges.retireChallengeIds` (now retiring 12 ids — the existing one plus the 11 new ones).
3. Run `internal.seedChallenges.repriceChallenges`.
4. Run `internal.seedChallenges.seedChallenges` to insert the 8 new entries.
5. Spot-check `/player/khari?tab=challenges` and `/` for the expected 52-item set, plus the styleguide.

## 5. Out of scope

- **Scavenger hunt rework** (daily-categorical with slot-machine reveal). Separate brainstorm + spec — Adan's mechanic still needs design work (slot-machine reveal interpretation, per-player vs first-finder scoring, admin item picker, points per item).
- **Refactoring HomePage to import from `src/data/challenges.js`.** It's existing drift but unrelated to this content update.
- **Player-locked challenges** (e.g. Lambo-themed challenges only Candice can claim). Considered, deferred — Khari said "we have enough for now."
- **FLOW-state and event-anchored challenges** (Saona / boat party / Coco Bongo / tonight's dinner). Considered, deferred to a future session.
- **Suggestions flow.** Out of scope; the existing suggestions table is untouched.
- **Per-day rotation or freshness logic for challenges.** Not in scope.

## 6. Risks and things to watch

- **Live entries against retired challenges:** the `gameState.gamesLive` gate is currently `false` so no real entries should exist. Verify before retiring. If any exist (e.g. from dev seeding), they'll keep their points (retire is soft and doesn't touch `entries`).
- **`gym-first` is daily-claimable but the system doesn't enforce one-per-day per-player at the data layer.** The honour system (and vouching) handles this — same as every other "per day" challenge today. No new logic needed; the title carries the rule.
- **Difficulty bands:** `deriveDifficulty(points)` derives bands from points. Confirm post-deploy that the new entries land in sensible bands; reprice if anything looks weird.
- **HomePage list length:** going from 34 → 52 cards on the marketing page is a longer scroll. Acceptable per Khari's "any other challenges on the site shouldn't exist" rule, but worth a quick eyeball post-deploy to make sure the grid doesn't blow up.
- **Naming:** `sanatana-shot` uses Khari's spelling. If the bartender's name turns out to be "Santana", the `challengeId` stays (immutable) but the `title` can be patched via a follow-up.
