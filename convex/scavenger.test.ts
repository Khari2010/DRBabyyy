import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seed(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug: "kai", passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: "kai", token: "tok", createdAt: Date.now() });
    await ctx.db.insert("gameState", {
      gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
    });
  });
}

describe("scavenger.getMyFinds", () => {
  it("returns only the requesting player's scavenger entries", async () => {
    const t = convexTest(schema);
    await seed(t);
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok", scavengerItemId: "coconut", photoStorageId: sid });
    const rows = await t.query(api.scavenger.getMyFinds, { token: "tok" });
    expect(rows.length).toBe(1);
    expect(rows[0].scavengerItemId).toBe("coconut");
  });
});

describe("scavenger.getItemFinders", () => {
  it("returns active finders for an item in creation order with photo urls", async () => {
    const t = convexTest(schema);
    await seed(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok2", createdAt: Date.now() });
    });
    const sid1 = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));
    const sid2 = await t.run((ctx) => ctx.storage.store(new Blob(["b"])));
    await t.mutation(api.entries.claimScavenger, { token: "tok", scavengerItemId: "coconut", photoStorageId: sid1 });
    await t.mutation(api.entries.claimScavenger, { token: "tok2", scavengerItemId: "coconut", photoStorageId: sid2 });
    const finders = await t.query(api.scavenger.getItemFinders, { scavengerItemId: "coconut" });
    expect(finders.length).toBe(2);
    expect(finders[0].subjectSlug).toBe("kai");
    expect(finders[1].subjectSlug).toBe("khari");
    expect(finders[0].photoUrl).toBeTruthy();
  });
});
