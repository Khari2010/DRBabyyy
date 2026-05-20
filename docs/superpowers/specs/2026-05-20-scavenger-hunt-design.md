# Scavenger Hunt — Design Spec

**Date:** 2026-05-20
**Status:** Designed, awaiting review
**Target ship:** Alongside the End-Day / wheel takeover work, before the trip's first full day if possible

## 1. Purpose

Add a scavenger hunt to the in-trip games experience. Players hunt resort/island items, photograph what they find, and earn points that feed the same daily/holiday leaderboard the challenges system already drives. A small order-bonus rewards fast logging so phones come out the moment something interesting is spotted.

The hunt is **open** (every player can claim every item) but uses photo evidence with admin post-hoc review to discourage padding.

## 2. Decisions locked during brainstorm

| Topic | Decision |
|---|---|
| Scoring model | Cumulative points race — finds become `entries` rows that feed the existing `getDaily` / `getHoliday` leaderboard queries. No separate scavenger winner. |
| Claim economics | **Open** — every player can claim every item once. Each player has a 29-slot personal checklist. |
| Order bonus | **1st finder +5, 2nd finder +3, 3rd+ no bonus.** Order is by upload timestamp, not approval. |
| Point tiers | Mirror challenges: **easy 5 / medium 10 / wild 20**. Each item is tagged once (see §6 below). |
| Evidence | **Photo required.** Submitted via the device camera. Stored in Convex storage. |
| Review model | **Trust-first.** Points awarded instantly on upload; admin can retroactively reject if a photo is obviously fake/wrong, which retracts points and slide-ups the order bonus. |
| Rejection slide-up | When admin rejects, every later active claim on the same item moves up one rank (and gets the larger bonus tier if applicable). |
| Resubmission | If a player's claim is rejected they may resubmit a new photo; their new entry is ranked against the current active set at the moment of resubmission. |
| Where it lives | Tab inside the existing `PlayerGamesPage` header (`?tab=scavenger`). No new route. |
| Per-day rotation | None. All 29 items always visible. |
| Pre-trip gate | Honours the existing `gameState.gamesLive` flag — empty/locked state shown until games go live. |
| Item list source of truth | Keep `src/data/scavenger.js` as the seed; items are baked into the bundle, not stored in Convex. Adan/Aiden recon can refine the list later; non-existent items self-correct (nobody can claim them). |
| Suggestions for new items | Out of scope for v1. Defer until the seed list is confirmed in the field. |

## 3. Architecture

Approach selected: **A — extend the existing `entries` table.**

- Photo finds are recorded as `entries` rows with `type: "scavenger"`. The existing leaderboard aggregator (`sum(entries.points WHERE status != 'disputed')`) already covers them — zero changes to leaderboard queries.
- The existing `status` field (`active` / `verified` / `disputed`) carries the trust-model state: scavenger finds are inserted as `active`; admin rejection moves them to `disputed`.
- The order-bonus rank is denormalised onto the entry row at insert time so the player UI can show "🥇 1st" / "🥈 2nd" without recomputing. Rejections trigger a slide-up that patches later entries' ranks and points.
- Photos live in Convex's built-in file storage (`ctx.storage`) and are referenced by `_storage` id on the entry row.

## 4. Convex schema changes

### `entries` table — three optional fields added

| Field | Type | Notes |
|---|---|---|
| `type` | `v.union(v.literal("challenge"), v.literal("negative"), v.literal("scavenger"))` | Add `"scavenger"` to the existing union. |
| `scavengerItemId` | `v.optional(v.string())` | Slug from `SCAVENGER_ITEMS` (e.g. `"coconut"`). Set only on scavenger entries. |
| `photoStorageId` | `v.optional(v.id("_storage"))` | Convex storage id for the uploaded photo. |
| `scavengerRank` | `v.optional(v.number())` | `1`, `2`, or `3+` (clamped). Drives the player's medal display and the bonus tier. |

### New index

- `entries.index("by_scavenger_item", ["scavengerItemId"])` — used by `claimScavenger` to count current active claims and by `rejectScavenger` to find later entries for the slide-up.

### No other tables added

Suggestions, leaderboard, rollovers, sessions all unchanged.

## 5. Mutations & queries

### `entries.claimScavenger` (new mutation)

```ts
args: {
  token: v.string(),
  scavengerItemId: v.string(),
  photoStorageId: v.id("_storage"),
}
```

Handler:
1. `requireSession(ctx, token)` → `playerSlug`.
2. Reject if `gameState.gamesLive === false`.
3. Reject if an active entry already exists for `(playerSlug, scavengerItemId)`.
4. Look up the item in `SCAVENGER_ITEMS` by id → reject if unknown. Pull `points`, `difficulty`.
5. Query existing entries with `scavengerItemId === id` AND `status !== "disputed"`. Count = `n`.
6. `rank = Math.min(n + 1, 3)`. `bonus = {1: 5, 2: 3, 3: 0}[rank]`.
7. Insert entries row:
   - `type: "scavenger"`, `subjectSlug: playerSlug`, `points: item.points + bonus`, `dailyKey: gameState.currentDailyKey`, `status: "active"`, `scavengerItemId`, `photoStorageId`, `scavengerRank: rank`, `vouchCount: 0`, `disputeCount: 0`, `createdAt: now`.
   - Label/icon are *not* stored on the entry — they're resolved at query time from `SCAVENGER_ITEMS` by id (matches how the existing `challenges` flow resolves `label`/`labelIcon` in `leaderboard.getRecentActivity`).

### `entries.rejectScavenger` (new mutation)

```ts
args: { token: v.string(), entryId: v.id("entries") }
```

Handler:
1. `requireAdmin(ctx, playerSlug)` (existing helper).
2. Load entry; reject if not type `"scavenger"` or already `"disputed"`.
3. Patch entry → `status: "disputed"`.
4. Find all *other* active entries with the same `scavengerItemId` and `createdAt > entry.createdAt`, ordered by `createdAt`.
5. For each (in order), decrement `scavengerRank` by 1 (clamped to 3) and patch `points` to `item.points + bonusForRank(newRank)` if the rank actually changed.

### `entries.resubmitScavenger` — *not* a separate mutation

Resubmission just calls `claimScavenger` again. The duplicate-active guard in step 3 of `claimScavenger` only blocks active entries, so a player with a previously rejected entry can re-claim freely.

### `scavenger.getAdminQueue` (new query)

```ts
args: { token: v.string(), filter: v.union(v.literal("today"), v.literal("all"), v.literal("rejected")) }
```

Returns scavenger entries for the admin review surface. Filter `"today"` matches `dailyKey === currentDailyKey`, `"all"` returns active only, `"rejected"` returns disputed only. Each row includes the storage URL via `ctx.storage.getUrl(photoStorageId)`.

### `scavenger.getMyFinds` (new query)

```ts
args: { token: v.string() }
```

Returns the current player's scavenger entries (active + disputed) — resolves session → slug, then queries by `subjectSlug` and `type: "scavenger"`. Lets the tile grid render its per-item state from a single reactive subscription.

### `scavenger.getItemFinders` (new query)

```ts
args: { scavengerItemId: v.string() }
```

Returns up to N active finders (ordered by `createdAt`) for the given item — drives the "found by Adan + Kai" avatar stack in the tile footer. Public — does not require a session.

### `leaderboard.getRecentActivity` — extended

The existing resolver loop in `convex/leaderboard.ts` (currently switches on `e.type === "challenge"` vs `"negative"` to fill `label`/`labelIcon`) gains a third branch for `"scavenger"`. Since `SCAVENGER_ITEMS` lives in `src/data/scavenger.js` (client code), the resolver re-imports it as a server-side constant — same approach the existing system uses for `NEGATIVE_POINTS`.

## 6. Seed data — `src/data/scavenger.js`

Each item gains `difficulty` and `points` fields. Proposed assignments:

### Food (8)
| Item | Tier | Pts |
|---|---|---|
| coconut | easy | 5 |
| mango-stand | easy | 5 |
| tostones | easy | 5 |
| presidente | easy | 5 |
| mamajuana | medium | 10 |
| conch-fritter | medium | 10 |
| tres-leches | medium | 10 |
| rum-coconut | medium | 10 |

### Plant (7)
| Item | Tier | Pts |
|---|---|---|
| royal-palm | easy | 5 |
| hibiscus | easy | 5 |
| banana-plant | easy | 5 |
| bird-of-paradise | medium | 10 |
| sea-grape | medium | 10 |
| bromeliad | medium | 10 |
| cactus-fruit | wild | 20 |

### Animal (7)
| Item | Tier | Pts |
|---|---|---|
| iguana | easy | 5 |
| crab | easy | 5 |
| stray-cat | easy | 5 |
| pelican | medium | 10 |
| tropical-fish | medium | 10 |
| hummingbird | medium | 10 |
| starfish | wild | 20 |

### Object (7)
| Item | Tier | Pts |
|---|---|---|
| peso | easy | 5 |
| conch-shell | medium | 10 |
| cigar | medium | 10 |
| maracas | medium | 10 |
| domino | wild | 20 |
| live-bachata | wild | 20 |
| sand-dollar | wild | 20 |

Distribution: 11 easy / 13 medium / 5 wild. Khari signs off on the tier assignments before implementation begins.

## 7. Components — new

| Component | Path | Notes |
|---|---|---|
| `GamesTabBar` | `src/components/GamesTabBar.jsx` | Two `Pill` buttons (Challenges / Scavenger), accent `C.gold`. Reads/writes `?tab=` search param. Used at top of `PlayerGamesPage`. |
| `ScavengerSection` | `src/components/ScavengerSection.jsx` | The scavenger view. Mirrors `ChallengesSection` rhythm: header → today chip → category pills → tile grid → my recent. Honours `gamesLive` gate identically. |
| `ScavengerCard` | `src/components/ScavengerCard.jsx` | Tile component with four visual states: unfound / pending / found / rejected. Photo thumbnail replaces icon when found. Medal overlay for rank 1/2. Footer shows up to 3 finder avatars. |
| `ScavengerClaimSheet` | `src/components/ScavengerClaimSheet.jsx` | Extends the existing `BottomSheet` primitive. Item header → camera input → preview → Claim button. Client-side compresses to ~1280px JPEG before upload. |
| `AdminScavengerQueue` | `src/components/AdminScavengerQueue.jsx` | Inline rows with thumbnail + meta + Reject button. Filter pills (Today / All / Rejected). Inline confirm before reject. Tap thumbnail → full-screen lightbox. |
| `PhotoLightbox` | `src/components/PhotoLightbox.jsx` | Full-bleed overlay; reuses `BottomSheet`'s overlay mechanics. Tap outside to close. |

## 8. Components — modified

| Component | Change |
|---|---|
| `PlayerGamesPage` | Mount `<GamesTabBar>` under `<DashboardHero>`. Conditionally render `<ChallengesSection>` or `<ScavengerSection>` based on the tab param. |
| `AdminPage` | Add a new section band with `<AdminScavengerQueue>`, accent `C.coralDeep` to match existing admin sections. |
| `EntryRow` | Add a scavenger variant — surfaces the photo thumbnail in the live feed when the entry is `type: "scavenger"`. No vouch/dispute buttons for scavenger rows (admin-only review). |

## 9. Visual & motion

- Tab bar, eyebrow, and Section accent: `C.gold` (`SECTION_ACCENTS.game`).
- Category pills colour-coded from `SCAVENGER_CATEGORIES`: food `C.coralDeep`, plant `C.green`, animal `C.turquoise`, object `C.gold`.
- Difficulty stripe on the top edge of unfound tiles: 1px in `DIFFICULTY_COLOR[difficulty]` (`C.green` / `C.gold` / `C.coralDeep` — same map `ChallengesSection` uses).
- Found tile: photo thumb (40×40, `RADIUS.sm`), medal emoji absolute-positioned top-right at `-6px / -6px`.
- Tile grid: `grid-template-columns: repeat(2, 1fr)`, `gap: 12`.
- Motion: `<Reveal>` wrapper on section header and grid; stagger children with `<Reveal delay={i * 0.03}>`. Medal-earning claims trigger a one-shot `transform: scale(1.18) → 1` pop using the project's standard `cubic-bezier(0.16,1,0.3,1)` easing.
- All inline values must use tokens from `src/data/design.js` — no hard-coded radii, shadows, or font stacks (per `DESIGN.md` §9 checklist).

## 10. Edge cases

| Case | Behaviour |
|---|---|
| Two players upload at the exact same moment | Convex serialises each mutation; whichever transaction commits first reads `n=0` and gets rank 1, the second reads `n=1` and gets rank 2. Safe. |
| Pre-trip (`gamesLive=false`) | `ScavengerSection` shows the same "Games kick off after breakfast" card as `ChallengesSection`. `claimScavenger` mutation rejects with "games not live". |
| Player attempts to claim same item twice | Duplicate-active guard in `claimScavenger` rejects with "already claimed". |
| Photo > 5 MB | Compressed client-side in `ScavengerClaimSheet` via `<canvas>` to ~1280px longest edge, ~80% JPEG quality. |
| Upload mid-flight network drop | `BottomSheet` stays open with a Retry CTA. Entry row is only inserted after the storage put resolves. |
| Storage put succeeds but mutation fails | Orphan blob in Convex storage. Acceptable for v1; no cleanup sweep. |
| Admin rejects → claimer's bonus retracts → claimer's leaderboard drops mid-day | Expected. Toast on the leaderboard recent-activity feed: "❌ Rejected — Khari's coconut find disputed." |
| Admin rejects #2 (not #1) | Slide-up only affects entries *later* than the rejected one. #1 stays #1; what was #3 becomes #2 and gains +3 bonus. |
| Player resubmits after rejection while two others have claimed in the interim | New entry is inserted against the current active count (now 2), so resubmission lands at rank 3 with no bonus. Old disputed row stays. |
| Item id no longer in `SCAVENGER_ITEMS` (data file change) | `claimScavenger` rejects new claims with "unknown item". Historic entries with a now-missing id render with the raw id as fallback (resolver returns the id when lookup misses) — same graceful-degradation pattern `getRecentActivity` already uses for challenges. Implication: do not delete items from the seed list once the trip starts; mark them retired in code if needed. |

## 11. Out of scope (deferred)

- Admin "freshness" badge / unseen-photos counter on the BottomNav.
- Notifications when your rank slides up after someone else's rejection.
- Player-suggested scavenger items (the existing `suggestions` flow could be reused later).
- Per-day rotation or "today's hunt" subsets.
- Photo editing / cropping inside the app.
- Bulk admin actions (approve-all, reject-all).

## 12. Memory update needed on ship

`project_leaderboard_design.md` currently says:

> Evidence is self-reported only — no photo/video uploads in the app (keeps it light on processing). The claim is just text/selection.

That rule still applies to challenges. For scavenger, photos *are* required. Update the memory to scope the no-uploads rule to challenges only when this ships.

## 13. Open items

1. Khari to sign off on the difficulty tier assignments in §6 before implementation begins.
2. Adan/Aiden recon (optional, can run in parallel) — confirm which items genuinely exist at the resort; suggest swaps for ones that don't. Not a blocker.
3. Confirm the End-Day / wheel takeover spec ships in the same wave (separate spec, sibling work, no hard dependency).
