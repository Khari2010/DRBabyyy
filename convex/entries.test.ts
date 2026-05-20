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

  it("rejects vouching after the day rolls over", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      // game has advanced to day-2 but the entry was created on day-1
      await ctx.db.insert("gameState", {
        gamesLive: true,
        currentDayNumber: 2,
        currentDailyKey: "day-2",
        updatedAt: Date.now(),
      });
      entryId = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
    });
    await expect(t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId }))
      .rejects.toThrow(/day is locked/);
  });

  it("rejects vouching after lockDay (gameState still at the same day)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true,
        currentDayNumber: 1,
        currentDailyKey: "day-1",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1",
        triggeredBySlug: "khari", triggeredAt: Date.now(),
        closedAt: Date.now(),
      });
      entryId = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
    });
    await expect(t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId }))
      .rejects.toThrow(/day is locked/);
  });
});

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

  it("does not change status on a verified entry (verified is final)", async () => {
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
    expect(after?.disputeCount).toBe(1);
  });

  it("rejects disputing after the day rolls over", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true,
        currentDayNumber: 2,
        currentDailyKey: "day-2",
        updatedAt: Date.now(),
      });
      entryId = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
    });
    await expect(t.mutation(api.entries.dispute, { token: "tok-kyanna", entryId }))
      .rejects.toThrow(/day is locked/);
  });

  it("rejects disputing after lockDay (gameState still at the same day)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true,
        currentDayNumber: 1,
        currentDailyKey: "day-1",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1",
        triggeredBySlug: "khari", triggeredAt: Date.now(),
        closedAt: Date.now(),
      });
      entryId = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
    });
    await expect(t.mutation(api.entries.dispute, { token: "tok-kyanna", entryId }))
      .rejects.toThrow(/day is locked/);
  });
});

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

  it("rejects when games not live", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: false, currentDayNumber: 0, currentDailyKey: "pre-trip", updatedAt: Date.now(),
      });
    });
    await expect(t.mutation(api.entries.logNegative, {
      token: "tok-kai", subjectSlug: "camara", negativeId: "throw-up",
    })).rejects.toThrow(/games not live/);
  });
});

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

describe("entries.applyForfeitDeduct", () => {
  it("inserts a system-applied negative on the chosen target (verified, not disputable)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "khari", "tok-khari");
    await t.run(async (ctx) => {
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 2, currentDailyKey: "day-2", updatedAt: Date.now(),
      });
    });
    await t.mutation(api.entries.applyForfeitDeduct, {
      token: "tok-khari",
      targetSlug: "miles",
      amount: 50,
    });
    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].subjectSlug).toBe("miles");
    expect(rows[0].points).toBe(-50);
    expect(rows[0].status).toBe("verified");
    expect(rows[0].appliedBySlug).toBe("system");
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await seedSession(t, "camara", "tok-camara");
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 2, currentDailyKey: "day-2", updatedAt: Date.now(),
      });
    });
    await expect(t.mutation(api.entries.applyForfeitDeduct, {
      token: "tok-camara", targetSlug: "miles", amount: 50,
    })).rejects.toThrow(/admin only/);
  });

  it("uses absolute value (cannot deduct negative)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "khari", "tok-khari");
    await t.run(async (ctx) => {
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 2, currentDailyKey: "day-2", updatedAt: Date.now(),
      });
    });
    await t.mutation(api.entries.applyForfeitDeduct, {
      token: "tok-khari", targetSlug: "miles", amount: -25,
    });
    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows[0].points).toBe(-25); // -|-25| = -25
  });
});

describe("entries.claimScavenger", () => {
  it("inserts an entry with rank=1 and +5 bonus on first claim", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);

    const storageId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(["x"], { type: "image/jpeg" }));
    });

    await t.mutation(api.entries.claimScavenger, {
      token: "tok-kai",
      scavengerItemId: "coconut",
      photoStorageId: storageId,
    });

    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("scavenger");
    expect(rows[0].subjectSlug).toBe("kai");
    expect(rows[0].scavengerItemId).toBe("coconut");
    expect(rows[0].scavengerRank).toBe(1);
    expect(rows[0].points).toBe(10); // 5 base + 5 first-finder bonus
    expect(rows[0].status).toBe("active");
    expect(rows[0].photoStorageId).toBe(storageId);
  });

  it("gives rank=2 with no bonus to the second finder (daily mode)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedGameLive(t);
    const sid1 = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));
    const sid2 = await t.run((ctx) => ctx.storage.store(new Blob(["b"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid1 });
    await t.mutation(api.entries.claimScavenger, { token: "tok-khari", scavengerItemId: "coconut", photoStorageId: sid2 });

    const rows = await t.run((ctx) =>
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", "khari")).collect(),
    );
    expect(rows[0].scavengerRank).toBe(2);
    expect(rows[0].points).toBe(5); // base only — daily mode has no rank-2 bonus
  });

  it("gives rank=3 with no bonus to the third+ finder", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedSession(t, "adan", "tok-adan");
    await seedGameLive(t);
    const sid = () => t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-khari", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-adan", scavengerItemId: "coconut", photoStorageId: await sid() });

    const rows = await t.run((ctx) =>
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", "adan")).collect(),
    );
    expect(rows[0].scavengerRank).toBe(3);
    expect(rows[0].points).toBe(5); // base only
  });

  it("rejects duplicate active claim by the same player", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid });
    await expect(
      t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid }),
    ).rejects.toThrow("already claimed");
  });

  it("rejects when games are not live", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: false, currentDayNumber: 0, currentDailyKey: "pre-trip", updatedAt: Date.now(),
      });
    });
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid }),
    ).rejects.toThrow("games not live");
  });

  it("rejects unknown item id", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "no-such-thing", photoStorageId: sid }),
    ).rejects.toThrow("unknown item");
  });

  it("ignores disputed entries when assigning rank", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedGameLive(t);

    const sid1 = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));
    const sid2 = await t.run((ctx) => ctx.storage.store(new Blob(["b"])));

    // Kai claims first (rank 1) then their entry is marked disputed manually.
    await t.mutation(api.entries.claimScavenger, {
      token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid1,
    });
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("entries")
        .withIndex("by_subject", (q) => q.eq("subjectSlug", "kai"))
        .first();
      if (row) await ctx.db.patch(row._id, { status: "disputed" });
    });

    // Khari claims after — should still be rank 1 because the only active count is 0.
    await t.mutation(api.entries.claimScavenger, {
      token: "tok-khari", scavengerItemId: "coconut", photoStorageId: sid2,
    });

    const khariRow = await t.run((ctx) =>
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", "khari")).first(),
    );
    expect(khariRow!.scavengerRank).toBe(1);
    expect(khariRow!.points).toBe(10); // 5 + 5 first bonus
  });
});

describe("entries.rejectScavenger", () => {
  it("disputes the entry and slides later finders up one rank", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedSession(t, "adan", "tok-adan");
    await seedGameLive(t);
    // Make Khari (the rejecter) an admin.
    await t.run(async (ctx) => {
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
    });

    const sid = () => t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-khari", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-adan", scavengerItemId: "coconut", photoStorageId: await sid() });

    const kaiEntry = await t.run((ctx) =>
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", "kai")).first(),
    );
    expect(kaiEntry).not.toBeNull();

    await t.mutation(api.entries.rejectScavenger, {
      token: "tok-khari",
      entryId: kaiEntry!._id,
    });

    const all = await t.run((ctx) => ctx.db.query("entries").collect());
    const kaiAfter = all.find((e) => e.subjectSlug === "kai");
    const khariAfter = all.find((e) => e.subjectSlug === "khari");
    const adanAfter = all.find((e) => e.subjectSlug === "adan");

    expect(kaiAfter!.status).toBe("disputed");
    // Khari was rank 2 → slides up to rank 1, daily-mode points 5 + 5 = 10.
    expect(khariAfter!.scavengerRank).toBe(1);
    expect(khariAfter!.points).toBe(10);
    // Adan was rank 3 → slides up to rank 2, daily-mode no bonus = 5.
    expect(adanAfter!.scavengerRank).toBe(2);
    expect(adanAfter!.points).toBe(5);
  });

  it("rejects when caller is not an admin", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedGameLive(t);
    // Khari is NOT an admin in this test.

    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, {
      token: "tok-kai", scavengerItemId: "coconut", photoStorageId: sid,
    });
    const kaiEntry = await t.run((ctx) =>
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", "kai")).first(),
    );

    await expect(
      t.mutation(api.entries.rejectScavenger, {
        token: "tok-khari", entryId: kaiEntry!._id,
      }),
    ).rejects.toThrow();
  });

  it("renumbers correctly when 5 players claim the same item (daily mode)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");
    await seedSession(t, "adan", "tok-adan");
    await seedSession(t, "tash", "tok-tash");
    await seedSession(t, "mo", "tok-mo");
    await seedGameLive(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
    });

    const sid = () => t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok-kai", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-khari", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-adan", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-tash", scavengerItemId: "coconut", photoStorageId: await sid() });
    await t.mutation(api.entries.claimScavenger, { token: "tok-mo", scavengerItemId: "coconut", photoStorageId: await sid() });

    // Daily mode: ranks are sequential (no cap). 1, 2, 3, 4, 5.
    const before = await t.run((ctx) => ctx.db.query("entries").collect());
    const beforeByPlayer = Object.fromEntries(before.map((e) => [e.subjectSlug, e.scavengerRank]));
    expect(beforeByPlayer.kai).toBe(1);
    expect(beforeByPlayer.khari).toBe(2);
    expect(beforeByPlayer.adan).toBe(3);
    expect(beforeByPlayer.tash).toBe(4);
    expect(beforeByPlayer.mo).toBe(5);

    const kaiEntry = before.find((e) => e.subjectSlug === "kai")!;
    await t.mutation(api.entries.rejectScavenger, {
      token: "tok-khari", entryId: kaiEntry._id,
    });

    // After: survivors slide up. Khari → rank 1 (+5 bonus), others stay base 5.
    const after = await t.run((ctx) => ctx.db.query("entries").collect());
    const find = (slug: string) => after.find((e) => e.subjectSlug === slug)!;

    expect(find("kai").status).toBe("disputed");
    expect(find("khari").scavengerRank).toBe(1);
    expect(find("khari").points).toBe(10); // 5 + 5 first-finder
    expect(find("adan").scavengerRank).toBe(2);
    expect(find("adan").points).toBe(5);
    expect(find("tash").scavengerRank).toBe(3);
    expect(find("tash").points).toBe(5);
    expect(find("mo").scavengerRank).toBe(4);
    expect(find("mo").points).toBe(5);
  });
});

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
        createdAt: Date.now() - 10_000,
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
        createdAt: Date.now() - 120_000,
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

describe("claimScavenger — daily mode (day-2+)", () => {
  async function setupDailyMode(t: ReturnType<typeof convexTest>) {
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 2, currentDailyKey: "day-2", updatedAt: 1,
      });
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-k", createdAt: 1 });
      await ctx.db.insert("players", { slug: "kai", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "kai", token: "tok-kai", createdAt: 1 });
    });
  }

  it("first finder of today's item gets base 5 + bonus 5 = 10 pts", async () => {
    const t = convexTest(schema);
    await setupDailyMode(t);
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"], { type: "image/jpeg" })));
    const entryId = await t.mutation(api.entries.claimScavenger, {
      token: "tok-k",
      scavengerItemId: "tres-leches",
      photoStorageId: sid,
    });
    const entry = await t.run((ctx) => ctx.db.get(entryId));
    expect(entry?.points).toBe(10);
    expect(entry?.scavengerRank).toBe(1);
  });

  it("second finder of today's item gets base 5 only (no bonus)", async () => {
    const t = convexTest(schema);
    await setupDailyMode(t);
    const sid1 = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));
    const sid2 = await t.run((ctx) => ctx.storage.store(new Blob(["b"])));
    await t.mutation(api.entries.claimScavenger, {
      token: "tok-k",
      scavengerItemId: "starfish",
      photoStorageId: sid1,
    });
    const entryId = await t.mutation(api.entries.claimScavenger, {
      token: "tok-kai",
      scavengerItemId: "starfish",
      photoStorageId: sid2,
    });
    const entry = await t.run((ctx) => ctx.db.get(entryId));
    expect(entry?.points).toBe(5);
    expect(entry?.scavengerRank).toBe(2);
  });

  it("rejects claim for an item NOT in today's set", async () => {
    const t = convexTest(schema);
    await setupDailyMode(t);
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.entries.claimScavenger, {
        token: "tok-k",
        scavengerItemId: "coconut",
        photoStorageId: sid,
      }),
    ).rejects.toThrow(/not today's item/);
  });
});

describe("claimScavenger — Day 1 (now daily mode too)", () => {
  it("rejects items not in Day 1's picks", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: 1,
      });
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-k", createdAt: 1 });
    });
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.entries.claimScavenger, {
        token: "tok-k",
        scavengerItemId: "domino",
        photoStorageId: sid,
      }),
    ).rejects.toThrow(/not today's item/);
  });

  it("scores Day 1 first-finder at base 5 + bonus 5 = 10 pts", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: 1,
      });
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-k", createdAt: 1 });
    });
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    const entryId = await t.mutation(api.entries.claimScavenger, {
      token: "tok-k",
      scavengerItemId: "coconut",
      photoStorageId: sid,
    });
    const entry = await t.run((ctx) => ctx.db.get(entryId));
    expect(entry?.points).toBe(10);
  });
});
