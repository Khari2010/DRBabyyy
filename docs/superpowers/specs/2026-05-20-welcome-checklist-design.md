# Welcome Checklist — Design

Status: design approved 2026-05-20.

## 1. Purpose

The trip is live and players are jumping in mid-week on phones, some less app-savvy than others. They need a quick way to:

1. See what they **need** to do to make the app theirs (profile setup), and
2. Discover what they **can** do across the four main destinations (Wall, Games, Leaderboard, Itinerary).

A single welcome card on the player home page acts as a self-paced tour: a checklist of nine actions that tick off automatically as the player performs them elsewhere in the app, with explicit navigation built into every row.

The card persists across devices for that player and disappears once everything is done (or the player explicitly hides it).

## 2. Placement & lifecycle

- Lives in `src/routes/PlayerPage.jsx`, rendered just below the hero/intro section and above the itinerary.
- Component: new `src/components/WelcomeChecklist.jsx`.
- Visible whenever:
  - the player is logged in **and** viewing their own page (`session.slug === slug`), **and**
  - `welcomeHidden` is `false`, **and**
  - not every item is in the completed state, **OR** all items are complete but the "all set" celebration row has not yet been hidden.
- Becomes a single celebratory row ("🎉 All set! Have a great trip.") when all nine items are done. The player can hide the celebratory row with a `Hide` tap.
- Once `welcomeHidden = true`, the card never reappears on any device.

## 3. Items

Two labelled groups inside the card.

### Set it up (one-time profile actions)

| # | Label | Auto-tick rule | On-tap behaviour |
|---|---|---|---|
| 1 | Pick your holiday name | Player has a non-empty `holidayName` (existing holiday-names data) | Scroll to `HolidayNameEditor` on the same page |
| 2 | Add a catchphrase | Player has a non-empty catchphrase (existing catchphrases data) | Scroll to `CatchphraseEditor` on the same page |
| 3 | Tell us your room number | Player has a saved room number (existing rooms data) | Scroll to `RoomNumberEditor` on the same page |
| 4 | Make your lockscreen | `playerProgress.lockscreenSeen === true` | Scroll to `LockscreenGenerator`; the scroll triggers `welcome.markLockscreenSeen` |

### Try it out (one-time discovery)

| # | Label | Auto-tick rule | On-tap behaviour |
|---|---|---|---|
| 5 | Post on the Wall | Player has ≥1 wall post (existing `wall.listForPlayer` style query) | Navigate to `/wall` |
| 6 | Claim a challenge | Player has ≥1 challenge claim, any status (existing challenges data) | Navigate to `/player/:slug/games` (Challenges tab) |
| 7 | Play today's scavenger | `playerProgress.visitedScavenger === true` | Navigate to `/player/:slug/games?tab=scavenger`; the games page fires `welcome.markScavengerVisited` on first paint when that tab is active |
| 8 | Vote on an adventure | Player has ≥1 row in `activityVotes` for their slug | Scroll to `AdventuresPanel` on the same page |
| 9 | Check the leaderboard | `playerProgress.visitedLeaderboard === true` | Navigate to `/leaderboard`; the leaderboard page fires `welcome.markLeaderboardVisited` on first paint |

Tap behaviour on already-completed items is identical (re-navigates or re-scrolls). Completion is a visual state, not a lockout.

## 4. Data model

### 4.1 New Convex table: `playerProgress`

One row per player slug. Indexed by `slug`.

```ts
playerProgress: {
  slug: string,
  visitedLeaderboard: boolean,
  visitedScavenger: boolean,
  lockscreenSeen: boolean,
  welcomeHidden: boolean,
}
```

All four fields default to `false` if the row is missing.

### 4.2 New Convex module: `convex/welcome.ts`

Single composite query plus four mutations.

**Query `welcome.getProgress({ slug }): Progress`**

```ts
type Progress = {
  items: Array<{ id: ChecklistItemId; done: boolean }>; // length = 9, ordered as in §3
  doneCount: number;     // count of items where done === true
  totalCount: number;    // always 9
  hidden: boolean;       // value of playerProgress.welcomeHidden
};
```

The query joins the three `playerProgress` flags that contribute to item state (`lockscreenSeen`, `visitedScavenger`, `visitedLeaderboard`) with six booleans derived from existing data (holiday name set, catchphrase set, room set, ≥1 wall post, ≥1 challenge claim, ≥1 activity vote — covering items 1, 2, 3, 5, 6, 8). It returns nine `{ id, done }` entries in the order listed in §3.

`ChecklistItemId` is a string-literal union: `'holidayName' | 'catchphrase' | 'room' | 'lockscreen' | 'wallPost' | 'challengeClaim' | 'scavengerVisit' | 'adventureVote' | 'leaderboardVisit'`.

**Mutations**

All four require `{ slug, token }` and verify the session matches the slug using the same helper that gates `CatchphraseEditor` etc. Each is idempotent — calling twice is a no-op once the flag is `true`.

- `welcome.markLockscreenSeen({ slug, token })`
- `welcome.markScavengerVisited({ slug, token })`
- `welcome.markLeaderboardVisited({ slug, token })`
- `welcome.hide({ slug, token })` — sets `welcomeHidden = true`

### 4.3 Mutation trigger points

- `markLockscreenSeen` — fired by `WelcomeChecklist.jsx` when the player taps the "Make your lockscreen" row (i.e. on intent, not on render). This avoids needing to wire anything into the existing `LockscreenGenerator`.
- `markScavengerVisited` — fired from `PlayerGamesPage.jsx` (or whichever component owns tab state) in a `useEffect` that runs when the active tab equals `scavenger`. Guarded by a `done` flag from `welcome.getProgress` so it only writes once.
- `markLeaderboardVisited` — fired from `LeaderboardPage.jsx` in a `useEffect` that runs on first paint. Guarded the same way.
- `hide` — fired by the `Hide` link in the card itself.

The guards mean the mutations are still safe to call repeatedly — the guards are a network-traffic optimisation, not a correctness requirement.

## 5. Component contract

### `WelcomeChecklist.jsx`

**Props**

```ts
{ slug: string; token: string; player: PlayerRecord }
```

**Behaviour**

1. Queries `welcome.getProgress({ slug })`. While loading, renders nothing (no skeleton — see §6 motion).
2. If `hidden === true`, renders nothing.
3. If `doneCount === totalCount`, renders the celebratory row (one line + `Hide` link).
4. Otherwise renders the full card (header + two groups + dismiss link).
5. Holds no state of its own beyond derived UI state — the source of truth is the query.

**Public surface used by other components**

None. The mutations on `PlayerGamesPage` and `LeaderboardPage` use `api.welcome.mark…` directly rather than going through this component.

## 6. Visual treatment

Uses primitives and tokens from `DESIGN.md`. No new design tokens.

- **Card**: `<Card>` accent variant — player-tinted gradient + ring in `player.color` (DESIGN.md §4).
- **Eyebrow**: `GET STARTED` in `player.color`, `EYEBROW` typography token.
- **Title**: "Make the most of the trip", `HEADING.h3`.
- **Progress chip**: top-right inside the header, `<Pill>` neutral. Shows `N / 9` while incomplete. Replaced by an inline green check + "All set" once `doneCount === totalCount`.
- **Group labels**: `SET IT UP` and `TRY IT OUT`, `MICRO_LABEL` token, `C.textBody` at 0.7 opacity.
- **Row**: 44px tall, padding 0 4px, gap 12px. Layout: `[ status icon | label (flex 1) | chevron ]`. Whole row is the click target.
- **Status icon**:
  - Incomplete — empty circle, 22px, `C.sandDark` 1.5px border.
  - Complete — filled disc in `C.green` with white check glyph, 22px.
- **Label**:
  - Incomplete — `C.dark`, Nunito 700, 14px.
  - Complete — `C.textBody` at 0.55 opacity, `textDecoration: 'line-through'`, same weight/size.
- **Chevron**: 16px, `C.textBody` at 0.4 opacity. Hidden when complete.
- **Dismiss link**: bottom-right of the card body, Nunito 600 / 12px / `C.textBody`. Text: `Hide this`. No confirm modal — calls `welcome.hide` directly. After the mutation resolves, fire a passive `showToast({ message: "Hidden — welcome card dismissed", accent: C.textBody })` using the existing `src/lib/useToast.js` helper.
- **Celebratory state**: card body collapses to one line — `🎉 All set! Have a great trip.` — with the `Hide` link to its right.

**Motion**

- When `done` flips `false → true` for a row while the card is mounted (e.g. the player returns from `/wall` after posting), the empty circle morphs to the filled check with a 200ms ease-out, and the label fades to its strikethrough state over the same 200ms. No confetti, no sound.
- No entrance animation on first mount.

## 7. Out of scope

These are explicitly **not** included in this v1 design:

- Re-show entry point from the profile (a "show welcome again" link). The card is one-shot. If the user requests this later, it can be added by exposing `welcome.unhide`.
- A `?tab=scavenger` query param if `PlayerGamesPage` doesn't already support tab-from-URL. If it doesn't, item 7 navigates to the games page and the player taps Scavenger themselves; the auto-tick still works once they land on the tab.
- Re-issuing the checklist on a new trip / next year. Out of scope until there's a next trip.
- Push notifications when items remain. Not in v1.
- Analytics on completion rates. Not in v1.

## 8. Testing notes

- Unit-test `welcome.getProgress` against a fixture player to confirm each of the five derivations (holiday name, catchphrase, room, wall post, challenge claim, activity vote) flips correctly.
- Unit-test each mutation's idempotency (call twice, only one write effect).
- Unit-test auth — calling any mutation with a token that doesn't match `slug` rejects.
- Manual: with a fresh test player, walk through all nine items and confirm the card disappears.
- Manual: tick a few items, tap `Hide this`, refresh, confirm the card stays gone.
