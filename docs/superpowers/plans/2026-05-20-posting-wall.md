# Posting Wall + PWA Push — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a group "wall" with posts/replies/reactions, plus a real PWA upgrade so iOS can receive web-push notifications when something new happens.

**Architecture:** Four layers. (1) Convex backend with four new tables and CRUD + push-trigger logic. (2) New `/wall` route + bottom-nav tab + a `src/components/wall/` component set. (3) PWA shell (`manifest.webmanifest`, custom icons, service worker, registration). (4) Web-push pipeline with VAPID keys and a Convex Node action that fans out notifications.

**Tech Stack:** React 18, react-router-dom 7, Convex 1.39.1, vitest 4 + convex-test 0.0.49, `web-push` (new), `sharp` (already in devDeps, used for icon generation).

**Reference spec:** `docs/superpowers/specs/2026-05-20-posting-wall-design.md`

---

## File map

**New (backend):**
- `convex/posts.ts`, `convex/posts.test.ts`
- `convex/postComments.ts`, `convex/postComments.test.ts`
- `convex/postReactions.ts`, `convex/postReactions.test.ts`
- `convex/pushNotifications.ts`, `convex/pushNotifications.test.ts`

**New (PWA + frontend):**
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icons/icon-180.png`, `icon-192.png`, `icon-512.png`
- `src/assets/icon-source.svg`
- `scripts/generate-icons.mjs`
- `src/routes/WallPage.jsx`
- `src/components/wall/PostComposer.jsx`
- `src/components/wall/PostCard.jsx`
- `src/components/wall/ReactionRow.jsx`
- `src/components/wall/ReplyThread.jsx`
- `src/components/wall/NotificationsBanner.jsx`
- `src/lib/formatRelative.js`
- `src/lib/usePushSubscription.js`
- `src/lib/useWallPagination.js`

**Modified:**
- `convex/schema.ts` (add 4 tables)
- `src/App.jsx` (add `/wall` route)
- `src/components/BottomNav.jsx` (add Wall tab)
- `src/main.jsx` (register service worker)
- `index.html` (manifest + apple-touch-icon)
- `package.json` (add `web-push` runtime dep)

---

## Task 1: Add four new tables to the Convex schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Append the four new tables to the schema**

Add these inside `defineSchema({...})`, after the existing tables:

```ts
  posts: defineTable({
    authorSlug: v.string(),
    text: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  postComments: defineTable({
    postId: v.id("posts"),
    authorSlug: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_post", ["postId"]),

  postReactions: defineTable({
    postId: v.id("posts"),
    playerSlug: v.string(),
    emoji: v.string(),
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

- [ ] **Step 2: Type-check passes**

Run: `npx convex codegen`
Expected: codegen completes without type errors and `convex/_generated/` updates.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(wall): schema for posts, comments, reactions, push subs"
```

---

## Task 2: `convex/posts.ts` — create, remove, generateUploadUrl

**Files:**
- Create: `convex/posts.ts`
- Create: `convex/posts.test.ts`

- [ ] **Step 1: Write `convex/posts.test.ts` with failing tests**

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug, isAdmin = false) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    if (isAdmin) await ctx.db.insert("adminRoles", { playerSlug: slug });
  });
}

describe("posts.create", () => {
  it("inserts a post with the caller as author", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const id = await t.mutation(api.posts.create, { token: "tok-khari", text: "Hello wall" });
    expect(id).toBeDefined();
    const rows = await t.run((ctx) => ctx.db.query("posts").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].authorSlug).toBe("khari");
    expect(rows[0].text).toBe("Hello wall");
  });

  it("trims whitespace and rejects empty text without a photo", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await expect(t.mutation(api.posts.create, { token: "tok-khari", text: "   " }))
      .rejects.toThrow(/text or a photo/);
  });

  it("allows a post with only a photo (no text)", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["fake"])));
    const id = await t.mutation(api.posts.create, {
      token: "tok-khari", text: "", photoStorageId: storageId,
    });
    expect(id).toBeDefined();
  });

  it("caps text at 500 chars after trim", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const long = "x".repeat(800);
    await expect(t.mutation(api.posts.create, { token: "tok-khari", text: long }))
      .rejects.toThrow(/too long/);
  });

  it("requires a valid session", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.posts.create, { token: "bogus", text: "hi" }))
      .rejects.toThrow(/invalid session/);
  });
});

describe("posts.remove", () => {
  it("author can delete their own post and cascades to comments + reactions + photo", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["fake"])));
    const postId = await t.mutation(api.posts.create, {
      token: "tok-khari", text: "to be deleted", photoStorageId: storageId,
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("postComments", { postId, authorSlug: "khari", text: "self-reply", createdAt: Date.now() });
      await ctx.db.insert("postReactions", { postId, playerSlug: "khari", emoji: "❤️", at: Date.now() });
    });

    await t.mutation(api.posts.remove, { token: "tok-khari", postId });

    const posts = await t.run((ctx) => ctx.db.query("posts").collect());
    const comments = await t.run((ctx) => ctx.db.query("postComments").collect());
    const reactions = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(posts.length).toBe(0);
    expect(comments.length).toBe(0);
    expect(reactions.length).toBe(0);
  });

  it("admin can delete another player's post", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "amelia", true);
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "x" });
    await t.mutation(api.posts.remove, { token: "tok-amelia", postId });
    const posts = await t.run((ctx) => ctx.db.query("posts").collect());
    expect(posts.length).toBe(0);
  });

  it("non-admin non-author cannot delete", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "x" });
    await expect(t.mutation(api.posts.remove, { token: "tok-adan", postId }))
      .rejects.toThrow(/admin only/);
  });
});

describe("posts.generateUploadUrl", () => {
  it("returns a non-empty URL for an authenticated caller", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const url = await t.mutation(api.posts.generateUploadUrl, { token: "tok-khari" });
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  it("rejects an invalid session", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.posts.generateUploadUrl, { token: "bogus" }))
      .rejects.toThrow(/invalid session/);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run convex/posts.test.ts`
Expected: all tests fail (no `posts.ts` yet).

- [ ] **Step 3: Implement `convex/posts.ts`**

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const MAX_TEXT = 500;

export const create = mutation({
  args: {
    token: v.string(),
    text: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { token, text, photoStorageId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const trimmed = text.trim();
    if (trimmed.length === 0 && !photoStorageId) {
      throw new Error("post must have text or a photo");
    }
    if (trimmed.length > MAX_TEXT) {
      throw new Error("text too long");
    }
    const postId = await ctx.db.insert("posts", {
      authorSlug: playerSlug,
      text: trimmed,
      photoStorageId,
      createdAt: Date.now(),
    });
    // PUSH_SCHEDULE: wired up in Task 7 once internal.pushNotifications exists.
    return postId;
  },
});

export const remove = mutation({
  args: { token: v.string(), postId: v.id("posts") },
  handler: async (ctx, { token, postId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("post not found");
    if (post.authorSlug !== playerSlug) {
      await requireAdmin(ctx, playerSlug);
    }
    const comments = await ctx.db
      .query("postComments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);
    const reactions = await ctx.db
      .query("postReactions")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);
    if (post.photoStorageId) {
      await ctx.storage.delete(post.photoStorageId);
    }
    await ctx.db.delete(postId);
  },
});

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireSession(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});
```

Note: this version intentionally omits the `ctx.scheduler.runAfter(...)` call because `internal.pushNotifications` doesn't exist yet — Convex codegen would fail. The push wiring is added in Task 7 once the actions file is in place.

- [ ] **Step 4: Run tests, confirm green**

Run: `npx vitest run convex/posts.test.ts`
Expected: 9/9 pass.

- [ ] **Step 5: Commit**

```bash
git add convex/posts.ts convex/posts.test.ts
git commit -m "feat(wall): posts.create / remove / generateUploadUrl + tests"
```

---

## Task 3: `convex/posts.ts` — `list` query (paginated, enriched)

**Files:**
- Modify: `convex/posts.ts`
- Modify: `convex/posts.test.ts`

- [ ] **Step 1: Add failing test cases to `convex/posts.test.ts`**

Append:

```ts
import { paginationOptsValidator } from "convex/server"; // not used at runtime — just for parity

describe("posts.list", () => {
  it("returns posts newest-first with enriched fields", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.run(async (ctx) => {
      await ctx.db.patch(
        (await ctx.db.query("players").withIndex("by_slug", (q) => q.eq("slug", "khari")).unique())!._id,
        { holidayName: "Sunshine" },
      );
    });
    const olderId = await t.mutation(api.posts.create, { token: "tok-khari", text: "first" });
    // tick the clock by inserting directly so the second post is newer
    const newerId = await t.mutation(api.posts.create, { token: "tok-khari", text: "second" });
    await t.run(async (ctx) => {
      await ctx.db.insert("postReactions", { postId: newerId, playerSlug: "khari", emoji: "🔥", at: Date.now() });
      await ctx.db.insert("postComments", { postId: newerId, authorSlug: "khari", text: "self-reply", createdAt: Date.now() });
    });

    const page = await t.query(api.posts.list, {
      token: "tok-khari",
      paginationOpts: { numItems: 10, cursor: null },
    });

    expect(page.page.length).toBe(2);
    expect(page.page[0]._id).toBe(newerId);
    expect(page.page[1]._id).toBe(olderId);
    expect(page.page[0].authorHolidayName).toBe("Sunshine");
    expect(page.page[0].reactionCounts["🔥"]).toBe(1);
    expect(page.page[0].viewerReactions).toContain("🔥");
    expect(page.page[0].commentCount).toBe(1);
    expect(page.page[1].commentCount).toBe(0);
  });

  it("returns null photoUrl when there is no photo", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.posts.create, { token: "tok-khari", text: "no photo" });
    const page = await t.query(api.posts.list, {
      token: "tok-khari",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page[0].photoUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `npx vitest run convex/posts.test.ts -t list`
Expected: failures referencing `posts.list` not exported.

- [ ] **Step 3: Add `list` to `convex/posts.ts`**

Insert at top of file (add to existing imports):

```ts
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
```

Append the `list` export:

```ts
export const list = query({
  args: { token: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { token, paginationOpts }) => {
    const { playerSlug } = await requireSession(ctx, token);

    const page = await ctx.db
      .query("posts")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(paginationOpts);

    const enriched = await Promise.all(page.page.map(async (post) => {
      const author = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", post.authorSlug))
        .unique();

      const reactions = await ctx.db
        .query("postReactions")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();

      const reactionCounts: Record<string, number> = {};
      const viewerReactions: string[] = [];
      for (const r of reactions) {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
        if (r.playerSlug === playerSlug) viewerReactions.push(r.emoji);
      }

      const comments = await ctx.db
        .query("postComments")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();

      const photoUrl = post.photoStorageId
        ? await ctx.storage.getUrl(post.photoStorageId)
        : null;

      return {
        ...post,
        authorHolidayName: author?.holidayName ?? post.authorSlug,
        photoUrl,
        reactionCounts,
        viewerReactions,
        commentCount: comments.length,
      };
    }));

    return { ...page, page: enriched };
  },
});
```

- [ ] **Step 4: Run tests, confirm green**

Run: `npx vitest run convex/posts.test.ts`
Expected: all green (11/11 now).

- [ ] **Step 5: Commit**

```bash
git add convex/posts.ts convex/posts.test.ts
git commit -m "feat(wall): posts.list paginated query with enriched fields"
```

---

## Task 4: `convex/postComments.ts` — add, remove, listByPost

**Files:**
- Create: `convex/postComments.ts`
- Create: `convex/postComments.test.ts`

- [ ] **Step 1: Write failing test file**

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug, isAdmin = false) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    if (isAdmin) await ctx.db.insert("adminRoles", { playerSlug: slug });
  });
}

describe("postComments.add", () => {
  it("inserts a comment with the caller as author", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "nice" });
    const rows = await t.run((ctx) => ctx.db.query("postComments").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].authorSlug).toBe("khari");
    expect(rows[0].text).toBe("nice");
  });

  it("rejects when the post is missing", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const fakeId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("posts", { authorSlug: "khari", text: "tmp", createdAt: Date.now() });
      await ctx.db.delete(id);
      return id;
    });
    await expect(t.mutation(api.postComments.add, { token: "tok-khari", postId: fakeId, text: "hi" }))
      .rejects.toThrow(/post not found/);
  });

  it("trims and rejects empty text", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await expect(t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "   " }))
      .rejects.toThrow(/text required/);
  });

  it("rejects > 280 chars after trim", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await expect(t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "x".repeat(400) }))
      .rejects.toThrow(/too long/);
  });
});

describe("postComments.remove", () => {
  it("author can delete their own comment", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "x" });
    const cmt = (await t.run((ctx) => ctx.db.query("postComments").collect()))[0];
    await t.mutation(api.postComments.remove, { token: "tok-khari", commentId: cmt._id });
    expect((await t.run((ctx) => ctx.db.query("postComments").collect())).length).toBe(0);
  });

  it("admin can delete another player's comment", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "amelia", true);
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "x" });
    const cmt = (await t.run((ctx) => ctx.db.query("postComments").collect()))[0];
    await t.mutation(api.postComments.remove, { token: "tok-amelia", commentId: cmt._id });
    expect((await t.run((ctx) => ctx.db.query("postComments").collect())).length).toBe(0);
  });

  it("non-admin non-author cannot delete", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "x" });
    const cmt = (await t.run((ctx) => ctx.db.query("postComments").collect()))[0];
    await expect(t.mutation(api.postComments.remove, { token: "tok-adan", commentId: cmt._id }))
      .rejects.toThrow(/admin only/);
  });
});

describe("postComments.listByPost", () => {
  it("returns comments oldest-first with author holiday name", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.run(async (ctx) => {
      const p = await ctx.db.query("players").withIndex("by_slug", (q) => q.eq("slug", "khari")).unique();
      await ctx.db.patch(p!._id, { holidayName: "Sunshine" });
    });
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "first" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "second" });
    const rows = await t.query(api.postComments.listByPost, { postId });
    expect(rows.length).toBe(2);
    expect(rows[0].text).toBe("first");
    expect(rows[1].text).toBe("second");
    expect(rows[0].authorHolidayName).toBe("Sunshine");
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `npx vitest run convex/postComments.test.ts`
Expected: all fail (module missing).

- [ ] **Step 3: Implement `convex/postComments.ts`**

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const MAX_TEXT = 280;

export const add = mutation({
  args: { token: v.string(), postId: v.id("posts"), text: v.string() },
  handler: async (ctx, { token, postId, text }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("post not found");
    const trimmed = text.trim();
    if (trimmed.length === 0) throw new Error("text required");
    if (trimmed.length > MAX_TEXT) throw new Error("text too long");
    const commentId = await ctx.db.insert("postComments", {
      postId,
      authorSlug: playerSlug,
      text: trimmed,
      createdAt: Date.now(),
    });
    // PUSH_SCHEDULE: wired up in Task 7 once internal.pushNotifications exists.
    return commentId;
  },
});

export const remove = mutation({
  args: { token: v.string(), commentId: v.id("postComments") },
  handler: async (ctx, { token, commentId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const row = await ctx.db.get(commentId);
    if (!row) throw new Error("comment not found");
    if (row.authorSlug !== playerSlug) {
      await requireAdmin(ctx, playerSlug);
    }
    await ctx.db.delete(commentId);
  },
});

export const listByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const rows = await ctx.db
      .query("postComments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    rows.sort((a, b) => a.createdAt - b.createdAt);
    return await Promise.all(rows.map(async (r) => {
      const author = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", r.authorSlug))
        .unique();
      return { ...r, authorHolidayName: author?.holidayName ?? r.authorSlug };
    }));
  },
});
```

- [ ] **Step 4: Run tests, confirm green**

Run: `npx vitest run convex/postComments.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add convex/postComments.ts convex/postComments.test.ts
git commit -m "feat(wall): postComments add / remove / listByPost + tests"
```

---

## Task 5: `convex/postReactions.ts` — toggle with allow-list

**Files:**
- Create: `convex/postReactions.ts`
- Create: `convex/postReactions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
  });
}

describe("postReactions.toggle", () => {
  it("inserts a reaction on first call and removes it on second", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });

    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "❤️" });
    let rows = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(rows.length).toBe(1);

    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "❤️" });
    rows = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(rows.length).toBe(0);
  });

  it("rejects emojis outside the allow-list", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await expect(t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "💩" }))
      .rejects.toThrow(/reaction not allowed/);
  });

  it("allows multiple different emoji reactions per (post, player)", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "❤️" });
    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "🔥" });
    const rows = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(rows.length).toBe(2);
  });

  it("requires a valid session", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await expect(t.mutation(api.postReactions.toggle, { token: "bogus", postId, emoji: "❤️" }))
      .rejects.toThrow(/invalid session/);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `npx vitest run convex/postReactions.test.ts`
Expected: all fail.

- [ ] **Step 3: Implement `convex/postReactions.ts`**

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

export const ALLOWED_REACTIONS = ["❤️", "😂", "🔥", "😭", "🍻", "👀"] as const;

export const toggle = mutation({
  args: {
    token: v.string(),
    postId: v.id("posts"),
    emoji: v.string(),
  },
  handler: async (ctx, { token, postId, emoji }) => {
    const { playerSlug } = await requireSession(ctx, token);
    if (!ALLOWED_REACTIONS.includes(emoji as any)) {
      throw new Error("reaction not allowed");
    }
    const existing = await ctx.db
      .query("postReactions")
      .withIndex("by_post_and_player", (q) => q.eq("postId", postId).eq("playerSlug", playerSlug))
      .collect();
    const match = existing.find((r) => r.emoji === emoji);
    if (match) {
      await ctx.db.delete(match._id);
    } else {
      await ctx.db.insert("postReactions", {
        postId, playerSlug, emoji, at: Date.now(),
      });
    }
  },
});
```

- [ ] **Step 4: Run tests, confirm green**

Run: `npx vitest run convex/postReactions.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add convex/postReactions.ts convex/postReactions.test.ts
git commit -m "feat(wall): postReactions.toggle with allow-list + tests"
```

---

## Task 6: `convex/pushNotifications.ts` mutations — subscribe / unsubscribe / prune

**Files:**
- Create: `convex/pushNotifications.ts`
- Create: `convex/pushNotifications.test.ts`

- [ ] **Step 1: Install the `web-push` runtime dep**

Run: `npm install web-push`
Expected: `web-push` added to `dependencies` in package.json.

- [ ] **Step 2: Write failing tests for the mutation surface**

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

async function seedPlayer(t, slug) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
  });
}

const SUB = {
  endpoint: "https://push.example/abc",
  p256dh: "P256",
  auth: "AUTH",
};

describe("pushNotifications.subscribe", () => {
  it("creates a subscription row for the caller", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB, userAgent: "iPhone" });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].playerSlug).toBe("khari");
    expect(rows[0].endpoint).toBe(SUB.endpoint);
  });

  it("upserts when the same endpoint is re-subscribed", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(1);
  });

  it("reassigns ownership when a different player subscribes the same endpoint", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-adan", ...SUB });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].playerSlug).toBe("adan");
  });
});

describe("pushNotifications.unsubscribe", () => {
  it("deletes the caller's subscription for an endpoint", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    await t.mutation(api.pushNotifications.unsubscribe, { token: "tok-khari", endpoint: SUB.endpoint });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(0);
  });
});

describe("pushNotifications._pruneSubscription", () => {
  it("deletes a row by id (internal)", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    const id = (await t.run((ctx) => ctx.db.query("pushSubscriptions").collect()))[0]._id;
    await t.mutation(internal.pushNotifications._pruneSubscription, { subscriptionId: id });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(0);
  });
});
```

- [ ] **Step 3: Run, confirm fail**

Run: `npx vitest run convex/pushNotifications.test.ts`
Expected: failures.

- [ ] **Step 4: Implement the mutation surface in `convex/pushNotifications.ts`**

```ts
"use node";

import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

export const subscribe = mutation({
  args: {
    token: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, { token, endpoint, p256dh, auth, userAgent }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { playerSlug, p256dh, auth, userAgent });
      return existing._id;
    }
    return await ctx.db.insert("pushSubscriptions", {
      playerSlug,
      endpoint,
      p256dh,
      auth,
      userAgent,
      createdAt: Date.now(),
    });
  },
});

export const unsubscribe = mutation({
  args: { token: v.string(), endpoint: v.string() },
  handler: async (ctx, { token, endpoint }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (!existing) return;
    if (existing.playerSlug !== playerSlug) return; // not yours, no-op
    await ctx.db.delete(existing._id);
  },
});

export const _pruneSubscription = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const row = await ctx.db.get(subscriptionId);
    if (row) await ctx.db.delete(subscriptionId);
  },
});
```

Note on `"use node";` — Convex requires this directive at the top of any file that needs the Node runtime. Mutations themselves don't need Node, but the actions in Task 7 do. We're keeping all the push surface in one file, so the directive lives at the top.

- [ ] **Step 5: Run, confirm green**

Run: `npx vitest run convex/pushNotifications.test.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add convex/pushNotifications.ts convex/pushNotifications.test.ts package.json package-lock.json
git commit -m "feat(wall): pushNotifications subscribe/unsubscribe/prune mutations + tests"
```

---

## Task 7: `convex/pushNotifications.ts` actions — sendForPost / sendForComment

**Files:**
- Modify: `convex/pushNotifications.ts`
- Modify: `convex/pushNotifications.test.ts`

- [ ] **Step 1: Append failing recipient-selection tests**

Append to `convex/pushNotifications.test.ts`:

```ts
import { vi } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async () => ({ statusCode: 201 })),
  },
}));

describe("pushNotifications.sendForPost", () => {
  it("notifies everyone with a subscription except the author", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    await seedPlayer(t, "amelia");
    await t.mutation(api.pushNotifications.subscribe, {
      token: "tok-adan", endpoint: "https://push.example/adan", p256dh: "P", auth: "A",
    });
    await t.mutation(api.pushNotifications.subscribe, {
      token: "tok-amelia", endpoint: "https://push.example/amelia", p256dh: "P", auth: "A",
    });
    await t.mutation(api.pushNotifications.subscribe, {
      token: "tok-khari", endpoint: "https://push.example/khari", p256dh: "P", auth: "A",
    });
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "hello" });

    // Drain scheduler so sendForPost runs.
    await t.finishInProgressScheduledFunctions();

    const webpush = (await import("web-push")).default as any;
    const calls = (webpush.sendNotification as any).mock.calls;
    const endpoints = calls.map((c: any[]) => c[0].endpoint);
    expect(endpoints).toContain("https://push.example/adan");
    expect(endpoints).toContain("https://push.example/amelia");
    expect(endpoints).not.toContain("https://push.example/khari");
  });
});

describe("pushNotifications.sendForComment", () => {
  it("notifies OP + earlier commenters, minus the new commenter", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari"); // OP
    await seedPlayer(t, "adan");  // earlier commenter
    await seedPlayer(t, "amelia"); // brand-new commenter (not notified)
    await seedPlayer(t, "kavi");  // uninvolved (not notified)

    for (const slug of ["khari", "adan", "amelia", "kavi"]) {
      await t.mutation(api.pushNotifications.subscribe, {
        token: `tok-${slug}`,
        endpoint: `https://push.example/${slug}`,
        p256dh: "P", auth: "A",
      });
    }
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.finishInProgressScheduledFunctions(); // drain the sendForPost from create

    const webpush = (await import("web-push")).default as any;
    (webpush.sendNotification as any).mockClear();

    await t.mutation(api.postComments.add, { token: "tok-adan", postId, text: "first reply" });
    await t.finishInProgressScheduledFunctions();
    (webpush.sendNotification as any).mockClear();

    await t.mutation(api.postComments.add, { token: "tok-amelia", postId, text: "second reply" });
    await t.finishInProgressScheduledFunctions();

    const endpoints = (webpush.sendNotification as any).mock.calls.map((c: any[]) => c[0].endpoint);
    expect(endpoints).toContain("https://push.example/khari"); // OP
    expect(endpoints).toContain("https://push.example/adan");  // earlier commenter
    expect(endpoints).not.toContain("https://push.example/amelia"); // the new commenter herself
    expect(endpoints).not.toContain("https://push.example/kavi"); // uninvolved
  });
});

describe("pushNotifications dead-endpoint pruning", () => {
  it("prunes a subscription when web-push returns 410", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    await t.mutation(api.pushNotifications.subscribe, {
      token: "tok-adan", endpoint: "https://push.example/dead", p256dh: "P", auth: "A",
    });

    const webpush = (await import("web-push")).default as any;
    (webpush.sendNotification as any).mockImplementationOnce(async () => {
      const err: any = new Error("gone"); err.statusCode = 410; throw err;
    });

    await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.finishInProgressScheduledFunctions();

    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.find((r) => r.endpoint === "https://push.example/dead")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `npx vitest run convex/pushNotifications.test.ts`
Expected: failures (`sendForPost` / `sendForComment` not exported).

- [ ] **Step 3: Implement the actions in `convex/pushNotifications.ts`**

Append to the file (after the existing exports):

```ts
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:khari@millennialservices.co.uk";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const SNIPPET = 120;
function snip(text: string) {
  return text.length > SNIPPET ? text.slice(0, SNIPPET - 1) + "…" : text;
}

async function fanout(
  ctx: any,
  recipients: Array<{ _id: any; endpoint: string; p256dh: string; auth: string }>,
  payload: object,
) {
  for (const sub of recipients) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await ctx.runMutation(internal.pushNotifications._pruneSubscription, { subscriptionId: sub._id });
      } else {
        console.error("[push] send failed:", err?.statusCode, err?.message);
      }
    }
  }
}

export const sendForPost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.runQuery(internal.pushNotifications._getPostForPush, { postId });
    if (!post) return;
    const subs = await ctx.runQuery(internal.pushNotifications._getSubscriptionsForPost, {
      authorSlug: post.authorSlug,
    });
    const payload = {
      title: "DR Baby",
      body: `${post.authorHolidayName}: ${snip(post.text || "(photo)")}`,
      url: `/wall#post-${postId}`,
      tag: `post-${postId}`,
    };
    await fanout(ctx, subs, payload);
  },
});

export const sendForComment = internalAction({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, { commentId }) => {
    const info = await ctx.runQuery(internal.pushNotifications._getCommentForPush, { commentId });
    if (!info) return;
    const subs = await ctx.runQuery(internal.pushNotifications._getSubscriptionsForComment, {
      postId: info.postId,
      commenterSlug: info.commenterSlug,
    });
    const payload = {
      title: "DR Baby",
      body: `${info.commenterHolidayName} replied on ${info.opHolidayName}'s post: ${snip(info.text)}`,
      url: `/wall#post-${info.postId}`,
      tag: `post-${info.postId}`,
    };
    await fanout(ctx, subs, payload);
  },
});
```

Add the three internal query helpers (also in the same file) so the action can read from the DB without being a mutation:

```ts
import { internalQuery } from "./_generated/server";

export const _getPostForPush = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) return null;
    const author = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", post.authorSlug))
      .unique();
    return {
      authorSlug: post.authorSlug,
      authorHolidayName: author?.holidayName ?? post.authorSlug,
      text: post.text,
    };
  },
});

export const _getSubscriptionsForPost = internalQuery({
  args: { authorSlug: v.string() },
  handler: async (ctx, { authorSlug }) => {
    const all = await ctx.db.query("pushSubscriptions").collect();
    return all.filter((s) => s.playerSlug !== authorSlug);
  },
});

export const _getCommentForPush = internalQuery({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, { commentId }) => {
    const c = await ctx.db.get(commentId);
    if (!c) return null;
    const post = await ctx.db.get(c.postId);
    if (!post) return null;
    const commenter = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", c.authorSlug))
      .unique();
    const op = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", post.authorSlug))
      .unique();
    return {
      postId: c.postId,
      commenterSlug: c.authorSlug,
      commenterHolidayName: commenter?.holidayName ?? c.authorSlug,
      opHolidayName: op?.holidayName ?? post.authorSlug,
      text: c.text,
    };
  },
});

export const _getSubscriptionsForComment = internalQuery({
  args: { postId: v.id("posts"), commenterSlug: v.string() },
  handler: async (ctx, { postId, commenterSlug }) => {
    const post = await ctx.db.get(postId);
    if (!post) return [];
    const comments = await ctx.db
      .query("postComments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    const recipientSlugs = new Set<string>([post.authorSlug, ...comments.map((c) => c.authorSlug)]);
    recipientSlugs.delete(commenterSlug);
    const subs = await ctx.db.query("pushSubscriptions").collect();
    return subs.filter((s) => recipientSlugs.has(s.playerSlug));
  },
});
```

- [ ] **Step 4: Wire `posts.create` to schedule `sendForPost`**

Modify `convex/posts.ts`. Add the import:
```ts
import { internal } from "./_generated/api";
```
Replace the `// PUSH_SCHEDULE:` comment in `create` with:
```ts
    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendForPost, { postId });
```

- [ ] **Step 5: Wire `postComments.add` to schedule `sendForComment`**

Modify `convex/postComments.ts`. Add the import:
```ts
import { internal } from "./_generated/api";
```
Replace the `// PUSH_SCHEDULE:` comment in `add` with:
```ts
    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendForComment, { commentId });
```

- [ ] **Step 6: Run tests, confirm green**

Run: `npx vitest run convex/pushNotifications.test.ts`
Expected: all pass — including the `sendForPost` recipient test, which depends on the wiring done in Step 4.

- [ ] **Step 7: Run the full Convex test suite to confirm no regressions**

Run: `npx vitest run convex/`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add convex/pushNotifications.ts convex/pushNotifications.test.ts convex/posts.ts convex/postComments.ts
git commit -m "feat(wall): web-push actions + wire schedule into create mutations"
```

---

## Task 8: VAPID env scaffolding

**Files:**
- Modify: `.env.local` (don't commit this)
- Documentation note inline in this plan only — no committable code change.

- [ ] **Step 1: Generate VAPID keys locally**

Run: `npx web-push generate-vapid-keys --json`
Expected: a JSON blob like `{"publicKey":"…","privateKey":"…"}`. Copy these.

- [ ] **Step 2: Set the public key in the frontend env**

Add to `.env.local` (gitignored):
```
VITE_VAPID_PUBLIC_KEY=<publicKey from step 1>
```

- [ ] **Step 3: Set the private key in Convex env (production AND dev deployments)**

Run (dev):
```
npx convex env set VAPID_PUBLIC_KEY <publicKey>
npx convex env set VAPID_PRIVATE_KEY <privateKey>
npx convex env set VAPID_SUBJECT mailto:khari@millennialservices.co.uk
```
For production: re-run the same commands with `--prod`.

- [ ] **Step 4: Set the same `VITE_VAPID_PUBLIC_KEY` in Vercel**

Run: `vercel env add VITE_VAPID_PUBLIC_KEY` and paste the public key. Repeat for `Production` / `Preview` / `Development` as prompted.

- [ ] **Step 5: Verify**

Run: `npx convex env list`
Expected: all three VAPID env vars present.

No git commit in this task — keys live in env stores, not the repo.

---

## Task 9: PWA manifest, icons, and `index.html` wiring

**Files:**
- Create: `src/assets/icon-source.svg`
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon-180.png` (generated)
- Create: `public/icons/icon-192.png` (generated)
- Create: `public/icons/icon-512.png` (generated)
- Create: `public/manifest.webmanifest`
- Modify: `index.html`
- Modify: `package.json` (add `icons` script)

- [ ] **Step 1: Create the SVG icon source**

Write `src/assets/icon-source.svg`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#FEF9EF"/>
  <text x="256" y="296" text-anchor="middle"
        font-family="Nunito, sans-serif" font-weight="900" font-size="200"
        fill="#1A1A2E">DR</text>
  <text x="256" y="396" text-anchor="middle"
        font-family="Nunito, sans-serif" font-weight="700" font-size="64"
        fill="#FF6B6B">'26</text>
</svg>
```

Stopgap artwork — can be replaced later without changing the script.

- [ ] **Step 2: Create the icon generation script**

Write `scripts/generate-icons.mjs`:

```js
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src/assets/icon-source.svg");
const OUT = resolve(__dirname, "../public/icons");

const SIZES = [180, 192, 512];

await mkdir(OUT, { recursive: true });
for (const size of SIZES) {
  const dest = resolve(OUT, `icon-${size}.png`);
  await sharp(SRC).resize(size, size).png().toFile(dest);
  console.log(`wrote ${dest}`);
}
```

- [ ] **Step 3: Add a `package.json` script**

Modify `package.json`, append to the `scripts` block:

```json
    "icons": "node scripts/generate-icons.mjs"
```

- [ ] **Step 4: Generate the PNGs**

Run: `npm run icons`
Expected: three files appear in `public/icons/`.

- [ ] **Step 5: Create the manifest**

Write `public/manifest.webmanifest`:

```json
{
  "name": "DR Baby '26",
  "short_name": "DR Baby",
  "start_url": "/wall",
  "scope": "/",
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

- [ ] **Step 6: Wire `index.html`**

Modify `index.html`, add inside `<head>` (after the existing `meta` tags):

```html
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/icon-180.png" />
```

- [ ] **Step 7: Manual install check**

Run: `npm run dev` and open the served URL in Chrome.
Open DevTools → Application → Manifest.
Expected: manifest loads with no errors, all three icons preview, `start_url: /wall`, `display: standalone`.

- [ ] **Step 8: Commit**

```bash
git add src/assets/icon-source.svg scripts/generate-icons.mjs public/icons public/manifest.webmanifest index.html package.json
git commit -m "feat(pwa): manifest, icon generation script, apple-touch-icon wiring"
```

---

## Task 10: Service worker + registration

**Files:**
- Create: `public/sw.js`
- Modify: `src/main.jsx`

- [ ] **Step 1: Write `public/sw.js`**

```js
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "DR Baby", body: "Something new on the wall" };
  try { payload = event.data?.json() ?? payload; } catch (_) {}
  const { title, body, url = "/wall", tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/wall";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = all.find((c) => c.url.includes("/wall"));
    if (existing) {
      existing.focus();
      existing.navigate?.(url);
    } else {
      self.clients.openWindow(url);
    }
  })());
});
```

- [ ] **Step 2: Register the SW from `src/main.jsx`**

Read current `src/main.jsx` and append at the bottom of the file (after the existing render call):

```js
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}
```

- [ ] **Step 3: Verify registration in dev**

Run: `npm run dev`, open the served URL, DevTools → Application → Service Workers.
Expected: `sw.js` listed as "activated and running".

- [ ] **Step 4: Commit**

```bash
git add public/sw.js src/main.jsx
git commit -m "feat(pwa): service worker for push + notificationclick"
```

---

## Task 11: `src/lib/formatRelative.js`

**Files:**
- Create: `src/lib/formatRelative.js`

- [ ] **Step 1: Write the helper**

```js
// Relative-time formatter for the wall: "Xs", "Xm", "Xh", "Yesterday", "MMM D".
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatRelative(timestampMs, now = Date.now()) {
  const diff = Math.max(0, now - timestampMs);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  const d = new Date(timestampMs);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
```

- [ ] **Step 2: Commit (no tests — trivial, used in UI only)**

```bash
git add src/lib/formatRelative.js
git commit -m "feat(wall): formatRelative helper"
```

---

## Task 12: `src/lib/usePushSubscription.js`

**Files:**
- Create: `src/lib/usePushSubscription.js`

- [ ] **Step 1: Write the hook**

```js
import { useEffect, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "./useSession.js";

// State values: "unsupported" | "needs-install" | "default" | "granted" | "denied"

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushSubscription() {
  const session = useSession();
  const subscribe = useMutation(api.pushNotifications.subscribe);
  const unsubscribeMut = useMutation(api.pushNotifications.unsubscribe);
  const [state, setState] = useState("unsupported");

  const compute = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
    if (!standalone) {
      setState("needs-install");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setState("denied"); return; }
    if (perm === "default") { setState("default"); return; }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (!existing && session?.token) {
      // silent re-subscribe
      try {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
        });
        const json = sub.toJSON();
        await subscribe({
          token: session.token,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent: navigator.userAgent,
        });
      } catch (err) {
        console.warn("silent re-subscribe failed:", err);
      }
    }
    setState("granted");
  }, [session?.token, subscribe]);

  useEffect(() => { compute(); }, [compute]);

  const requestPermission = useCallback(async () => {
    if (!session?.token) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { await compute(); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    await subscribe({
      token: session.token,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    });
    await compute();
  }, [session?.token, subscribe, compute]);

  const unsubscribe = useCallback(async () => {
    if (!session?.token) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await unsubscribeMut({ token: session.token, endpoint: existing.endpoint });
      await existing.unsubscribe();
    }
    await compute();
  }, [session?.token, unsubscribeMut, compute]);

  return { state, requestPermission, unsubscribe };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/usePushSubscription.js
git commit -m "feat(wall): usePushSubscription hook"
```

---

## Task 13: `/wall` route, `WallPage` scaffold, BottomNav tab

**Files:**
- Create: `src/routes/WallPage.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/BottomNav.jsx`

- [ ] **Step 1: Scaffold `src/routes/WallPage.jsx`**

```jsx
import BottomNav from "../components/BottomNav.jsx";
import { C } from "../data/colors.js";

export default function WallPage() {
  return (
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 24 }}>
      <header style={{ padding: "20px 20px 12px" }}>
        <h1 style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 28, color: C.dark, margin: 0 }}>
          The Wall
        </h1>
      </header>
      <main style={{ padding: "0 20px" }}>
        {/* PostComposer goes here in Task 14 */}
        {/* Feed of PostCards goes here in Tasks 17 + 19 */}
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Add the route to `src/App.jsx`**

Add the import:
```jsx
import WallPage from "./routes/WallPage.jsx";
```
Add inside `<Routes>`:
```jsx
<Route path="/wall" element={<WallPage />} />
```

- [ ] **Step 3: Add the Wall tab to `BottomNav.jsx`**

Modify the `navItems` function to insert the Wall tab between Home and Games:

```js
function navItems(slug, isAdmin) {
  const items = [
    { to: `/player/${slug}`, icon: "🏖️", label: "Home", match: (p) => p === `/player/${slug}` },
    { to: "/wall", icon: "💬", label: "Wall", match: (p) => p.startsWith("/wall") },
    { to: `/player/${slug}/games`, icon: "🎯", label: "Games", match: (p) => p.startsWith(`/player/${slug}/games`) },
    { to: "/leaderboard", icon: "🏆", label: "Board", match: (p) => p.startsWith("/leaderboard") },
  ];
  if (isAdmin) {
    items.push({ to: "/admin", icon: "⚙️", label: "Admin", match: (p) => p.startsWith("/admin") });
  }
  return items;
}
```

- [ ] **Step 4: Visual smoke check**

Run: `npm run dev`. Log in as any seeded player. Tap the new `💬 Wall` tab in the bottom nav.
Expected: blank "The Wall" page renders, bottom nav highlights the Wall tab.

- [ ] **Step 5: Commit**

```bash
git add src/routes/WallPage.jsx src/App.jsx src/components/BottomNav.jsx
git commit -m "feat(wall): /wall route + Wall tab in bottom nav"
```

---

## Task 14: `PostComposer` component

**Files:**
- Create: `src/components/wall/PostComposer.jsx`
- Modify: `src/routes/WallPage.jsx`

- [ ] **Step 1: Write `src/components/wall/PostComposer.jsx`**

```jsx
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

const MAX = 500;

export default function PostComposer() {
  const session = useSession();
  const create = useMutation(api.posts.create);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const me = useQuery(api.players.getBySlug, session?.slug ? { slug: session.slug } : "skip");

  const [text, setText] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  if (!session) return null;

  const canSubmit = (text.trim().length > 0 || photoFile) && !busy;
  const placeholder = me?.holidayName ? `What's up, ${me.holidayName}?` : "What's up?";

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    const draft = text;
    setText("");
    const draftFile = photoFile;
    setPhotoFile(null);
    setPhotoPreview(null);
    try {
      let photoStorageId;
      if (draftFile) {
        const uploadUrl = await generateUploadUrl({ token: session.token });
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": draftFile.type }, body: draftFile });
        const { storageId } = await res.json();
        photoStorageId = storageId;
      }
      await create({ token: session.token, text: draft, photoStorageId });
    } catch (err) {
      console.error(err);
      setText(draft);
      setPhotoFile(draftFile);
      if (draftFile) setPhotoPreview(URL.createObjectURL(draftFile));
      alert("Couldn't post. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      background: C.white,
      borderRadius: RADIUS.lg,
      boxShadow: SHADOW.card,
      padding: 14,
      marginBottom: 16,
    }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        placeholder={placeholder}
        rows={3}
        style={{
          width: "100%", border: "none", outline: "none", resize: "none",
          fontFamily: "Nunito, sans-serif", fontSize: 16, color: C.dark, background: "transparent",
        }}
      />
      {photoPreview && (
        <div style={{ position: "relative", marginTop: 8 }}>
          <img src={photoPreview} alt="" style={{ width: "100%", borderRadius: RADIUS.md, display: "block" }} />
          <button
            onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: 16, width: 28, height: 28, cursor: "pointer" }}
          >×</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", padding: 4 }}
            aria-label="Add photo"
          >📷</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPhotoFile(f);
              setPhotoPreview(URL.createObjectURL(f));
            }}
            style={{ display: "none" }}
          />
          <span style={{ fontSize: 12, color: C.textBody }}>{text.length}/{MAX}</span>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            background: canSubmit ? C.coral : C.sandDark,
            color: canSubmit ? "white" : C.textBody,
            border: "none",
            borderRadius: RADIUS.pill,
            padding: "8px 18px",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >{busy ? "Posting…" : "Post"}</button>
      </div>
    </div>
  );
}
```

Note: this references `api.players.getBySlug`. If that query does not exist, instead read the holiday name from `useQuery(api.players.list, ...)` filtering by slug, or add a tiny `getBySlug` query alongside. Step 2 covers the check.

- [ ] **Step 2: Confirm `api.players.getBySlug` exists**

Run: `grep -n "getBySlug" /Users/khari/Documents/GitHub/DRBabyyy/convex/players.ts`
- If present → continue to Step 3.
- If missing → add this export to `convex/players.ts`:

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});
```

(then `git add convex/players.ts` will get folded into the Step 6 commit.)

- [ ] **Step 3: Mount the composer in `WallPage.jsx`**

Modify `src/routes/WallPage.jsx`:

```jsx
import BottomNav from "../components/BottomNav.jsx";
import PostComposer from "../components/wall/PostComposer.jsx";
import { C } from "../data/colors.js";

export default function WallPage() {
  return (
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 24 }}>
      <header style={{ padding: "20px 20px 12px" }}>
        <h1 style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 28, color: C.dark, margin: 0 }}>
          The Wall
        </h1>
      </header>
      <main style={{ padding: "0 20px" }}>
        <PostComposer />
        {/* Feed of PostCards goes here in Tasks 17 + 19 */}
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 4: Visual smoke check**

Run dev server. Open `/wall`. Type a message and tap Post. Confirm:
- No errors in console.
- Composer clears.
- Convex dashboard shows a new `posts` row.
- Pick a photo, see preview, tap × to remove, repick — works.
- Post-with-photo creates a row with `photoStorageId` populated.

- [ ] **Step 5: Commit**

```bash
git add src/components/wall/PostComposer.jsx src/routes/WallPage.jsx convex/players.ts
git commit -m "feat(wall): PostComposer (text + optional photo)"
```

---

## Task 15: `ReactionRow` component

**Files:**
- Create: `src/components/wall/ReactionRow.jsx`

- [ ] **Step 1: Write `src/components/wall/ReactionRow.jsx`**

```jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";

const ALLOWED = ["❤️", "😂", "🔥", "😭", "🍻", "👀"];

export default function ReactionRow({ postId, reactionCounts, viewerReactions }) {
  const session = useSession();
  const toggle = useMutation(api.postReactions.toggle);
  const [pickerOpen, setPickerOpen] = useState(false);

  const viewerSet = new Set(viewerReactions ?? []);
  const visible = ALLOWED.filter((e) => (reactionCounts?.[e] ?? 0) > 0 || viewerSet.has(e));

  async function tap(emoji) {
    if (!session) return;
    try {
      await toggle({ token: session.token, postId, emoji });
    } catch (err) { console.error(err); }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {visible.map((emoji) => {
        const mine = viewerSet.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => tap(emoji)}
            style={{
              background: mine ? C.coral : C.sandDark,
              color: mine ? "white" : C.dark,
              border: "none",
              borderRadius: RADIUS.pill,
              padding: "4px 10px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{emoji}</span>
            <span style={{ fontWeight: 700 }}>{reactionCounts?.[emoji] ?? 0}</span>
          </button>
        );
      })}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        style={{
          background: "transparent",
          border: `1px dashed ${C.sandDark}`,
          borderRadius: RADIUS.pill,
          padding: "4px 10px",
          fontSize: 13,
          cursor: "pointer",
          color: C.textBody,
        }}
        aria-label="Add reaction"
      >+ react</button>
      {pickerOpen && (
        <div style={{
          flexBasis: "100%",
          display: "flex",
          gap: 6,
          marginTop: 4,
        }}>
          {ALLOWED.map((e) => (
            <button
              key={e}
              onClick={() => { tap(e); setPickerOpen(false); }}
              style={{ fontSize: 22, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
            >{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit (no consumers yet — wires up in Task 17)**

```bash
git add src/components/wall/ReactionRow.jsx
git commit -m "feat(wall): ReactionRow component"
```

---

## Task 16: `ReplyThread` component

**Files:**
- Create: `src/components/wall/ReplyThread.jsx`

- [ ] **Step 1: Write `src/components/wall/ReplyThread.jsx`**

```jsx
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { formatRelative } from "../../lib/formatRelative.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";

const MAX = 280;

export default function ReplyThread({ postId, commentCount, isAdmin }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const comments = useQuery(api.postComments.listByPost, open ? { postId } : "skip");
  const add = useMutation(api.postComments.add);
  const remove = useMutation(api.postComments.remove);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "none",
          color: C.textBody,
          padding: "6px 0 0",
          fontSize: 13,
          cursor: "pointer",
        }}
      >▸ {commentCount > 0 ? `${commentCount} ${commentCount === 1 ? "reply" : "replies"}` : "Reply"}</button>
    );
  }

  async function submit() {
    if (!session || draft.trim().length === 0 || busy) return;
    setBusy(true);
    const txt = draft.trim();
    setDraft("");
    try {
      await add({ token: session.token, postId, text: txt });
    } catch (err) {
      console.error(err);
      setDraft(txt);
      alert("Couldn't reply. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${C.sandDark}` }}>
      {(comments ?? []).map((c) => (
        <div key={c._id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: C.textBody, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, color: C.dark }}>{c.authorHolidayName}</span>
            <span>
              {formatRelative(c.createdAt)}
              {(c.authorSlug === session?.slug || isAdmin) && (
                <button
                  onClick={async () => { await remove({ token: session.token, commentId: c._id }); }}
                  style={{ marginLeft: 8, background: "transparent", border: "none", color: C.textBody, cursor: "pointer" }}
                  aria-label="Delete reply"
                >×</button>
              )}
            </span>
          </div>
          <div style={{ fontSize: 14, color: C.dark }}>{c.text}</div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          placeholder="Reply…"
          style={{
            flex: 1,
            border: `1px solid ${C.sandDark}`,
            borderRadius: RADIUS.pill,
            padding: "6px 12px",
            fontSize: 14,
            outline: "none",
          }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <button
          onClick={submit}
          disabled={draft.trim().length === 0 || busy}
          style={{
            background: draft.trim().length === 0 ? C.sandDark : C.coral,
            color: draft.trim().length === 0 ? C.textBody : "white",
            border: "none",
            borderRadius: RADIUS.pill,
            padding: "6px 14px",
            cursor: draft.trim().length === 0 ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >Send</button>
      </div>
      <button
        onClick={() => setOpen(false)}
        style={{ background: "transparent", border: "none", color: C.textBody, fontSize: 12, marginTop: 6, cursor: "pointer" }}
      >Hide replies</button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/wall/ReplyThread.jsx
git commit -m "feat(wall): ReplyThread (collapsed → expandable with composer)"
```

---

## Task 17: `PostCard` component (assembles ReactionRow + ReplyThread)

**Files:**
- Create: `src/components/wall/PostCard.jsx`

- [ ] **Step 1: Write `src/components/wall/PostCard.jsx`**

```jsx
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { formatRelative } from "../../lib/formatRelative.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";
import ReactionRow from "./ReactionRow.jsx";
import ReplyThread from "./ReplyThread.jsx";
import PhotoLightbox from "../PhotoLightbox.jsx";

export default function PostCard({ post }) {
  const session = useSession();
  const isAdmin = useQuery(
    api.admin.isAdmin,
    session?.token ? { token: session.token } : "skip",
  ) === true;
  const remove = useMutation(api.posts.remove);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const canDelete = session?.slug === post.authorSlug || isAdmin;
  const initial = (post.authorHolidayName || post.authorSlug)[0]?.toUpperCase() ?? "?";

  return (
    <article
      id={`post-${post._id}`}
      style={{
        background: C.white,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOW.card,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16, background: C.coral, color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800,
          }}>{initial}</div>
          <div>
            <div style={{ fontWeight: 800, color: C.dark, fontSize: 14 }}>{post.authorHolidayName}</div>
            <div style={{ fontSize: 12, color: C.textBody }}>{formatRelative(post.createdAt)}</div>
          </div>
        </div>
        {canDelete && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{ background: "transparent", border: "none", color: C.textBody, fontSize: 22, cursor: "pointer" }}
              aria-label="Post menu"
            >⋯</button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: "100%",
                background: C.white, boxShadow: SHADOW.floating, borderRadius: RADIUS.md,
                padding: 6, zIndex: 5,
              }}>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this post?")) return;
                    setMenuOpen(false);
                    await remove({ token: session.token, postId: post._id });
                  }}
                  style={{ background: "transparent", border: "none", color: C.coralDeep, padding: "6px 10px", cursor: "pointer", fontWeight: 700 }}
                >Delete</button>
              </div>
            )}
          </div>
        )}
      </header>

      {post.text && (
        <div style={{ fontSize: 15, color: C.dark, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
          {post.text}
        </div>
      )}

      {post.photoUrl && (
        <img
          src={post.photoUrl}
          alt=""
          onClick={() => setLightboxOpen(true)}
          style={{ width: "100%", borderRadius: RADIUS.md, marginTop: 10, cursor: "zoom-in", display: "block" }}
        />
      )}

      <ReactionRow
        postId={post._id}
        reactionCounts={post.reactionCounts}
        viewerReactions={post.viewerReactions}
      />

      <ReplyThread postId={post._id} commentCount={post.commentCount} isAdmin={isAdmin} />

      {lightboxOpen && post.photoUrl && (
        <PhotoLightbox src={post.photoUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </article>
  );
}
```

Note: this assumes `PhotoLightbox` accepts `{ src, onClose }`. Check its actual signature once:

- [ ] **Step 2: Confirm `PhotoLightbox` prop shape**

Run: `head -30 /Users/khari/Documents/GitHub/DRBabyyy/src/components/PhotoLightbox.jsx`
- If `src` + `onClose` is correct → continue.
- Otherwise → adjust the call site in PostCard (e.g. it may take `photoUrl` and `setOpen` or render its own toggle). Match the existing convention; no need to change `PhotoLightbox` itself.

- [ ] **Step 3: Commit (still no consumer until Task 19)**

```bash
git add src/components/wall/PostCard.jsx
git commit -m "feat(wall): PostCard with author header, photo, reactions, replies, menu"
```

---

## Task 18: `NotificationsBanner` component

**Files:**
- Create: `src/components/wall/NotificationsBanner.jsx`

- [ ] **Step 1: Write `src/components/wall/NotificationsBanner.jsx`**

```jsx
import { usePushSubscription } from "../../lib/usePushSubscription.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

export default function NotificationsBanner() {
  const { state, requestPermission } = usePushSubscription();

  if (state === "granted" || state === "denied" || state === "unsupported") return null;

  if (state === "needs-install") {
    return (
      <div style={banner}>
        <strong>Add DR Baby to your home screen first.</strong>{" "}
        In Safari: tap <span style={{ whiteSpace: "nowrap" }}>Share → Add to Home Screen</span>.
        Then open it from the icon and come back here.
      </div>
    );
  }

  // state === "default"
  return (
    <button
      onClick={requestPermission}
      style={{ ...banner, cursor: "pointer", textAlign: "left", width: "100%", border: "none" }}
    >
      🔔 <strong>Turn on notifications</strong> so you don't miss the chat.
    </button>
  );
}

const banner = {
  background: C.yellow,
  color: C.dark,
  borderRadius: RADIUS.lg,
  boxShadow: SHADOW.card,
  padding: "10px 14px",
  marginBottom: 12,
  fontFamily: "Nunito, sans-serif",
  fontSize: 14,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/wall/NotificationsBanner.jsx
git commit -m "feat(wall): NotificationsBanner with install + opt-in copy"
```

---

## Task 19: `useWallPagination` + assemble the feed in `WallPage`

**Files:**
- Create: `src/lib/useWallPagination.js`
- Modify: `src/routes/WallPage.jsx`

- [ ] **Step 1: Write `src/lib/useWallPagination.js`**

```js
import { useEffect, useRef } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useWallPagination(token) {
  const result = usePaginatedQuery(
    api.posts.list,
    token ? { token } : "skip",
    { initialNumItems: 15 },
  );
  const sentinelRef = useRef(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (result.status !== "CanLoadMore") return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) result.loadMore(10);
    }, { rootMargin: "300px" });
    obs.observe(node);
    return () => obs.disconnect();
  }, [result, result.status]);

  return { ...result, sentinelRef };
}
```

- [ ] **Step 2: Mount the feed + banner in `WallPage.jsx`**

Replace `src/routes/WallPage.jsx`:

```jsx
import BottomNav from "../components/BottomNav.jsx";
import PostComposer from "../components/wall/PostComposer.jsx";
import NotificationsBanner from "../components/wall/NotificationsBanner.jsx";
import PostCard from "../components/wall/PostCard.jsx";
import { useSession } from "../lib/useSession.js";
import { useWallPagination } from "../lib/useWallPagination.js";
import { C } from "../data/colors.js";

export default function WallPage() {
  const session = useSession();
  const { results, status, sentinelRef } = useWallPagination(session?.token);

  return (
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 24 }}>
      <header style={{ padding: "20px 20px 12px" }}>
        <h1 style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 28, color: C.dark, margin: 0 }}>
          The Wall
        </h1>
      </header>
      <main style={{ padding: "0 20px" }}>
        <NotificationsBanner />
        <PostComposer />
        {(results ?? []).map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
        {status === "Exhausted" && results.length === 0 && (
          <div style={{ textAlign: "center", color: C.textBody, padding: 40 }}>
            Nothing yet — be the first to post.
          </div>
        )}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Visual smoke check**

Run dev server. From two browser sessions (or one + Convex dashboard):
- Post from session A — verify it appears at the top in session B within ~1s (Convex live query).
- React with ❤️ in session B — verify count + highlighted pill in session A.
- Open reply thread in session A, post a reply — verify session B sees the reply count tick.
- Delete your own post — verify it vanishes from both.
- Scroll past 15 posts — verify the next batch loads as the sentinel enters view (seed extra posts via Convex dashboard if needed).

- [ ] **Step 4: Commit**

```bash
git add src/lib/useWallPagination.js src/routes/WallPage.jsx
git commit -m "feat(wall): paginated feed with infinite scroll + banner + composer"
```

---

## Task 20: End-to-end push smoke + rollout note

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-posting-wall-design.md` (status header only)

- [ ] **Step 1: Run the full test suite one more time**

Run: `npm run test`
Expected: green.

- [ ] **Step 2: Manual PWA + push smoke on a real iPhone**

1. Deploy to production (or use a tunneled HTTPS dev URL — push requires HTTPS).
2. On the iPhone: in Safari, remove the old `Punta Cana '26` home-screen icon.
3. Open the deployed URL in Safari, tap Share → Add to Home Screen. Confirm the icon is now the custom DR Baby tile.
4. Open the app from the home screen icon. Confirm it launches in standalone mode (no Safari chrome).
5. Tap the `💬 Wall` tab. The "🔔 Turn on notifications" banner should appear.
6. Tap it, accept the iOS permission prompt.
7. From a second device (or the Convex dashboard) create a new post.
8. The iPhone should receive a lockscreen notification within a few seconds. Tapping it should open the wall.

If any step fails, log details in this plan as a follow-up. Do not skip the manual smoke.

- [ ] **Step 3: Update the spec status to "Shipped"**

In `docs/superpowers/specs/2026-05-20-posting-wall-design.md` change the second header line from:

```
**Status:** Designed, awaiting review
```
to:
```
**Status:** Shipped — see implementation plan 2026-05-20-posting-wall.md
```

- [ ] **Step 4: Send the rollout message to the crew (out of repo)**

The note (paste into WhatsApp):

> **DR Baby got an upgrade 🎉**
> Delete the old "Punta Cana '26" icon from your home screen.
> Open the site in Safari → Share → Add to Home Screen — you'll get the real DR Baby icon now.
> Tap the new icon to open the app, go to the 💬 Wall tab, and tap "Turn on notifications" so you get pinged when someone posts.
> Anything wonky → message Khari.

- [ ] **Step 5: Commit the spec status flip**

```bash
git add docs/superpowers/specs/2026-05-20-posting-wall-design.md
git commit -m "docs(wall): mark spec as shipped"
```
