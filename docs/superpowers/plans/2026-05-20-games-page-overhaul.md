# Games Page Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Convex backend tasks use TDD via vitest; UI tasks verify with `npm run build 2>&1 | tail -5` plus a manual run-through on the dev server (port 5173) on the phone. Dispatch sequential sonnet implementer subagents — never concurrent (file conflicts). One commit per task with explicit `git add <paths>`.

**Goal:** Overhaul `/player/:slug/games` — collapse the stacked-header tax, rework the challenge content for Dominican Republic (vs the original Crete villa list), make challenges sortable + filterable, lighten the claim flow with one-tap-claim + undo + bottom-sheet bonus modal, add a celebratory peak moment, fix dashboard rank/empty-state, and demote the Suggest-a-challenge band to an inline expand row.

**Architecture:** All UI work uses existing primitives (`Card`, `Pill`, `Avatar`, `SectionBand`, `SectionHeader`, `Reveal`) plus two new primitives (`Toast`, `BottomSheet`). Convex backend gains a `getRecentActivity` title-join, an `unclaim` mutation for undo, and a `retireChallenges` admin mutation for the Crete→DR content swap. The DR challenge list is editorial — it replaces `SEED_CHALLENGES` wholesale plus retires any Crete-only entries via a one-shot mutation on deploy.

**Tech Stack:** React 18 + Vite + react-router-dom, Convex (queries/mutations + `convex-test` + vitest), inline styling via design tokens (`src/data/design.js`, `src/data/colors.js`), Dela Gothic One + Nunito. No new dependencies needed.

---

## File Structure

**Backend (Convex):**
- Modify: `convex/_seedData/challenges.ts` — replace `SEED_CHALLENGES` with the DR list; expand `NEGATIVE_POINTS_CONST` with 2 DR-flavored negatives.
- Modify: `convex/seedChallenges.ts` — add `retireChallengeIds` internal mutation to flip removed Crete entries to `status: "retired"`.
- Modify: `convex/leaderboard.ts` — extend `getRecentActivity` to join challenge `title`/`icon` and negative `action`/`icon` onto each row.
- Modify: `convex/entries.ts` — add `unclaim` mutation (delete own active entry within 60s window).
- Modify: `convex/leaderboard.test.ts` — new test for title-joined activity rows.
- Create: `convex/entries.test.ts` — new test file for `unclaim` (file may already exist; check first).

**Frontend primitives:**
- Create: `src/components/primitives/Toast.jsx` — toast queue + portal renderer.
- Create: `src/lib/useToast.js` — `useToast()` hook + global toast event bus (`window.dispatchEvent` pattern, matching `SESSION_EVENT` in `src/lib/session.js`).
- Create: `src/components/primitives/BottomSheet.jsx` — slide-up sheet with backdrop, escape-key handler, focus trap.

**Games page UI:**
- Modify: `src/routes/PlayerGamesPage.jsx` — drop outer `SectionHeader`; replace the Crowdsource `SectionBand` with `SuggestCallout`; refine `DashboardHero` (rank denominator, empty state, Today emphasis, count-up on claim).
- Modify: `src/components/ChallengesSection.jsx` — own section header, fold `TodaysClaims` chip strip inline, multi-select filter pills, sort dropdown, render activity rows with joined titles.
- Modify: `src/components/ChallengeCard.jsx` — add difficulty chip; one-tap-claim path when no bonus.
- Modify: `src/components/TodaysClaims.jsx` — repurpose as an inline chip-strip component (or delete + inline into `ChallengesSection`; this plan deletes it).
- Rename + rewrite: `src/components/ClaimModal.jsx` → `src/components/ClaimSheet.jsx` — bonus-challenge claim flow as `BottomSheet`.
- Create: `src/components/SuggestCallout.jsx` — inline expand-on-tap row replacing the dedicated Crowdsource section.
- Modify: `src/components/ProposeForm.jsx` — no logic changes; ensure styling holds inside `SuggestCallout`.
- Modify: `src/routes/StyleGuide.jsx` — add `Toast`, `BottomSheet` to the styleguide grid.

**Tests/build:**
- `npx vitest run convex/<file>.test.ts` for convex tests.
- `npm run build 2>&1 | tail -5` for UI build verification after every UI task.
- `npx convex deploy -y` after any convex schema/function change before testing on the device.

---

## DR Challenge Content (used in Task 3)

This is the editorial source for the rewrite. Implementer should paste this verbatim into `convex/_seedData/challenges.ts`.

**Keep (carried over from Crete list — universal):** kiss-someone, sing-in-public, run-1km, 5-shots, buy-drinks, selfie-stranger, selfie-sleeping, wear-clothes, gym-30, get-contact, sand-sculpture, stranger-money, make-tiktok, stranger-tiktok, cliff-jump, find-lookalike, sleep-elsewhere, receive-compliments, get-tan, hold-hands, down-drink, shot, play-game-stranger, buy-souvenir, matching-outfit, pic-5-over-50, embarrassing-ask, scare-group, give-massage, shower-with, tattoo, all-nighter, scavenger-hunt, try-new.

**Retire (Crete-only):** gianni-bike.

**New DR-specific entries (15):**

| challengeId | title | icon | points | bonus | category |
|---|---|---|---|---|---|
| ocean-sunrise | Sunrise Ocean Swim | 🌅 | 25 | — | beach |
| ocean-midnight | Midnight Ocean Swim | 🌙 | 30 | — | wild |
| mamajuana | Mamajuana Shot | 🍶 | 10 | — | drinks |
| swim-up-bar | Drink from the Swim-Up Bar | 🍹 | 5 | — | drinks |
| presidente | Try a Presidente | 🍺 | 2 | — | drinks |
| pinacolada-coconut | Piña Colada in a Coconut | 🥥 | 8 | — | drinks |
| bachata-dance | Bachata with a Local | 💃 | 50 | — | social |
| spanish-convo | 2-Minute Spanish Conversation | 🗣️ | 50 | — | local |
| spanish-order | Order Entirely in Spanish | 🇩🇴 | 10 | — | local |
| la-bandera | Eat La Bandera | 🍛 | 15 | — | food |
| tostones | Try Mofongo or Tostones | 🍌 | 10 | — | food |
| cigar | Smoke a Dominican Cigar | 🚬 | 15 | — | local |
| larimar | Buy Larimar or Amber | 💎 | 25 | — | shopping |
| negotiate-half | Negotiate Below 50% of Asking | 🤝 | 30 | — | shopping |
| hair-braids | Beach Hair Braiding | 💁 | 30 | — | beach |

**New DR squad challenges (3):**

| challengeId | title | icon | points | bonus | category |
|---|---|---|---|---|---|
| crew-ocean | Whole Crew in the Ocean | 🌊 | 30 | — | squad |
| crew-swim-up | Whole Crew at Swim-Up Bar | 🍹 | 30 | — | squad |
| matching-dinner | Crew Matching Outfit at Dinner | 👯 | 40 | — | squad |

**New DR wild (3):**

| challengeId | title | icon | points | bonus | category |
|---|---|---|---|---|---|
| skinny-dip | Skinny Dip in the Ocean | 🍑 | 150 | — | wild |
| horseback-beach | Horseback on the Beach | 🐎 | 100 | — | wild |
| every-bar | Hit Every Resort Bar in One Day | 🍻 | 50 | — | wild |

**Additional negatives (2 — appended to `NEGATIVE_POINTS_CONST`):**

| negativeId | action | points | icon |
|---|---|---|---|
| bad-sunburn | Forgot sunscreen (lobster mode) | -15 | 🦞 |
| lost-bracelet | Lost the all-inclusive bracelet | -20 | 📛 |

Total post-rewrite: **52 challenges + 6 negatives**. If this feels like too many for the UI density target, the implementer should preserve all 52 — sorting + filtering will keep the grid manageable.

---

## Task 1: Backend — `getRecentActivity` joins challenge titles + negative titles

**Why:** "My recent" and "Today's claims" lists currently render `challengeId` (e.g. `breakfast-veggies`) and `foul: ${negativeId}` directly. The recognition vs recall heuristic fails — users see developer IDs.

**Files:**
- Modify: `convex/leaderboard.ts:43-70` (`getRecentActivity` query)
- Modify: `convex/leaderboard.test.ts` (add new test)

- [ ] **Step 1: Write the failing test**

Append to `convex/leaderboard.test.ts`:

```typescript
describe("leaderboard.getRecentActivity joined labels", () => {
  it("attaches title + icon to challenge entries", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "mamajuana",
        title: "Mamajuana Shot",
        icon: "🍶",
        points: 10,
        category: "drinks",
        difficulty: "easy",
        status: "active",
      });
      await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "khari",
        challengeId: "mamajuana",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now(),
      });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Mamajuana Shot");
    expect(rows[0].labelIcon).toBe("🍶");
  });

  it("attaches action + icon to negative entries", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", {
        type: "negative",
        subjectSlug: "khari",
        appliedBySlug: "kai",
        negativeId: "bed-pre-11",
        points: -40,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now(),
      });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10 });
    expect(rows[0].label).toBe("Going to bed before 11pm");
    expect(rows[0].labelIcon).toBe("😴");
  });

  it("falls back to id when challenge/negative is missing", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "khari",
        challengeId: "deleted-challenge",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now(),
      });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10 });
    expect(rows[0].label).toBe("deleted-challenge");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run convex/leaderboard.test.ts
```
Expected: 3 new tests FAIL with "expected undefined to be..." (no `label` / `labelIcon` field yet).

- [ ] **Step 3: Implement the join**

Replace the body of `getRecentActivity` in `convex/leaderboard.ts`:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { NEGATIVE_POINTS_CONST } from "./_seedData/challenges";

// (keep existing aggregate/getDaily/getHoliday)

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

      let label = "";
      let labelIcon = "";
      if (e.type === "challenge" && e.challengeId) {
        const challenge = await ctx.db
          .query("challenges")
          .withIndex("by_challenge_id", (q) => q.eq("challengeId", e.challengeId!))
          .unique();
        label = challenge?.title ?? e.challengeId;
        labelIcon = challenge?.icon ?? "";
      } else if (e.type === "negative" && e.negativeId) {
        const neg = NEGATIVE_POINTS_CONST.find((n) => n.negativeId === e.negativeId);
        label = neg?.action ?? e.negativeId;
        labelIcon = neg?.icon ?? "";
      }

      return { ...e, myReaction, label, labelIcon };
    }));
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run convex/leaderboard.test.ts
```
Expected: all tests in file PASS.

- [ ] **Step 5: Deploy + commit**

```bash
npx convex deploy -y
git add convex/leaderboard.ts convex/leaderboard.test.ts
git commit -m "feat(games): join challenge titles into recent-activity rows"
```

---

## Task 2: Backend — `unclaim` mutation for undo within 60s

**Why:** One-tap claim flow needs a quick undo path. A 60s window is generous enough for "wrong button" while preventing leaderboard manipulation hours later.

**Files:**
- Modify: `convex/entries.ts`
- Create: `convex/entries.test.ts` (check if file exists first; if not, create)

- [ ] **Step 1: Write the failing test**

Create or append to `convex/entries.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("entries.unclaim", () => {
  it("deletes my active entry created within 60s", async () => {
    const t = convexTest(schema);
    let entryId: string;
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-khari", createdAt: Date.now() });
      await ctx.db.insert("gameState", { gamesLive: true, currentDayNumber: 1, currentDailyKey: "2026-05-20", updatedAt: Date.now() });
      entryId = await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "khari",
        challengeId: "mamajuana",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now() - 10_000, // 10s ago
      });
    });
    await t.mutation(api.entries.unclaim, { token: "tok-khari", entryId: entryId! });
    const remaining = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(remaining).toHaveLength(0);
  });

  it("rejects entries older than 60s", async () => {
    const t = convexTest(schema);
    let entryId: string;
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-khari", createdAt: Date.now() });
      entryId = await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "khari",
        challengeId: "mamajuana",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now() - 120_000, // 2 min ago
      });
    });
    await expect(
      t.mutation(api.entries.unclaim, { token: "tok-khari", entryId: entryId! }),
    ).rejects.toThrow(/too late/i);
  });

  it("rejects unclaiming someone else's entry", async () => {
    const t = convexTest(schema);
    let entryId: string;
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("players", { slug: "camara", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "camara", token: "tok-camara", createdAt: Date.now() });
      entryId = await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "khari",
        challengeId: "mamajuana",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now() - 10_000,
      });
    });
    await expect(
      t.mutation(api.entries.unclaim, { token: "tok-camara", entryId: entryId! }),
    ).rejects.toThrow(/not your entry/i);
  });

  it("rejects unclaim on verified/disputed entries", async () => {
    const t = convexTest(schema);
    let entryId: string;
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-khari", createdAt: Date.now() });
      entryId = await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "khari",
        challengeId: "mamajuana",
        points: 10,
        status: "verified",
        vouchCount: 1,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now() - 10_000,
      });
    });
    await expect(
      t.mutation(api.entries.unclaim, { token: "tok-khari", entryId: entryId! }),
    ).rejects.toThrow(/already resolved/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run convex/entries.test.ts
```
Expected: 4 tests FAIL with "api.entries.unclaim is not a function" or similar.

- [ ] **Step 3: Implement the mutation**

Append to `convex/entries.ts`:

```typescript
export const unclaim = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug !== playerSlug) throw new Error("not your entry");
    if (entry.status !== "active") throw new Error("already resolved");
    if (Date.now() - entry.createdAt > 60_000) throw new Error("too late to undo");

    // Also remove any pending reactions on this entry (defensive — should be empty within 60s anyway)
    const reactions = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry", (q) => q.eq("entryId", entryId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);

    await ctx.db.delete(entryId);
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run convex/entries.test.ts
```
Expected: all 4 tests PASS.

- [ ] **Step 5: Deploy + commit**

```bash
npx convex deploy -y
git add convex/entries.ts convex/entries.test.ts
git commit -m "feat(games): add unclaim mutation for 60s undo window"
```

---

## Task 3: DR challenge content rewrite + retire Crete-only entries

**Why:** The seed list was designed for a villa in Crete. We're now in Punta Cana. Replace with DR-flavored challenges and retire the one Crete-specific entry (`gianni-bike`).

**Files:**
- Modify: `convex/_seedData/challenges.ts`
- Modify: `convex/seedChallenges.ts` (add `retireChallengeIds` mutation)

- [ ] **Step 1: Replace `SEED_CHALLENGES` and extend `NEGATIVE_POINTS_CONST`**

Replace `convex/_seedData/challenges.ts` entirely with:

```typescript
// convex/_seedData/challenges.ts
// One-time snapshot of CHALLENGES used to seed the Convex `challenges` table.
// After seeding, the table is source of truth.

export type SeedChallenge = {
  challengeId: string;
  title: string;
  icon: string;
  points: number;
  bonus?: string;
  category: string;
};

export const SEED_CHALLENGES = [
  // ── Carried over (universal) ───────────────────────────────────────
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
  { challengeId: "sand-sculpture", title: "Build Sand Sculpture", icon: "🏖️", points: 30, category: "beach" },
  { challengeId: "stranger-money", title: "Stranger Gives You Money", icon: "💸", points: 75, category: "wild" },
  { challengeId: "make-tiktok", title: "Make a TikTok", icon: "📹", points: 2, category: "content" },
  { challengeId: "stranger-tiktok", title: "Stranger Joins TikTok", icon: "🎬", points: 20, category: "content" },
  { challengeId: "cliff-jump", title: "Cliff Jump", icon: "🪂", points: 100, category: "wild" },
  { challengeId: "find-lookalike", title: "Find Group Lookalike", icon: "👥", points: 70, category: "squad" },
  { challengeId: "sleep-elsewhere", title: "Sleep Somewhere Else", icon: "🛏️", points: 100, category: "wild" },
  { challengeId: "receive-compliments", title: "Receive Compliments", icon: "😊", points: 7, category: "social" },
  { challengeId: "get-tan", title: "Get a Tan", icon: "☀️", points: 1, category: "beach" },
  { challengeId: "hold-hands", title: "Hold Hands with Stranger", icon: "🤝", points: 15, category: "social" },
  { challengeId: "down-drink", title: "Down a Drink", icon: "🍺", points: 2, category: "drinks" },
  { challengeId: "shot", title: "Shot", icon: "🥂", points: 2, category: "drinks" },
  { challengeId: "play-game-stranger", title: "Play Game with Stranger", icon: "🎲", points: 25, category: "social" },
  { challengeId: "buy-souvenir", title: "Buy Souvenir", icon: "🎁", points: 4, category: "shopping" },
  { challengeId: "matching-outfit", title: "Matching Outfit Stranger", icon: "👯", points: 15, category: "social" },
  { challengeId: "pic-5-over-50", title: "Pic with 5 People 50+", icon: "📸", points: 50, category: "wild" },
  { challengeId: "embarrassing-ask", title: "Ask Something Embarrassing", icon: "😳", points: 35, category: "social" },
  { challengeId: "scare-group", title: "Scare Someone in Group", icon: "👻", points: 10, category: "squad" },
  { challengeId: "try-new", title: "Try Something New", icon: "✨", points: 10, category: "wild" },
  { challengeId: "give-massage", title: "Give Massage", icon: "💆", points: 1, bonus: "per minute", category: "squad" },
  { challengeId: "shower-with", title: "Shower with Someone", icon: "🚿", points: 100, category: "wild" },
  { challengeId: "tattoo", title: "Get a Tattoo", icon: "🖋️", points: 250, category: "wild" },
  { challengeId: "all-nighter", title: "All Nighter (until midday)", icon: "🌙", points: 40, category: "wild" },
  { challengeId: "scavenger-hunt", title: "Scavenger Hunt (Food/Plant/Animal/Object)", icon: "🔍", points: 80, category: "squad" },

  // ── DR-specific ────────────────────────────────────────────────────
  { challengeId: "ocean-sunrise", title: "Sunrise Ocean Swim", icon: "🌅", points: 25, category: "beach" },
  { challengeId: "ocean-midnight", title: "Midnight Ocean Swim", icon: "🌙", points: 30, category: "wild" },
  { challengeId: "mamajuana", title: "Mamajuana Shot", icon: "🍶", points: 10, category: "drinks" },
  { challengeId: "swim-up-bar", title: "Drink from the Swim-Up Bar", icon: "🍹", points: 5, category: "drinks" },
  { challengeId: "presidente", title: "Try a Presidente", icon: "🍺", points: 2, category: "drinks" },
  { challengeId: "pinacolada-coconut", title: "Piña Colada in a Coconut", icon: "🥥", points: 8, category: "drinks" },
  { challengeId: "bachata-dance", title: "Bachata with a Local", icon: "💃", points: 50, category: "social" },
  { challengeId: "spanish-convo", title: "2-Minute Spanish Conversation", icon: "🗣️", points: 50, category: "local" },
  { challengeId: "spanish-order", title: "Order Entirely in Spanish", icon: "🇩🇴", points: 10, category: "local" },
  { challengeId: "la-bandera", title: "Eat La Bandera", icon: "🍛", points: 15, category: "food" },
  { challengeId: "tostones", title: "Try Mofongo or Tostones", icon: "🍌", points: 10, category: "food" },
  { challengeId: "cigar", title: "Smoke a Dominican Cigar", icon: "🚬", points: 15, category: "local" },
  { challengeId: "larimar", title: "Buy Larimar or Amber", icon: "💎", points: 25, category: "shopping" },
  { challengeId: "negotiate-half", title: "Negotiate Below 50% of Asking", icon: "🤝", points: 30, category: "shopping" },
  { challengeId: "hair-braids", title: "Beach Hair Braiding", icon: "💁", points: 30, category: "beach" },
  { challengeId: "crew-ocean", title: "Whole Crew in the Ocean", icon: "🌊", points: 30, category: "squad" },
  { challengeId: "crew-swim-up", title: "Whole Crew at Swim-Up Bar", icon: "🍹", points: 30, category: "squad" },
  { challengeId: "matching-dinner", title: "Crew Matching Outfit at Dinner", icon: "👯", points: 40, category: "squad" },
  { challengeId: "skinny-dip", title: "Skinny Dip in the Ocean", icon: "🍑", points: 150, category: "wild" },
  { challengeId: "horseback-beach", title: "Horseback on the Beach", icon: "🐎", points: 100, category: "wild" },
  { challengeId: "every-bar", title: "Hit Every Resort Bar in One Day", icon: "🍻", points: 50, category: "wild" },
] as const satisfies readonly SeedChallenge[];

export const NEGATIVE_POINTS_CONST = [
  { negativeId: "throw-up", action: "Throwing up", points: -50, icon: "🤮" },
  { negativeId: "bed-pre-11", action: "Going to bed before 11pm", points: -40, icon: "😴" },
  { negativeId: "debate-drinks", action: "Debating chosen drinks", points: -10, icon: "🙄" },
  { negativeId: "first-to-bed", action: "First to go to bed", points: -30, icon: "💤" },
  { negativeId: "bad-sunburn", action: "Forgot sunscreen (lobster mode)", points: -15, icon: "🦞" },
  { negativeId: "lost-bracelet", action: "Lost the all-inclusive bracelet", points: -20, icon: "📛" },
] as const;
```

Note: `gianni-bike` is removed from the list — the next step retires it in the live DB.

- [ ] **Step 2: Add a `retireChallengeIds` internal mutation**

Append to `convex/seedChallenges.ts`:

```typescript
export const retireChallengeIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const idsToRetire = ["gianni-bike"];
    for (const id of idsToRetire) {
      const existing = await ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", id))
        .unique();
      if (existing && existing.status === "active") {
        await ctx.db.patch(existing._id, { status: "retired" });
      }
    }
  },
});
```

- [ ] **Step 3: Deploy + run seed**

```bash
npx convex deploy -y
npx convex run seedChallenges:seedChallenges
npx convex run seedChallenges:retireChallengeIds
```

Expected: the convex dashboard should show 21 new challenge documents in the `challenges` table (52 active total) and `gianni-bike` flipped to `retired`.

- [ ] **Step 4: Verify with a quick query in convex dashboard**

In the Convex dashboard's Data tab, filter `challenges` by `status = "active"`. Expected count: 52. `gianni-bike` should show `status = "retired"`.

- [ ] **Step 5: Commit**

```bash
git add convex/_seedData/challenges.ts convex/seedChallenges.ts
git commit -m "feat(games): replace Crete seed with DR challenge content; add retireChallengeIds"
```

---

## Task 4: Create `Toast` primitive + `useToast` hook

**Why:** Replace `alert()` calls and unlock the celebratory peak moment + undo affordance.

**Files:**
- Create: `src/components/primitives/Toast.jsx`
- Create: `src/lib/useToast.js`
- Modify: `src/main.jsx` (mount `<ToastContainer />` once at root)

- [ ] **Step 1: Create the event bus + hook**

`src/lib/useToast.js`:

```javascript
import { useEffect, useState } from "react";

const TOAST_EVENT = "drbabyyy:toast";
let counter = 0;

export function showToast({ message, icon, accent, action, durationMs = 3000 }) {
  const id = ++counter;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: { id, message, icon, accent, action, durationMs },
    }),
  );
  return id;
}

export function dismissToast(id) {
  window.dispatchEvent(new CustomEvent(`${TOAST_EVENT}:dismiss`, { detail: { id } }));
}

export function useToastQueue() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onPush = (e) => {
      const t = e.detail;
      setToasts((prev) => [...prev, t]);
      if (t.durationMs > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== t.id));
        }, t.durationMs);
      }
    };
    const onDismiss = (e) => {
      setToasts((prev) => prev.filter((x) => x.id !== e.detail.id));
    };
    window.addEventListener(TOAST_EVENT, onPush);
    window.addEventListener(`${TOAST_EVENT}:dismiss`, onDismiss);
    return () => {
      window.removeEventListener(TOAST_EVENT, onPush);
      window.removeEventListener(`${TOAST_EVENT}:dismiss`, onDismiss);
    };
  }, []);

  return toasts;
}
```

- [ ] **Step 2: Create the Toast primitive**

`src/components/primitives/Toast.jsx`:

```jsx
import { useToastQueue, dismissToast } from "../../lib/useToast.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

export default function ToastContainer() {
  const toasts = useToastQueue();
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 88, // sits above bottom nav (64px) + 24px gap
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }) {
  return (
    <div
      style={{
        background: C.dark,
        color: C.white,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOW.dramatic,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 420,
        width: "100%",
        pointerEvents: "auto",
        animation: "drToastSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {toast.icon && <span style={{ fontSize: 24, lineHeight: 1 }}>{toast.icon}</span>}
      <span
        style={{
          flex: 1,
          fontFamily: "Nunito, sans-serif",
          fontWeight: 700,
          fontSize: 14,
          color: toast.accent ?? C.white,
        }}
      >
        {toast.message}
      </span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action.onClick();
            dismissToast(toast.id);
          }}
          style={{
            background: "transparent",
            border: `1px solid rgba(255,255,255,0.4)`,
            borderRadius: RADIUS.pill,
            color: C.white,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          {toast.action.label}
        </button>
      )}
      <style>{`
        @keyframes drToastSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 3: Mount the container at root**

Modify `src/main.jsx`. Find the root render and wrap so `<ToastContainer />` sits as a sibling to your app router. Show the change:

```jsx
import ToastContainer from "./components/primitives/Toast.jsx";

// inside the existing render:
<>
  <App />
  <ToastContainer />
</>
```

(If `src/main.jsx` already returns a fragment or has a wrapper, drop `<ToastContainer />` as the last child.)

- [ ] **Step 4: Build to verify no breakage**

```bash
npm run build 2>&1 | tail -5
```
Expected: clean build, no new warnings.

- [ ] **Step 5: Quick smoke test**

In dev server, open the browser console and run:
```js
window.dispatchEvent(new CustomEvent("drbabyyy:toast", { detail: { id: 1, message: "Hello", icon: "🍶", durationMs: 2000 }}));
```
Toast should slide up and auto-dismiss in 2s.

- [ ] **Step 6: Commit**

```bash
git add src/components/primitives/Toast.jsx src/lib/useToast.js src/main.jsx
git commit -m "feat(ui): add Toast primitive + useToast event-bus hook"
```

---

## Task 5: Create `BottomSheet` primitive

**Why:** Bonus-challenge claim flow needs a mobile-native feel, not a centered desktop modal.

**Files:**
- Create: `src/components/primitives/BottomSheet.jsx`
- Modify: `src/routes/StyleGuide.jsx` (add demo)

- [ ] **Step 1: Implement the primitive**

`src/components/primitives/BottomSheet.jsx`:

```jsx
import { useEffect, useRef } from "react";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

export default function BottomSheet({ open, onClose, children, maxHeight = "85vh" }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && sheetRef.current) {
      const focusable = sheetRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      focusable?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,26,46,0.55)",
        zIndex: 150,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "drSheetFade 0.3s ease",
      }}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`,
          boxShadow: SHADOW.dramatic,
          width: "100%",
          maxWidth: 520,
          maxHeight,
          overflowY: "auto",
          padding: "12px 20px 24px",
          animation: "drSheetSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 4,
            borderRadius: 999,
            background: "rgba(0,0,0,0.18)",
            margin: "0 auto 16px",
          }}
        />
        {children}
      </div>
      <style>{`
        @keyframes drSheetFade {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes drSheetSlideUp {
          from { transform: translateY(100%); } to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Add to /styleguide**

In `src/routes/StyleGuide.jsx`, add a demo section that renders a "Open sheet" button which toggles `<BottomSheet>` open. Use existing patterns in the file. Show the relevant snippet:

```jsx
import { useState } from "react";
import BottomSheet from "../components/primitives/BottomSheet.jsx";

// inside the StyleGuide component body, in a new section:
const [sheetOpen, setSheetOpen] = useState(false);

// in the JSX, alongside other primitives:
<section>
  <h3>BottomSheet</h3>
  <button onClick={() => setSheetOpen(true)}>Open sheet</button>
  <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
    <h3>Sheet contents</h3>
    <p>Press Esc or backdrop to close.</p>
  </BottomSheet>
</section>
```

- [ ] **Step 3: Build + verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: clean build.

- [ ] **Step 4: Manual check**

Open `/styleguide` in dev server. Click "Open sheet" — verify slide-up animation, backdrop dim, Escape closes, backdrop click closes.

- [ ] **Step 5: Commit**

```bash
git add src/components/primitives/BottomSheet.jsx src/routes/StyleGuide.jsx
git commit -m "feat(ui): add BottomSheet primitive"
```

---

## Task 6: ChallengeCard — difficulty chip + one-tap (bonus-free) vs sheet (bonus) routing

**Why:** Two improvements in one card edit: (1) show difficulty inline so a single "All" list works; (2) route bonus-free challenges to one-tap with undo, route bonus challenges to a BottomSheet.

**Files:**
- Modify: `src/components/ChallengeCard.jsx`

- [ ] **Step 1: Update the card**

Replace `src/components/ChallengeCard.jsx` entirely with:

```jsx
import Card from "./primitives/Card.jsx";
import { C } from "../data/colors.js";

const DIFFICULTY_COLOR = {
  easy: C.green,
  medium: C.gold,
  wild: C.coralDeep,
};

const DIFFICULTY_LABEL = {
  easy: "Easy",
  medium: "Medium",
  wild: "Wild",
};

export default function ChallengeCard({ challenge, onClaim }) {
  const dColor = DIFFICULTY_COLOR[challenge.difficulty] ?? C.dark;
  return (
    <button
      type="button"
      onClick={() => onClaim(challenge)}
      style={{ all: "unset", display: "block", cursor: "pointer", width: "100%" }}
    >
      <Card padding={14}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>{challenge.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 16,
              color: C.dark,
              lineHeight: 1.2,
            }}>
              {challenge.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 10,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: dColor,
                  background: `${dColor}18`,
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {DIFFICULTY_LABEL[challenge.difficulty] ?? "—"}
              </span>
              {challenge.bonus && (
                <span style={{
                  fontFamily: "Nunito, sans-serif",
                  fontSize: 11,
                  color: C.textBody,
                }}>
                  Bonus: {challenge.bonus}
                </span>
              )}
            </div>
          </div>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 22,
            color: dColor,
            flexShrink: 0,
          }}>
            +{challenge.points}
          </div>
        </div>
      </Card>
    </button>
  );
}
```

Note: this card stays a single button; the parent (`ChallengesSection`) routes the `onClaim(challenge)` call to either one-tap-claim or sheet depending on `challenge.bonus`.

- [ ] **Step 2: Build + verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: clean build.

- [ ] **Step 3: Manual check**

On `/player/khari/games`, every challenge card should show the colored difficulty chip (green Easy / gold Medium / coral Wild). Bonus text now sits next to the chip on the second line.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChallengeCard.jsx
git commit -m "feat(games): difficulty chip on ChallengeCard"
```

---

## Task 7: Convert ClaimModal → ClaimSheet (BottomSheet) for bonus challenges

**Why:** Centered modal feels heavy. Bottom sheet feels mobile-native and integrates with the slide-up toast aesthetic.

**Files:**
- Create: `src/components/ClaimSheet.jsx`
- Delete: `src/components/ClaimModal.jsx`

- [ ] **Step 1: Create ClaimSheet**

`src/components/ClaimSheet.jsx`:

```jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { showToast } from "../lib/useToast.js";
import { C } from "../data/colors.js";
import { RADIUS, HEADING, BODY } from "../data/design.js";
import BottomSheet from "./primitives/BottomSheet.jsx";

const BONUS_RE = /^\+(\d+)\s+(\w+)$/;

function parseBonus(bonusText) {
  if (!bonusText) return [];
  return bonusText.split(",").map((part) => {
    const m = part.trim().match(BONUS_RE);
    if (!m) return null;
    return { key: m[2], points: Number(m[1]) };
  }).filter(Boolean);
}

export default function ClaimSheet({ challenge, onClose }) {
  const session = useSession();
  const token = session?.token;
  const claim = useMutation(api.entries.claim);
  const unclaim = useMutation(api.entries.unclaim);
  const [selected, setSelected] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);

  const bonusOpts = parseBonus(challenge?.bonus);
  const bonusPoints = bonusOpts.filter((b) => selected.has(b.key)).reduce((s, b) => s + b.points, 0);
  const total = (challenge?.points ?? 0) + bonusPoints;

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!token) {
      showToast({ message: "Not logged in", accent: C.coralDeep });
      return;
    }
    setSubmitting(true);
    const bonusKey = Array.from(selected).sort().join("+") || undefined;
    try {
      const entryId = await claim({ token, challengeId: challenge.challengeId, bonusKey });
      showToast({
        message: `+${total} · ${challenge.title}`,
        icon: challenge.icon,
        durationMs: 4000,
        action: entryId
          ? { label: "Undo", onClick: () => unclaim({ token, entryId }).catch(() => {}) }
          : undefined,
      });
      onClose();
    } catch (err) {
      showToast({ message: err.message || "Claim failed", accent: C.coralDeep });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={!!challenge} onClose={onClose}>
      <div style={{ fontSize: 36 }}>{challenge?.icon}</div>
      <h3 style={{ ...HEADING.h3, margin: "8px 0 4px", color: C.dark }}>
        {challenge?.title}
      </h3>
      <div style={{ ...BODY, marginBottom: 12 }}>+{challenge?.points} base</div>

      {bonusOpts.map((b) => (
        <label key={b.key} style={{
          display: "flex", gap: 10, padding: "8px 0", cursor: "pointer",
          fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody,
          alignItems: "center", borderTop: `1px solid ${C.sandDark}`,
        }}>
          <input type="checkbox" checked={selected.has(b.key)} onChange={() => toggle(b.key)} />
          <span style={{ flex: 1 }}>+{b.points} {b.key}</span>
        </label>
      ))}

      <div style={{
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 22, margin: "16px 0 12px", color: C.dark,
      }}>
        Total: +{total}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: "12px 14px", borderRadius: RADIUS.md,
            border: `1.5px solid ${C.sandDark}`, background: "transparent",
            fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14,
            color: C.textBody, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          disabled={submitting}
          onClick={handleConfirm}
          style={{
            flex: 2, padding: "12px 14px", borderRadius: RADIUS.md,
            background: C.green, color: C.white, border: 0,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14,
            cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "..." : "I did this"}
        </button>
      </div>
    </BottomSheet>
  );
}
```

Important: `claim` currently does not return the new entry id. We need to modify `convex/entries.ts:claim` to return the id so the undo toast can target it.

- [ ] **Step 2: Make `claim` return the entry id**

Modify `convex/entries.ts`, change the `claim` handler so the final `insert` is captured and returned:

```typescript
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

    const entryId = await ctx.db.insert("entries", {
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
    return entryId;
  },
});
```

- [ ] **Step 3: Delete the old modal + update imports**

```bash
git rm src/components/ClaimModal.jsx
```

Update `src/components/ChallengesSection.jsx` imports (Task 9 will fully rewrite this file; for now, change the import from `ClaimModal` to `ClaimSheet` to keep build green):

```jsx
import ClaimSheet from "./ClaimSheet.jsx";
// inside JSX: replace <ClaimModal ... /> with <ClaimSheet ... />
```

- [ ] **Step 4: Update any existing claim tests for the new return type**

```bash
npx vitest run convex/entries.test.ts
```
Expected: existing claim test (if any) still passes. Update it if it asserts no return value.

- [ ] **Step 5: Deploy + build + smoke test**

```bash
npx convex deploy -y
npm run build 2>&1 | tail -5
```

Open dev server, navigate to `/player/khari/games`, click any bonus challenge (e.g. `sing-in-public`). Verify the bottom sheet slides up, you can check bonus boxes, total updates, and `I did this` triggers a toast with the title.

- [ ] **Step 6: Commit**

```bash
git add src/components/ClaimSheet.jsx src/components/ChallengesSection.jsx convex/entries.ts
git rm src/components/ClaimModal.jsx
git commit -m "feat(games): convert ClaimModal to BottomSheet, claim returns entry id"
```

---

## Task 8: One-tap claim with undo for bonus-free challenges

**Why:** ~70% of challenges have no bonus options. Forcing a modal/sheet for those adds friction on the highest-frequency action.

**Files:**
- Modify: `src/components/ChallengesSection.jsx`

- [ ] **Step 1: Add a `quickClaim` helper inside ChallengesSection**

In `src/components/ChallengesSection.jsx`, alongside the `useState` for `active`, import the claim/unclaim mutations and the toast:

```jsx
import { useMutation } from "convex/react";
import { showToast } from "../lib/useToast.js";
// ... existing imports ...
const claim = useMutation(api.entries.claim);
const unclaim = useMutation(api.entries.unclaim);
```

Replace the `onClaim={setActive}` prop on `ChallengeCard` with a routing handler:

```jsx
const handleCardTap = async (challenge) => {
  if (challenge.bonus) {
    setActive(challenge); // route to BottomSheet for bonus challenges
    return;
  }
  if (!session?.token) {
    showToast({ message: "Not logged in", accent: C.coralDeep });
    return;
  }
  try {
    const entryId = await claim({ token: session.token, challengeId: challenge.challengeId });
    showToast({
      message: `+${challenge.points} · ${challenge.title}`,
      icon: challenge.icon,
      durationMs: 4000,
      action: { label: "Undo", onClick: () => unclaim({ token: session.token, entryId }).catch(() => {}) },
    });
  } catch (err) {
    showToast({ message: err.message || "Claim failed", accent: C.coralDeep });
  }
};
// pass to ChallengeCard:
<ChallengeCard key={c.challengeId} challenge={c} onClaim={handleCardTap} />
```

- [ ] **Step 2: Build + manual check**

```bash
npm run build 2>&1 | tail -5
```

Open dev server. Tap a bonus-free card (e.g. `mamajuana`). Verify: no sheet opens; toast slides up with "Undo" button; entry shows up in the activity list (Task 9 will format this nicely); tapping Undo within 3-4s reverses it.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChallengesSection.jsx
git commit -m "feat(games): one-tap claim with undo toast for bonus-free challenges"
```

---

## Task 9: ChallengesSection rework — collapse headers, fold Today's claims inline, multi-filter pills, sort dropdown

**Why:** The page currently stacks 4 hierarchical labels in ~300vh and forces exclusive Easy/Medium/Wild browsing. This is the biggest IA win.

**Files:**
- Modify: `src/components/ChallengesSection.jsx`
- Modify: `src/routes/PlayerGamesPage.jsx` (remove outer SectionHeader)
- Delete: `src/components/TodaysClaims.jsx` (logic absorbed into ChallengesSection)

- [ ] **Step 1: Replace ChallengesSection wholesale**

Replace `src/components/ChallengesSection.jsx` entirely with:

```jsx
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { showToast } from "../lib/useToast.js";
import { C } from "../data/colors.js";
import { BODY, MICRO_LABEL, EYEBROW, HEADING, RADIUS } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";
import ChallengeCard from "./ChallengeCard.jsx";
import ClaimSheet from "./ClaimSheet.jsx";

const ALL_DIFFICULTIES = ["easy", "medium", "wild"];

const DIFFICULTY_COLOR = {
  easy: C.green,
  medium: C.gold,
  wild: C.coralDeep,
};

const SORT_OPTIONS = [
  { key: "default", label: "Default" },
  { key: "pointsDesc", label: "Most points" },
  { key: "pointsAsc", label: "Least points" },
  { key: "newest", label: "Newest" },
];

function sortChallenges(list, sortKey) {
  const sorted = [...list];
  if (sortKey === "pointsDesc") return sorted.sort((a, b) => b.points - a.points);
  if (sortKey === "pointsAsc") return sorted.sort((a, b) => a.points - b.points);
  if (sortKey === "newest") return sorted.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
  // default: difficulty order then points desc
  const order = { easy: 0, medium: 1, wild: 2 };
  return sorted.sort((a, b) => {
    const d = (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9);
    if (d !== 0) return d;
    return b.points - a.points;
  });
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChallengesSection() {
  const { gamesLive, currentDayNumber, currentDailyKey } = useGameState();
  const challenges = useQuery(api.challenges.listActive) ?? [];
  const session = useSession();
  const token = session?.token;
  const mySlug = session?.slug;
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    token ? { limit: 100, token } : "skip",
  ) ?? [];
  const claim = useMutation(api.entries.claim);
  const unclaim = useMutation(api.entries.unclaim);

  const [activeChallenge, setActiveChallenge] = useState(null);
  const [filters, setFilters] = useState(() => new Set(ALL_DIFFICULTIES));
  const [sortKey, setSortKey] = useState("default");
  const [claimsOpen, setClaimsOpen] = useState(true);

  if (!gamesLive) {
    return (
      <Card>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18 }}>
          Games kick off after breakfast (Day 1).
        </div>
        <div style={{ ...BODY, marginTop: 8 }}>
          Once Khari or Kai pulls the trigger, this is where you'll claim challenges.
        </div>
      </Card>
    );
  }

  const mineToday = activity.filter(
    (e) => e.subjectSlug === mySlug && e.dailyKey === currentDailyKey,
  );
  const totalToday = mineToday.reduce(
    (sum, e) => (e.status === "disputed" ? sum : sum + e.points),
    0,
  );

  const mineRecent = activity.filter((e) => e.subjectSlug === mySlug).slice(0, 8);

  const visibleChallenges = useMemo(() => {
    const filtered = challenges.filter((c) => filters.has(c.difficulty));
    return sortChallenges(filtered, sortKey);
  }, [challenges, filters, sortKey]);

  const toggleFilter = (d) => {
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      // never allow zero filters — re-enable all if user removed the last one
      if (next.size === 0) ALL_DIFFICULTIES.forEach((x) => next.add(x));
      return next;
    });
  };

  const handleCardTap = async (challenge) => {
    if (challenge.bonus) {
      setActiveChallenge(challenge);
      return;
    }
    if (!token) {
      showToast({ message: "Not logged in", accent: C.coralDeep });
      return;
    }
    try {
      const entryId = await claim({ token, challengeId: challenge.challengeId });
      showToast({
        message: `+${challenge.points} · ${challenge.title}`,
        icon: challenge.icon,
        durationMs: 4000,
        action: { label: "Undo", onClick: () => unclaim({ token, entryId }).catch(() => {}) },
      });
    } catch (err) {
      showToast({ message: err.message || "Claim failed", accent: C.coralDeep });
    }
  };

  return (
    <section style={{ margin: "16px 0" }}>
      {/* SINGLE HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...EYEBROW, color: C.gold, marginBottom: 4 }}>
          Day {currentDayNumber} · The hunt
        </div>
        <div style={{ ...HEADING.h2, color: C.dark }}>What did you just do?</div>
      </div>

      {/* TODAY'S CLAIMS CHIP STRIP */}
      <button
        type="button"
        onClick={() => setClaimsOpen((o) => !o)}
        style={{
          width: "100%", background: `${C.gold}10`, border: `1px solid ${C.gold}25`,
          borderRadius: RADIUS.md, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          marginBottom: 12,
        }}
      >
        <span style={{ ...MICRO_LABEL, color: C.gold }}>Today</span>
        <span style={{
          fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18,
          color: totalToday >= 0 ? C.green : C.coralDeep,
        }}>
          {totalToday >= 0 ? "+" : ""}{totalToday}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {mineToday.length} claim{mineToday.length === 1 ? "" : "s"}
        </span>
        <span style={{ color: C.textBody }}>{claimsOpen ? "▴" : "▾"}</span>
      </button>

      {claimsOpen && mineToday.length > 0 && (
        <Card padding={0} style={{ marginBottom: 16, overflow: "hidden" }}>
          {mineToday.map((e) => (
            <div key={e._id} style={{
              padding: "8px 14px",
              borderBottom: `1px solid ${C.sandDark}`,
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "Nunito, sans-serif", fontSize: 13,
              opacity: e.status === "disputed" ? 0.5 : 1,
              textDecoration: e.status === "disputed" ? "line-through" : "none",
            }}>
              <span style={{ fontSize: 16 }}>{e.labelIcon}</span>
              <span style={{ flex: 1 }}>{e.label}</span>
              <span style={{ color: C.textBody, fontSize: 11 }}>{formatTime(e.createdAt)}</span>
              <strong style={{ color: e.points >= 0 ? C.green : C.coralDeep }}>
                {e.points >= 0 ? "+" : ""}{e.points}
              </strong>
              {e.status === "verified" && <span>🛡</span>}
            </div>
          ))}
        </Card>
      )}
      {claimsOpen && mineToday.length === 0 && (
        <div style={{
          fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody,
          marginBottom: 16, marginLeft: 4,
        }}>
          Nothing claimed yet. Tap a challenge below.
        </div>
      )}

      {/* FILTER + SORT ROW */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        marginBottom: 12,
      }}>
        {ALL_DIFFICULTIES.map((d) => (
          <Pill
            key={d}
            active={filters.has(d)}
            accent={DIFFICULTY_COLOR[d]}
            onClick={() => toggleFilter(d)}
            aria-pressed={filters.has(d)}
            style={{ textTransform: "capitalize" }}
          >
            {d} ({challenges.filter((c) => c.difficulty === d).length})
          </Pill>
        ))}
        <span style={{ flex: 1 }} />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          aria-label="Sort challenges"
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12, fontWeight: 800,
            padding: "6px 10px",
            borderRadius: RADIUS.pill,
            border: `1px solid ${C.sandDark}`,
            background: C.white,
            color: C.textBody,
            cursor: "pointer",
          }}
        >
          {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* CHALLENGE GRID */}
      <div style={{ display: "grid", gap: 8 }}>
        {visibleChallenges.map((c) => (
          <ChallengeCard key={c.challengeId} challenge={c} onClaim={handleCardTap} />
        ))}
      </div>

      {activeChallenge && <ClaimSheet challenge={activeChallenge} onClose={() => setActiveChallenge(null)} />}

      {/* MY RECENT (all-time) */}
      {mineRecent.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>My recent</div>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {mineRecent.map((e) => (
              <div key={e._id} style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${C.sandDark}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                opacity: e.status === "disputed" ? 0.5 : 1,
                textDecoration: e.status === "disputed" ? "line-through" : "none",
                fontFamily: "Nunito, sans-serif", fontSize: 13,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{e.labelIcon}</span>
                  <span>{e.label}</span>
                </span>
                <span style={{ fontWeight: 700 }}>
                  {e.points >= 0 ? "+" : ""}{e.points}
                  {e.status === "verified" ? " 🛡" : ""}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Strip the outer SectionHeader + TodaysClaims from PlayerGamesPage**

In `src/routes/PlayerGamesPage.jsx`, remove the imports for `SectionHeader` and `TodaysClaims`. Replace the second `<SectionBand>` body with just the ChallengesSection (and its Reveal wrapper):

```jsx
<SectionBand bg="white" pad="40px 0" innerMaxWidth={520}>
  <Reveal>
    <ChallengesSection />
  </Reveal>
</SectionBand>
```

- [ ] **Step 3: Delete TodaysClaims**

```bash
git rm src/components/TodaysClaims.jsx
```

- [ ] **Step 4: Build + manual check**

```bash
npm run build 2>&1 | tail -5
```

Open `/player/khari/games`. Verify:
- Single header "DAY X · THE HUNT" + "What did you just do?" — no more outer "Your challenges" header.
- Today chip strip shows directly under the header, collapsible.
- 3 difficulty filter pills (Easy/Medium/Wild) sit above the grid, all selected by default. Tapping one toggles it. Tapping the last enabled one re-enables all.
- Sort dropdown sits to the right of the pills with the 4 options.
- All challenges visible by default in difficulty order.
- "My recent" shows human-readable titles + icons.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChallengesSection.jsx src/routes/PlayerGamesPage.jsx
git rm src/components/TodaysClaims.jsx
git commit -m "feat(games): collapse headers, fold Today's claims inline, add multi-filter + sort"
```

---

## Task 10: Claim peak — DashboardHero Today count-up + pulse animation

**Why:** Peak-end rule. The moment of claiming is currently silent. Make the Today stat visibly react.

**Files:**
- Modify: `src/routes/PlayerGamesPage.jsx` (DashboardHero is inline)

- [ ] **Step 1: Add count-up animation to the Today stat**

In `src/routes/PlayerGamesPage.jsx`, replace the `Stat` function and the `dailyTotal` prop wiring so that the Today value animates from its previous to its new value when it changes:

```jsx
import { useEffect, useRef, useState } from "react";

function useCountUp(value, durationMs = 600) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setDisplay(Math.round(v));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return display;
}

function Stat({ label, value, accent, pulseOnChange = false }) {
  const display = pulseOnChange ? useCountUp(value) : value;
  const [pulseKey, setPulseKey] = useState(0);
  const prevRef = useRef(value);
  useEffect(() => {
    if (pulseOnChange && value !== prevRef.current) {
      setPulseKey((k) => k + 1);
      prevRef.current = value;
    }
  }, [value, pulseOnChange]);

  return (
    <div style={{
      background: "rgba(255,255,255,0.85)",
      borderRadius: 14,
      padding: "10px 12px",
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 2 }}>{label}</div>
      <div
        key={pulseKey}
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 24,
          color: accent ?? C.dark,
          lineHeight: 1,
          animation: pulseKey > 0 ? "drStatPulse 0.5s cubic-bezier(0.16,1,0.3,1)" : undefined,
        }}
      >
        {typeof display === "number"
          ? (display >= 0 ? `+${display}` : display)
          : display}
      </div>
      <style>{`
        @keyframes drStatPulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// In DashboardHero, pass pulseOnChange to the Today stat:
<Stat label="Today" value={dailyTotal} accent={dailyTotal >= 0 ? C.green : C.coralDeep} pulseOnChange />
```

- [ ] **Step 2: Build + manual check**

```bash
npm run build 2>&1 | tail -5
```

Tap a challenge with no bonus. Watch the Today stat in the hero count up and pulse. Should feel light and fast (~500ms).

- [ ] **Step 3: Commit**

```bash
git add src/routes/PlayerGamesPage.jsx
git commit -m "feat(games): Today stat count-up + pulse on claim"
```

---

## Task 11: Dashboard hero refinement — rank denominator, empty state, Today emphasis

**Why:** "Rank #3" lacks context; "+0 / +0 / —" reads as broken; Today is the actionable number and should dominate.

**Files:**
- Modify: `src/routes/PlayerGamesPage.jsx`

- [ ] **Step 1: Update DashboardHero**

In `src/routes/PlayerGamesPage.jsx`, change the `DashboardHero` props to accept the crew size, and restructure the stat row so Today dominates. The page passes `holiday.length` as `crewSize`:

```jsx
function DashboardHero({ player, dailyTotal, holidayTotal, rank, crewSize }) {
  const { gamesLive, currentDayNumber } = useGameState();
  const remaining = daysRemaining();
  const isPristine = dailyTotal === 0 && holidayTotal === 0;
  return (
    <Card tint={player?.color ?? C.gold} padding={20} style={{
      boxShadow: `0 4px 20px ${player?.color ?? C.flow}30, 0 0 0 1px ${player?.color ?? C.flow}15`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {player && <Avatar player={player} size="lg" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...MICRO_LABEL, color: player?.color ?? ACCENT, marginBottom: 2 }}>
            {gamesLive ? `Day ${currentDayNumber}` : "Pre-trip"}
          </div>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(22px, 5vw, 32px)",
            color: C.dark,
            lineHeight: 1.1,
          }}>{player?.name ?? "Player"}'s Games</div>
        </div>
      </div>

      {/* TODAY — emphasised */}
      <div style={{
        marginTop: 16,
        background: "rgba(255,255,255,0.85)",
        borderRadius: 14,
        padding: "12px 14px",
      }}>
        <div style={{ ...MICRO_LABEL, color: C.textBody }}>Today</div>
        <Stat label="" value={dailyTotal} accent={dailyTotal >= 0 ? C.green : C.coralDeep} pulseOnChange />
      </div>

      {/* HOLIDAY + RANK — secondary */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Stat label="Holiday" value={holidayTotal} accent={holidayTotal >= 0 ? C.green : C.coralDeep} />
        <Stat label="Rank" value={rank && crewSize ? `#${rank} of ${crewSize}` : "—"} />
      </div>

      <div style={{ ...BODY, fontSize: 12, marginTop: 12, color: C.textBody }}>
        {isPristine
          ? "Tap a challenge to start scoring."
          : remaining > 0
            ? `${remaining} day${remaining === 1 ? "" : "s"} of trip remaining`
            : "Trip in progress"}
      </div>
    </Card>
  );
}
```

Note: this nests one `Stat` inside the Today block — the implementer should refactor `Stat` to optionally hide its own label when `label === ""` (one-line addition: `{label && <div ...>{label}</div>}` around the existing label div).

- [ ] **Step 2: Pass `crewSize` from the page**

In the same file, find the `<DashboardHero ... />` call inside `PlayerGamesPage` and add the prop:

```jsx
<DashboardHero
  player={player}
  dailyTotal={dailyRow?.total ?? 0}
  holidayTotal={holidayRow?.total ?? 0}
  rank={rank >= 0 ? rank + 1 : null}
  crewSize={holiday.length || null}
/>
```

- [ ] **Step 3: Build + manual check**

```bash
npm run build 2>&1 | tail -5
```

Verify on the games page: Today is now visually largest stat; rank shows `#3 of 8`; pristine state shows "Tap a challenge to start scoring."

- [ ] **Step 4: Commit**

```bash
git add src/routes/PlayerGamesPage.jsx
git commit -m "feat(games): dashboard hero — Today emphasis, rank denominator, pristine empty state"
```

---

## Task 12: Demote Suggest-a-challenge to inline `SuggestCallout`

**Why:** The dedicated `SectionBand` consumes 80px+ padding to host one input field when most users have nothing pending.

**Files:**
- Create: `src/components/SuggestCallout.jsx`
- Modify: `src/routes/PlayerGamesPage.jsx`

- [ ] **Step 1: Build SuggestCallout**

`src/components/SuggestCallout.jsx`:

```jsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { RADIUS, MICRO_LABEL } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import ProposeForm from "./ProposeForm.jsx";
import VotingRow from "./VotingRow.jsx";

export default function SuggestCallout() {
  const session = useSession();
  const slug = session?.slug;
  const allSuggestions = useQuery(api.suggestions.list, {}) ?? [];
  const myVoting = allSuggestions.filter((s) => s.status === "voting" && s.proposerSlug !== slug);
  const myProposed = allSuggestions.filter((s) => s.status === "proposed" && s.proposerSlug === slug);
  const recentApproved = allSuggestions.filter((s) => s.status === "approved").slice(-3);

  const [open, setOpen] = useState(myVoting.length > 0 || myProposed.length > 0);

  return (
    <div style={{ marginTop: 24 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", background: `${C.coralDeep}10`, border: `1px solid ${C.coralDeep}25`,
          borderRadius: RADIUS.md, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, color: C.dark,
        }}
      >
        <span style={{ fontSize: 20 }}>💡</span>
        <span style={{ flex: 1, textAlign: "left" }}>
          Got a better one? Suggest a challenge
        </span>
        {myVoting.length > 0 && (
          <span style={{
            ...MICRO_LABEL, color: C.coralDeep, background: `${C.coralDeep}18`,
            borderRadius: 999, padding: "2px 8px",
          }}>
            {myVoting.length} to vote
          </span>
        )}
        <span style={{ color: C.textBody }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <Card style={{ marginTop: 8 }}>
          <ProposeForm />
          {myProposed.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.sandDark}` }}>
              <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 6 }}>Your pending</div>
              {myProposed.map((s) => (
                <div key={s._id} style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, padding: "2px 0" }}>
                  ⏳ {s.title} — awaiting admin
                </div>
              ))}
            </div>
          )}
          {myVoting.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.sandDark}` }}>
              <div style={{ ...MICRO_LABEL, color: C.coralDeep, marginBottom: 8 }}>Vote now</div>
              {myVoting.map((s) => <VotingRow key={s._id} suggestion={s} />)}
            </div>
          )}
          {recentApproved.length > 0 && (
            <div style={{
              marginTop: 12, fontSize: 12, color: C.textBody, fontFamily: "Nunito, sans-serif",
            }}>
              Recently approved: {recentApproved.map((s) => s.title).join(" · ")}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the dedicated SectionBand in PlayerGamesPage**

In `src/routes/PlayerGamesPage.jsx`, remove the third `<SectionBand bg="sand" ...>` block entirely and the imports it needed (`ProposeForm`, `VotingRow`, the `suggestions` query, the `myProposed`/`myVoting`/`recentApproved` derivations). Mount `<SuggestCallout />` inside the "Your challenges" white band, after the `<ChallengesSection />`:

```jsx
import SuggestCallout from "../components/SuggestCallout.jsx";
// ...
<SectionBand bg="white" pad="40px 0 80px" innerMaxWidth={520}>
  <Reveal>
    <ChallengesSection />
  </Reveal>
  <Reveal delay={0.05}>
    <SuggestCallout />
  </Reveal>
</SectionBand>
```

(Update the `pad` on the white band so the bottom padding compensates for the deleted sand band.)

- [ ] **Step 3: Build + manual check**

```bash
npm run build 2>&1 | tail -5
```

Verify: Crowdsource band is gone. Below challenges, there's an inline "💡 Got a better one? Suggest a challenge ▾" row. Tapping expands it. When there are no pending votes, it stays collapsed and small.

- [ ] **Step 4: Commit**

```bash
git add src/components/SuggestCallout.jsx src/routes/PlayerGamesPage.jsx
git commit -m "feat(games): demote Suggest-a-challenge to inline SuggestCallout"
```

---

## Task 13: Polish pass — alert→toast, focus styles, aria, ProposeForm cleanup

**Why:** Sweep the small fit-and-finish items the critique surfaced.

**Files:**
- Modify: `src/components/ProposeForm.jsx`
- Modify: `src/components/primitives/Pill.jsx`
- Modify: `src/routes/StyleGuide.jsx` (verify everything renders)

- [ ] **Step 1: Replace `alert()` in ProposeForm with toast**

In `src/components/ProposeForm.jsx`:

```jsx
import { showToast } from "../lib/useToast.js";
// ...
// inside submit():
if (!token) { showToast({ message: "Not logged in", accent: C.coralDeep }); return; }
// catch block:
} catch (err) {
  showToast({ message: err.message || "Couldn't suggest", accent: C.coralDeep });
}
```

- [ ] **Step 2: Add focus ring to Pill primitive**

Modify `src/components/primitives/Pill.jsx`. Add a `:focus-visible` outline. Inline styles can't `:focus-visible`, so add a tiny `<style>` block or convert to a className. Quick path: append a `<style>` tag in the file or in `src/main.jsx`:

```jsx
// at the top of Pill.jsx (or in main.jsx for global), add a style block once:
const FOCUS_RING_STYLES = `
  button[data-pill]:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;
// emit via a once-mounted helper, or — simpler — add the styles inline in src/main.jsx as a global <style>.
```

In `src/main.jsx` add a small global style block:

```jsx
<style>{`
  button[data-pill]:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  button[data-claim]:focus-visible { outline: 2px solid ${"#00C2A8"}; outline-offset: 2px; }
`}</style>
```

In `Pill.jsx`, set `data-pill="true"` on the rendered element. In `ChallengeCard.jsx`, set `data-claim="true"` on the button.

- [ ] **Step 3: Add `aria-pressed` on filter pills (already added in Task 9) — verify**

Search `src/components/ChallengesSection.jsx` for `aria-pressed` — confirm it's wired on the difficulty filter pills. If missing, add it.

- [ ] **Step 4: Build + smoke test**

```bash
npm run build 2>&1 | tail -5
```

Tab into the games page from the bottom-nav. Verify keyboard focus rings appear on Pill and card. Submit an empty Propose form — should toast, not alert.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProposeForm.jsx src/components/primitives/Pill.jsx src/components/ChallengeCard.jsx src/main.jsx
git commit -m "polish(games): toast replaces alert, focus rings on Pill + ChallengeCard"
```

---

## Self-Review

**Spec coverage:**
- ✅ Stacked header tax (P0) — Task 9
- ✅ Claim has no peak (P0) — Tasks 4 + 8 + 10
- ✅ Easy/Medium/Wild as exclusive tabs (P1) — Task 9 (multi-select + sort)
- ✅ Claim modal too heavy for bonus-free (P1) — Tasks 7 + 8
- ✅ Suggest-a-challenge wrong shape (P2) — Task 12
- ✅ Activity rows leak IDs (P2) — Task 1
- ✅ Dashboard hero — rank denominator, empty state, Today emphasis (minor → P2) — Task 11
- ✅ Sort feature (user request) — Task 9
- ✅ DR challenge content rework (user request) — Task 3
- ✅ Polish (alert→toast, focus, escape, aria) — Tasks 4 (escape via BottomSheet), 13

**Placeholder scan:** No "TBD" / "TODO" / "fill in later" in any code block. Every step has either runnable code, a runnable command, or a concrete manual verification instruction.

**Type/name consistency:**
- `entryId` returned from `claim` mutation in Task 7 — consumed in `unclaim` calls in Tasks 7 and 8 ✓
- `label` and `labelIcon` introduced in Task 1, consumed in Task 9 ✓
- `SuggestCallout` introduced in Task 12, no later task references different name ✓
- `useToast` exports `showToast` and `dismissToast` (Task 4) — consumed via `showToast` in Tasks 7, 8, 9, 13 ✓
- `BottomSheet` props `{ open, onClose, children, maxHeight }` (Task 5) — `ClaimSheet` passes `open` (truthy challenge) + `onClose` (Task 7) ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-20-games-page-overhaul.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh sonnet subagent per task, review the diff between tasks, fast iteration. Matches your "subagent-driven, sequential, sonnet for mechanical tasks" pattern.

2. **Inline Execution** — Execute tasks in this session using executing-plans with checkpoints for review.

Which approach?
