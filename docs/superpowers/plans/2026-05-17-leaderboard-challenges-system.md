# Leaderboard & Challenges System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full in-app challenges/forfeits/leaderboard system per `docs/superpowers/specs/2026-05-17-leaderboard-challenges-system-design.md`. Players claim challenges on their player page → points hit a reactive group leaderboard → 1 vouch verifies, 2 disputes reverse. Negative points are witness-applied with the same mechanics. Co-admins Khari + Kai trigger daily rollovers; the daily lowest scorer spins the wheel for a forfeit on a shared-screen reveal page. Players can also propose new challenges in-app via a title → admin draft → 5-of-8 vote pipeline.

**Architecture:** Convex tables + reactive queries (Approach B). 7 new tables: `challenges`, `entries`, `entryReactions`, `suggestions`, `suggestionVotes`, `rollovers`, `gameState`, `adminRoles`. All write paths enforce auth + business rules server-side. The existing `src/data/challenges.js` becomes a one-time seed snapshot; runtime reads switch to the Convex query.

**Tech Stack:** Convex 1.35, React 18 + react-router-dom 7, Vite 5, Vitest 4, `convex-test` 0.0.49, bcryptjs (existing auth), sharp (image conversion only).

---

## File Structure

### New / modified Convex files

```
convex/
  schema.ts                       ← modify: add 7 new tables
  helpers.ts                      ← NEW: requireSession, requireAdmin, deriveDifficulty, getGameState
  _seedData/
    challenges.ts                 ← NEW: one-time snapshot of CHALLENGES (plain TS export, not a Convex function)
  seedChallenges.ts               ← NEW: seedChallenges, seedAdmins, seedGameState internalMutations
  challenges.ts                   ← NEW: listActive query, retire(admin) mutation
  challenges.test.ts              ← NEW
  entries.ts                      ← NEW: claim, vouch, dispute, logNegative mutations
  entries.test.ts                 ← NEW
  leaderboard.ts                  ← NEW: getDaily, getHoliday, getRecentActivity queries
  leaderboard.test.ts             ← NEW
  suggestions.ts                  ← NEW: create, draft, vote, reject mutations + list query
  suggestions.test.ts             ← NEW
  rollovers.ts                    ← NEW: trigger, recordForfeit, undoLast, get queries/mutations
  rollovers.test.ts               ← NEW
  admin.ts                        ← modify: add isAdmin query
```

### New / modified frontend files

```
src/
  App.jsx                         ← modify: add 4 new routes
  lib/
    useGameState.js               ← NEW
    useSession.js                 ← NEW (small wrapper to read session token from localStorage)
  components/
    ChallengeCard.jsx             ← NEW
    ClaimModal.jsx                ← NEW
    FoulModal.jsx                 ← NEW
    EntryRow.jsx                  ← NEW
    SuggestionDraftForm.jsx       ← NEW
  routes/
    PlayerPage.jsx                ← modify: add challenges tabs + foul button on others' pages
    LeaderboardPage.jsx           ← NEW
    SuggestionsPage.jsx           ← NEW
    AdminPage.jsx                 ← NEW
    PunishmentRevealPage.jsx      ← NEW
  data/
    challenges.js                 ← modify: reduce to re-export of seed snapshot (keep CATEGORIES + NEGATIVE_POINTS + FORFEITS reexport for back-compat)
```

The existing `WheelSpinner` lives in `src/components/games/ScavengerHuntList.jsx` or similar — Phase 7 task instructions check first and wrap rather than duplicate.

### Commit cadence

One commit per task (after green tests). Plan groups multiple steps under a task; the **final step** is the commit. If a task can't be commit-able on its own (rare), I've called it out explicitly.

---

# Phase 1 — Foundation (schema, seed, gameState)

Goal: Database is ready. No UI changes. After this phase, you can verify with `npx convex data` that the new tables exist and are seeded.

---

## Task 1.1: Add new tables to Convex schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Replace `convex/schema.ts` with the extended definition**

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── EXISTING TABLES ────────────────────────────────────────────────
  players: defineTable({
    slug: v.string(),
    passcodeHash: v.union(v.string(), v.null()),
  }).index("by_slug", ["slug"]),

  answers: defineTable({
    playerSlug: v.string(),
    questionId: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["playerSlug"])
    .index("by_slug_and_question", ["playerSlug", "questionId"]),

  sessions: defineTable({
    playerSlug: v.string(),
    token: v.string(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  activityVotes: defineTable({
    playerSlug: v.string(),
    activityId: v.string(),
    vote: v.union(v.literal("like"), v.literal("dislike")),
    updatedAt: v.number(),
  })
    .index("by_activity", ["activityId"])
    .index("by_player_and_activity", ["playerSlug", "activityId"]),

  // ── NEW: CHALLENGES SYSTEM ─────────────────────────────────────────
  challenges: defineTable({
    challengeId: v.string(),
    title: v.string(),
    icon: v.string(),
    points: v.number(),
    bonus: v.optional(v.string()),
    category: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("wild")),
    status: v.union(v.literal("active"), v.literal("retired")),
    createdBySlug: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
  })
    .index("by_challenge_id", ["challengeId"])
    .index("by_status", ["status"]),

  entries: defineTable({
    type: v.union(v.literal("challenge"), v.literal("negative")),
    subjectSlug: v.string(),
    appliedBySlug: v.optional(v.string()),
    challengeId: v.optional(v.string()),
    negativeId: v.optional(v.string()),
    points: v.number(),
    bonusKey: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("verified"), v.literal("disputed")),
    vouchCount: v.number(),
    disputeCount: v.number(),
    dailyKey: v.string(),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_subject", ["subjectSlug"])
    .index("by_daily_key", ["dailyKey"])
    .index("by_status", ["status"]),

  entryReactions: defineTable({
    entryId: v.id("entries"),
    playerSlug: v.string(),
    reaction: v.union(v.literal("vouch"), v.literal("dispute")),
    at: v.number(),
  })
    .index("by_entry_and_player", ["entryId", "playerSlug"])
    .index("by_entry", ["entryId"]),

  suggestions: defineTable({
    proposerSlug: v.string(),
    title: v.string(),
    icon: v.optional(v.string()),
    points: v.optional(v.number()),
    category: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    status: v.union(
      v.literal("proposed"),
      v.literal("voting"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    yesCount: v.number(),
    noCount: v.number(),
    resultingChallengeId: v.optional(v.string()),
    createdAt: v.number(),
    draftedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  suggestionVotes: defineTable({
    suggestionId: v.id("suggestions"),
    voterSlug: v.string(),
    vote: v.union(v.literal("yes"), v.literal("no")),
    at: v.number(),
  }).index("by_suggestion_and_voter", ["suggestionId", "voterSlug"]),

  rollovers: defineTable({
    dayNumber: v.number(),
    dailyKey: v.string(),
    triggeredBySlug: v.string(),
    triggeredAt: v.number(),
    loserSlug: v.optional(v.string()),
    forfeitId: v.optional(v.string()),
    forfeitLabel: v.optional(v.string()),
    spunAt: v.optional(v.number()),
  }).index("by_day_number", ["dayNumber"]),

  gameState: defineTable({
    gamesLive: v.boolean(),
    currentDayNumber: v.number(),
    currentDailyKey: v.string(),
    updatedAt: v.number(),
  }),

  adminRoles: defineTable({
    playerSlug: v.string(),
  }).index("by_slug", ["playerSlug"]),
});
```

- [ ] **Step 2: Verify schema deploys cleanly**

Run: `npx convex dev --once`
Expected: ends with `✔ Convex functions ready!` and no schema errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add schema for challenges, entries, suggestions, rollovers, gameState, adminRoles"
```

---

## Task 1.2: Create seed data snapshot

**Files:**
- Create: `convex/_seedData/challenges.ts`

The directory name `_seedData/` ensures Convex doesn't try to deploy it as functions (Convex only deploys files exporting `mutation`/`query`/`action`/etc.).

- [ ] **Step 1: Create the snapshot file**

```ts
// convex/_seedData/challenges.ts
// One-time snapshot of CHALLENGES from src/data/challenges.js used to seed
// the Convex `challenges` table. After seeding, the table is source of truth.

export type SeedChallenge = {
  challengeId: string;
  title: string;
  icon: string;
  points: number;
  bonus?: string;
  category: string;
};

export const SEED_CHALLENGES: SeedChallenge[] = [
  { challengeId: "kiss-someone", title: "Kiss Someone", icon: "💋", points: 100, category: "social" },
  { challengeId: "sing-in-public", title: "Sing in Public", icon: "🎤", points: 15, bonus: "+50 crowd, +50 money", category: "wild" },
  { challengeId: "run-1km", title: "Run 1km", icon: "🏃", points: 20, category: "fitness" },
  { challengeId: "5-shots", title: "5 Shots at Once", icon: "🥃", points: 20, category: "drinks" },
  { challengeId: "buy-drinks", title: "Get Someone to Buy You Drinks", icon: "🍹", points: 5, category: "social" },
  { challengeId: "selfie-stranger", title: "Selfie with Stranger", icon: "🤳", points: 3, category: "social" },
  { challengeId: "selfie-sleeping", title: "Selfie with Someone Sleeping", icon: "😴", points: 3, bonus: "+30 get everyone", category: "squad" },
  { challengeId: "wear-clothes", title: "Wear Someone's Clothes (10 min)", icon: "👕", points: 15, category: "squad" },
  { challengeId: "gym-30", title: "30 Min Gym Workout", icon: "💪", points: 15, category: "fitness" },
  { challengeId: "get-contact", title: "Get Number / Insta / Snap", icon: "📱", points: 5, category: "social" },
  { challengeId: "sand-sculpture", title: "Build Sand Sculpture", icon: "🏖️", points: 30, category: "chill" },
  { challengeId: "stranger-money", title: "Stranger Gives You Money", icon: "💸", points: 75, category: "wild" },
  { challengeId: "make-tiktok", title: "Make a TikTok", icon: "📹", points: 2, category: "content" },
  { challengeId: "stranger-tiktok", title: "Stranger Joins TikTok", icon: "🎬", points: 20, category: "content" },
  { challengeId: "cliff-jump", title: "Cliff Jump", icon: "🪂", points: 100, category: "wild" },
  { challengeId: "find-lookalike", title: "Find Group Lookalike", icon: "👥", points: 70, category: "squad" },
  { challengeId: "sleep-elsewhere", title: "Sleep Somewhere Else", icon: "🛏️", points: 100, category: "wild" },
  { challengeId: "receive-compliments", title: "Receive Compliments", icon: "😊", points: 7, category: "social" },
  { challengeId: "get-tan", title: "Get a Tan", icon: "☀️", points: 1, category: "chill" },
  { challengeId: "hold-hands", title: "Hold Hands with Stranger", icon: "🤝", points: 15, category: "social" },
  { challengeId: "down-drink", title: "Down a Drink", icon: "🍺", points: 2, category: "drinks" },
  { challengeId: "shot", title: "Shot", icon: "🥂", points: 2, category: "drinks" },
  { challengeId: "play-game-stranger", title: "Play Game with Stranger", icon: "🎲", points: 25, category: "social" },
  { challengeId: "buy-souvenir", title: "Buy Souvenir", icon: "🎁", points: 4, category: "chill" },
  { challengeId: "matching-outfit", title: "Matching Outfit Stranger", icon: "👯", points: 15, category: "social" },
  { challengeId: "pic-5-over-50", title: "Pic with 5 People 50+", icon: "📸", points: 50, category: "wild" },
  { challengeId: "embarrassing-ask", title: "Ask Something Embarrassing", icon: "😳", points: 35, category: "social" },
  { challengeId: "scare-group", title: "Scare Someone in Group", icon: "👻", points: 10, category: "squad" },
  { challengeId: "try-new", title: "Try Something New", icon: "✨", points: 10, category: "wild" },
  { challengeId: "gianni-bike", title: "Ride Gianni's Bike", icon: "🚲", points: 85, category: "wild" },
  { challengeId: "give-massage", title: "Give Massage", icon: "💆", points: 1, bonus: "per minute", category: "squad" },
  { challengeId: "shower-with", title: "Shower with Someone", icon: "🚿", points: 100, category: "wild" },
  { challengeId: "tattoo", title: "Get a Tattoo", icon: "🖋️", points: 250, category: "wild" },
  { challengeId: "all-nighter", title: "All Nighter (until midday)", icon: "🌙", points: 40, category: "wild" },
  { challengeId: "scavenger-hunt", title: "Scavenger Hunt (Food/Plant/Animal/Object)", icon: "🔍", points: 80, category: "squad" },
];

export const NEGATIVE_POINTS_CONST = [
  { id: "throw-up", action: "Throwing up", points: -50, icon: "🤮" },
  { id: "bed-pre-11", action: "Going to bed before 11pm", points: -40, icon: "😴" },
  { id: "debate-drinks", action: "Debating chosen drinks", points: -10, icon: "🙄" },
  { id: "first-to-bed", action: "First to go to bed", points: -30, icon: "💤" },
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add convex/_seedData/challenges.ts
git commit -m "feat(convex): add seed data snapshot for challenges + negatives"
```

---

## Task 1.3: Create Convex helpers module

**Files:**
- Create: `convex/helpers.ts`

- [ ] **Step 1: Create the helpers file**

```ts
// convex/helpers.ts
// Shared helpers for auth, admin checks, gameState lookup, and derived values.
import type { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireSession(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<{ playerSlug: string }> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session) throw new Error("invalid session");
  return { playerSlug: session.playerSlug };
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  slug: string,
): Promise<void> {
  const role = await ctx.db
    .query("adminRoles")
    .withIndex("by_slug", (q) => q.eq("playerSlug", slug))
    .unique();
  if (!role) throw new Error("admin only");
}

export async function getGameState(ctx: QueryCtx | MutationCtx) {
  return await ctx.db.query("gameState").first();
}

export function deriveDifficulty(points: number): "easy" | "medium" | "wild" {
  if (points >= 70) return "wild";
  if (points >= 20) return "medium";
  return "easy";
}
```

- [ ] **Step 2: Verify the file type-checks via the next deploy**

Will be exercised by Task 1.4 — no separate test step here.

- [ ] **Step 3: Commit**

```bash
git add convex/helpers.ts
git commit -m "feat(convex): add shared helpers (requireSession, requireAdmin, deriveDifficulty, getGameState)"
```

---

## Task 1.4: Create seed mutations

**Files:**
- Create: `convex/seedChallenges.ts`

- [ ] **Step 1: Create the seed file**

```ts
// convex/seedChallenges.ts
import { internalMutation } from "./_generated/server";
import { SEED_CHALLENGES } from "./_seedData/challenges";
import { deriveDifficulty } from "./helpers";

export const seedChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const c of SEED_CHALLENGES) {
      const existing = await ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", c.challengeId))
        .unique();
      if (!existing) {
        await ctx.db.insert("challenges", {
          challengeId: c.challengeId,
          title: c.title,
          icon: c.icon,
          points: c.points,
          bonus: c.bonus,
          category: c.category,
          difficulty: deriveDifficulty(c.points),
          status: "active",
          approvedAt: now,
        });
      }
    }
  },
});

export const seedAdmins = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const slug of ["khari", "kai"]) {
      const existing = await ctx.db
        .query("adminRoles")
        .withIndex("by_slug", (q) => q.eq("playerSlug", slug))
        .unique();
      if (!existing) {
        await ctx.db.insert("adminRoles", { playerSlug: slug });
      }
    }
  },
});

export const seedGameState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("gameState").first();
    if (!existing) {
      await ctx.db.insert("gameState", {
        gamesLive: false,
        currentDayNumber: 0,
        currentDailyKey: "pre-trip",
        updatedAt: Date.now(),
      });
    }
  },
});
```

- [ ] **Step 2: Push and run the seeds**

```bash
npx convex dev --once
npx convex run seedChallenges:seedChallenges
npx convex run seedChallenges:seedAdmins
npx convex run seedChallenges:seedGameState
```

Expected: all three commands return with no output (success).

- [ ] **Step 3: Verify**

```bash
npx convex data challenges --limit 100
npx convex data adminRoles --limit 10
npx convex data gameState --limit 5
```

Expected: 35 challenge rows; 2 admin rows (khari + kai); 1 gameState row with `gamesLive: false`, `currentDayNumber: 0`, `currentDailyKey: "pre-trip"`.

- [ ] **Step 4: Commit**

```bash
git add convex/seedChallenges.ts
git commit -m "feat(convex): seed challenges, admin roles, game state"
```

---

## Task 1.5: Add gameState query for frontend

**Files:**
- Create: `convex/gameState.ts`

- [ ] **Step 1: Create the file**

```ts
// convex/gameState.ts
import { query } from "./_generated/server";
import { getGameState } from "./helpers";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await getGameState(ctx);
  },
});
```

- [ ] **Step 2: Push and verify it deploys**

```bash
npx convex dev --once
```

Expected: deploys cleanly.

- [ ] **Step 3: Commit**

```bash
git add convex/gameState.ts
git commit -m "feat(convex): expose gameState.get query"
```

---

# Phase 2 — Claim + Leaderboard (minimum viable)

Goal: Player can tap a challenge → score updates → leaderboard renders reactively. No vouching yet — that's Phase 3.

---

## Task 2.1: `entries.claim` mutation + tests

**Files:**
- Create: `convex/entries.ts`
- Create: `convex/entries.test.ts`

- [ ] **Step 1: Write the failing test file first**

```ts
// convex/entries.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedSession(t: ReturnType<typeof convexTest>, slug: string, token: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token, createdAt: Date.now() });
  });
}

async function seedGameLive(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("gameState", {
      gamesLive: true,
      currentDayNumber: 1,
      currentDailyKey: "day-1",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("challenges", {
      challengeId: "kiss-someone",
      title: "Kiss Someone",
      icon: "💋",
      points: 100,
      category: "social",
      difficulty: "wild",
      status: "active",
    });
  });
}

describe("entries.claim", () => {
  it("inserts an entry row when games are live", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);

    await t.mutation(api.entries.claim, {
      token: "tok-kai",
      challengeId: "kiss-someone",
      bonusKey: undefined,
    });

    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].subjectSlug).toBe("kai");
    expect(rows[0].points).toBe(100);
    expect(rows[0].status).toBe("active");
    expect(rows[0].dailyKey).toBe("day-1");
  });

  it("rejects when games are not live", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: false,
        currentDayNumber: 0,
        currentDailyKey: "pre-trip",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("challenges", {
        challengeId: "kiss-someone",
        title: "Kiss Someone",
        icon: "💋",
        points: 100,
        category: "social",
        difficulty: "wild",
        status: "active",
      });
    });

    await expect(
      t.mutation(api.entries.claim, {
        token: "tok-kai",
        challengeId: "kiss-someone",
        bonusKey: undefined,
      }),
    ).rejects.toThrow(/games not live/);
  });

  it("rejects with invalid session", async () => {
    const t = convexTest(schema);
    await seedGameLive(t);
    await expect(
      t.mutation(api.entries.claim, {
        token: "bogus",
        challengeId: "kiss-someone",
        bonusKey: undefined,
      }),
    ).rejects.toThrow(/invalid session/);
  });

  it("rejects unknown challenge", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    await expect(
      t.mutation(api.entries.claim, {
        token: "tok-kai",
        challengeId: "made-up",
        bonusKey: undefined,
      }),
    ).rejects.toThrow(/unknown challenge/);
  });
});
```

- [ ] **Step 2: Run the test — expect failures since `entries.ts` doesn't exist**

Run: `npx vitest run convex/entries.test.ts`
Expected: All tests fail with `Cannot find module './entries'` or similar.

- [ ] **Step 3: Implement `entries.ts`**

```ts
// convex/entries.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, getGameState } from "./helpers";

export const claim = mutation({
  args: {
    token: v.string(),
    challengeId: v.string(),
    bonusKey: v.optional(v.string()),
  },
  handler: async (ctx, { token, challengeId, bonusKey }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const state = await getGameState(ctx);
    if (!state || !state.gamesLive) throw new Error("games not live");

    const challenge = await ctx.db
      .query("challenges")
      .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
      .unique();
    if (!challenge || challenge.status !== "active") throw new Error("unknown challenge");

    let points = challenge.points;
    if (bonusKey === "crowd") points += 50;
    if (bonusKey === "money") points += 50;
    if (bonusKey === "crowd+money") points += 100;
    if (bonusKey === "everyone") points += 30;

    await ctx.db.insert("entries", {
      type: "challenge",
      subjectSlug: playerSlug,
      challengeId,
      points,
      bonusKey,
      status: "active",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run convex/entries.test.ts`
Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "feat(convex): entries.claim mutation with live-gate + bonus math"
```

---

## Task 2.2: Leaderboard queries + tests

**Files:**
- Create: `convex/leaderboard.ts`
- Create: `convex/leaderboard.test.ts`

- [ ] **Step 1: Write tests**

```ts
// convex/leaderboard.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedEntries(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const now = Date.now();
    // Khari: 100 active + 20 verified = 120 (verifiedCount = 1)
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: now });
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "y", points: 20, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: now + 1 });
    // Kai: 200 active, 30 disputed (excluded) = 200
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 200, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: now });
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "y", points: 30, status: "disputed", vouchCount: 0, disputeCount: 2, dailyKey: "day-1", createdAt: now });
    // Camara: -50 negative (verified)
    await ctx.db.insert("entries", { type: "negative", subjectSlug: "camara", negativeId: "throw-up", appliedBySlug: "kai", points: -50, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: now });
    // Day 2 entry shouldn't appear in day-1 board
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 500, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-2", createdAt: now });
  });
}

describe("leaderboard.getDaily", () => {
  it("sums entries by subject, excludes disputed, orders desc", async () => {
    const t = convexTest(schema);
    await seedEntries(t);
    const board = await t.query(api.leaderboard.getDaily, { dailyKey: "day-1" });
    expect(board.map((r) => r.slug)).toEqual(["kai", "khari", "camara"]);
    expect(board.find((r) => r.slug === "kai")?.total).toBe(200);
    expect(board.find((r) => r.slug === "khari")?.total).toBe(120);
    expect(board.find((r) => r.slug === "camara")?.total).toBe(-50);
    expect(board.find((r) => r.slug === "khari")?.verifiedCount).toBe(1);
  });

  it("uses verifiedCount as tiebreaker when totals match", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      const now = Date.now();
      // Two players with total 50, but kai has 1 verified, khari 0
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "a", points: 50, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: now });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "a", points: 50, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: now });
    });
    const board = await t.query(api.leaderboard.getDaily, { dailyKey: "day-1" });
    expect(board[0].slug).toBe("kai");
  });
});

describe("leaderboard.getHoliday", () => {
  it("aggregates across all dailyKeys, excludes disputed", async () => {
    const t = convexTest(schema);
    await seedEntries(t);
    const board = await t.query(api.leaderboard.getHoliday, {});
    expect(board.find((r) => r.slug === "khari")?.total).toBe(620); // 120 + 500
  });
});

describe("leaderboard.getRecentActivity", () => {
  it("returns most recent entries first up to limit", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      const base = Date.now();
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 1, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: base + i });
      }
    });
    const recent = await t.query(api.leaderboard.getRecentActivity, { limit: 3 });
    expect(recent.length).toBe(3);
    // Most recent first
    expect(recent[0].createdAt).toBeGreaterThan(recent[2].createdAt);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

Run: `npx vitest run convex/leaderboard.test.ts`
Expected: fails with module-not-found.

- [ ] **Step 3: Implement**

```ts
// convex/leaderboard.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

type Row = { slug: string; total: number; claimCount: number; verifiedCount: number; earliestAt: number };

function aggregate(entries: Array<{ subjectSlug: string; points: number; status: string; createdAt: number }>): Row[] {
  const map = new Map<string, Row>();
  for (const e of entries) {
    if (e.status === "disputed") continue;
    const row = map.get(e.subjectSlug) ?? { slug: e.subjectSlug, total: 0, claimCount: 0, verifiedCount: 0, earliestAt: Infinity };
    row.total += e.points;
    row.claimCount += 1;
    if (e.status === "verified") row.verifiedCount += 1;
    if (e.createdAt < row.earliestAt) row.earliestAt = e.createdAt;
    map.set(e.subjectSlug, row);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.verifiedCount !== a.verifiedCount) return b.verifiedCount - a.verifiedCount;
    return a.earliestAt - b.earliestAt;
  });
}

export const getDaily = query({
  args: { dailyKey: v.string() },
  handler: async (ctx, { dailyKey }) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", dailyKey))
      .collect();
    return aggregate(entries);
  },
});

export const getHoliday = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("entries").collect();
    return aggregate(entries);
  },
});

export const getRecentActivity = query({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db.query("entries").collect();
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  },
});
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run convex/leaderboard.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/leaderboard.ts convex/leaderboard.test.ts
git commit -m "feat(convex): leaderboard.getDaily/getHoliday/getRecentActivity queries"
```

---

## Task 2.3: `challenges.listActive` query

**Files:**
- Create: `convex/challenges.ts`
- Create: `convex/challenges.test.ts`

- [ ] **Step 1: Tests**

```ts
// convex/challenges.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("challenges.listActive", () => {
  it("returns only active challenges", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", { challengeId: "a", title: "A", icon: "🥃", points: 10, category: "drinks", difficulty: "easy", status: "active" });
      await ctx.db.insert("challenges", { challengeId: "b", title: "B", icon: "🥃", points: 100, category: "wild", difficulty: "wild", status: "retired" });
    });
    const rows = await t.query(api.challenges.listActive, {});
    expect(rows.map((r) => r.challengeId)).toEqual(["a"]);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run convex/challenges.test.ts`

- [ ] **Step 3: Implement**

```ts
// convex/challenges.ts
import { query } from "./_generated/server";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("challenges")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});
```

- [ ] **Step 4: Re-run — expect pass**

Run: `npx vitest run convex/challenges.test.ts`

- [ ] **Step 5: Commit**

```bash
git add convex/challenges.ts convex/challenges.test.ts
git commit -m "feat(convex): challenges.listActive query"
```

---

## Task 2.4: `useSession` + `useGameState` hooks

**Files:**
- Create: `src/lib/useSession.js`
- Create: `src/lib/useGameState.js`

- [ ] **Step 1: Create useSession hook**

```js
// src/lib/useSession.js
// Tiny wrapper around localStorage for the session token (set by the
// existing LoginModal flow).
import { useEffect, useState } from "react";

const KEY = "drbabyyy.session.token";

export function useSession() {
  const [token, setToken] = useState(() => localStorage.getItem(KEY) ?? null);

  useEffect(() => {
    const handler = () => setToken(localStorage.getItem(KEY) ?? null);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return token;
}

export function setSessionToken(token) {
  localStorage.setItem(KEY, token);
  window.dispatchEvent(new Event("storage"));
}

export function clearSessionToken() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("storage"));
}
```

- [ ] **Step 2: Create useGameState hook**

```js
// src/lib/useGameState.js
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useGameState() {
  const state = useQuery(api.gameState.get);
  return {
    loading: state === undefined,
    gamesLive: state?.gamesLive ?? false,
    currentDayNumber: state?.currentDayNumber ?? 0,
    currentDailyKey: state?.currentDailyKey ?? "pre-trip",
  };
}
```

- [ ] **Step 3: Audit existing login flow to wire `setSessionToken`**

Read `src/components/LoginModal.jsx`. After a successful login mutation that returns `{ token }`, call `setSessionToken(token)`. If the file already persists to localStorage under a different key, normalize on `drbabyyy.session.token`. This is a one-line edit.

- [ ] **Step 4: Commit**

```bash
git add src/lib/useSession.js src/lib/useGameState.js src/components/LoginModal.jsx
git commit -m "feat(frontend): useSession + useGameState hooks; wire LoginModal to store token"
```

---

## Task 2.5: `ChallengeCard` component

**Files:**
- Create: `src/components/ChallengeCard.jsx`

- [ ] **Step 1: Implement the card**

```jsx
// src/components/ChallengeCard.jsx
import { C } from "../data/colors.js";

const DIFFICULTY_COLOR = {
  easy: C.green,
  medium: C.gold,
  wild: C.coralDeep,
};

export default function ChallengeCard({ challenge, onClaim }) {
  return (
    <button
      type="button"
      onClick={() => onClaim(challenge)}
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${C.sandDark}`,
        background: C.white,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }}>{challenge.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: C.dark }}>{challenge.title}</div>
        {challenge.bonus && (
          <div style={{ fontSize: 12, color: C.textBody, marginTop: 2 }}>
            Bonus: {challenge.bonus}
          </div>
        )}
      </div>
      <div
        style={{
          fontWeight: 700,
          color: DIFFICULTY_COLOR[challenge.difficulty] ?? C.dark,
          alignSelf: "center",
        }}
      >
        +{challenge.points}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChallengeCard.jsx
git commit -m "feat(frontend): ChallengeCard component"
```

---

## Task 2.6: `ClaimModal` component

**Files:**
- Create: `src/components/ClaimModal.jsx`

- [ ] **Step 1: Implement**

```jsx
// src/components/ClaimModal.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";

function parseBonus(bonusText) {
  // "+50 crowd, +50 money" → [{key: "crowd", points: 50}, {key: "money", points: 50}]
  if (!bonusText) return [];
  return bonusText.split(",").map((part) => {
    const m = part.trim().match(/^\+(\d+)\s+(\w+)$/);
    if (!m) return null;
    return { key: m[2], points: Number(m[1]) };
  }).filter(Boolean);
}

export default function ClaimModal({ challenge, onClose }) {
  const token = useSession();
  const claim = useMutation(api.entries.claim);
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const bonusOpts = parseBonus(challenge.bonus);
  const bonusPoints = bonusOpts
    .filter((b) => selected.has(b.key))
    .reduce((sum, b) => sum + b.points, 0);
  const total = challenge.points + bonusPoints;

  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    const bonusKey = Array.from(selected).sort().join("+") || undefined;
    try {
      await claim({ token, challengeId: challenge.challengeId, bonusKey });
      onClose();
    } catch (err) {
      alert(err.message || "claim failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      style={{
        position: "fixed", inset: 0, background: "rgba(26,26,46,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.white, padding: 20, borderRadius: 16, maxWidth: 360, width: "100%" }}
      >
        <div style={{ fontSize: 32 }}>{challenge.icon}</div>
        <h3 style={{ margin: "8px 0 4px", color: C.dark }}>{challenge.title}</h3>
        <div style={{ color: C.textBody, marginBottom: 12 }}>+{challenge.points} base</div>

        {bonusOpts.map((b) => (
          <label key={b.key} style={{ display: "flex", gap: 8, padding: "6px 0", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selected.has(b.key)}
              onChange={() => toggle(b.key)}
            />
            <span>+{b.points} {b.key}</span>
          </label>
        ))}

        <div style={{ fontWeight: 700, margin: "12px 0", color: C.dark }}>
          Total: +{total}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8 }}>
            Cancel
          </button>
          <button
            disabled={submitting}
            onClick={handleConfirm}
            style={{ flex: 1, padding: 10, borderRadius: 8, background: C.green, color: C.white, fontWeight: 600 }}
          >
            {submitting ? "..." : "I did this"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ClaimModal.jsx
git commit -m "feat(frontend): ClaimModal with bonus toggles"
```

---

## Task 2.7: Player page — Challenges tabs

**Files:**
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Add the section**

Read `src/routes/PlayerPage.jsx` to find a good insertion point (typically below the player's bio/header). Insert this block where `slug === mySlug` (i.e. on the player's own page only):

```jsx
// ── ADD AT TOP OF FILE ─────────────────────────────────────────────
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ChallengeCard from "../components/ChallengeCard.jsx";
import ClaimModal from "../components/ClaimModal.jsx";
import { useGameState } from "../lib/useGameState.js";

// ── NEW COMPONENT BLOCK (paste inside PlayerPage, in the player-own-page branch) ──
function ChallengesSection() {
  const { gamesLive, currentDayNumber } = useGameState();
  const challenges = useQuery(api.challenges.listActive) ?? [];
  const [active, setActive] = useState(null);
  const [tab, setTab] = useState("easy");

  if (!gamesLive) {
    return (
      <section style={{ padding: 16, background: "#FEF9EF", borderRadius: 12, margin: "16px 0" }}>
        <strong>Games kick off after breakfast (Day 1).</strong>
        <p>Once Khari or Kai pulls the trigger, this is where you'll claim challenges.</p>
      </section>
    );
  }

  const byDifficulty = {
    easy: challenges.filter((c) => c.difficulty === "easy"),
    medium: challenges.filter((c) => c.difficulty === "medium"),
    wild: challenges.filter((c) => c.difficulty === "wild"),
  };

  return (
    <section style={{ margin: "16px 0" }}>
      <h2>Challenges — Day {currentDayNumber}</h2>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        {(["easy", "medium", "wild"]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setTab(d)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: tab === d ? "#1A1A2E" : "transparent",
              color: tab === d ? "#FFF" : "#1A1A2E",
              border: "1px solid #1A1A2E",
              textTransform: "capitalize",
              cursor: "pointer",
            }}
          >
            {d} ({byDifficulty[d].length})
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {byDifficulty[tab].map((c) => (
          <ChallengeCard key={c.challengeId} challenge={c} onClaim={setActive} />
        ))}
      </div>
      {active && <ClaimModal challenge={active} onClose={() => setActive(null)} />}
    </section>
  );
}
```

Then render `<ChallengesSection />` in the body of the player's own page (the branch where the user is viewing their own profile — there should be an `isMe` or `mySlug === slug` check already; if not, add it using the `useSession` token lookup against `playerSlug`).

- [ ] **Step 2: Manually verify in browser**

Run: `npm run dev`
Then log in as Kai, visit `/player/kai`. Confirm:
- Pre-rollover: see "Games kick off after breakfast" notice.
- After hitting `npx convex run rollovers:trigger` (Phase 5 will provide the button — for now, manually toggle gameState via the Convex dashboard: set `gamesLive` to true, `currentDayNumber` to 1, `currentDailyKey` to "day-1"): see the Easy/Medium/Wild tabs and the challenges grid.
- Tap a challenge → modal opens → confirm → modal closes, no error.

- [ ] **Step 3: Commit**

```bash
git add src/routes/PlayerPage.jsx
git commit -m "feat(frontend): challenges tabs on PlayerPage with claim flow"
```

---

## Task 2.8: LeaderboardPage + route

**Files:**
- Create: `src/routes/LeaderboardPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create LeaderboardPage**

```jsx
// src/routes/LeaderboardPage.jsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGameState } from "../lib/useGameState.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function playerByslug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

function BoardRow({ row, rank }) {
  const p = playerByslug(row.slug);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
      borderBottom: `1px solid ${C.sandDark}`,
    }}>
      <div style={{ width: 28, textAlign: "right", color: C.textBody }}>{rank}.</div>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: p?.color ?? C.sand,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.white,
      }}>
        {p?.emoji ?? "?"}
      </div>
      <div style={{ flex: 1, fontWeight: 600 }}>{p?.name ?? row.slug}</div>
      <div style={{ fontSize: 12, color: C.textBody }}>
        {row.claimCount} claims · {row.verifiedCount} 🛡
      </div>
      <div style={{ fontWeight: 700, color: row.total >= 0 ? C.green : C.coralDeep, minWidth: 60, textAlign: "right" }}>
        {row.total >= 0 ? "+" : ""}{row.total}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState("daily");
  const { currentDailyKey, currentDayNumber, gamesLive } = useGameState();
  const daily = useQuery(api.leaderboard.getDaily, { dailyKey: currentDailyKey }) ?? [];
  const holiday = useQuery(api.leaderboard.getHoliday, {}) ?? [];
  const rows = tab === "daily" ? daily : holiday;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ margin: 0 }}>Leaderboard</h1>
      <div style={{ color: C.textBody, margin: "4px 0 16px" }}>
        {gamesLive ? `Day ${currentDayNumber}` : "Games not live yet"}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["daily", "Today"], ["holiday", "Holiday"]].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              flex: 1, padding: 10, borderRadius: 8,
              background: tab === k ? C.dark : "transparent",
              color: tab === k ? C.white : C.dark,
              border: `1px solid ${C.dark}`,
              cursor: "pointer", fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: C.white, borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: C.textBody }}>
            No claims yet
          </div>
        ) : (
          rows.map((row, i) => <BoardRow key={row.slug} row={row} rank={i + 1} />)
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add route in `src/App.jsx`**

Edit `src/App.jsx` — add the import and the route:

```jsx
// ADD IMPORT
import LeaderboardPage from "./routes/LeaderboardPage.jsx";

// ADD ROUTE inside <Routes>
<Route path="/leaderboard" element={<LeaderboardPage />} />
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`
Visit `http://localhost:5173/leaderboard`. Expect: page renders. If you've claimed challenges in Task 2.7, expect rows. Switch tabs Today / Holiday.

- [ ] **Step 4: Commit**

```bash
git add src/routes/LeaderboardPage.jsx src/App.jsx
git commit -m "feat(frontend): LeaderboardPage + /leaderboard route"
```

---

# Phase 3 — Vouch + Dispute

Goal: Any other player can verify or dispute an entry from the Recent Activity strip on `/leaderboard`. 1 vouch → verified. 2 disputes → disputed (points removed).

---

## Task 3.1: `entries.vouch` mutation + tests

**Files:**
- Modify: `convex/entries.ts`
- Modify: `convex/entries.test.ts`

- [ ] **Step 1: Add tests to `entries.test.ts`**

Append to the existing file:

```ts
describe("entries.vouch", () => {
  it("increments vouchCount and flips status to verified at 1 vouch", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId });
    const after = await t.run((ctx) => ctx.db.get(entryId));
    expect(after?.status).toBe("verified");
    expect(after?.vouchCount).toBe(1);
  });

  it("rejects self-vouch", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await expect(t.mutation(api.entries.vouch, { token: "tok-kai", entryId }))
      .rejects.toThrow(/cannot react to own entry/);
  });

  it("rejects double vouch by same player", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId });
    await expect(t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId }))
      .rejects.toThrow(/already reacted/);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run convex/entries.test.ts`

- [ ] **Step 3: Implement — append to `convex/entries.ts`**

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

export const vouch = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug === playerSlug) throw new Error("cannot react to own entry");

    const existing = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry_and_player", (q) => q.eq("entryId", entryId).eq("playerSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already reacted");

    await ctx.db.insert("entryReactions", { entryId, playerSlug, reaction: "vouch", at: Date.now() });

    const newCount = entry.vouchCount + 1;
    const patch: Record<string, any> = { vouchCount: newCount };
    if (entry.status === "active" && newCount >= 1) {
      patch.status = "verified";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(entryId, patch);
  },
});
```

- [ ] **Step 4: Re-run tests — expect pass**

Run: `npx vitest run convex/entries.test.ts`

- [ ] **Step 5: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "feat(convex): entries.vouch mutation (1 vouch → verified)"
```

---

## Task 3.2: `entries.dispute` mutation + tests

**Files:**
- Modify: `convex/entries.ts`
- Modify: `convex/entries.test.ts`

- [ ] **Step 1: Add tests**

Append to `entries.test.ts`:

```ts
describe("entries.dispute", () => {
  it("flips to disputed after 2 disputes", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    await seedSession(t, "camara", "tok-camara");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.dispute, { token: "tok-kyanna", entryId });
    let after = await t.run((ctx) => ctx.db.get(entryId));
    expect(after?.status).toBe("active");
    expect(after?.disputeCount).toBe(1);

    await t.mutation(api.entries.dispute, { token: "tok-camara", entryId });
    after = await t.run((ctx) => ctx.db.get(entryId));
    expect(after?.status).toBe("disputed");
    expect(after?.disputeCount).toBe(2);
  });

  it("rejects dispute on already-verified entry (no-op path)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.dispute, { token: "tok-kyanna", entryId });
    const after = await t.run((ctx) => ctx.db.get(entryId));
    // verified is final; disputeCount still increments but status stays verified
    expect(after?.status).toBe("verified");
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx vitest run convex/entries.test.ts`

- [ ] **Step 3: Implement — append to `convex/entries.ts`**

```ts
export const dispute = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug === playerSlug) throw new Error("cannot react to own entry");

    const existing = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry_and_player", (q) => q.eq("entryId", entryId).eq("playerSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already reacted");

    await ctx.db.insert("entryReactions", { entryId, playerSlug, reaction: "dispute", at: Date.now() });

    const newCount = entry.disputeCount + 1;
    const patch: Record<string, any> = { disputeCount: newCount };
    if (entry.status === "active" && newCount >= 2) {
      patch.status = "disputed";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(entryId, patch);
  },
});
```

- [ ] **Step 4: Re-run — expect pass**

Run: `npx vitest run convex/entries.test.ts`

- [ ] **Step 5: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "feat(convex): entries.dispute mutation (2 disputes → disputed)"
```

---

## Task 3.3: `getRecentActivity` returns reaction state per entry

**Files:**
- Modify: `convex/leaderboard.ts`
- Modify: `convex/leaderboard.test.ts`

The earlier `getRecentActivity` returned raw entries. Enrich each with `myReaction` so the UI can hide buttons the user has already pressed.

- [ ] **Step 1: Add test**

Append to `leaderboard.test.ts`:

```ts
describe("leaderboard.getRecentActivity with token", () => {
  it("annotates entries with myReaction", async () => {
    const t = convexTest(schema);
    let entryId: any;
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kai", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "kai", token: "tok-kai", createdAt: Date.now() });
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entryReactions", { entryId, playerSlug: "kai", reaction: "vouch", at: Date.now() });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10, token: "tok-kai" });
    expect(rows[0].myReaction).toBe("vouch");
  });
});
```

- [ ] **Step 2: Update implementation**

Edit `convex/leaderboard.ts`. Replace the `getRecentActivity` definition:

```ts
export const getRecentActivity = query({
  args: { limit: v.number(), token: v.optional(v.string()) },
  handler: async (ctx, { limit, token }) => {
    const all = await ctx.db.query("entries").collect();
    const sorted = all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);

    let mySlug: string | null = null;
    if (token) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      mySlug = session?.playerSlug ?? null;
    }

    return await Promise.all(sorted.map(async (e) => {
      let myReaction: "vouch" | "dispute" | null = null;
      if (mySlug) {
        const reaction = await ctx.db
          .query("entryReactions")
          .withIndex("by_entry_and_player", (q) => q.eq("entryId", e._id).eq("playerSlug", mySlug!))
          .unique();
        myReaction = reaction?.reaction ?? null;
      }
      return { ...e, myReaction };
    }));
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/leaderboard.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/leaderboard.ts convex/leaderboard.test.ts
git commit -m "feat(convex): annotate recent activity with viewer's reaction"
```

---

## Task 3.4: `EntryRow` component

**Files:**
- Create: `src/components/EntryRow.jsx`

- [ ] **Step 1: Implement**

```jsx
// src/components/EntryRow.jsx
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function playerName(slug) {
  return PLAYERS.find((p) => p.slug === slug)?.name ?? slug;
}

export default function EntryRow({ entry }) {
  const token = useSession();
  const vouch = useMutation(api.entries.vouch);
  const dispute = useMutation(api.entries.dispute);
  const challenges = useQuery(api.challenges.listActive) ?? [];

  const challenge = entry.challengeId ? challenges.find((c) => c.challengeId === entry.challengeId) : null;
  const isMine = false; // page-level filter usually excludes own rows; safe fallback
  const canReact = !entry.myReaction && entry.status === "active";

  const label = entry.type === "challenge"
    ? `${playerName(entry.subjectSlug)} claimed: ${challenge?.title ?? entry.challengeId} (${entry.points >= 0 ? "+" : ""}${entry.points})`
    : `${playerName(entry.subjectSlug)} got fouled: ${entry.negativeId} (${entry.points})`;

  const badge = entry.status === "verified" ? "🛡" : entry.status === "disputed" ? "⚠️" : null;

  return (
    <div style={{
      padding: 10,
      borderBottom: `1px solid ${C.sandDark}`,
      opacity: entry.status === "disputed" ? 0.5 : 1,
    }}>
      <div style={{
        textDecoration: entry.status === "disputed" ? "line-through" : "none",
      }}>
        {label} {badge}
      </div>
      {canReact && !isMine && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button onClick={() => vouch({ token, entryId: entry._id })}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.green, color: C.white, border: 0 }}>
            ✓ I saw it
          </button>
          <button onClick={() => dispute({ token, entryId: entry._id })}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.coralDeep, color: C.white, border: 0 }}>
            ✗ Didn't happen
          </button>
        </div>
      )}
      {entry.myReaction && (
        <div style={{ fontSize: 11, color: C.textBody, marginTop: 4 }}>
          You {entry.myReaction === "vouch" ? "vouched" : "disputed"} this
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EntryRow.jsx
git commit -m "feat(frontend): EntryRow with vouch/dispute buttons"
```

---

## Task 3.5: Recent Activity strip on LeaderboardPage

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

- [ ] **Step 1: Add the strip below the existing board**

Edit `src/routes/LeaderboardPage.jsx`. Add the import:

```jsx
import EntryRow from "../components/EntryRow.jsx";
import { useSession } from "../lib/useSession.js";
```

Inside the component body, after `holiday`:

```jsx
const token = useSession();
const activity = useQuery(api.leaderboard.getRecentActivity, { limit: 12, token: token ?? undefined }) ?? [];
```

Then below the board JSX:

```jsx
<section style={{ marginTop: 24 }}>
  <h2 style={{ fontSize: 18 }}>Recent activity</h2>
  <div style={{ background: C.white, borderRadius: 12, overflow: "hidden" }}>
    {activity.length === 0
      ? <div style={{ padding: 20, textAlign: "center", color: C.textBody }}>Nothing yet</div>
      : activity.map((e) => <EntryRow key={e._id} entry={e} />)}
  </div>
</section>
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`. Visit `/leaderboard`. Confirm recent activity shows entries with reaction buttons that disappear after pressing.

- [ ] **Step 3: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "feat(frontend): recent activity strip on leaderboard with vouch/dispute"
```

---

## Task 3.6: Verified/disputed badges on PlayerPage

**Files:**
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Add a "My recent claims" panel on the player's own page**

Inside `ChallengesSection` (from Task 2.7), append:

```jsx
import { useSession } from "../lib/useSession.js";

// inside the component, alongside the existing queries:
const token = useSession();
const activity = useQuery(api.leaderboard.getRecentActivity, { limit: 50, token: token ?? undefined }) ?? [];
const mySlug = /* derive from token via a query or pass down from parent */;
const mine = activity.filter((e) => e.subjectSlug === mySlug);

// ...and add a section below the challenges grid:
<section style={{ marginTop: 16 }}>
  <h3>My recent</h3>
  {mine.map((e) => (
    <div key={e._id} style={{ padding: 8, borderBottom: "1px solid #F5EDE0" }}>
      {e.challengeId ?? e.negativeId} — {e.points >= 0 ? "+" : ""}{e.points}{" "}
      {e.status === "verified" && "🛡"}
      {e.status === "disputed" && <span style={{ textDecoration: "line-through", opacity: 0.5 }}>(removed)</span>}
    </div>
  ))}
</section>
```

For `mySlug`: the simplest approach is to add an `auth.whoami` query that returns `{ playerSlug }` for a given token. Add it to `convex/auth.ts`:

```ts
export const whoami = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    return session ? { playerSlug: session.playerSlug } : null;
  },
});
```

Then in `ChallengesSection`:

```jsx
const me = useQuery(api.auth.whoami, token ? { token } : "skip");
const mySlug = me?.playerSlug;
```

- [ ] **Step 2: Manually verify**

Make a claim as Kai, then verify as Kyanna. Kai's player page should show 🛡 next to his claim.

- [ ] **Step 3: Commit**

```bash
git add src/routes/PlayerPage.jsx convex/auth.ts
git commit -m "feat(frontend): verified/disputed badges on PlayerPage; auth.whoami query"
```

---

# Phase 4 — Negative Points (Foul Logging)

Goal: Any player can log one of the 4 negative-point actions on any other player's page.

---

## Task 4.1: `entries.logNegative` mutation + tests

**Files:**
- Modify: `convex/entries.ts`
- Modify: `convex/entries.test.ts`

- [ ] **Step 1: Add tests**

```ts
describe("entries.logNegative", () => {
  it("inserts a negative entry with appliedBySlug", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    await t.mutation(api.entries.logNegative, {
      token: "tok-kai",
      subjectSlug: "camara",
      negativeId: "throw-up",
    });
    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("negative");
    expect(rows[0].subjectSlug).toBe("camara");
    expect(rows[0].appliedBySlug).toBe("kai");
    expect(rows[0].points).toBe(-50);
  });

  it("rejects self-foul", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    await expect(t.mutation(api.entries.logNegative, {
      token: "tok-kai",
      subjectSlug: "kai",
      negativeId: "throw-up",
    })).rejects.toThrow(/cannot foul yourself/);
  });

  it("rejects unknown negativeId", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    await expect(t.mutation(api.entries.logNegative, {
      token: "tok-kai",
      subjectSlug: "camara",
      negativeId: "made-up",
    })).rejects.toThrow(/unknown negative action/);
  });
});
```

- [ ] **Step 2: Implement — append to `convex/entries.ts`**

```ts
import { NEGATIVE_POINTS_CONST } from "./_seedData/challenges";

export const logNegative = mutation({
  args: { token: v.string(), subjectSlug: v.string(), negativeId: v.string() },
  handler: async (ctx, { token, subjectSlug, negativeId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    if (subjectSlug === playerSlug) throw new Error("cannot foul yourself");
    const state = await getGameState(ctx);
    if (!state || !state.gamesLive) throw new Error("games not live");

    const def = NEGATIVE_POINTS_CONST.find((n) => n.id === negativeId);
    if (!def) throw new Error("unknown negative action");

    await ctx.db.insert("entries", {
      type: "negative",
      subjectSlug,
      appliedBySlug: playerSlug,
      negativeId,
      points: def.points,
      status: "active",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 3: Run tests — expect pass**

Run: `npx vitest run convex/entries.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "feat(convex): entries.logNegative mutation (witness-applied fouls)"
```

---

## Task 4.2: `FoulModal` component

**Files:**
- Create: `src/components/FoulModal.jsx`

- [ ] **Step 1: Implement**

```jsx
// src/components/FoulModal.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";

const NEGATIVES = [
  { id: "throw-up", action: "Throwing up", points: -50, icon: "🤮" },
  { id: "bed-pre-11", action: "Going to bed before 11pm", points: -40, icon: "😴" },
  { id: "debate-drinks", action: "Debating chosen drinks", points: -10, icon: "🙄" },
  { id: "first-to-bed", action: "First to go to bed", points: -30, icon: "💤" },
];

export default function FoulModal({ targetSlug, targetName, onClose }) {
  const token = useSession();
  const logNegative = useMutation(api.entries.logNegative);
  const [submitting, setSubmitting] = useState(null);

  const apply = async (negativeId) => {
    setSubmitting(negativeId);
    try {
      await logNegative({ token, subjectSlug: targetSlug, negativeId });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div role="dialog"
      style={{ position: "fixed", inset: 0, background: "rgba(26,26,46,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.white, padding: 20, borderRadius: 16, maxWidth: 360, width: "100%" }}>
        <h3 style={{ marginTop: 0 }}>{targetName} — Log a foul</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {NEGATIVES.map((n) => (
            <button key={n.id} disabled={submitting !== null} onClick={() => apply(n.id)}
              style={{
                padding: 12, borderRadius: 8, textAlign: "left",
                background: submitting === n.id ? C.sandDark : C.sand,
                border: `1px solid ${C.sandDark}`, display: "flex", justifyContent: "space-between",
              }}>
              <span>{n.icon} {n.action}</span>
              <strong style={{ color: C.coralDeep }}>{n.points}</strong>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 8 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FoulModal.jsx
git commit -m "feat(frontend): FoulModal for logging negatives on someone else"
```

---

## Task 4.3: "Log a foul" button on others' player pages

**Files:**
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Add the button on the branch where `slug !== mySlug`**

In `PlayerPage.jsx`, when viewing someone else's page (`slug !== mySlug`), render below their bio:

```jsx
import FoulModal from "../components/FoulModal.jsx";

// In the not-my-own-page branch:
const [foulOpen, setFoulOpen] = useState(false);
// ...
<button
  onClick={() => setFoulOpen(true)}
  style={{
    marginTop: 16, padding: "8px 16px", borderRadius: 8,
    background: "#FF6B6B", color: "#FFF", border: 0, fontWeight: 600,
  }}
>
  Log a foul on {playerName}
</button>
{foulOpen && (
  <FoulModal targetSlug={slug} targetName={playerName} onClose={() => setFoulOpen(false)} />
)}
```

- [ ] **Step 2: Manually verify**

Log in as Kai, visit `/player/camara`. Tap "Log a foul on Camara". Pick "Throwing up". Visit `/leaderboard` — Camara should show -50.

- [ ] **Step 3: Commit**

```bash
git add src/routes/PlayerPage.jsx
git commit -m "feat(frontend): Log a foul button on other players' pages"
```

---

## Task 4.4: Verify negatives flow through vouch/dispute too

**Files:**
- Modify: `convex/entries.test.ts` (sanity test only)

- [ ] **Step 1: Add a regression test**

```ts
describe("entries.vouch on a negative", () => {
  it("flips a negative entry to verified after 1 vouch", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "negative", subjectSlug: "camara", appliedBySlug: "kai", negativeId: "throw-up", points: -50, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId });
    const after = await t.run((ctx) => ctx.db.get(entryId));
    expect(after?.status).toBe("verified");
  });
});
```

- [ ] **Step 2: Run tests — expect pass with no code changes**

Run: `npx vitest run convex/entries.test.ts`
Expected: all tests pass; this validates the vouch path works on negatives too.

- [ ] **Step 3: Commit**

```bash
git add convex/entries.test.ts
git commit -m "test(convex): regression — vouch works on negative entries too"
```

---

# Phase 5 — Admin + Rollover

Goal: Khari and Kai have an admin page where they trigger rollovers, draft suggestions, and (rarely) reverse mistakes. The first-ever rollover unlocks the games.

---

## Task 5.1: `admin.isAdmin` query

**Files:**
- Modify: `convex/admin.ts`

- [ ] **Step 1: Append to existing `convex/admin.ts`**

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const isAdmin = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return false;
    const role = await ctx.db
      .query("adminRoles")
      .withIndex("by_slug", (q) => q.eq("playerSlug", session.playerSlug))
      .unique();
    return role !== null;
  },
});
```

- [ ] **Step 2: Add quick test**

In `convex/admin.test.ts`, add:

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("admin.isAdmin", () => {
  it("returns true for admin slugs", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-k", createdAt: Date.now() });
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
    });
    expect(await t.query(api.admin.isAdmin, { token: "tok-k" })).toBe(true);
  });

  it("returns false for non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "camara", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "camara", token: "tok-c", createdAt: Date.now() });
    });
    expect(await t.query(api.admin.isAdmin, { token: "tok-c" })).toBe(false);
  });
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/admin.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/admin.ts convex/admin.test.ts
git commit -m "feat(convex): admin.isAdmin query"
```

---

## Task 5.2: `rollovers.trigger` mutation + tests

**Files:**
- Create: `convex/rollovers.ts`
- Create: `convex/rollovers.test.ts`

- [ ] **Step 1: Tests**

```ts
// convex/rollovers.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function setupAdmins(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    for (const slug of ["khari", "kai"]) {
      await ctx.db.insert("players", { slug, passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      await ctx.db.insert("adminRoles", { playerSlug: slug });
    }
    await ctx.db.insert("players", { slug: "camara", passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: "camara", token: "tok-camara", createdAt: Date.now() });
    await ctx.db.insert("gameState", {
      gamesLive: false, currentDayNumber: 0, currentDailyKey: "pre-trip", updatedAt: Date.now(),
    });
  });
}

describe("rollovers.trigger", () => {
  it("first trigger by admin sets gamesLive and day 1", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.gamesLive).toBe(true);
    expect(state?.currentDayNumber).toBe(1);
    expect(state?.currentDailyKey).toBe("day-1");
    const rows = await t.run((ctx) => ctx.db.query("rollovers").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].dayNumber).toBe(1);
    expect(rows[0].loserSlug).toBeUndefined();
  });

  it("second trigger computes loser and bumps day", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    // Seed some day-1 entries
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "negative", subjectSlug: "camara", negativeId: "throw-up", appliedBySlug: "kai", points: -50, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.trigger, { token: "tok-kai" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(2);
    expect(state?.currentDailyKey).toBe("day-2");
    const rows = await t.run((ctx) => ctx.db.query("rollovers").collect());
    const day1 = rows.find((r) => r.dayNumber === 1);
    expect(day1?.loserSlug).toBe("camara");
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await expect(t.mutation(api.rollovers.trigger, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
  });
});
```

- [ ] **Step 2: Implement `convex/rollovers.ts`**

```ts
// convex/rollovers.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin, getGameState } from "./helpers";

function nextDailyKey(dayNumber: number) {
  return `day-${dayNumber}`;
}

export const trigger = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const now = Date.now();

    if (!state.gamesLive) {
      // First-ever trigger: unlock games as Day 1, no loser.
      await ctx.db.patch(state._id, {
        gamesLive: true,
        currentDayNumber: 1,
        currentDailyKey: "day-1",
        updatedAt: now,
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1,
        dailyKey: "day-1",
        triggeredBySlug: playerSlug,
        triggeredAt: now,
      });
      return;
    }

    // Subsequent rollover — close current day, compute loser, bump day.
    const closingKey = state.currentDailyKey;
    const closingDay = state.currentDayNumber;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", closingKey))
      .collect();

    const totals = new Map<string, number>();
    for (const e of entries) {
      if (e.status === "disputed") continue;
      totals.set(e.subjectSlug, (totals.get(e.subjectSlug) ?? 0) + e.points);
    }
    let loserSlug: string | undefined;
    let loserTotal = Infinity;
    for (const [slug, total] of totals.entries()) {
      if (total < loserTotal) {
        loserSlug = slug;
        loserTotal = total;
      }
    }

    await ctx.db.insert("rollovers", {
      dayNumber: closingDay,
      dailyKey: closingKey,
      triggeredBySlug: playerSlug,
      triggeredAt: now,
      loserSlug,
    });

    const newDay = closingDay + 1;
    await ctx.db.patch(state._id, {
      currentDayNumber: newDay,
      currentDailyKey: nextDailyKey(newDay),
      updatedAt: now,
    });
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/rollovers.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts
git commit -m "feat(convex): rollovers.trigger (admin-only; kickoff & subsequent days)"
```

---

## Task 5.3: `rollovers.recordForfeit` + `get` + tests

**Files:**
- Modify: `convex/rollovers.ts`
- Modify: `convex/rollovers.test.ts`

- [ ] **Step 1: Add tests**

Append:

```ts
describe("rollovers.recordForfeit", () => {
  it("records the forfeit on a rollover row", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // kickoff Day 1
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // close Day 1, now on Day 2
    const day1 = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    await t.mutation(api.rollovers.recordForfeit, {
      token: "tok-khari",
      rolloverId: day1!._id,
      forfeitId: "cold-shower",
      forfeitLabel: "Cold shower (1 min)",
    });
    const after = await t.run((ctx) => ctx.db.get(day1!._id));
    expect(after?.forfeitId).toBe("cold-shower");
  });

  it("rejects re-spin (forfeitId already set)", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    const day1 = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    await t.mutation(api.rollovers.recordForfeit, {
      token: "tok-khari", rolloverId: day1!._id, forfeitId: "wax", forfeitLabel: "Wax",
    });
    await expect(t.mutation(api.rollovers.recordForfeit, {
      token: "tok-khari", rolloverId: day1!._id, forfeitId: "chili", forfeitLabel: "Chili",
    })).rejects.toThrow(/forfeit already recorded/);
  });
});

describe("rollovers.get", () => {
  it("returns the rollover row for the given dayNumber", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    const r = await t.query(api.rollovers.get, { dayNumber: 1 });
    expect(r?.dayNumber).toBe(1);
  });
});
```

- [ ] **Step 2: Implement — append to `convex/rollovers.ts`**

```ts
export const recordForfeit = mutation({
  args: {
    token: v.string(),
    rolloverId: v.id("rollovers"),
    forfeitId: v.string(),
    forfeitLabel: v.string(),
  },
  handler: async (ctx, { token, rolloverId, forfeitId, forfeitLabel }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const row = await ctx.db.get(rolloverId);
    if (!row) throw new Error("unknown rollover");
    if (row.forfeitId) throw new Error("forfeit already recorded");
    await ctx.db.patch(rolloverId, {
      forfeitId,
      forfeitLabel,
      spunAt: Date.now(),
    });
  },
});

export const get = query({
  args: { dayNumber: v.number() },
  handler: async (ctx, { dayNumber }) => {
    return await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", dayNumber))
      .unique();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rollovers").collect();
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/rollovers.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts
git commit -m "feat(convex): rollovers.recordForfeit, rollovers.get, rollovers.listAll"
```

---

## Task 5.4: `rollovers.undoLast` mutation + tests

**Files:**
- Modify: `convex/rollovers.ts`
- Modify: `convex/rollovers.test.ts`

- [ ] **Step 1: Add test**

```ts
describe("rollovers.undoLast", () => {
  it("removes the most recent rollover and reverses gameState", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // Day 1 kickoff
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // close Day 1, now Day 2
    await t.mutation(api.rollovers.undoLast, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(1);
    expect(state?.currentDailyKey).toBe("day-1");
    const rows = await t.run((ctx) => ctx.db.query("rollovers").collect());
    expect(rows.length).toBe(1); // only the kickoff remains
  });

  it("undoLast on the kickoff returns to pre-trip", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.mutation(api.rollovers.undoLast, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.gamesLive).toBe(false);
    expect(state?.currentDayNumber).toBe(0);
    expect(state?.currentDailyKey).toBe("pre-trip");
  });
});
```

- [ ] **Step 2: Implement — append**

```ts
export const undoLast = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const all = await ctx.db.query("rollovers").collect();
    if (all.length === 0) throw new Error("no rollovers to undo");
    const last = all.sort((a, b) => b.dayNumber - a.dayNumber)[0];

    await ctx.db.delete(last._id);

    if (last.dayNumber === 1) {
      // Undoing the kickoff → back to pre-trip
      await ctx.db.patch(state._id, {
        gamesLive: false,
        currentDayNumber: 0,
        currentDailyKey: "pre-trip",
        updatedAt: Date.now(),
      });
    } else {
      // Undoing day N → back to day N-1
      await ctx.db.patch(state._id, {
        currentDayNumber: last.dayNumber,
        currentDailyKey: `day-${last.dayNumber}`,
        updatedAt: Date.now(),
      });
    }
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/rollovers.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts
git commit -m "feat(convex): rollovers.undoLast — admin can reverse a mistaken rollover"
```

---

## Task 5.5: `challenges.retire` mutation (admin) + tests

**Files:**
- Modify: `convex/challenges.ts`
- Modify: `convex/challenges.test.ts`

- [ ] **Step 1: Add tests**

```ts
describe("challenges.retire", () => {
  it("flips an active challenge to retired (admin only)", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-khari", createdAt: Date.now() });
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("challenges", { challengeId: "tat", title: "Tattoo", icon: "🖋️", points: 250, category: "wild", difficulty: "wild", status: "active" });
    });
    await t.mutation(api.challenges.retire, { token: "tok-khari", challengeId: "tat" });
    const c = await t.run((ctx) =>
      ctx.db.query("challenges").withIndex("by_challenge_id", (q) => q.eq("challengeId", "tat")).unique());
    expect(c?.status).toBe("retired");
  });
});
```

- [ ] **Step 2: Implement — append to `convex/challenges.ts`**

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

export const retire = mutation({
  args: { token: v.string(), challengeId: v.string() },
  handler: async (ctx, { token, challengeId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const c = await ctx.db
      .query("challenges")
      .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
      .unique();
    if (!c) throw new Error("unknown challenge");
    await ctx.db.patch(c._id, { status: "retired" });
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/challenges.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/challenges.ts convex/challenges.test.ts
git commit -m "feat(convex): challenges.retire (admin-only)"
```

---

## Task 5.6: AdminPage + route + gate

**Files:**
- Create: `src/routes/AdminPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create AdminPage**

```jsx
// src/routes/AdminPage.jsx
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";

export default function AdminPage() {
  const token = useSession();
  const navigate = useNavigate();
  const isAdmin = useQuery(api.admin.isAdmin, token ? { token } : "skip");
  const state = useGameState();
  const trigger = useMutation(api.rollovers.trigger);
  const undoLast = useMutation(api.rollovers.undoLast);

  if (isAdmin === undefined) return <div style={{ padding: 24 }}>Loading…</div>;
  if (isAdmin === false) return <div style={{ padding: 24 }}>Admins only. Nice try.</div>;

  const handleRollover = async () => {
    const label = state.gamesLive
      ? `Lock Day ${state.currentDayNumber}, reveal the loser, and start Day ${state.currentDayNumber + 1}?`
      : "Start the games (Day 1)?";
    if (!confirm(label)) return;
    try {
      await trigger({ token });
      if (state.gamesLive) navigate(`/punishment-reveal?day=${state.currentDayNumber}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUndo = async () => {
    if (!confirm("Undo the last rollover? This deletes the most recent rollover row.")) return;
    try { await undoLast({ token }); } catch (err) { alert(err.message); }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1>Admin Console</h1>

      <section style={{ padding: 16, background: C.white, borderRadius: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Game state</h3>
        <div>Status: {state.gamesLive ? `● LIVE (Day ${state.currentDayNumber})` : "○ Pre-trip"}</div>
        <button onClick={handleRollover}
          style={{ marginTop: 12, padding: 12, width: "100%", borderRadius: 8, background: C.green, color: C.white, border: 0, fontWeight: 700 }}>
          {state.gamesLive ? `Trigger rollover → Day ${state.currentDayNumber + 1}` : "Start the games"}
        </button>
      </section>

      <section style={{ padding: 16, background: C.white, borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>Edge actions</h3>
        <button onClick={handleUndo}
          style={{ padding: 10, width: "100%", borderRadius: 8, border: `1px solid ${C.coralDeep}`, color: C.coralDeep, background: "transparent" }}>
          Undo last rollover
        </button>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add the route**

In `src/App.jsx`:

```jsx
import AdminPage from "./routes/AdminPage.jsx";
// ...
<Route path="/admin" element={<AdminPage />} />
```

- [ ] **Step 3: Manually verify**

Log in as Khari. Visit `/admin`. Confirm:
- Page renders.
- Tap "Start the games" → confirm → games go live.
- Tap "Trigger rollover → Day 2" → confirm → redirects to `/punishment-reveal?day=1` (which doesn't exist yet — 404 is expected; Phase 7 builds it).
- Log out, log in as Camara, visit `/admin` → see "Admins only" message.

- [ ] **Step 4: Commit**

```bash
git add src/routes/AdminPage.jsx src/App.jsx
git commit -m "feat(frontend): AdminPage with rollover + undo buttons (admin-gated)"
```

---

# Phase 6 — Suggestions

Goal: Any player can propose a new challenge by title. Admins draft (assign points + category). Group votes; 5 yes = approved + auto-promoted to live challenge.

---

## Task 6.1: `suggestions.create` mutation + tests

**Files:**
- Create: `convex/suggestions.ts`
- Create: `convex/suggestions.test.ts`

- [ ] **Step 1: Tests**

```ts
// convex/suggestions.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t: ReturnType<typeof convexTest>, slug: string, isAdmin = false) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    if (isAdmin) await ctx.db.insert("adminRoles", { playerSlug: slug });
  });
}

describe("suggestions.create", () => {
  it("creates a proposed suggestion", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "justin");
    await t.mutation(api.suggestions.create, { token: "tok-justin", title: "Drink from a coconut" });
    const rows = await t.run((ctx) => ctx.db.query("suggestions").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe("Drink from a coconut");
    expect(rows[0].proposerSlug).toBe("justin");
    expect(rows[0].status).toBe("proposed");
  });

  it("rejects empty title", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "justin");
    await expect(t.mutation(api.suggestions.create, { token: "tok-justin", title: "  " }))
      .rejects.toThrow(/title required/);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// convex/suggestions.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin, deriveDifficulty } from "./helpers";

const APPROVE_THRESHOLD = 5;
const REJECT_THRESHOLD = 5;

export const create = mutation({
  args: { token: v.string(), title: v.string(), icon: v.optional(v.string()) },
  handler: async (ctx, { token, title, icon }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = title.trim();
    if (cleaned.length === 0) throw new Error("title required");
    await ctx.db.insert("suggestions", {
      proposerSlug: playerSlug,
      title: cleaned,
      icon,
      status: "proposed",
      yesCount: 0,
      noCount: 0,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/suggestions.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/suggestions.ts convex/suggestions.test.ts
git commit -m "feat(convex): suggestions.create"
```

---

## Task 6.2: `suggestions.draft` (admin) + tests

**Files:**
- Modify: `convex/suggestions.ts`
- Modify: `convex/suggestions.test.ts`

- [ ] **Step 1: Tests**

```ts
describe("suggestions.draft", () => {
  it("admin sets points/category, transitions to voting", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "justin");
    await seedPlayer(t, "khari", true);
    await t.mutation(api.suggestions.create, { token: "tok-justin", title: "Coconut" });
    const s = await t.run((ctx) => ctx.db.query("suggestions").first());
    await t.mutation(api.suggestions.draft, {
      token: "tok-khari",
      suggestionId: s!._id,
      points: 25,
      category: "chill",
      icon: "🥥",
    });
    const after = await t.run((ctx) => ctx.db.get(s!._id));
    expect(after?.status).toBe("voting");
    expect(after?.points).toBe(25);
    expect(after?.difficulty).toBe("medium");
  });

  it("non-admin cannot draft", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "justin");
    await seedPlayer(t, "camara");
    await t.mutation(api.suggestions.create, { token: "tok-justin", title: "X" });
    const s = await t.run((ctx) => ctx.db.query("suggestions").first());
    await expect(t.mutation(api.suggestions.draft, {
      token: "tok-camara", suggestionId: s!._id, points: 10, category: "chill",
    })).rejects.toThrow(/admin only/);
  });
});
```

- [ ] **Step 2: Implement — append**

```ts
export const draft = mutation({
  args: {
    token: v.string(),
    suggestionId: v.id("suggestions"),
    points: v.number(),
    category: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { token, suggestionId, points, category, icon }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "proposed") throw new Error(`cannot draft suggestion in status ${s.status}`);
    await ctx.db.patch(suggestionId, {
      status: "voting",
      points,
      category,
      difficulty: deriveDifficulty(points),
      icon: icon ?? s.icon,
      draftedAt: Date.now(),
    });
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/suggestions.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/suggestions.ts convex/suggestions.test.ts
git commit -m "feat(convex): suggestions.draft (admin assigns points/category)"
```

---

## Task 6.3: `suggestions.vote` (with auto-promote) + tests

**Files:**
- Modify: `convex/suggestions.ts`
- Modify: `convex/suggestions.test.ts`

- [ ] **Step 1: Tests**

```ts
describe("suggestions.vote", () => {
  async function setupVoting(t: ReturnType<typeof convexTest>) {
    await seedPlayer(t, "khari", true);
    for (const slug of ["kai", "kyanna", "candice", "camara", "miles", "ebony", "justin"]) {
      await seedPlayer(t, slug);
    }
    await seedPlayer(t, "proposer");
    await t.mutation(api.suggestions.create, { token: "tok-proposer", title: "Test" });
    const s = await t.run((ctx) => ctx.db.query("suggestions").first());
    await t.mutation(api.suggestions.draft, {
      token: "tok-khari", suggestionId: s!._id, points: 25, category: "chill",
    });
    return s!._id;
  }

  it("counts a yes vote", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    await t.mutation(api.suggestions.vote, { token: "tok-kai", suggestionId: id, vote: "yes" });
    const s = await t.run((ctx) => ctx.db.get(id));
    expect(s?.yesCount).toBe(1);
    expect(s?.status).toBe("voting");
  });

  it("5 yes → approved + new challenges row inserted", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    for (const slug of ["kai", "kyanna", "candice", "camara", "miles"]) {
      await t.mutation(api.suggestions.vote, { token: `tok-${slug}`, suggestionId: id, vote: "yes" });
    }
    const s = await t.run((ctx) => ctx.db.get(id));
    expect(s?.status).toBe("approved");
    expect(s?.resultingChallengeId).toBeDefined();
    const ch = await t.run((ctx) =>
      ctx.db.query("challenges").withIndex("by_challenge_id", (q) => q.eq("challengeId", s!.resultingChallengeId!)).unique());
    expect(ch?.title).toBe("Test");
  });

  it("5 no → rejected", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    for (const slug of ["kai", "kyanna", "candice", "camara", "miles"]) {
      await t.mutation(api.suggestions.vote, { token: `tok-${slug}`, suggestionId: id, vote: "no" });
    }
    const s = await t.run((ctx) => ctx.db.get(id));
    expect(s?.status).toBe("rejected");
  });

  it("rejects self-vote", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    await expect(t.mutation(api.suggestions.vote, { token: "tok-proposer", suggestionId: id, vote: "yes" }))
      .rejects.toThrow(/cannot vote on own/);
  });

  it("rejects double-vote", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    await t.mutation(api.suggestions.vote, { token: "tok-kai", suggestionId: id, vote: "yes" });
    await expect(t.mutation(api.suggestions.vote, { token: "tok-kai", suggestionId: id, vote: "no" }))
      .rejects.toThrow(/already voted/);
  });
});
```

- [ ] **Step 2: Implement — append**

```ts
function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export const vote = mutation({
  args: {
    token: v.string(),
    suggestionId: v.id("suggestions"),
    vote: v.union(v.literal("yes"), v.literal("no")),
  },
  handler: async (ctx, { token, suggestionId, vote }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "voting") throw new Error(`cannot vote on suggestion in status ${s.status}`);
    if (s.proposerSlug === playerSlug) throw new Error("cannot vote on own suggestion");

    const existing = await ctx.db
      .query("suggestionVotes")
      .withIndex("by_suggestion_and_voter", (q) => q.eq("suggestionId", suggestionId).eq("voterSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already voted");

    await ctx.db.insert("suggestionVotes", {
      suggestionId, voterSlug: playerSlug, vote, at: Date.now(),
    });

    const newYes = vote === "yes" ? s.yesCount + 1 : s.yesCount;
    const newNo = vote === "no" ? s.noCount + 1 : s.noCount;

    const patch: Record<string, any> = { yesCount: newYes, noCount: newNo };

    if (newYes >= APPROVE_THRESHOLD) {
      // Promote to live challenge
      let challengeId = slugify(s.title);
      // De-dupe if a challenge with that id already exists
      let suffix = 1;
      while (true) {
        const conflict = await ctx.db
          .query("challenges")
          .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
          .unique();
        if (!conflict) break;
        challengeId = `${slugify(s.title)}-${++suffix}`;
      }
      await ctx.db.insert("challenges", {
        challengeId,
        title: s.title,
        icon: s.icon ?? "✨",
        points: s.points ?? 0,
        category: s.category ?? "wild",
        difficulty: (s.difficulty as "easy" | "medium" | "wild") ?? deriveDifficulty(s.points ?? 0),
        status: "active",
        createdBySlug: s.proposerSlug,
        approvedAt: Date.now(),
      });
      patch.status = "approved";
      patch.resultingChallengeId = challengeId;
      patch.resolvedAt = Date.now();
    } else if (newNo >= REJECT_THRESHOLD) {
      patch.status = "rejected";
      patch.resolvedAt = Date.now();
    }

    await ctx.db.patch(suggestionId, patch);
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/suggestions.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/suggestions.ts convex/suggestions.test.ts
git commit -m "feat(convex): suggestions.vote (5-yes auto-promotes; 5-no auto-rejects)"
```

---

## Task 6.4: `suggestions.reject` (admin) + `suggestions.list` query + tests

**Files:**
- Modify: `convex/suggestions.ts`
- Modify: `convex/suggestions.test.ts`

- [ ] **Step 1: Tests**

```ts
describe("suggestions.reject", () => {
  it("admin can reject a proposed suggestion", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "justin");
    await seedPlayer(t, "khari", true);
    await t.mutation(api.suggestions.create, { token: "tok-justin", title: "X" });
    const s = await t.run((ctx) => ctx.db.query("suggestions").first());
    await t.mutation(api.suggestions.reject, { token: "tok-khari", suggestionId: s!._id });
    const after = await t.run((ctx) => ctx.db.get(s!._id));
    expect(after?.status).toBe("rejected");
  });
});

describe("suggestions.list", () => {
  it("returns suggestions grouped by status", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("suggestions", { proposerSlug: "a", title: "P", status: "proposed", yesCount: 0, noCount: 0, createdAt: Date.now() });
      await ctx.db.insert("suggestions", { proposerSlug: "b", title: "V", status: "voting", yesCount: 1, noCount: 0, createdAt: Date.now() });
    });
    const all = await t.query(api.suggestions.list, {});
    expect(all.length).toBe(2);
  });
});
```

- [ ] **Step 2: Implement — append**

```ts
export const reject = mutation({
  args: { token: v.string(), suggestionId: v.id("suggestions") },
  handler: async (ctx, { token, suggestionId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status === "approved" || s.status === "rejected") {
      throw new Error("already resolved");
    }
    await ctx.db.patch(suggestionId, { status: "rejected", resolvedAt: Date.now() });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suggestions").collect();
  },
});

export const myVote = query({
  args: { token: v.string(), suggestionId: v.id("suggestions") },
  handler: async (ctx, { token, suggestionId }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;
    const v = await ctx.db
      .query("suggestionVotes")
      .withIndex("by_suggestion_and_voter", (q) => q.eq("suggestionId", suggestionId).eq("voterSlug", session.playerSlug))
      .unique();
    return v?.vote ?? null;
  },
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npx vitest run convex/suggestions.test.ts`

- [ ] **Step 4: Commit**

```bash
git add convex/suggestions.ts convex/suggestions.test.ts
git commit -m "feat(convex): suggestions.reject, suggestions.list, suggestions.myVote"
```

---

## Task 6.5: `SuggestionsPage` UI

**Files:**
- Create: `src/routes/SuggestionsPage.jsx`
- Create: `src/components/SuggestionDraftForm.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create SuggestionDraftForm (admin-only inline form)**

```jsx
// src/components/SuggestionDraftForm.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";

const CATEGORIES = ["social", "drinks", "fitness", "content", "wild", "squad", "chill"];

export default function SuggestionDraftForm({ suggestion, onDone }) {
  const token = useSession();
  const draft = useMutation(api.suggestions.draft);
  const [points, setPoints] = useState("");
  const [category, setCategory] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const p = Number(points);
    if (!Number.isFinite(p) || !category) return alert("Need points + category");
    try {
      await draft({ token, suggestionId: suggestion._id, points: p, category });
      onDone();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 8, padding: 8, background: C.sand, borderRadius: 8 }}>
      <input
        type="number"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        placeholder="Points"
        style={{ padding: 6, marginRight: 6, width: 80 }}
      />
      <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 6 }}>
        <option value="">— Category —</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" style={{ marginLeft: 6, padding: 6, background: C.green, color: C.white, border: 0, borderRadius: 4 }}>
        Send to vote
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create SuggestionsPage**

```jsx
// src/routes/SuggestionsPage.jsx
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import SuggestionDraftForm from "../components/SuggestionDraftForm.jsx";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function nameOf(slug) {
  return PLAYERS.find((p) => p.slug === slug)?.name ?? slug;
}

function ProposeForm() {
  const token = useSession();
  const create = useMutation(api.suggestions.create);
  const [title, setTitle] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try { await create({ token, title }); setTitle(""); }
    catch (err) { alert(err.message); }
  };
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Suggest a challenge…"
        style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.sandDark}` }} />
      <button type="submit" style={{ padding: "10px 16px", borderRadius: 8, background: C.green, color: C.white, border: 0 }}>
        Suggest
      </button>
    </form>
  );
}

function VotingRow({ suggestion }) {
  const token = useSession();
  const vote = useMutation(api.suggestions.vote);
  const myVote = useQuery(api.suggestions.myVote, token ? { token, suggestionId: suggestion._id } : "skip");

  const cast = async (v) => {
    try { await vote({ token, suggestionId: suggestion._id, vote: v }); }
    catch (err) { alert(err.message); }
  };

  return (
    <div style={{ padding: 12, borderBottom: `1px solid ${C.sandDark}` }}>
      <div><strong>{suggestion.title}</strong> · {suggestion.points} pts · {suggestion.category}</div>
      <div style={{ fontSize: 12, color: C.textBody }}>
        by {nameOf(suggestion.proposerSlug)}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button disabled={!!myVote} onClick={() => cast("yes")}
          style={{ padding: "4px 10px", borderRadius: 6, background: C.green, color: C.white, border: 0 }}>
          👍 Yes ({suggestion.yesCount})
        </button>
        <button disabled={!!myVote} onClick={() => cast("no")}
          style={{ padding: "4px 10px", borderRadius: 6, background: C.coralDeep, color: C.white, border: 0 }}>
          👎 No ({suggestion.noCount})
        </button>
        {myVote && <span style={{ fontSize: 12, alignSelf: "center", color: C.textBody }}>
          You: {myVote}
        </span>}
      </div>
    </div>
  );
}

function ProposedRow({ suggestion, isAdmin }) {
  const token = useSession();
  const reject = useMutation(api.suggestions.reject);
  const [drafting, setDrafting] = useState(false);
  return (
    <div style={{ padding: 12, borderBottom: `1px solid ${C.sandDark}` }}>
      <div><strong>{suggestion.title}</strong></div>
      <div style={{ fontSize: 12, color: C.textBody }}>by {nameOf(suggestion.proposerSlug)}</div>
      {isAdmin && !drafting && (
        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
          <button onClick={() => setDrafting(true)} style={{ padding: "4px 10px", borderRadius: 6 }}>
            Draft
          </button>
          <button onClick={() => reject({ token, suggestionId: suggestion._id })}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.coralDeep, color: C.white, border: 0 }}>
            Reject
          </button>
        </div>
      )}
      {isAdmin && drafting && (
        <SuggestionDraftForm suggestion={suggestion} onDone={() => setDrafting(false)} />
      )}
    </div>
  );
}

export default function SuggestionsPage() {
  const token = useSession();
  const all = useQuery(api.suggestions.list, {}) ?? [];
  const isAdmin = useQuery(api.admin.isAdmin, token ? { token } : "skip") === true;

  const byStatus = {
    proposed: all.filter((s) => s.status === "proposed"),
    voting: all.filter((s) => s.status === "voting"),
    approved: all.filter((s) => s.status === "approved"),
    rejected: all.filter((s) => s.status === "rejected"),
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1>Suggestions</h1>
      <ProposeForm />

      <h3>⏳ Awaiting admin ({byStatus.proposed.length})</h3>
      {byStatus.proposed.map((s) => <ProposedRow key={s._id} suggestion={s} isAdmin={isAdmin} />)}

      <h3>🗳 Voting ({byStatus.voting.length})</h3>
      {byStatus.voting.map((s) => <VotingRow key={s._id} suggestion={s} />)}

      <h3>✅ Approved ({byStatus.approved.length})</h3>
      {byStatus.approved.map((s) => (
        <div key={s._id} style={{ padding: 8 }}>{s.title} — {s.points} pts</div>
      ))}

      <h3>❌ Rejected ({byStatus.rejected.length})</h3>
      {byStatus.rejected.map((s) => (
        <div key={s._id} style={{ padding: 8, color: C.textBody }}>{s.title}</div>
      ))}
    </main>
  );
}
```

- [ ] **Step 3: Add route**

In `src/App.jsx`:

```jsx
import SuggestionsPage from "./routes/SuggestionsPage.jsx";
// ...
<Route path="/suggestions" element={<SuggestionsPage />} />
```

- [ ] **Step 4: Manually verify**

Log in as Justin, visit `/suggestions`. Propose "Test challenge". Log in as Khari, see it under Awaiting admin, click Draft, fill in 25 points + chill, send to vote. Log in as 5 other players, each vote yes. The suggestion should move to Approved and appear in `/player/<slug>` challenges grid (Easy tab, since 25 = medium actually — pick a value that puts it where you want to verify).

- [ ] **Step 5: Commit**

```bash
git add src/routes/SuggestionsPage.jsx src/components/SuggestionDraftForm.jsx src/App.jsx
git commit -m "feat(frontend): SuggestionsPage + draft form + /suggestions route"
```

---

# Phase 7 — Punishment Reveal + Wheel

Goal: The shared-screen reveal page for each rolled-over day. Three stages: recap → scoreboard with name-drop animation → wheel spin → recorded forfeit.

---

## Task 7.1: Locate/wrap existing wheel component

**Files:**
- Read: `src/components/games/ScavengerHuntList.jsx` and any wheel-related file
- Create (if no reusable wheel exists yet): `src/components/Wheel.jsx`

- [ ] **Step 1: Audit existing wheel code**

Run:

```bash
grep -rn "wheel\|spin\|FORFEITS" src/ --include="*.jsx" --include="*.js" | head -30
```

Expected: find the existing wheel implementation. Read it. Confirm it accepts an items array and emits a result.

- [ ] **Step 2: If the wheel isn't easily reusable, create a thin wrapper**

```jsx
// src/components/Wheel.jsx
// Thin wrapper around the existing wheel implementation.
// If a Wheel component already exists in src/components/games/, re-export from there:
//   export { default } from "./games/<WheelFile>.jsx";
// Otherwise implement a minimal SVG/CSS spinner that picks a random item with a brief animation.
import { useState } from "react";
import { C } from "../data/colors.js";

export default function Wheel({ items, onResult }) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);

  const spin = () => {
    setSpinning(true);
    setResult(null);
    const winner = items[Math.floor(Math.random() * items.length)];
    setTimeout(() => {
      setResult(winner);
      setSpinning(false);
      onResult(winner);
    }, 2500);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 200, height: 200, margin: "0 auto", borderRadius: "50%",
        background: `conic-gradient(${items.map((i, idx) => `${i.color ?? C.sand} ${(idx * 360) / items.length}deg ${((idx + 1) * 360) / items.length}deg`).join(", ")})`,
        animation: spinning ? "spin 2.5s cubic-bezier(.2,.7,.1,1) forwards" : "none",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(${3 * 360 + Math.floor(Math.random() * 360)}deg); } }`}</style>
      <button onClick={spin} disabled={spinning || !!result}
        style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, background: C.coralDeep, color: C.white, border: 0, fontWeight: 700 }}>
        {spinning ? "Spinning…" : "SPIN"}
      </button>
      {result && (
        <div style={{ marginTop: 16, fontSize: 20 }}>
          {result.icon} {result.label}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Wheel.jsx
git commit -m "feat(frontend): Wheel component (wrapper / minimal impl)"
```

---

## Task 7.2: PunishmentRevealPage — Stage 1 + 2

**Files:**
- Create: `src/routes/PunishmentRevealPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create the page**

```jsx
// src/routes/PunishmentRevealPage.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { FORFEITS } from "../data/forfeits.js";
import { PLAYERS } from "../data/players.js";
import Wheel from "../components/Wheel.jsx";
import { C } from "../data/colors.js";

function nameOf(slug) {
  return PLAYERS.find((p) => p.slug === slug)?.name ?? slug;
}

export default function PunishmentRevealPage() {
  const [params] = useSearchParams();
  const day = Number(params.get("day") ?? 0);
  const token = useSession();
  const rollover = useQuery(api.rollovers.get, { dayNumber: day });
  const board = useQuery(api.leaderboard.getDaily,
    rollover ? { dailyKey: rollover.dailyKey } : "skip") ?? [];
  const recordForfeit = useMutation(api.rollovers.recordForfeit);

  const [stage, setStage] = useState(1);

  if (rollover === undefined) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!rollover) return <div style={{ padding: 24 }}>No rollover for day {day}.</div>;

  // Day 1 kickoff variant
  if (!rollover.loserSlug) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <h1>🏝️ Games are LIVE</h1>
        <p>Day 1 begins now. Start hunting points.</p>
      </main>
    );
  }

  const onSpinResult = async (f) => {
    try {
      await recordForfeit({
        token, rolloverId: rollover._id, forfeitId: f.id, forfeitLabel: f.label,
      });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      {stage === 1 && (
        <section style={{ textAlign: "center", padding: 24 }}>
          <h1>✨ Day {day} — Closed ✨</h1>
          <div style={{ margin: "16px 0", color: C.textBody }}>
            Total players scored: {board.length}<br/>
            Most verified: {board.slice().sort((a, b) => b.verifiedCount - a.verifiedCount)[0]?.slug ?? "—"}
          </div>
          <button onClick={() => setStage(2)}
            style={{ padding: 12, borderRadius: 8, background: C.dark, color: C.white, border: 0, fontWeight: 700 }}>
            Reveal scores ▼
          </button>
        </section>
      )}

      {stage === 2 && (
        <section>
          <h2 style={{ textAlign: "center" }}>Daily Scoreboard</h2>
          <div style={{ background: C.white, borderRadius: 12, overflow: "hidden" }}>
            {board.map((row, i) => (
              <div key={row.slug}
                style={{
                  padding: 12, borderBottom: `1px solid ${C.sandDark}`,
                  display: "flex", justifyContent: "space-between",
                  animation: `fadeInRow 0.4s ${i * 0.4}s both`,
                  background: row.slug === rollover.loserSlug ? C.coral : C.white,
                  color: row.slug === rollover.loserSlug ? C.white : C.dark,
                }}>
                <span>{i + 1}. {nameOf(row.slug)}</span>
                <span>{row.total >= 0 ? "+" : ""}{row.total}</span>
              </div>
            ))}
          </div>
          <style>{`@keyframes fadeInRow { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
          <p style={{ textAlign: "center", marginTop: 16 }}>
            <strong>{nameOf(rollover.loserSlug)}</strong> — spin the wheel.
          </p>
          <div style={{ textAlign: "center" }}>
            <button onClick={() => setStage(3)}
              style={{ padding: 12, borderRadius: 8, background: C.coralDeep, color: C.white, border: 0, fontWeight: 700 }}>
              Open the wheel ▶
            </button>
          </div>
        </section>
      )}

      {stage === 3 && (
        <section style={{ textAlign: "center" }}>
          <h2>{nameOf(rollover.loserSlug)}, your fate:</h2>
          {rollover.forfeitId ? (
            <div>
              <div style={{ fontSize: 32, margin: 16 }}>
                {FORFEITS.find((f) => f.id === rollover.forfeitId)?.icon}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{rollover.forfeitLabel}</div>
              <p style={{ marginTop: 16 }}>
                {nameOf(rollover.loserSlug)} owes you all.
              </p>
            </div>
          ) : (
            <Wheel items={FORFEITS} onResult={onSpinResult} />
          )}
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Add route**

In `src/App.jsx`:

```jsx
import PunishmentRevealPage from "./routes/PunishmentRevealPage.jsx";
// ...
<Route path="/punishment-reveal" element={<PunishmentRevealPage />} />
```

- [ ] **Step 3: Manually verify end-to-end**

1. Reset by running undoLast a few times if state is dirty, OR run `npx convex run seedChallenges:seedGameState` again.
2. Log in as Khari, visit `/admin`, click "Start the games".
3. Visit `/player/khari`, claim a few challenges.
4. Switch to Camara (different browser/incognito), claim nothing (or log a foul to bring him below).
5. Back as Khari on `/admin`, click "Trigger rollover → Day 2" — page redirects to `/punishment-reveal?day=1`.
6. Click "Reveal scores" → see the board drop in → loser highlighted.
7. Click "Open the wheel" → spin → result is recorded.

- [ ] **Step 4: Commit**

```bash
git add src/routes/PunishmentRevealPage.jsx src/App.jsx
git commit -m "feat(frontend): PunishmentRevealPage 3-stage flow + wheel integration"
```

---

## Task 7.3: "Deduct points" forfeit edge case

**Files:**
- Modify: `src/routes/PunishmentRevealPage.jsx`
- Modify: `convex/entries.ts` (add a system-applied deduct mutation)
- Modify: `convex/entries.test.ts`

- [ ] **Step 1: Add `entries.applyForfeitDeduct` mutation + test**

In `convex/entries.test.ts`:

```ts
describe("entries.applyForfeitDeduct", () => {
  it("inserts a system-applied negative on the chosen target", async () => {
    const t = convexTest(schema);
    await seedSession(t, "khari", "tok-khari");
    await t.run(async (ctx) => {
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", { gamesLive: true, currentDayNumber: 2, currentDailyKey: "day-2", updatedAt: Date.now() });
    });
    await t.mutation(api.entries.applyForfeitDeduct, {
      token: "tok-khari",
      targetSlug: "miles",
      amount: 50,
    });
    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows[0].subjectSlug).toBe("miles");
    expect(rows[0].points).toBe(-50);
    expect(rows[0].status).toBe("verified"); // not disputable
  });
});
```

In `convex/entries.ts`:

```ts
import { requireAdmin } from "./helpers";

export const applyForfeitDeduct = mutation({
  args: { token: v.string(), targetSlug: v.string(), amount: v.number() },
  handler: async (ctx, { token, targetSlug, amount }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state || !state.gamesLive) throw new Error("games not live");
    await ctx.db.insert("entries", {
      type: "negative",
      subjectSlug: targetSlug,
      appliedBySlug: "system",
      negativeId: "forfeit-deduct",
      points: -Math.abs(amount),
      status: "verified", // wheel result is final, not disputable
      vouchCount: 1,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
      resolvedAt: Date.now(),
    });
  },
});
```

Run: `npx vitest run convex/entries.test.ts` — expect pass.

- [ ] **Step 2: Add the picker branch on PunishmentRevealPage**

In `src/routes/PunishmentRevealPage.jsx`, replace the section where `rollover.forfeitId` is set:

```jsx
{rollover.forfeitId === "deduct" ? (
  <DeductPicker loserSlug={rollover.loserSlug} />
) : rollover.forfeitId ? (
  <div>
    <div style={{ fontSize: 32, margin: 16 }}>
      {FORFEITS.find((f) => f.id === rollover.forfeitId)?.icon}
    </div>
    <div style={{ fontSize: 22, fontWeight: 700 }}>{rollover.forfeitLabel}</div>
  </div>
) : (
  <Wheel items={FORFEITS} onResult={onSpinResult} />
)}
```

Add the picker component at the bottom of the file:

```jsx
function DeductPicker({ loserSlug }) {
  const token = useSession();
  const apply = useMutation(api.entries.applyForfeitDeduct);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const targets = PLAYERS.filter((p) => p.slug !== loserSlug);

  const submit = async (slug) => {
    setPicked(slug);
    try {
      await apply({ token, targetSlug: slug, amount: 50 });
      setDone(true);
    } catch (err) {
      alert(err.message);
      setPicked(null);
    }
  };

  if (done) return <div>{nameOf(loserSlug)} deducted 50 from {nameOf(picked)}.</div>;
  return (
    <div>
      <h3>📉 Pick someone to lose 50 points</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {targets.map((p) => (
          <button key={p.slug} disabled={picked !== null} onClick={() => submit(p.slug)}
            style={{ padding: 10, borderRadius: 8, background: C.sand }}>
            {p.emoji} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts src/routes/PunishmentRevealPage.jsx
git commit -m "feat: deduct-points forfeit picker (system-applied, not disputable)"
```

---

## Task 7.4: Final smoke check — all phases together

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all Convex test files pass.

- [ ] **Step 2: Full manual flow**

1. Reset state — undo all rollovers, delete all entries via Convex dashboard if needed.
2. Khari taps Start the games on `/admin`.
3. Each player logs in, claims 2-3 challenges, vouches some, disputes one.
4. Camara takes a couple negatives.
5. Justin proposes "Eat 3 plantains" → Khari drafts (20 pts, drinks) → 5 players vote yes → it appears live in `/player/<slug>` challenges grid.
6. Khari rolls over → reveal page renders → wheel spins → forfeit recorded.

- [ ] **Step 3: Commit any stragglers + tag the milestone**

```bash
git add -A
git diff --cached --stat
# review
git commit -m "chore: leaderboard system end-to-end smoke check passed" || echo "nothing to commit"
git tag leaderboard-system-v1
```

---

# Self-review notes (post-write)

**Spec coverage check (each spec section → task or note):**

- ✅ Section 4 schema → Task 1.1
- ✅ Section 5 mutations & queries → Phases 2–7 cover every function
- ✅ Section 6 frontend file inventory → covered across Phases 2–7
- ✅ Section 7 UI flows → claim (2.6–2.7), vouch/dispute (3.4–3.5), foul (4.2–4.3), suggestions (6.5), rollover (5.6), reveal (7.2)
- ✅ Section 8 migration → Tasks 1.2–1.4
- ✅ Section 9 test plan → tests created alongside each Convex module
- ✅ Section 10 phased build order → plan structure mirrors the 7 phases exactly
- ✅ Section 11 risks → handled: gamesLive gate (claim mutation), admin lockout (acknowledged in spec; npx convex run remains escape hatch), deduct-points forfeit (Task 7.3)

**No placeholders found.** Every code step has full code; every command has expected output.

**Type consistency:** `entries.dailyKey: string`, `gameState.currentDailyKey: string`, `rollovers.dailyKey: string` — all match. `entries.subjectSlug` used consistently. `challengeId` (string slug) vs `Id<"challenges">` distinction preserved.

---

# Execution

Plan saved to `docs/superpowers/plans/2026-05-17-leaderboard-challenges-system.md`.
