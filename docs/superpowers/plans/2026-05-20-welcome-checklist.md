# Welcome Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first-login welcome checklist card on the player home page, with Convex-backed completion that follows the player across devices.

**Architecture:** A new Convex table `playerProgress` stores three "visited" booleans plus a `welcomeHidden` flag, joined in a single `welcome.getProgress` query with six booleans derived from existing data (holiday name, catchphrase, room, wall post, challenge claim, adventure vote). A new `WelcomeChecklist` React component reads that query and renders a tinted card with two grouped sections of nine tappable rows that scroll-or-navigate to the right place. Mutations from `PlayerGamesPage` and `LeaderboardPage` flip the "visited scavenger / leaderboard" booleans on first paint.

**Tech Stack:** Convex (TypeScript), Vitest + `convex-test`, React 18 with `convex/react`, React Router v7.

Spec reference: `docs/superpowers/specs/2026-05-20-welcome-checklist-design.md`.

---

## File Structure

**Create**
- `convex/welcome.ts` — query + 4 mutations
- `convex/welcome.test.ts` — unit tests for the module
- `src/components/WelcomeChecklist.jsx` — the card component

**Modify**
- `convex/schema.ts` — add `playerProgress` table
- `src/routes/PlayerPage.jsx` — mount component, add `id="profile"` to the holiday-name section
- `src/routes/PlayerGamesPage.jsx` — fire `markScavengerVisited` when the scavenger tab is active
- `src/routes/LeaderboardPage.jsx` — fire `markLeaderboardVisited` on first paint

---

## Task 1: Add `playerProgress` table to the Convex schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Open the schema and find the existing `players` table block**

  Read `convex/schema.ts:1-15`. The first table defined is `players` and it sets the pattern (`defineTable({ ... }).index(...)`).

- [ ] **Step 2: Add the `playerProgress` table definition**

  Insert this block immediately after the `players` table definition (right before the `answers` block, so it sits with the other identity-style tables):

  ```ts
  playerProgress: defineTable({
    slug: v.string(),
    visitedLeaderboard: v.boolean(),
    visitedScavenger: v.boolean(),
    lockscreenSeen: v.boolean(),
    welcomeHidden: v.boolean(),
  }).index("by_slug", ["slug"]),
  ```

- [ ] **Step 3: Verify the project still type-checks and tests still pass**

  Run: `npm test -- --run`
  Expected: all existing tests pass (no welcome tests yet).

- [ ] **Step 4: Commit**

  ```bash
  git add convex/schema.ts
  git commit -m "feat(welcome): add playerProgress table to schema"
  ```

---

## Task 2: Implement `welcome.getProgress` with tests

**Files:**
- Create: `convex/welcome.ts`
- Create: `convex/welcome.test.ts`

- [ ] **Step 1: Write the failing test file**

  Create `convex/welcome.test.ts`:

  ```ts
  import { convexTest } from "convex-test";
  import { describe, it, expect } from "vitest";
  import { api } from "./_generated/api";
  import schema from "./schema";

  async function seedPlayer(t: ReturnType<typeof convexTest>, slug: string) {
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug, passcodeHash: null });
    });
  }

  async function seedSession(t: ReturnType<typeof convexTest>, slug: string, token: string) {
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", { playerSlug: slug, token, createdAt: Date.now() });
    });
  }

  describe("welcome.getProgress", () => {
    it("returns nine items, all done=false, for a brand-new player", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");

      const result = await t.query(api.welcome.getProgress, { slug: "kai" });

      expect(result.totalCount).toBe(9);
      expect(result.doneCount).toBe(0);
      expect(result.hidden).toBe(false);
      expect(result.items.map((i) => i.id)).toEqual([
        "holidayName",
        "catchphrase",
        "room",
        "lockscreen",
        "wallPost",
        "challengeClaim",
        "scavengerVisit",
        "adventureVote",
        "leaderboardVisit",
      ]);
      expect(result.items.every((i) => i.done === false)).toBe(true);
    });

    it("ticks holidayName when player.holidayName is set", async () => {
      const t = convexTest(schema);
      await t.run(async (ctx) => {
        await ctx.db.insert("players", { slug: "kai", passcodeHash: null, holidayName: "Don Pollo" });
      });

      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      const item = result.items.find((i) => i.id === "holidayName");
      expect(item?.done).toBe(true);
      expect(result.doneCount).toBe(1);
    });

    it("ticks catchphrase when player.catchphrase is set", async () => {
      const t = convexTest(schema);
      await t.run(async (ctx) => {
        await ctx.db.insert("players", { slug: "kai", passcodeHash: null, catchphrase: "let's gooo" });
      });
      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "catchphrase")?.done).toBe(true);
    });

    it("ticks room when player.roomNumber is set", async () => {
      const t = convexTest(schema);
      await t.run(async (ctx) => {
        await ctx.db.insert("players", { slug: "kai", passcodeHash: null, roomNumber: "4201" });
      });
      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "room")?.done).toBe(true);
    });

    it("ticks wallPost when the player has at least one post", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await t.run(async (ctx) => {
        await ctx.db.insert("posts", {
          authorSlug: "kai",
          text: "hello world",
          createdAt: Date.now(),
        });
      });
      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "wallPost")?.done).toBe(true);
    });

    it("ticks challengeClaim when the player has any entries row", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await t.run(async (ctx) => {
        await ctx.db.insert("entries", {
          type: "challenge",
          subjectSlug: "kai",
          points: 10,
          status: "active",
          vouchCount: 0,
          disputeCount: 0,
          dailyKey: "2026-05-20",
          createdAt: Date.now(),
        });
      });
      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "challengeClaim")?.done).toBe(true);
    });

    it("ticks adventureVote when the player has cast a vote", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await t.run(async (ctx) => {
        await ctx.db.insert("activityVotes", {
          playerSlug: "kai",
          activityId: "saona",
          vote: "like",
          updatedAt: Date.now(),
        });
      });
      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "adventureVote")?.done).toBe(true);
    });

    it("ticks scavengerVisit / leaderboardVisit / lockscreen from playerProgress flags", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await t.run(async (ctx) => {
        await ctx.db.insert("playerProgress", {
          slug: "kai",
          visitedLeaderboard: true,
          visitedScavenger: true,
          lockscreenSeen: true,
          welcomeHidden: false,
        });
      });
      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "scavengerVisit")?.done).toBe(true);
      expect(result.items.find((i) => i.id === "leaderboardVisit")?.done).toBe(true);
      expect(result.items.find((i) => i.id === "lockscreen")?.done).toBe(true);
      expect(result.hidden).toBe(false);
    });

    it("returns hidden=true when welcomeHidden is set", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await t.run(async (ctx) => {
        await ctx.db.insert("playerProgress", {
          slug: "kai",
          visitedLeaderboard: false,
          visitedScavenger: false,
          lockscreenSeen: false,
          welcomeHidden: true,
        });
      });
      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.hidden).toBe(true);
    });

    it("doesn't count posts/entries/votes belonging to other players", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedPlayer(t, "candice");
      await t.run(async (ctx) => {
        await ctx.db.insert("posts", { authorSlug: "candice", text: "hi", createdAt: Date.now() });
        await ctx.db.insert("entries", {
          type: "challenge",
          subjectSlug: "candice",
          points: 10,
          status: "active",
          vouchCount: 0,
          disputeCount: 0,
          dailyKey: "2026-05-20",
          createdAt: Date.now(),
        });
        await ctx.db.insert("activityVotes", {
          playerSlug: "candice",
          activityId: "saona",
          vote: "like",
          updatedAt: Date.now(),
        });
      });
      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.doneCount).toBe(0);
    });
  });
  ```

- [ ] **Step 2: Run the tests, confirm they fail because the module doesn't exist**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: failure such as `Cannot find module './_generated/api'` for `api.welcome` (or "no such function" once the api regen runs). Either way, the tests should not pass.

- [ ] **Step 3: Implement `convex/welcome.ts`**

  Create `convex/welcome.ts`:

  ```ts
  import { mutation, query } from "./_generated/server";
  import { v } from "convex/values";
  import type { QueryCtx, MutationCtx } from "./_generated/server";
  import { requireSession } from "./helpers";

  // Order matches the spec §3 — keep this stable; the UI relies on it.
  const ITEM_ORDER = [
    "holidayName",
    "catchphrase",
    "room",
    "lockscreen",
    "wallPost",
    "challengeClaim",
    "scavengerVisit",
    "adventureVote",
    "leaderboardVisit",
  ] as const;
  type ItemId = (typeof ITEM_ORDER)[number];

  async function loadProgressRow(ctx: QueryCtx | MutationCtx, slug: string) {
    return await ctx.db
      .query("playerProgress")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  }

  async function ensureProgressRow(ctx: MutationCtx, slug: string) {
    const existing = await loadProgressRow(ctx, slug);
    if (existing) return existing;
    const id = await ctx.db.insert("playerProgress", {
      slug,
      visitedLeaderboard: false,
      visitedScavenger: false,
      lockscreenSeen: false,
      welcomeHidden: false,
    });
    const fresh = await ctx.db.get(id);
    if (!fresh) throw new Error("failed to create playerProgress row");
    return fresh;
  }

  async function requireSelf(ctx: MutationCtx, token: string, slug: string) {
    const { playerSlug } = await requireSession(ctx, token);
    if (playerSlug !== slug) throw new Error("not your progress");
  }

  export const getProgress = query({
    args: { slug: v.string() },
    handler: async (ctx, { slug }) => {
      const [player, progress, posts, entries, votes] = await Promise.all([
        ctx.db.query("players").withIndex("by_slug", (q) => q.eq("slug", slug)).unique(),
        loadProgressRow(ctx, slug),
        // posts has no by_author index — collect and filter (≤8 players, low volume).
        ctx.db.query("posts").collect(),
        ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", slug)).take(1),
        ctx.db.query("activityVotes").collect(),
      ]);

      const hasHolidayName = !!(player?.holidayName && player.holidayName.length > 0);
      const hasCatchphrase = !!(player?.catchphrase && player.catchphrase.length > 0);
      const hasRoom = !!(player?.roomNumber && player.roomNumber.length > 0);
      const hasWallPost = posts.some((p) => p.authorSlug === slug);
      const hasChallengeClaim = entries.length > 0;
      const hasAdventureVote = votes.some((v) => v.playerSlug === slug);

      const lockscreenSeen = progress?.lockscreenSeen === true;
      const visitedScavenger = progress?.visitedScavenger === true;
      const visitedLeaderboard = progress?.visitedLeaderboard === true;
      const hidden = progress?.welcomeHidden === true;

      const byId: Record<ItemId, boolean> = {
        holidayName: hasHolidayName,
        catchphrase: hasCatchphrase,
        room: hasRoom,
        lockscreen: lockscreenSeen,
        wallPost: hasWallPost,
        challengeClaim: hasChallengeClaim,
        scavengerVisit: visitedScavenger,
        adventureVote: hasAdventureVote,
        leaderboardVisit: visitedLeaderboard,
      };

      const items = ITEM_ORDER.map((id) => ({ id, done: byId[id] }));
      const doneCount = items.reduce((n, i) => n + (i.done ? 1 : 0), 0);

      return { items, doneCount, totalCount: items.length, hidden };
    },
  });
  ```

- [ ] **Step 4: Run the tests, confirm they pass**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: all `welcome.getProgress` tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/welcome.ts convex/welcome.test.ts
  git commit -m "feat(welcome): getProgress query with nine-item derivation"
  ```

---

## Task 3: Implement `welcome.markLockscreenSeen`

**Files:**
- Modify: `convex/welcome.ts`
- Modify: `convex/welcome.test.ts`

- [ ] **Step 1: Add failing tests at the bottom of `welcome.test.ts`**

  Append:

  ```ts
  describe("welcome.markLockscreenSeen", () => {
    it("creates the progress row and sets lockscreenSeen", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedSession(t, "kai", "tok");

      await t.mutation(api.welcome.markLockscreenSeen, { token: "tok", slug: "kai" });

      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "lockscreen")?.done).toBe(true);
    });

    it("is idempotent (second call is a no-op)", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedSession(t, "kai", "tok");

      await t.mutation(api.welcome.markLockscreenSeen, { token: "tok", slug: "kai" });
      await t.mutation(api.welcome.markLockscreenSeen, { token: "tok", slug: "kai" });

      await t.run(async (ctx) => {
        const rows = await ctx.db.query("playerProgress").collect();
        expect(rows).toHaveLength(1);
        expect(rows[0].lockscreenSeen).toBe(true);
      });
    });

    it("rejects when token doesn't match slug", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedPlayer(t, "candice");
      await seedSession(t, "candice", "candice-tok");

      await expect(
        t.mutation(api.welcome.markLockscreenSeen, { token: "candice-tok", slug: "kai" }),
      ).rejects.toThrow(/not your progress/);
    });

    it("rejects when token is invalid", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");

      await expect(
        t.mutation(api.welcome.markLockscreenSeen, { token: "nope", slug: "kai" }),
      ).rejects.toThrow(/invalid session/);
    });
  });
  ```

- [ ] **Step 2: Run the tests, confirm failure**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: "no such function `welcome.markLockscreenSeen`" or equivalent.

- [ ] **Step 3: Add the mutation to `convex/welcome.ts`**

  Append after the `getProgress` export:

  ```ts
  export const markLockscreenSeen = mutation({
    args: { token: v.string(), slug: v.string() },
    handler: async (ctx, { token, slug }) => {
      await requireSelf(ctx, token, slug);
      const row = await ensureProgressRow(ctx, slug);
      if (row.lockscreenSeen) return;
      await ctx.db.patch(row._id, { lockscreenSeen: true });
    },
  });
  ```

- [ ] **Step 4: Run the tests, confirm they pass**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: all `markLockscreenSeen` tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/welcome.ts convex/welcome.test.ts
  git commit -m "feat(welcome): markLockscreenSeen mutation"
  ```

---

## Task 4: Implement `welcome.markScavengerVisited`

**Files:**
- Modify: `convex/welcome.ts`
- Modify: `convex/welcome.test.ts`

- [ ] **Step 1: Add failing tests**

  Append to `welcome.test.ts`:

  ```ts
  describe("welcome.markScavengerVisited", () => {
    it("sets visitedScavenger=true and is idempotent", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedSession(t, "kai", "tok");

      await t.mutation(api.welcome.markScavengerVisited, { token: "tok", slug: "kai" });
      await t.mutation(api.welcome.markScavengerVisited, { token: "tok", slug: "kai" });

      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "scavengerVisit")?.done).toBe(true);

      await t.run(async (ctx) => {
        const rows = await ctx.db.query("playerProgress").collect();
        expect(rows).toHaveLength(1);
      });
    });

    it("rejects when token doesn't match slug", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedPlayer(t, "candice");
      await seedSession(t, "candice", "candice-tok");

      await expect(
        t.mutation(api.welcome.markScavengerVisited, { token: "candice-tok", slug: "kai" }),
      ).rejects.toThrow(/not your progress/);
    });
  });
  ```

- [ ] **Step 2: Run, confirm failure**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: tests for `markScavengerVisited` fail with "no such function".

- [ ] **Step 3: Add the mutation**

  Append to `convex/welcome.ts`:

  ```ts
  export const markScavengerVisited = mutation({
    args: { token: v.string(), slug: v.string() },
    handler: async (ctx, { token, slug }) => {
      await requireSelf(ctx, token, slug);
      const row = await ensureProgressRow(ctx, slug);
      if (row.visitedScavenger) return;
      await ctx.db.patch(row._id, { visitedScavenger: true });
    },
  });
  ```

- [ ] **Step 4: Run, confirm passing**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/welcome.ts convex/welcome.test.ts
  git commit -m "feat(welcome): markScavengerVisited mutation"
  ```

---

## Task 5: Implement `welcome.markLeaderboardVisited`

**Files:**
- Modify: `convex/welcome.ts`
- Modify: `convex/welcome.test.ts`

- [ ] **Step 1: Add failing tests**

  Append to `welcome.test.ts`:

  ```ts
  describe("welcome.markLeaderboardVisited", () => {
    it("sets visitedLeaderboard=true and is idempotent", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedSession(t, "kai", "tok");

      await t.mutation(api.welcome.markLeaderboardVisited, { token: "tok", slug: "kai" });
      await t.mutation(api.welcome.markLeaderboardVisited, { token: "tok", slug: "kai" });

      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.items.find((i) => i.id === "leaderboardVisit")?.done).toBe(true);

      await t.run(async (ctx) => {
        const rows = await ctx.db.query("playerProgress").collect();
        expect(rows).toHaveLength(1);
      });
    });

    it("rejects when token doesn't match slug", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedPlayer(t, "candice");
      await seedSession(t, "candice", "candice-tok");

      await expect(
        t.mutation(api.welcome.markLeaderboardVisited, { token: "candice-tok", slug: "kai" }),
      ).rejects.toThrow(/not your progress/);
    });
  });
  ```

- [ ] **Step 2: Run, confirm failure**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: new tests fail with "no such function".

- [ ] **Step 3: Add the mutation**

  Append to `convex/welcome.ts`:

  ```ts
  export const markLeaderboardVisited = mutation({
    args: { token: v.string(), slug: v.string() },
    handler: async (ctx, { token, slug }) => {
      await requireSelf(ctx, token, slug);
      const row = await ensureProgressRow(ctx, slug);
      if (row.visitedLeaderboard) return;
      await ctx.db.patch(row._id, { visitedLeaderboard: true });
    },
  });
  ```

- [ ] **Step 4: Run, confirm passing**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/welcome.ts convex/welcome.test.ts
  git commit -m "feat(welcome): markLeaderboardVisited mutation"
  ```

---

## Task 6: Implement `welcome.hide`

**Files:**
- Modify: `convex/welcome.ts`
- Modify: `convex/welcome.test.ts`

- [ ] **Step 1: Add failing tests**

  Append to `welcome.test.ts`:

  ```ts
  describe("welcome.hide", () => {
    it("sets welcomeHidden=true and is idempotent", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedSession(t, "kai", "tok");

      await t.mutation(api.welcome.hide, { token: "tok", slug: "kai" });
      await t.mutation(api.welcome.hide, { token: "tok", slug: "kai" });

      const result = await t.query(api.welcome.getProgress, { slug: "kai" });
      expect(result.hidden).toBe(true);

      await t.run(async (ctx) => {
        const rows = await ctx.db.query("playerProgress").collect();
        expect(rows).toHaveLength(1);
      });
    });

    it("rejects when token doesn't match slug", async () => {
      const t = convexTest(schema);
      await seedPlayer(t, "kai");
      await seedPlayer(t, "candice");
      await seedSession(t, "candice", "candice-tok");

      await expect(
        t.mutation(api.welcome.hide, { token: "candice-tok", slug: "kai" }),
      ).rejects.toThrow(/not your progress/);
    });
  });
  ```

- [ ] **Step 2: Run, confirm failure**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: new tests fail with "no such function".

- [ ] **Step 3: Add the mutation**

  Append to `convex/welcome.ts`:

  ```ts
  export const hide = mutation({
    args: { token: v.string(), slug: v.string() },
    handler: async (ctx, { token, slug }) => {
      await requireSelf(ctx, token, slug);
      const row = await ensureProgressRow(ctx, slug);
      if (row.welcomeHidden) return;
      await ctx.db.patch(row._id, { welcomeHidden: true });
    },
  });
  ```

- [ ] **Step 4: Run, confirm passing**

  Run: `npm test -- --run convex/welcome.test.ts`
  Expected: all welcome tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add convex/welcome.ts convex/welcome.test.ts
  git commit -m "feat(welcome): hide mutation"
  ```

---

## Task 7: Build `WelcomeChecklist.jsx`

**Files:**
- Create: `src/components/WelcomeChecklist.jsx`

This task has no unit tests — the component is presentation glued to a server query, and the project does not test React components anywhere else (only Convex). Manual verification happens in Task 11.

- [ ] **Step 1: Create the component file**

  Create `src/components/WelcomeChecklist.jsx`:

  ```jsx
  import { useNavigate } from "react-router-dom";
  import { useQuery, useMutation } from "convex/react";
  import { api } from "../../convex/_generated/api";
  import { C } from "../data/colors.js";
  import Card from "./primitives/Card.jsx";
  import { showToast } from "../lib/useToast.js";

  // Item config — order MUST match the ITEM_ORDER constant in convex/welcome.ts.
  // `onTap` returns void; it is what runs when the row is clicked. We pass `slug`,
  // `navigate`, and `markLockscreenSeen` to give it everything it needs.
  function buildItems({ slug, navigate, markLockscreenSeen }) {
    const scrollTo = (anchorId) => {
      const el = document.getElementById(anchorId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return {
      setup: [
        {
          id: "holidayName",
          label: "Pick your holiday name",
          onTap: () => scrollTo("profile"),
        },
        {
          id: "catchphrase",
          label: "Add a catchphrase",
          onTap: () => scrollTo("profile"),
        },
        {
          id: "room",
          label: "Tell us your room number",
          onTap: () => scrollTo("about"),
        },
        {
          id: "lockscreen",
          label: "Make your lockscreen",
          onTap: () => {
            markLockscreenSeen();
            scrollTo("profile");
          },
        },
      ],
      try: [
        {
          id: "wallPost",
          label: "Post on the Wall",
          onTap: () => navigate("/wall"),
        },
        {
          id: "challengeClaim",
          label: "Claim a challenge",
          onTap: () => navigate(`/player/${slug}/games`),
        },
        {
          id: "scavengerVisit",
          label: "Play today's scavenger",
          onTap: () => navigate(`/player/${slug}/games?tab=scavenger`),
        },
        {
          id: "adventureVote",
          label: "Vote on an adventure",
          onTap: () => scrollTo("adventures"),
        },
        {
          id: "leaderboardVisit",
          label: "Check the leaderboard",
          onTap: () => navigate("/leaderboard"),
        },
      ],
    };
  }

  function Row({ id, label, done, onTap }) {
    return (
      <button
        type="button"
        onClick={onTap}
        aria-label={label}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          minHeight: 44,
          padding: "8px 4px",
          background: "transparent",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "Nunito, sans-serif",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: done ? C.green : "transparent",
            border: done ? "none" : `1.5px solid ${C.sandDark}`,
            color: C.white,
            fontWeight: 900,
            fontSize: 13,
            transition: "background 200ms ease, border-color 200ms ease",
          }}
        >
          {done ? "✓" : ""}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 700,
            color: done ? C.textBody : C.dark,
            opacity: done ? 0.55 : 1,
            textDecoration: done ? "line-through" : "none",
            transition: "color 200ms ease, opacity 200ms ease",
          }}
        >
          {label}
        </span>
        {!done && (
          <span aria-hidden style={{ color: C.textBody, opacity: 0.4, fontSize: 16 }}>
            ›
          </span>
        )}
      </button>
    );
  }

  function GroupHeader({ children }) {
    return (
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: C.textBody,
          opacity: 0.7,
          margin: "8px 0 4px",
        }}
      >
        {children}
      </div>
    );
  }

  export default function WelcomeChecklist({ slug, token, player }) {
    const navigate = useNavigate();
    const progress = useQuery(api.welcome.getProgress, { slug });
    const markLockscreenSeenMutation = useMutation(api.welcome.markLockscreenSeen);
    const hideMutation = useMutation(api.welcome.hide);

    if (!progress) return null;
    if (progress.hidden) return null;

    const doneById = Object.fromEntries(progress.items.map((i) => [i.id, i.done]));
    const allDone = progress.doneCount === progress.totalCount;

    const items = buildItems({
      slug,
      navigate,
      markLockscreenSeen: () => {
        if (!doneById.lockscreen) {
          markLockscreenSeenMutation({ token, slug }).catch(() => {});
        }
      },
    });

    const handleHide = async () => {
      try {
        await hideMutation({ token, slug });
        showToast({ message: "Hidden — welcome card dismissed", accent: C.textBody });
      } catch {
        showToast({ message: "Couldn't hide — try again", accent: C.coralDeep });
      }
    };

    if (allDone) {
      return (
        <Card tint={player.color} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>🎉</span>
          <span
            style={{
              flex: 1,
              fontFamily: "Nunito, sans-serif",
              fontSize: 14,
              fontWeight: 800,
              color: C.dark,
            }}
          >
            All set! Have a great trip.
          </span>
          <button
            type="button"
            onClick={handleHide}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 600,
              fontSize: 12,
              color: C.textBody,
            }}
          >
            Hide
          </button>
        </Card>
      );
    }

    return (
      <Card tint={player.color}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 900,
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: player.color,
              }}
            >
              Get started
            </div>
            <div
              style={{
                fontFamily: "'Dela Gothic One', sans-serif",
                fontSize: 22,
                color: C.dark,
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              Make the most of the trip
            </div>
          </div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: 0.5,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.04)",
              color: C.textBody,
              flexShrink: 0,
            }}
          >
            {progress.doneCount} / {progress.totalCount}
          </div>
        </div>

        <GroupHeader>Set it up</GroupHeader>
        <div>
          {items.setup.map((it) => (
            <Row key={it.id} {...it} done={doneById[it.id]} />
          ))}
        </div>

        <GroupHeader>Try it out</GroupHeader>
        <div>
          {items.try.map((it) => (
            <Row key={it.id} {...it} done={doneById[it.id]} />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button
            type="button"
            onClick={handleHide}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 600,
              fontSize: 12,
              color: C.textBody,
            }}
          >
            Hide this
          </button>
        </div>
      </Card>
    );
  }
  ```

- [ ] **Step 2: Verify the dev server still boots and existing tests still pass**

  Run: `npm test -- --run`
  Expected: all tests pass. (We aren't testing the component, but a syntax error here would fail the test runner's import scan.)

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/WelcomeChecklist.jsx
  git commit -m "feat(welcome): WelcomeChecklist card component"
  ```

---

## Task 8: Mount the card on `PlayerPage` and add scroll anchors

**Files:**
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Import the component**

  In `src/routes/PlayerPage.jsx`, locate the existing import block at the top (lines 1–20). Add this line alongside the other component imports:

  ```jsx
  import WelcomeChecklist from "../components/WelcomeChecklist.jsx";
  ```

- [ ] **Step 2: Add `id="profile"` to the holiday-name / catchphrase / lockscreen section**

  Find this opening tag in `PlayerPage.jsx` (around line 295):

  ```jsx
  <section style={{ padding: "32px 16px 24px", background: C.sand }}>
  ```

  Replace it with:

  ```jsx
  <section id="profile" style={{ padding: "32px 16px 24px", background: C.sand }}>
  ```

- [ ] **Step 3: Render `WelcomeChecklist` inside the profile section**

  Inside the same `<section id="profile">…</section>` (around line 295), insert the checklist as the first child wrapped in a `<Reveal>` and a width-capped container. The block above the existing `<Reveal>` that wraps `HolidayNameEditor`:

  ```jsx
  <section id="profile" style={{ padding: "32px 16px 24px", background: C.sand }}>
    <div style={{ maxWidth: 720, margin: "0 auto 12px" }}>
      <Reveal>
        <WelcomeChecklist slug={slug} token={session.token} player={player} />
      </Reveal>
    </div>
    <Reveal>
      <HolidayNameEditor ... />
    </Reveal>
    ...
  ```

  Leave the existing children intact.

- [ ] **Step 4: Smoke-test in the dev server**

  Run: `npm run dev`
  Open: `http://localhost:5173/player/kai` (after logging in as kai from the home page if needed)
  Expected: the welcome card appears above the holiday-name editor with the 9-item checklist, the progress chip shows `N / 9`, and tapping a row either scrolls or navigates.
  Stop the dev server with Ctrl+C when done.

- [ ] **Step 5: Commit**

  ```bash
  git add src/routes/PlayerPage.jsx
  git commit -m "feat(welcome): mount checklist on player home + anchor profile section"
  ```

---

## Task 9: Auto-tick `scavengerVisit` from the games page

**Files:**
- Modify: `src/routes/PlayerGamesPage.jsx`

- [ ] **Step 1: Read the current shape of `PlayerGamesPage`**

  Skim the top of `src/routes/PlayerGamesPage.jsx`. The relevant bits:
  - It imports `useEffect` from `react` and `useGamesTab` from `../components/GamesTabBar.jsx`
  - It calls `const tab = useGamesTab();` near the top of the component body (around line 187)
  - The session is loaded similarly to `PlayerPage`. The local variable holding `session.token` is what you need.

- [ ] **Step 2: Add the mutation hook + effect**

  Just below the line `const tab = useGamesTab();`, add:

  ```jsx
  const markScavengerVisited = useMutation(api.welcome.markScavengerVisited);
  useEffect(() => {
    if (tab !== "scavenger") return;
    if (!session?.token || !slug) return;
    markScavengerVisited({ token: session.token, slug }).catch(() => {});
  }, [tab, session?.token, slug, markScavengerVisited]);
  ```

  Make sure `useMutation` is imported from `convex/react` and `useEffect` from `react` at the top of the file (`PlayerGamesPage.jsx` already imports both — confirm and add if missing).

  Note: the mutation is server-side idempotent (Task 4), so firing it on every render where `tab === "scavenger"` is safe; the early-exit guard inside the mutation keeps the cost trivial.

- [ ] **Step 3: Smoke-test**

  Run: `npm run dev`
  In the browser as a known logged-in player, navigate to `/player/<slug>/games?tab=scavenger`. Then go back to `/player/<slug>` — the "Play today's scavenger" row should be ticked.
  Stop the dev server when done.

- [ ] **Step 4: Run the full test suite to make sure nothing regressed**

  Run: `npm test -- --run`
  Expected: green.

- [ ] **Step 5: Commit**

  ```bash
  git add src/routes/PlayerGamesPage.jsx
  git commit -m "feat(welcome): auto-tick scavengerVisit on games tab"
  ```

---

## Task 10: Auto-tick `leaderboardVisit` from the leaderboard page

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

- [ ] **Step 1: Add `useEffect` and `useMutation` if not already imported**

  At the top of `src/routes/LeaderboardPage.jsx`, ensure these imports exist:

  ```jsx
  import { useEffect, useState, useMemo } from "react";
  import { useQuery, useMutation } from "convex/react";
  ```

  (The file currently imports `useState`/`useMemo` from `react` and `useQuery` from `convex/react`; extend both lines.)

- [ ] **Step 2: Inside the `LeaderboardPage` component, after `useSession()`, fire the mutation**

  Find the line that calls `useSession()`. Just below it, add:

  ```jsx
  const markLeaderboardVisited = useMutation(api.welcome.markLeaderboardVisited);
  useEffect(() => {
    if (!session?.token || !session?.slug) return;
    markLeaderboardVisited({ token: session.token, slug: session.slug }).catch(() => {});
  }, [session?.token, session?.slug, markLeaderboardVisited]);
  ```

  The mutation is server-side idempotent (Task 5), so the effect re-running is fine.

- [ ] **Step 3: Smoke-test**

  Run: `npm run dev`
  As a logged-in player, navigate to `/leaderboard`. Then return to `/player/<slug>` — the "Check the leaderboard" row should be ticked.
  Stop the dev server when done.

- [ ] **Step 4: Run the full test suite**

  Run: `npm test -- --run`
  Expected: green.

- [ ] **Step 5: Commit**

  ```bash
  git add src/routes/LeaderboardPage.jsx
  git commit -m "feat(welcome): auto-tick leaderboardVisit on visit"
  ```

---

## Task 11: End-to-end manual verification

**Files:** none modified — pure verification.

- [ ] **Step 1: Boot the dev server with a clean session**

  Run: `npm run dev`
  Open an incognito window, navigate to `http://localhost:5173/`, and log in as a player that has never used the welcome card before (e.g. a freshly-reset test player; if no such player exists, use the seed scripts in `scripts/` or `convex/seed.ts` to add one).

- [ ] **Step 2: Walk every item and confirm the tick lands**

  Starting from the player home, work through each row in order. For each, verify:
  - Tapping the row navigates/scrolls to the right place.
  - Performing the action causes the row to tick on return to home.

  Specifically:
  1. **Pick your holiday name** — open the editor, save a name, navigate away and back. Row ticks.
  2. **Add a catchphrase** — same flow.
  3. **Tell us your room number** — scroll to `#about`, open RoomNumberEditor, save. Row ticks.
  4. **Make your lockscreen** — tap the row; it scrolls and ticks immediately.
  5. **Post on the Wall** — tap, create a post on `/wall`, navigate back. Row ticks.
  6. **Claim a challenge** — tap, create a claim on the games page. Row ticks.
  7. **Play today's scavenger** — tap; on landing the Scavenger tab is active and the row ticks on next visit to home.
  8. **Vote on an adventure** — tap, scroll to adventures, cast a like/dislike. Row ticks.
  9. **Check the leaderboard** — tap; the row ticks immediately on landing on `/leaderboard`.

  Expected: after all nine, the card collapses to the "🎉 All set! Have a great trip." row with a `Hide` link.

- [ ] **Step 3: Verify dismissal**

  Tap `Hide`. A toast appears. Refresh the page. Card stays gone.

- [ ] **Step 4: Verify cross-device persistence (best-effort)**

  Open a second browser (or incognito session in a different browser profile), log in as the same player. The card should also be gone.

- [ ] **Step 5: No commit needed (verification only)**

  If everything passes, the feature is done. If any step fails, file the bug as a follow-up task and address before merging.
