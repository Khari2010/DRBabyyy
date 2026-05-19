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
