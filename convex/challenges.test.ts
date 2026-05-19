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

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "camara", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "camara", token: "tok-camara", createdAt: Date.now() });
      await ctx.db.insert("challenges", { challengeId: "tat", title: "Tattoo", icon: "🖋️", points: 250, category: "wild", difficulty: "wild", status: "active" });
    });
    await expect(t.mutation(api.challenges.retire, { token: "tok-camara", challengeId: "tat" }))
      .rejects.toThrow(/admin only/);
  });
});
