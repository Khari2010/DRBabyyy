# Posting Wall + PWA Push Notifications — Design Spec

**Date:** 2026-05-20
**Status:** Designed, awaiting review
**Target ship:** Pre-trip — live now as a hype tool, runs through the trip

## 1. Purpose

A group "wall" where the crew can post short text updates (with optional photos), reply, and react. Pings the rest of the crew via real iOS push notifications when something new happens. Replaces the WhatsApp habit of "did you see what so-and-so posted" with one shared, in-app, persistent feed.

Two things ship together: the wall itself, and a full PWA upgrade (real icon, manifest, service worker) that unlocks web push on iOS. The crew currently has a plain Safari web clip on their home screens — they re-add the icon once after launch, getting a custom DR Baby icon and push in the same gesture.

## 2. Decisions locked during brainstorm

| Topic | Decision |
|---|---|
| Content | **Text + optional single photo.** Text-first, 500 chars on a post, 280 on a reply. |
| Interactions | **Replies + emoji reactions** on top-level posts. Reactions on replies: out of scope. |
| Feed shape | **One global feed, newest-first.** No day grouping, no pinned slot. |
| Reaction set | **Fixed allow-list:** `❤️ 😂 🔥 😭 🍻 👀`. Free-form emoji: out of scope. |
| Reaction model | One row per `(post, player, emoji)`. Tap same emoji twice toggles off. Multiple different emojis per (post, player) allowed. |
| Edit | Out of scope. Post-and-fix-with-a-reply if needed. |
| Delete | Hard delete; author OR admin, matches `dayComments` pattern. Cascades to comments + reactions + photo storage. |
| Lifetime | **Live as soon as it ships.** Not gated on `gamesLive`. Doubles as pre-trip hype tool. |
| Placement | **New "Wall" tab in `BottomNav`** between Home and Games. Icon `💬`. |
| `start_url` | **`/wall`** — tapping the re-added home-screen icon opens the wall directly. |
| Notifications fire on | **New post → everyone except author.** **New reply → OP + everyone who replied earlier, minus the new replier.** Reactions and @mentions: out of scope. |
| Push permission UX | **Opt-in banner only.** Never auto-prompt. iOS rejects auto-prompts anyway. |
| Push delivery | DIY web-push with VAPID keys. Convex `internalAction` scheduled from the create/add mutations. No third-party push vendor. |
| Foreground suppression | Out of scope for v1 — notifications fire even if the wall is open. |
| Subscription model | One row per device (unique `endpoint`). Same player on multiple devices = multiple rows = multiple pushes. |

## 3. Architecture

Four loosely-coupled layers — each can be built and tested independently.

1. **Convex backend** — new tables (`posts`, `postComments`, `postReactions`, `pushSubscriptions`), mutations, queries, and one Node-runtime action file for web-push delivery. Mirrors the existing `dayComments` / `entryReactions` patterns.
2. **Wall UI** — new route `/wall`, new `WallPage.jsx`, new component folder `src/components/wall/`. Reuses primitives + tokens already in `src/components/primitives/` and `src/data/design.js`. New tab added to `BottomNav.jsx`.
3. **PWA shell** — `public/manifest.webmanifest`, custom icons in `public/icons/`, real `apple-touch-icon` link in `index.html`, `public/sw.js` service worker, registration from `src/main.jsx`.
4. **Push pipeline** — VAPID key pair (one-time generated). Public key as `VITE_VAPID_PUBLIC_KEY`, private key + subject in Convex env. New `src/lib/usePushSubscription.js` hook handles permission + subscription lifecycle on the client.

**End-to-end flow of one new post:**

1. Client calls `posts.create` mutation.
2. Row inserted; `ctx.scheduler.runAfter(0, internal.pushNotifications.sendForPost, { postId })` scheduled inside the same transaction.
3. Internal action loads the post + author, loads all `pushSubscriptions` except the author's.
4. Action POSTs a signed web-push payload to each endpoint.
5. Each device's service worker receives `push`, shows an OS notification.
6. Stale `404/410` responses trigger a follow-up mutation that deletes the dead subscription rows.

## 4. Data model

Four new tables added to `convex/schema.ts`:

```ts
posts: defineTable({
  authorSlug: v.string(),
  text: v.string(),                        // max 500 chars, enforced server-side
  photoStorageId: v.optional(v.id("_storage")),
  createdAt: v.number(),
}).index("by_created_at", ["createdAt"]),

postComments: defineTable({
  postId: v.id("posts"),
  authorSlug: v.string(),
  text: v.string(),                        // max 280 chars
  createdAt: v.number(),
}).index("by_post", ["postId"]),

postReactions: defineTable({
  postId: v.id("posts"),
  playerSlug: v.string(),
  emoji: v.string(),                       // one of the allow-listed set
  at: v.number(),
})
  .index("by_post", ["postId"])
  .index("by_post_and_player", ["postId", "playerSlug"]),

pushSubscriptions: defineTable({
  playerSlug: v.string(),
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
  userAgent: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_player", ["playerSlug"])
  .index("by_endpoint", ["endpoint"]),
```

**Allow-listed reaction set** (constant in `convex/postReactions.ts`): `["❤️", "😂", "🔥", "😭", "🍻", "👀"]`. Anything else is rejected at the mutation layer.

**Hard delete** — no `deletedAt` columns. `posts.remove` cascades to comments + reactions + the photo blob in `_storage`.

## 5. Convex API

All authenticated mutations take a `token` and run through `requireSession` (existing helper in `convex/helpers.ts`).

### `convex/posts.ts`

- `create({ token, text, photoStorageId? })` — mutation. Trim text. Reject if both text and photo are empty. Reject if text > 500 chars after trim. Insert row. Schedule `internal.pushNotifications.sendForPost`. Return the new `postId`.
- `remove({ token, postId })` — mutation. Author OR admin. Delete photo (if any), delete all `postComments` for the post, delete all `postReactions` for the post, delete the post itself.
- `list({ paginationOpts })` — query. Uses `by_created_at` index, `order("desc")`, paginated via `ctx.db.query(...).paginate(paginationOpts)`. Each item enriched server-side with: author holiday name, photo URL via `ctx.storage.getUrl()`, `reactionCounts: Array<{emoji, count}>` (Convex blocks non-ASCII object keys, so counts ship as an array), `viewerReactions: emoji[]`, `commentCount: number`.
- `generateUploadUrl({ token })` — mutation. Returns `await ctx.storage.generateUploadUrl()`. Matches the scavenger photo pattern.

### `convex/postComments.ts`

- `add({ token, postId, text })` — mutation. `ctx.db.get(postId)` first; throw if missing. Trim, reject empty / > 280. Insert. Schedule `internal.pushNotifications.sendForComment`.
- `remove({ token, commentId })` — mutation. Author OR admin.
- `listByPost({ postId })` — query. All rows sorted by `createdAt` ascending. Enriched with author holiday name.

### `convex/postReactions.ts`

- `toggle({ token, postId, emoji })` — mutation. Reject if emoji not in the allow-list. Look up `(postId, playerSlug, emoji)` via `by_post_and_player` index; if present delete it, otherwise insert. No push fires.

### `convex/pushNotifications.ts` (Node runtime — `"use node";` at top)

- `subscribe({ token, endpoint, p256dh, auth, userAgent? })` — mutation. Look up existing row by `endpoint`. If present, patch (handles "different player picked up the same device"). Else insert.
- `unsubscribe({ token, endpoint })` — mutation. Delete the row matching the endpoint owned by the caller.
- `sendForPost({ postId })` — internal action. Recipients = all `pushSubscriptions` except the author's. Payload: `{ title: "DR Baby", body: "<HolidayName>: <text snippet>", url: "/wall#post-<id>", tag: "post-<id>" }`. Per-subscription try/catch; on 404/410 schedule the prune mutation.
- `sendForComment({ commentId })` — internal action. Recipients = OP of the post + all distinct earlier commenters, minus the new commenter. Payload mirrors above, with `body: "<HolidayName> replied on <OPHolidayName>'s post: <snippet>"`, `tag: "post-<postId>"`.
- `_pruneSubscription({ subscriptionId })` — internal mutation called by the actions on dead-endpoint responses.

## 6. PWA + push flow

### Manifest — `public/manifest.webmanifest`

```json
{
  "name": "DR Baby '26",
  "short_name": "DR Baby",
  "start_url": "/wall",
  "display": "standalone",
  "background_color": "#FEF9EF",
  "theme_color": "#FEF9EF",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-180.png", "sizes": "180x180", "type": "image/png", "purpose": "any" }
  ]
}
```

Wired in `index.html`:
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<link rel="apple-touch-icon" href="/icons/icon-180.png">`

Custom icon artwork lives in `public/icons/` (PNG, generated from a single source).

### Service worker — `public/sw.js`

Three handlers:

- `install` / `activate` — `self.skipWaiting()` + `clients.claim()`.
- `push` — parse JSON payload, call `self.registration.showNotification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag, data: { url } })`. `tag` lets follow-up pushes for the same post collapse the previous one.
- `notificationclick` — `event.notification.close()`, then focus an existing client at `url` if any, else `clients.openWindow(url)`.

Registered once from `src/main.jsx`:

```js
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
```

### Permission + subscribe — `src/lib/usePushSubscription.js`

Exposes `{ state, requestPermission, unsubscribe }` where `state` is one of:
- `"unsupported"` — no `Notification` or no `PushManager` available.
- `"needs-install"` — supported, but not running in standalone mode.
- `"default"` — supported, standalone, but `Notification.permission === "default"` and no server-side subscription for this device.
- `"granted"` — `Notification.permission === "granted"` and a `pushSubscriptions` row exists for this endpoint.
- `"denied"` — `Notification.permission === "denied"`.

`state === "granted"` with no subscription row → hook silently re-subscribes (recovers from "permission saved but server forgot us" cases).

`requestPermission()` is invoked from a user gesture (banner tap). On grant → `swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID public key as Uint8Array> })` → call `pushNotifications.subscribe` mutation with the resulting endpoint + keys.

### Banner copy

- `default`: "🔔 Turn on notifications so you don't miss the chat."
- `needs-install`: "Add DR Baby to your home screen first — then come back and turn on notifications." with brief instructions.
- `granted`: banner hidden.
- `denied`: banner hidden. A help link in the Player settings strip explains the iOS uninstall/reinstall path.

### VAPID keys

Generated once locally with `npx web-push generate-vapid-keys`.

- Frontend: `VITE_VAPID_PUBLIC_KEY` committed via Vercel env.
- Backend (Convex env): `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (`mailto:khari@millennialservices.co.uk`).

The Convex action uses the `web-push` npm package to sign each delivery.

## 7. UI components

New route in `src/App.jsx`:
```jsx
<Route path="/wall" element={<WallPage />} />
```

New tab in `src/components/BottomNav.jsx` between Home and Games:
```js
{ to: "/wall", icon: "💬", label: "Wall", match: (p) => p.startsWith("/wall") }
```

### Page layout — `src/routes/WallPage.jsx`

```
┌─ Header: "The Wall" ────────────────┐
│ [Optional] NotificationsBanner       │
│ PostComposer                         │
│                                      │
│ PostCard (newest)                    │
│   author row · time · ⋯              │
│   text                               │
│   [photo]                            │
│   ReactionRow                        │
│   ▸ N replies (ReplyThread collapsed)│
│ PostCard …                           │
│   …                                  │
│ (infinite scroll sentinel)           │
└──────────────────────────────────────┘
```

### Components — `src/components/wall/`

- `NotificationsBanner.jsx` — uses `usePushSubscription`. Renders nothing when state is `granted` / `denied` / `unsupported`. Renders the right copy + CTA otherwise.
- `PostComposer.jsx` — autogrow textarea, placeholder `"What's up, <holiday name>?"`, 500-char counter, photo picker button, Post button (disabled until text or photo present). Optimistic clear on submit; restore + toast on failure.
- `PostCard.jsx` — author initial circle + holiday name + relative time, text body, optional photo (taps open existing `PhotoLightbox.jsx`), `ReactionRow`, `ReplyThread`. A `⋯` corner menu shows a Delete action for author + admins.
- `ReactionRow.jsx` — horizontal pills (emoji + count, highlighted if the viewer reacted). Trailing `+` pill opens a small picker with the 6 allowed emojis. Calls `postReactions.toggle`.
- `ReplyThread.jsx` — collapsed by default showing `▸ N replies`. Expanded reveals all replies plus a small inline reply composer (280 chars). Each reply has its own `⋯` for delete.
- `useWallPagination.js` — wraps `usePaginatedQuery(api.posts.list, {}, { initialNumItems: 15 })` and an `IntersectionObserver` sentinel at the bottom of the list.

### Reused

- `PhotoLightbox.jsx` — photo zoom (already in scavenger).
- `src/data/design.js` tokens, `src/components/primitives/` for surface primitives.
- Storage upload pattern from scavenger / `convex/scavenger.ts`.
- A new `src/lib/formatRelative.js` helper (the codebase has no existing relative-time util — kept tiny: "Xs / Xm / Xh / Yesterday / MMM D").

## 8. Error handling & edge cases

**Server-side validation** is the source of truth. Client validation is for UX only.

- Empty post (no text AND no photo) → mutation throws `"post must have text or a photo"`.
- Text over cap after trim → throws.
- Unknown reaction emoji → throws.
- `postComments.add` against a deleted post → throws `"post not found"`.
- `remove` mutations: author check first; if it fails, `requireAdmin`. Anyone else → throw.

**Cascade on `posts.remove`** — single mutation deletes photo blob, all comments, all reactions, then the post row.

**Push delivery is best-effort:**
- Each `webpush.sendNotification()` wrapped in try/catch.
- 404 / 410 → schedule prune of that subscription.
- Other errors logged, batch continues.
- If the post is deleted between mutation and action firing, action no-ops (re-fetches first; if missing, returns).
- Push never blocks or surfaces failures to the poster.

**Push payload shape** (under 4KB):
```json
{ "title": "DR Baby", "body": "<HolidayName>: <snippet up to 120 chars>…", "url": "/wall#post-<id>", "tag": "post-<id>" }
```

**Permission edge cases:**
- iOS `denied` is one-way per install — only fix is uninstall + reinstall the PWA. Documented in the help link.
- `granted` but no `pushSubscriptions` row → hook silently re-subscribes.
- Permission re-prompt after `default` → only from a user gesture (banner tap).

**Multi-device:** unique `endpoint` per device, so each device is its own row and gets its own push. No special handling.

**Foreground notifications:** v1 always shows the OS notification, even if the wall is in focus. Suppressing later via `clients.matchAll()` is a known follow-up, not v1.

**Optimistic UI:**
- Composer clears immediately; restore + toast on failure.
- Reaction pills toggle on tap pre-resolution. Convex's live query reconciles within a frame.

## 9. Testing

Matches the existing `*.test.ts` pattern (using `convex-test`).

**`convex/posts.test.ts`**
- `create` inserts a row, schedules `sendForPost`, returns id.
- `create` rejects empty (no text + no photo).
- `create` rejects > 500 chars after trim.
- `create` requires a valid session token.
- `remove` by author succeeds and cascades (post + comments + reactions + photo storage all gone).
- `remove` by admin succeeds for another player's post.
- `remove` by another non-admin player throws.
- `list` returns newest-first, includes enriched fields (holiday name, photo URL, reaction counts, viewer reactions, comment count).

**`convex/postComments.test.ts`**
- `add` inserts and schedules `sendForComment`.
- `add` against a missing post throws.
- `add` rejects > 280 chars after trim.
- `remove` author / admin / other-player matrix.
- `listByPost` sorted ascending.

**`convex/postReactions.test.ts`**
- `toggle` inserts on first call, deletes on second call with same `(post, player, emoji)`.
- `toggle` rejects emojis outside the allow-list.
- One player can hold multiple different emoji reactions on the same post.

**`convex/pushNotifications.test.ts`**
- `subscribe` upserts by `endpoint` (calling twice doesn't duplicate).
- `subscribe` from a new player on the same endpoint overwrites ownership.
- `unsubscribe` deletes the matching row.
- `_pruneSubscription` deletes a stale row.
- `sendForPost` / `sendForComment` actions — mock `web-push`, assert recipient set is correct (post: everyone except author; comment: OP + earlier commenters minus the new replier). Skip actual network send.
- 410-response simulation triggers prune scheduling.

**Manual / smoke (not unit-tested):**
- Service worker `push` and `notificationclick` — verified on a real iPhone PWA before shipping.
- Manifest installability — Chrome devtools "Application → Manifest" + actual iOS Add-to-Home-Screen run-through.
- End-to-end push — second device posts; first device receives the lockscreen notification.

**No new test infra needed.** `convex-test` is already configured in `vitest.config.js`. Push actions mock `web-push` via `vi.mock`.

## 10. Out of scope

Captured here so reviewers know what we deliberately punted on:

- @mentions of crew members (would require a mention parser + picker).
- Notifications on emoji reactions.
- Editing a post or reply after submission.
- Per-user notification preferences (quiet hours, mute one thread, "only mentions").
- Foreground suppression (skip OS notification when the wall is already in focus).
- Daily digest / catch-up summary.
- Day-grouped feed sections.
- Pinned posts.
- Video posts.
- Multiple photos per post.
- Reactions on replies.
- Cross-app deeplinks (everything links to `/wall#post-<id>`, no granular reply anchors v1).

## 11. Rollout

The crew has to re-add the home-screen icon once after launch — that's the only manual step.

1. Generate and commit a custom DR Baby icon (192 / 512 / 180 PNGs in `public/icons/`).
2. Generate VAPID keys, store in Vercel + Convex env.
3. Ship the wall + PWA shell + push in one deploy.
4. Send the crew a short WhatsApp note: "Delete the old DR Baby icon and re-add from Safari — you'll get a real icon and notifications. Tap '🔔 Turn on notifications' in the app once it opens."
5. Khari tests end-to-end from two devices to confirm push delivery before posting the rollout note.

Crew members who skip step 4 will still get a fully-working wall — they just won't see push notifications until they re-add. Acceptable degraded state.
