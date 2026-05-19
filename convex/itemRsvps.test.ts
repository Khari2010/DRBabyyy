import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
  });
}

describe("itemRsvps.setItemRsvp", () => {
  it("inserts a new RSVP", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.itemRsvps.setItemRsvp, {
      token: "tok-khari", dayDate: "21 May", itemKey: "0", status: "in",
    });
    const rows = await t.run((ctx) => ctx.db.query("itemRsvps").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe("in");
  });

  it("upserts an existing RSVP for the same player+day+item", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.itemRsvps.setItemRsvp, {
      token: "tok-khari", dayDate: "21 May", itemKey: "0", status: "in",
    });
    await t.mutation(api.itemRsvps.setItemRsvp, {
      token: "tok-khari", dayDate: "21 May", itemKey: "0", status: "out",
    });
    const rows = await t.run((ctx) => ctx.db.query("itemRsvps").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe("out");
  });

  it("rejects invalid session", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.itemRsvps.setItemRsvp, {
      token: "bogus", dayDate: "21 May", itemKey: "0", status: "in",
    })).rejects.toThrow(/invalid session/);
  });
});

describe("itemRsvps.clearItemRsvp", () => {
  it("deletes an existing RSVP", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.itemRsvps.setItemRsvp, {
      token: "tok-khari", dayDate: "21 May", itemKey: "0", status: "in",
    });
    await t.mutation(api.itemRsvps.clearItemRsvp, {
      token: "tok-khari", dayDate: "21 May", itemKey: "0",
    });
    const rows = await t.run((ctx) => ctx.db.query("itemRsvps").collect());
    expect(rows.length).toBe(0);
  });
});

describe("itemRsvps.rsvpsForDay", () => {
  it("returns RSVPs grouped by itemKey", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("itemRsvps", { dayDate: "21 May", itemKey: "0", playerSlug: "khari", status: "in", updatedAt: now });
      await ctx.db.insert("itemRsvps", { dayDate: "21 May", itemKey: "0", playerSlug: "kai", status: "in", updatedAt: now });
      await ctx.db.insert("itemRsvps", { dayDate: "21 May", itemKey: "0", playerSlug: "camara", status: "out", updatedAt: now });
      await ctx.db.insert("itemRsvps", { dayDate: "21 May", itemKey: "1", playerSlug: "khari", status: "in", updatedAt: now });
      // Different day — should be filtered out
      await ctx.db.insert("itemRsvps", { dayDate: "22 May", itemKey: "0", playerSlug: "khari", status: "in", updatedAt: now });
    });
    const grouped = await t.query(api.itemRsvps.rsvpsForDay, { dayDate: "21 May" });
    expect(grouped["0"]?.in?.sort()).toEqual(["kai", "khari"]);
    expect(grouped["0"]?.out).toEqual(["camara"]);
    expect(grouped["1"]?.in).toEqual(["khari"]);
  });
});
