import { internalMutation } from "./_generated/server";

const V1_SLUGS = ["kai", "khari", "candice", "kyanna", "camara", "miles"];

export const seedPlayers = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const slug of V1_SLUGS) {
      const existing = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!existing) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
      }
    }
  },
});
