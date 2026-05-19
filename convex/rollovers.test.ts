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

  it("rejects invalid session", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await expect(t.mutation(api.rollovers.trigger, { token: "bogus" }))
      .rejects.toThrow(/invalid session/);
  });
});
