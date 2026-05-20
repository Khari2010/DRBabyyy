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

  it("rejects a second trigger for the same closing day", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // kickoff → Day 1
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // close Day 1 → Day 2

    // Manually rewind gameState back to Day 1 to simulate a stale client retrying
    await t.run(async (ctx) => {
      const state = await ctx.db.query("gameState").first();
      await ctx.db.patch(state!._id, {
        currentDayNumber: 1,
        currentDailyKey: "day-1",
        updatedAt: Date.now(),
      });
    });

    await expect(t.mutation(api.rollovers.trigger, { token: "tok-khari" }))
      .rejects.toThrow(/day already closed/);
  });
});

describe("rollovers.recordForfeit", () => {
  it("records the forfeit on a rollover row", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
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
    expect(after?.forfeitLabel).toBe("Cold shower (1 min)");
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

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    const day1 = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    await expect(t.mutation(api.rollovers.recordForfeit, {
      token: "tok-camara", rolloverId: day1!._id, forfeitId: "x", forfeitLabel: "X",
    })).rejects.toThrow(/admin only/);
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

  it("returns null for unknown day", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    const r = await t.query(api.rollovers.get, { dayNumber: 99 });
    expect(r).toBeNull();
  });
});

describe("rollovers.undoLast", () => {
  it("removes the most recent rollover and reverses gameState to previous day", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // kickoff → Day 1
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // close Day 1 → Day 2
    await t.mutation(api.rollovers.undoLast, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(1);
    expect(state?.currentDailyKey).toBe("day-1");
    expect(state?.gamesLive).toBe(true);
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
    const rows = await t.run((ctx) => ctx.db.query("rollovers").collect());
    expect(rows.length).toBe(0);
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.undoLast, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
  });

  it("rejects when no rollovers exist", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await expect(t.mutation(api.rollovers.undoLast, { token: "tok-khari" }))
      .rejects.toThrow(/no rollovers to undo/);
  });
});
