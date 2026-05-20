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

describe("players.getPlayerDay", () => {
  it("returns scoped claims, fouls, and vouches for the dailyKey", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");

    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "sing-in-public",
        title: "Sing in Public",
        icon: "🎤",
        points: 15,
        category: "wild",
        difficulty: "wild",
        status: "active",
      });
      // kai claims on day-1 (verified)
      const e1 = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "sing-in-public",
        points: 15, status: "verified", vouchCount: 1, disputeCount: 0,
        dailyKey: "day-1", createdAt: 100,
      });
      // kai fouled on day-1
      await ctx.db.insert("entries", {
        type: "negative", subjectSlug: "kai", appliedBySlug: "khari",
        negativeId: "throw-up", points: -50,
        status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: 200,
      });
      // kai claims on day-2 (different day, should be excluded)
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "sing-in-public",
        points: 15, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-2", createdAt: 300,
      });
      // khari vouches kai's day-1 claim
      await ctx.db.insert("entryReactions", {
        entryId: e1, playerSlug: "khari", reaction: "vouch", at: 150,
      });
    });

    const data = await t.query(api.players.getPlayerDay, {
      slug: "kai", dailyKey: "day-1",
    });

    expect(data.claims).toHaveLength(1);
    expect(data.claims[0].label).toBe("Sing in Public");
    expect(data.claims[0].labelIcon).toBe("🎤");
    expect(data.claims[0].status).toBe("verified");
    expect(data.fouls).toHaveLength(1);
    expect(data.fouls[0].label).toBe("Throwing up");
    expect(data.fouls[0].points).toBe(-50);
    expect(data.vouchedBy).toEqual({ khari: 1 });
  });

  it("returns all-time data when dailyKey is omitted", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");

    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "x", title: "X", icon: "X", points: 10,
        category: "wild", difficulty: "wild", status: "active",
      });
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: 100,
      });
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-2", createdAt: 200,
      });
    });

    const data = await t.query(api.players.getPlayerDay, { slug: "kai" });
    expect(data.claims).toHaveLength(2);
  });

  it("excludes disputed entries from the vouchedBy tally", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");

    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "x", title: "X", icon: "X", points: 10,
        category: "wild", difficulty: "wild", status: "active",
      });
      const e = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "disputed", vouchCount: 1, disputeCount: 2,
        dailyKey: "day-1", createdAt: 100,
      });
      await ctx.db.insert("entryReactions", {
        entryId: e, playerSlug: "khari", reaction: "vouch", at: 150,
      });
    });

    const data = await t.query(api.players.getPlayerDay, { slug: "kai", dailyKey: "day-1" });
    expect(data.claims).toHaveLength(1);
    expect(data.claims[0].status).toBe("disputed");
    expect(data.vouchedBy).toEqual({}); // vouch on a disputed entry doesn't count
  });
});
