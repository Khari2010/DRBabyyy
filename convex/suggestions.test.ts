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
