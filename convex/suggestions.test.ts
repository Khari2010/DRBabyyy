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
    expect(rows[0].yesCount).toBe(0);
    expect(rows[0].noCount).toBe(0);
  });

  it("rejects empty title", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "justin");
    await expect(t.mutation(api.suggestions.create, { token: "tok-justin", title: "  " }))
      .rejects.toThrow(/title required/);
  });

  it("rejects invalid session", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.suggestions.create, { token: "bogus", title: "X" }))
      .rejects.toThrow(/invalid session/);
  });
});

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
    expect(after?.category).toBe("chill");
    expect(after?.difficulty).toBe("medium");
    expect(after?.icon).toBe("🥥");
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

  it("cannot draft suggestion not in 'proposed' status", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "justin");
    await seedPlayer(t, "khari", true);
    let sid: any;
    await t.run(async (ctx) => {
      sid = await ctx.db.insert("suggestions", {
        proposerSlug: "justin", title: "Already voting", status: "voting",
        yesCount: 0, noCount: 0, createdAt: Date.now(),
      });
    });
    await expect(t.mutation(api.suggestions.draft, {
      token: "tok-khari", suggestionId: sid, points: 10, category: "chill",
    })).rejects.toThrow(/cannot draft/);
  });
});

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
    expect(ch?.points).toBe(25);
    expect(ch?.status).toBe("active");
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

  it("rejects vote on suggestion not in voting status", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    let sid: any;
    await t.run(async (ctx) => {
      sid = await ctx.db.insert("suggestions", {
        proposerSlug: "other", title: "X", status: "proposed",
        yesCount: 0, noCount: 0, createdAt: Date.now(),
      });
    });
    await expect(t.mutation(api.suggestions.vote, { token: "tok-kai", suggestionId: sid, vote: "yes" }))
      .rejects.toThrow(/cannot vote/);
  });
});

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

  it("non-admin cannot reject", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "justin");
    await seedPlayer(t, "camara");
    await t.mutation(api.suggestions.create, { token: "tok-justin", title: "X" });
    const s = await t.run((ctx) => ctx.db.query("suggestions").first());
    await expect(t.mutation(api.suggestions.reject, { token: "tok-camara", suggestionId: s!._id }))
      .rejects.toThrow(/admin only/);
  });

  it("cannot reject already-resolved suggestion", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari", true);
    let sid: any;
    await t.run(async (ctx) => {
      sid = await ctx.db.insert("suggestions", {
        proposerSlug: "x", title: "X", status: "approved",
        yesCount: 5, noCount: 0, createdAt: Date.now(),
      });
    });
    await expect(t.mutation(api.suggestions.reject, { token: "tok-khari", suggestionId: sid }))
      .rejects.toThrow(/already resolved/);
  });
});

describe("suggestions.list", () => {
  it("returns all suggestions", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("suggestions", { proposerSlug: "a", title: "P", status: "proposed", yesCount: 0, noCount: 0, createdAt: Date.now() });
      await ctx.db.insert("suggestions", { proposerSlug: "b", title: "V", status: "voting", yesCount: 1, noCount: 0, createdAt: Date.now() });
    });
    const all = await t.query(api.suggestions.list, {});
    expect(all.length).toBe(2);
  });
});

describe("suggestions.myVote", () => {
  it("returns vote for token holder", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    let sid: any;
    await t.run(async (ctx) => {
      sid = await ctx.db.insert("suggestions", {
        proposerSlug: "other", title: "X", status: "voting",
        yesCount: 0, noCount: 0, createdAt: Date.now(),
      });
      await ctx.db.insert("suggestionVotes", {
        suggestionId: sid, voterSlug: "kai", vote: "yes", at: Date.now(),
      });
    });
    const v = await t.query(api.suggestions.myVote, { token: "tok-kai", suggestionId: sid });
    expect(v).toBe("yes");
  });

  it("returns null when no vote cast", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    let sid: any;
    await t.run(async (ctx) => {
      sid = await ctx.db.insert("suggestions", {
        proposerSlug: "other", title: "X", status: "voting",
        yesCount: 0, noCount: 0, createdAt: Date.now(),
      });
    });
    const v = await t.query(api.suggestions.myVote, { token: "tok-kai", suggestionId: sid });
    expect(v).toBeNull();
  });
});
