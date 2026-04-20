import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    slug: v.string(),
    passcodeHash: v.union(v.string(), v.null()),
  }).index("by_slug", ["slug"]),

  answers: defineTable({
    playerSlug: v.string(),
    questionId: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["playerSlug"])
    .index("by_slug_and_question", ["playerSlug", "questionId"]),

  sessions: defineTable({
    playerSlug: v.string(),
    token: v.string(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  activityVotes: defineTable({
    playerSlug: v.string(),
    activityId: v.string(),
    vote: v.union(v.literal("like"), v.literal("dislike")),
    updatedAt: v.number(),
  })
    .index("by_activity", ["activityId"])
    .index("by_player_and_activity", ["playerSlug", "activityId"]),
});
