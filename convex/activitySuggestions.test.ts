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

describe("activitySuggestions.create", () => {
  it("creates a proposed suggestion", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.activitySuggestions.create, {
      token: "tok-khari", title: "Hoyo Azul", notes: "natural cenote",
    });
    const rows = await t.run((ctx) => ctx.db.query("activitySuggestions").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe("Hoyo Azul");
    expect(rows[0].status).toBe("proposed");
  });

  it("rejects empty title", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await expect(t.mutation(api.activitySuggestions.create, {
      token: "tok-khari", title: "  ",
    })).rejects.toThrow(/title required/);
  });
});

describe("activitySuggestions.draft", () => {
  it("admin transitions to voting with category + cost", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari", true);
    await seedPlayer(t, "kai");
    await t.mutation(api.activitySuggestions.create, { token: "tok-kai", title: "Zip" });
    const s = await t.run((ctx) => ctx.db.query("activitySuggestions").first());
    await t.mutation(api.activitySuggestions.draft, {
      token: "tok-khari", suggestionId: s!._id, category: "excursion", cost: "$60pp",
    });
    const after = await t.run((ctx) => ctx.db.get(s!._id));
    expect(after!.status).toBe("voting");
    expect(after!.category).toBe("excursion");
    expect(after!.cost).toBe("$60pp");
  });
});

describe("activitySuggestions.vote", () => {
  async function setupVoting(t: ReturnType<typeof convexTest>) {
    await seedPlayer(t, "khari", true);
    for (const slug of ["kai", "kyanna", "candice", "camara", "miles", "ebony", "justin"]) {
      await seedPlayer(t, slug);
    }
    await seedPlayer(t, "proposer");
    await t.mutation(api.activitySuggestions.create, { token: "tok-proposer", title: "X" });
    const s = await t.run((ctx) => ctx.db.query("activitySuggestions").first());
    await t.mutation(api.activitySuggestions.draft, {
      token: "tok-khari", suggestionId: s!._id, category: "excursion", cost: "$30pp",
    });
    return s!._id;
  }

  it("5 yes → approved", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    for (const slug of ["kai", "kyanna", "candice", "camara", "miles"]) {
      await t.mutation(api.activitySuggestions.vote, { token: `tok-${slug}`, suggestionId: id, vote: "yes" });
    }
    const s = await t.run((ctx) => ctx.db.get(id));
    expect(s!.status).toBe("approved");
  });

  it("rejects self-vote", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    await expect(t.mutation(api.activitySuggestions.vote, {
      token: "tok-proposer", suggestionId: id, vote: "yes",
    })).rejects.toThrow(/cannot vote on own/);
  });
});
