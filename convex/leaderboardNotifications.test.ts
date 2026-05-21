import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async () => ({ statusCode: 201 })),
  },
}));

async function drainScheduler(t: ReturnType<typeof convexTest>) {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
}

async function seedPlayer(
  t: ReturnType<typeof convexTest>,
  slug: string,
  holidayName?: string,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null, holidayName });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    await ctx.db.insert("pushSubscriptions", {
      playerSlug: slug,
      endpoint: `https://push.example/${slug}`,
      p256dh: "P",
      auth: "A",
      createdAt: Date.now(),
    });
  });
}

async function seedGameLive(t: ReturnType<typeof convexTest>, dailyKey = "day-2") {
  await t.run(async (ctx) => {
    await ctx.db.insert("gameState", {
      gamesLive: true,
      currentDayNumber: 2,
      currentDailyKey: dailyKey,
      updatedAt: Date.now(),
    });
    // seed a challenge so claim() works
    await ctx.db.insert("challenges", {
      challengeId: "shot",
      title: "Take a shot",
      icon: "🍹",
      points: 50,
      category: "drinks",
      difficulty: "easy",
      status: "active",
    });
    await ctx.db.insert("challenges", {
      challengeId: "big-shot",
      title: "Take a big shot",
      icon: "🍹",
      points: 100,
      category: "drinks",
      difficulty: "wild",
      status: "active",
    });
  });
}

describe("leaderboardNotifications — leader change push", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("fires a push to everyone when the first claim of the day creates a leader", async () => {
    const t = convexTest(schema);
    await seedGameLive(t);
    await seedPlayer(t, "khari", "Kahuna");
    await seedPlayer(t, "adan", "Adan-osaurus");

    await t.mutation(api.entries.claim, { token: "tok-khari", challengeId: "shot" });
    await drainScheduler(t);

    const webpush = (await import("web-push")).default as any;
    const calls = (webpush.sendNotification as any).mock.calls;
    const leaderCalls = calls.filter((c: any[]) => {
      const payload = JSON.parse(c[1]);
      return payload.tag?.startsWith("leader-");
    });
    expect(leaderCalls.length).toBe(2); // both subscribers, including the new leader
    const endpoints = leaderCalls.map((c: any[]) => c[0].endpoint).sort();
    expect(endpoints).toEqual([
      "https://push.example/adan",
      "https://push.example/khari",
    ]);
    const payload = JSON.parse(leaderCalls[0][1]);
    expect(payload.body).toContain("Kahuna");
    expect(payload.body).toContain("50");
    expect(payload.url).toBe("/leaderboard");
  });

  it("does not fire again when the same player extends their lead", async () => {
    const t = convexTest(schema);
    await seedGameLive(t);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");

    await t.mutation(api.entries.claim, { token: "tok-khari", challengeId: "shot" });
    await drainScheduler(t);
    const webpush = (await import("web-push")).default as any;
    (webpush.sendNotification as any).mockClear();

    await t.mutation(api.entries.claim, { token: "tok-khari", challengeId: "big-shot" });
    await drainScheduler(t);

    const leaderCalls = (webpush.sendNotification as any).mock.calls.filter((c: any[]) => {
      const payload = JSON.parse(c[1]);
      return payload.tag?.startsWith("leader-");
    });
    expect(leaderCalls.length).toBe(0);
  });

  it("fires when a new player overtakes the previous leader", async () => {
    const t = convexTest(schema);
    await seedGameLive(t);
    await seedPlayer(t, "khari", "Kahuna");
    await seedPlayer(t, "adan", "Adan-osaurus");

    await t.mutation(api.entries.claim, { token: "tok-khari", challengeId: "shot" });
    await drainScheduler(t);
    const webpush = (await import("web-push")).default as any;
    (webpush.sendNotification as any).mockClear();

    await t.mutation(api.entries.claim, { token: "tok-adan", challengeId: "big-shot" });
    await drainScheduler(t);

    const leaderCalls = (webpush.sendNotification as any).mock.calls.filter((c: any[]) => {
      const payload = JSON.parse(c[1]);
      return payload.tag?.startsWith("leader-");
    });
    expect(leaderCalls.length).toBe(2);
    const payload = JSON.parse(leaderCalls[0][1]);
    expect(payload.body).toContain("Adan-osaurus");
    expect(payload.body).toContain("took the lead");
  });

  it("skips practice days (day-1)", async () => {
    const t = convexTest(schema);
    await seedGameLive(t, "day-1");
    await seedPlayer(t, "khari");

    await t.mutation(api.entries.claim, { token: "tok-khari", challengeId: "shot" });
    await drainScheduler(t);

    const webpush = (await import("web-push")).default as any;
    const leaderCalls = (webpush.sendNotification as any).mock.calls.filter((c: any[]) => {
      const payload = JSON.parse(c[1]);
      return payload.tag?.startsWith("leader-");
    });
    expect(leaderCalls.length).toBe(0);
  });

  it("does not fire when the game is not live", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: false,
        currentDayNumber: 0,
        currentDailyKey: "pre-trip",
        updatedAt: Date.now(),
      });
    });
    await seedPlayer(t, "khari");

    // Directly invoke the check — claim() would throw because games are not live.
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "khari", challengeId: "shot",
        points: 50, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-2", createdAt: Date.now(),
      });
    });
    // Even after scheduling the check, no leader push should fire.
    const { internal } = await import("./_generated/api");
    await t.mutation(internal.leaderboardNotifications._checkDailyLeaderChange, { dailyKey: "day-2" });
    await drainScheduler(t);

    const webpush = (await import("web-push")).default as any;
    const leaderCalls = (webpush.sendNotification as any).mock.calls.filter((c: any[]) => {
      const payload = JSON.parse(c[1]);
      return payload.tag?.startsWith("leader-");
    });
    expect(leaderCalls.length).toBe(0);
  });

  it("fires when a dispute hands the lead to another player", async () => {
    const t = convexTest(schema);
    await seedGameLive(t);
    await seedPlayer(t, "khari", "Kahuna");
    await seedPlayer(t, "adan", "Adan-osaurus");
    await seedPlayer(t, "amelia", "Amelia");

    // Khari claims big-shot (100), Adan claims shot (50). Khari leads.
    await t.mutation(api.entries.claim, { token: "tok-khari", challengeId: "big-shot" });
    await drainScheduler(t);
    await t.mutation(api.entries.claim, { token: "tok-adan", challengeId: "shot" });
    await drainScheduler(t);

    const webpush = (await import("web-push")).default as any;
    (webpush.sendNotification as any).mockClear();

    // Two disputes flip Khari's claim to disputed → it stops counting → Adan leads.
    const khariEntry = await t.run(async (ctx) => {
      const rows = await ctx.db.query("entries").collect();
      return rows.find((r) => r.subjectSlug === "khari")!;
    });
    await t.mutation(api.entries.dispute, { token: "tok-adan", entryId: khariEntry._id });
    await drainScheduler(t);
    await t.mutation(api.entries.dispute, { token: "tok-amelia", entryId: khariEntry._id });
    await drainScheduler(t);

    const leaderCalls = (webpush.sendNotification as any).mock.calls.filter((c: any[]) => {
      const payload = JSON.parse(c[1]);
      return payload.tag?.startsWith("leader-");
    });
    expect(leaderCalls.length).toBeGreaterThan(0);
    const payload = JSON.parse(leaderCalls[0][1]);
    expect(payload.body).toContain("Adan-osaurus");
  });

  it("clears stored leader when the only claim is unclaimed", async () => {
    const t = convexTest(schema);
    await seedGameLive(t);
    await seedPlayer(t, "khari");

    const entryId = await t.mutation(api.entries.claim, { token: "tok-khari", challengeId: "shot" });
    await drainScheduler(t);
    await t.mutation(api.entries.unclaim, { token: "tok-khari", entryId });
    await drainScheduler(t);

    const stored = await t.run(async (ctx) =>
      await ctx.db.query("leaderboardTopState").collect(),
    );
    expect(stored.length).toBe(0);
  });
});
