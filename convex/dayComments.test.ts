import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug, isAdmin = false) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    if (isAdmin) await ctx.db.insert("adminRoles", { playerSlug: slug });
  });
}

describe("dayComments.add", () => {
  it("inserts a comment with the caller as author", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.dayComments.add, {
      token: "tok-khari", dayDate: "21 May", text: "Excited for Saona",
    });
    const rows = await t.run((ctx) => ctx.db.query("dayComments").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].authorSlug).toBe("khari");
    expect(rows[0].dayDate).toBe("21 May");
    expect(rows[0].text).toBe("Excited for Saona");
  });

  it("rejects empty text", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await expect(t.mutation(api.dayComments.add, {
      token: "tok-khari", dayDate: "21 May", text: "  ",
    })).rejects.toThrow(/text required/);
  });

  it("rejects invalid session", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.dayComments.add, {
      token: "bogus", dayDate: "21 May", text: "hi",
    })).rejects.toThrow(/invalid session/);
  });

  it("caps text at 280 chars", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const long = "x".repeat(500);
    await t.mutation(api.dayComments.add, {
      token: "tok-khari", dayDate: "21 May", text: long,
    });
    const rows = await t.run((ctx) => ctx.db.query("dayComments").collect());
    expect(rows[0].text.length).toBe(280);
  });
});
