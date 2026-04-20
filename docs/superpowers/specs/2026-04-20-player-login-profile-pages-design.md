# Player Login & Private Profile Pages — Design

**Status:** Approved for planning
**Date:** 2026-04-20
**Target:** Live before trip start (18 May 2026)

## Goal

Give each of the 6 trip players a private, passcode-gated page they can log in to before the trip. The page centres on them (their flights, their answers to pre-trip prompts) and lets them browse their crew's answers to the same prompts. The existing public site at `/` is not changed.

## V1 scope

**In scope:**
- Login modal on the main site (reusing the existing "Player Log In" button)
- Each player sets their own 4-digit passcode on first use
- Passcode verification redirects to a private per-player page at `/player/<slug>`
- Each private page shows: player hero, their flight details, pre-trip questions (editable), crew answers viewer (read-only)
- Answers persist in a Convex backend and update live across devices via Convex reactive queries

**Out of scope for v1 (tracked as future work below):**
- Any changes to the public home page content or layout
- Per-player hotel room photos
- Adventure map voting (like/dislike planned/unplanned activities)
- Photo uploads / custom caricatures
- Holiday games leaderboard
- "Who's most likely to…" polls
- Ebony on the login picker (added when she's confirmed — currently TBC mystery player)

## Players in v1

Login picker and private pages ship for: Kai, Khari, Candice, Kyanna, Camara, Miles. Matches the existing `PLAYERS` array in `src/App.jsx`. Ebony is deliberately excluded from the picker to preserve the surprise.

## User flows

### First-time login

1. User lands on `/`, clicks the existing "Player Log In" button in the welcome corner.
2. Modal opens showing a 3×2 grid of the 6 player avatars (emoji, name, player colour).
3. User taps their own avatar.
4. Because no passcode exists yet for this player, the modal swaps to: "Set a 4-digit passcode for your profile." User enters it twice to confirm.
5. Convex hashes and stores the passcode. Convex returns a session token. Client stores `{ slug, token }` in `localStorage` under key `drbabyyy.session`.
6. Client navigates to `/player/<slug>`.

### Returning login

1. User clicks "Player Log In" → avatar grid → taps their avatar.
2. Because a passcode is already set, the modal shows: "Enter your passcode."
3. Passcode is verified via Convex. On success, a new session token is issued and stored in `localStorage`.
4. Client navigates to `/player/<slug>`.

### Already-logged-in user visits `/`

If a valid session token exists in `localStorage`, the "Player Log In" button is replaced by a chip: "Go to your page · ☀️ Candice". Clicking it navigates to `/player/<slug>`. (A separate "Log out" link clears the token.)

### Direct visit to `/player/<slug>`

1. Page loads and reads `localStorage.drbabyyy.session`.
2. If no session, or session's slug doesn't match the URL slug, the client redirects to `/` and auto-opens the login modal targeting that slug.
3. If session slug matches, the client validates the token via a Convex query. If the token is valid, the page renders. If not, redirect as above.

### Forgot passcode

No self-service reset in v1. Khari (or any trip admin) runs an internal Convex mutation (`admin.resetPasscode`) that clears the target player's hash. That player's next login will flow through the first-time path and set a new passcode.

## Routes

| Route | Purpose |
|---|---|
| `/` | Existing public site. Unchanged. Login modal is layered on top on button click. |
| `/player/:slug` | Private per-player page, passcode-gated via session check on the client. |

Routing is handled by `react-router-dom` added as a new dependency. Vercel is configured with a `vercel.json` rewrite so client-side routing works for the `/player/*` paths (SPA fallback to `index.html`).

## Private player page — components

One shared template renders for all players, parametrised by slug and logged-in player data.

### Layout (top to bottom)

1. **Hero**: large avatar, player name, title, role, bio. Uses the player's colour for accents. Floating "Log out" chip in a corner.
2. **Your flights**: renders the flight cards from the existing `FLIGHTS` data where the player's name appears in `who`. Prominent treatment — full colour, own section.
3. **Pre-trip questions**: a list of 5 prompts (see below). For each: shows the player's current answer with an inline "Edit" button, or an empty textarea + "Save" button if unanswered. Saves to Convex on submit.
4. **Crew answers**: a row of the other 5 player avatars. Tapping one expands an inline panel showing that player's answers to the same 5 prompts (read-only). Only one is expanded at a time. No navigation occurs — the data loads via Convex and renders inside the current page.

### Starter question set (v1)

1. "What are you most looking forward to?"
2. "One thing that *has* to happen this trip?"
3. "A dare you'd be willing to do for the group?"
4. "Your song for the trip playlist?"
5. "Hot take about this crew?"

Questions are defined in a frontend constant `QUESTIONS` (id + prompt). Editing or swapping requires a code change and redeploy — acceptable for a tiny, static list.

Per-answer character limit: 280.

## Frontend structure changes

Current state: everything lives in `src/App.jsx` (1027 lines). Introducing routing and new pages is a good moment to break this up, scoped tightly to what this feature requires — not a broader refactor.

**New files:**
- `src/routes/HomePage.jsx` — wraps the existing long-scroll content extracted from `App.jsx`.
- `src/routes/PlayerPage.jsx` — the private per-player page.
- `src/components/LoginModal.jsx` — the login modal.
- `src/components/LoggedInChip.jsx` — the "Go to your page / Log out" chip shown on `/` when logged in.
- `src/components/QuestionBlock.jsx` — single prompt + answer UI (editable or read-only).
- `src/components/CrewAnswersPanel.jsx` — the crew viewer.
- `src/data/questions.js` — the `QUESTIONS` array.
- `src/lib/session.js` — small helpers for reading/writing the session token in `localStorage`.
- `src/lib/convex.js` — Convex client setup.

**Existing code:**
- `src/App.jsx` becomes a thin router using `react-router-dom`'s `BrowserRouter` + `Routes`, mounting `HomePage` at `/` and `PlayerPage` at `/player/:slug`.
- The hardcoded `PLAYERS`, `FLIGHTS`, `ITINERARY`, etc. arrays move out of `App.jsx` into `src/data/` modules so both routes can import them cleanly.

This is a focused split, not a rewrite. The existing components and styles used in `App.jsx` carry over into `HomePage.jsx` unchanged.

## Convex backend

### Schema

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    slug: v.string(),             // e.g. "candice"
    passcodeHash: v.union(v.string(), v.null()),
  }).index("by_slug", ["slug"]),

  answers: defineTable({
    playerSlug: v.string(),
    questionId: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  }).index("by_slug", ["playerSlug"])
    .index("by_slug_and_question", ["playerSlug", "questionId"]),

  sessions: defineTable({
    playerSlug: v.string(),
    token: v.string(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),
});
```

Players are seeded once via a one-off internal mutation listing the 6 known slugs with `passcodeHash: null`. New players are added the same way.

### Functions

Password hashing requires the Node.js runtime, so the two auth entry points that touch raw passcodes are Convex **actions**. Actions invoke internal mutations/queries for DB work.

- `auth.setPasscode` (action) — args: `{ slug, passcode }`. Calls an internal query to check that `passcodeHash` is not already set for that slug; rejects if it is. Runs bcrypt to hash the passcode. Calls an internal mutation to write the hash and create a session. Returns `{ token }`.
- `auth.login` (action) — args: `{ slug, passcode }`. Calls an internal query to load the stored hash, runs bcrypt compare, calls an internal mutation to create a session. Returns `{ token }`. Throws on failure.
- `auth.getSession` (query) — args: `{ token }`. Returns `{ playerSlug }` or `null`.
- `auth.logout` (mutation) — args: `{ token }`. Deletes the matching session row.
- `admin.resetPasscode` (internal mutation) — args: `{ slug }`. Sets `passcodeHash` to `null` and deletes sessions for that slug. Called manually via Convex dashboard or `npx convex run`.
- `answers.listAll` (query) — no args. Returns all answers across all players. Reactive; all clients see updates live.
- `answers.save` (mutation) — args: `{ token, questionId, text }`. Validates the session, upserts the answer for `(session.playerSlug, questionId)` with `updatedAt = Date.now()` and `text` trimmed to 280 chars.

### Security notes

- Passcodes are hashed with bcrypt even though this is a low-trust, friends-only gate. Cost factor 10.
- Session tokens are 32-byte random strings (base64url), generated via `crypto.randomUUID()`-style entropy in a Convex action. No expiry in v1 — sessions live until logout or admin cleanup.
- Only `answers.save` checks the session token's slug matches the write target. Queries return data freely to any caller (no gate), which is consistent with "answers visible to everyone once logged in" — the gate is the private page itself, not the query.
- No rate limiting in v1. With 6 users this is acceptable.

## Deployment workflow

**Vercel (frontend):**
- Existing deployment continues. Add one environment variable: `VITE_CONVEX_URL` (Convex provides this on project creation).
- Add `vercel.json` at the repo root with a catch-all rewrite to `index.html` so `/player/*` SPA routes work:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```

**Convex (backend):**
- New directory `convex/` at the repo root with schema + functions.
- `npx convex dev` during local development (auto-generates typed client code).
- `npx convex deploy` pushes to production.
- Free tier is sufficient for this scale (6 users, small writes, small dataset).

**Local dev:** two terminals — `npm run dev` and `npx convex dev`.

## Open decisions captured

- **Session lifetime:** no expiry in v1. If this causes issues (e.g., a phone passed around), we add an expiry in a later iteration.
- **Passcode length:** 4 digits. Easy to remember, easy to distribute. Brute force is out of scope for this trust model.
- **Questions are hardcoded:** changing them needs a deploy. Acceptable because the set is small and stable before the trip.
- **Ebony:** excluded from v1 login picker to preserve the surprise. She's added when confirmed via a small data + seed update.
- **Main site unchanged:** no re-skinning, no logged-in chip in sections, no content shifts. The only addition to `/` is the existing "Player Log In" button now wiring up to the real login modal (and optionally the "Go to your page" chip when a session exists).

## Future work (out of v1)

- `/player/<slug>` phase 2: hotel/room photos per player, score entry, photo upload for custom caricatures
- Adventure map voting (separate spec — planned vs. unplanned activities, like/dislike, suggestions)
- Holiday games leaderboard (separate spec — daily scoring, live standings)
- "Who's most likely to…" polls
- Admin UI for passcode reset (replaces manual Convex script)
