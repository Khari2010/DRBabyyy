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

describe("rollovers.lockDay", () => {
  it("sets loserSlug + closedAt on the closing day rollover; does NOT advance gameState", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    // Bootstrap to Day 1 via existing trigger (kickoff path)
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    // Seed entries so there's a clear loser
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "negative", subjectSlug: "camara", negativeId: "throw-up", appliedBySlug: "kai", points: -50, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(1); // NOT advanced
    const day1 = await t.run((ctx) =>
      ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first(),
    );
    expect(day1?.loserSlug).toBe("camara");
    expect(day1?.closedAt).toBeDefined();
  });

  it("refuses non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.lockDay, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
  });

  it("refuses when day is already locked", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.lockDay, { token: "tok-khari" }))
      .rejects.toThrow(/already locked/);
  });

  it("refuses when games are not live", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    // gameState exists from setupAdmins but gamesLive=false; no trigger yet
    await expect(t.mutation(api.rollovers.lockDay, { token: "tok-khari" }))
      .rejects.toThrow(/games not live/);
  });

  it("locks an empty day with no loserSlug", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    // No entries at all
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const day1 = await t.run((ctx) =>
      ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first(),
    );
    expect(day1?.closedAt).toBeDefined();
    expect(day1?.loserSlug).toBeUndefined();
  });

  it("server-picks a forfeit and stores forfeitId + forfeitLabel + spunAt", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const row = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    expect(typeof row?.forfeitId).toBe("string");
    expect(typeof row?.forfeitLabel).toBe("string");
    expect(typeof row?.spunAt).toBe("number");
  });

  it("does not pick a forfeit on empty days (no loser)", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    // no entries
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const row = await t.run((ctx) =>
      ctx.db.query("rollovers").filter((q) => q.eq(q.field("dayNumber"), 1)).first());
    expect(row?.closedAt).toBeTypeOf("number");
    expect(row?.loserSlug).toBeUndefined();
    expect(row?.forfeitId).toBeUndefined();
  });

  it("does not re-pick the previous day's forfeit", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    // Seed a day-1 rollover that already has a forfeit assigned.
    await t.run(async (ctx) => {
      const state = await ctx.db.query("gameState").first();
      await ctx.db.patch(state!._id, {
        gamesLive: true,
        currentDayNumber: 2,
        currentDailyKey: "day-2",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1,
        dailyKey: "day-1",
        triggeredBySlug: "khari",
        triggeredAt: Date.now(),
        loserSlug: "camara",
        closedAt: Date.now(),
        forfeitId: "wax",
        forfeitLabel: "Wax",
        spunAt: Date.now(),
        flowWinnerSlug: "khari",
        flowResolvedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 2,
        dailyKey: "day-2",
        triggeredBySlug: "khari",
        triggeredAt: Date.now(),
      });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-2", createdAt: Date.now() });
    });
    // Run lockDay many times — each fresh setup picks from the pool with
    // "wax" excluded, so we should never see it on day 2.
    for (let i = 0; i < 20; i++) {
      // Reset day-2 rollover to unlocked between attempts.
      await t.run(async (ctx) => {
        const row = await ctx.db.query("rollovers")
          .withIndex("by_day_number", (q) => q.eq("dayNumber", 2)).first();
        await ctx.db.patch(row!._id, { closedAt: undefined, forfeitId: undefined, forfeitLabel: undefined, spunAt: undefined, loserSlug: undefined });
      });
      await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
      const row = await t.run((ctx) => ctx.db.query("rollovers")
        .withIndex("by_day_number", (q) => q.eq("dayNumber", 2)).first());
      expect(row?.forfeitId).not.toBe("wax");
    }
  });
});

describe("rollovers.relock", () => {
  it("updates loserSlug + re-picks forfeit when the leaderboard's lowest has changed", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    // Seed initial entries: camara is lowest.
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 50, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "camara", challengeId: "x", points: 20, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const lockedRow = await t.run((ctx) =>
      ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first());
    expect(lockedRow?.loserSlug).toBe("camara");
    const lockedForfeit = lockedRow?.forfeitId;

    // Late entry slams kai's total below camara's.
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "negative", subjectSlug: "kai", negativeId: "throw-up", appliedBySlug: "khari", points: -100, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.relock, { token: "tok-khari" });
    const relocked = await t.run((ctx) =>
      ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first());
    expect(relocked?.loserSlug).toBe("kai");
    expect(relocked?.forfeitId).not.toBe(lockedForfeit);
    expect(typeof relocked?.forfeitId).toBe("string");
  });

  it("is a no-op when the loser is already correct", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "camara", challengeId: "x", points: 20, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    const before = await t.run((ctx) =>
      ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first());
    await t.mutation(api.rollovers.relock, { token: "tok-khari" });
    const after = await t.run((ctx) =>
      ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first());
    expect(after?.loserSlug).toBe(before?.loserSlug);
    expect(after?.forfeitId).toBe(before?.forfeitId);
  });

  it("refuses when the day is not yet locked", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.relock, { token: "tok-khari" }))
      .rejects.toThrow(/day not locked/);
  });

  it("refuses once Flow State has resolved", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "camara", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });
    await expect(t.mutation(api.rollovers.relock, { token: "tok-khari" }))
      .rejects.toThrow(/already resolved/);
  });

  it("refuses non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.trigger, { token: "tok-khari" });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    await expect(t.mutation(api.rollovers.relock, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
  });
});

describe("rollovers.advance", () => {
  it("kickoff: pre-trip → Day 1 (no lock required)", async () => {
    const t = convexTest(schema);
    await setupAdmins(t); // gamesLive=false at this point
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.gamesLive).toBe(true);
    expect(state?.currentDayNumber).toBe(1);
    expect(state?.currentDailyKey).toBe("day-1");
    const rows = await t.run((ctx) => ctx.db.query("rollovers").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].dayNumber).toBe(1);
  });

  it("refuses to advance when current day is not locked", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" }); // kickoff → Day 1
    await expect(t.mutation(api.rollovers.advance, { token: "tok-khari" }))
      .rejects.toThrow(/lock the day first/);
  });

  it("refuses to advance when day is locked but Flow State is not resolved", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" }); // kickoff
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    // closedAt is set, but flowWinnerSlug is not
    await expect(t.mutation(api.rollovers.advance, { token: "tok-khari" }))
      .rejects.toThrow(/resolve flow state|flow.*not resolved/i);
  });

  it("advances when day is locked AND flowWinnerSlug is set", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    await t.mutation(api.rollovers.lockDay, { token: "tok-khari" });
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers").withIndex("by_day_number", (q) => q.eq("dayNumber", 1)).first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });
    await t.mutation(api.rollovers.advance, { token: "tok-khari" });
    const state = await t.run((ctx) => ctx.db.query("gameState").first());
    expect(state?.currentDayNumber).toBe(2);
    expect(state?.currentDailyKey).toBe("day-2");
    const rows = await t.run((ctx) => ctx.db.query("rollovers").collect());
    expect(rows.length).toBe(2);
    expect(rows.find((r) => r.dayNumber === 2)).toBeDefined();
  });

  it("refuses non-admin", async () => {
    const t = convexTest(schema);
    await setupAdmins(t);
    await expect(t.mutation(api.rollovers.advance, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
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
