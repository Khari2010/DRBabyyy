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
