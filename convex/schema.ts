import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── EXISTING TABLES ────────────────────────────────────────────────
  players: defineTable({
    slug: v.string(),
    passcodeHash: v.union(v.string(), v.null()),
    holidayName: v.optional(v.string()),
    roomNumber: v.optional(v.string()),
    catchphrase: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  playerProgress: defineTable({
    slug: v.string(),
    visitedLeaderboard: v.boolean(),
    visitedScavenger: v.boolean(),
    lockscreenSeen: v.boolean(),
    welcomeHidden: v.boolean(),
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

  // ── NEW: CHALLENGES SYSTEM ─────────────────────────────────────────
  challenges: defineTable({
    challengeId: v.string(),
    title: v.string(),
    icon: v.string(),
    points: v.number(),
    bonus: v.optional(v.string()),
    category: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("wild")),
    status: v.union(v.literal("active"), v.literal("retired")),
    createdBySlug: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
  })
    .index("by_challenge_id", ["challengeId"])
    .index("by_status", ["status"]),

  entries: defineTable({
    type: v.union(
      v.literal("challenge"),
      v.literal("negative"),
      v.literal("scavenger"),
      v.literal("flowWin"),
    ),
    subjectSlug: v.string(),
    appliedBySlug: v.optional(v.string()),
    challengeId: v.optional(v.string()),
    negativeId: v.optional(v.string()),
    points: v.number(),
    bonusKey: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("verified"), v.literal("disputed")),
    vouchCount: v.number(),
    disputeCount: v.number(),
    dailyKey: v.string(),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    scavengerItemId: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    scavengerRank: v.optional(v.number()),
  })
    .index("by_subject", ["subjectSlug"])
    .index("by_daily_key", ["dailyKey"])
    .index("by_status", ["status"])
    .index("by_subject_and_daily_key", ["subjectSlug", "dailyKey"])
    .index("by_scavenger_item", ["scavengerItemId"]),

  entryReactions: defineTable({
    entryId: v.id("entries"),
    playerSlug: v.string(),
    reaction: v.union(v.literal("vouch"), v.literal("dispute")),
    at: v.number(),
  })
    .index("by_entry_and_player", ["entryId", "playerSlug"])
    .index("by_entry", ["entryId"]),

  suggestions: defineTable({
    proposerSlug: v.string(),
    title: v.string(),
    icon: v.optional(v.string()),
    points: v.optional(v.number()),
    category: v.optional(v.string()),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("wild"))),
    status: v.union(
      v.literal("proposed"),
      v.literal("voting"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    yesCount: v.number(),
    noCount: v.number(),
    resultingChallengeId: v.optional(v.string()),
    createdAt: v.number(),
    draftedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  suggestionVotes: defineTable({
    suggestionId: v.id("suggestions"),
    voterSlug: v.string(),
    vote: v.union(v.literal("yes"), v.literal("no")),
    at: v.number(),
  }).index("by_suggestion_and_voter", ["suggestionId", "voterSlug"]),

  rollovers: defineTable({
    dayNumber: v.number(),
    dailyKey: v.string(),
    triggeredBySlug: v.string(),
    triggeredAt: v.number(),
    // Bottom of the board — spins the wheel.
    loserSlug: v.optional(v.string()),
    forfeitId: v.optional(v.string()),
    forfeitLabel: v.optional(v.string()),
    // Second-from-bottom — also spins, gets their own forfeit.
    secondLoserSlug: v.optional(v.string()),
    secondForfeitId: v.optional(v.string()),
    secondForfeitLabel: v.optional(v.string()),
    // Third-from-bottom — takes 5 shots (no wheel).
    shotsSlug: v.optional(v.string()),
    spunAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    flowWinnerSlug: v.optional(v.string()),
    flowResolvedAt: v.optional(v.number()),
    flowTieCandidates: v.optional(v.array(v.string())),
    flowForcedClose: v.optional(v.boolean()),
  })
    .index("by_day_number", ["dayNumber"])
    .index("by_daily_key", ["dailyKey"]),

  gameState: defineTable({
    gamesLive: v.boolean(),
    currentDayNumber: v.number(),
    currentDailyKey: v.string(),
    updatedAt: v.number(),
  }),

  adminRoles: defineTable({
    playerSlug: v.string(),
  }).index("by_slug", ["playerSlug"]),

  dayComments: defineTable({
    dayDate: v.string(),
    authorSlug: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_day", ["dayDate"]),

  activityComments: defineTable({
    activityId: v.string(),
    authorSlug: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_activity", ["activityId"]),

  activitySuggestions: defineTable({
    proposerSlug: v.string(),
    title: v.string(),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    cost: v.optional(v.string()),
    status: v.union(
      v.literal("proposed"),
      v.literal("voting"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    yesCount: v.number(),
    noCount: v.number(),
    createdAt: v.number(),
    draftedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  activitySuggestionVotes: defineTable({
    suggestionId: v.id("activitySuggestions"),
    voterSlug: v.string(),
    vote: v.union(v.literal("yes"), v.literal("no")),
    at: v.number(),
  }).index("by_suggestion_and_voter", ["suggestionId", "voterSlug"]),

  itemRsvps: defineTable({
    dayDate: v.string(),
    itemKey: v.string(),
    playerSlug: v.string(),
    status: v.union(v.literal("in"), v.literal("out")),
    updatedAt: v.number(),
  })
    .index("by_day_and_item", ["dayDate", "itemKey"])
    .index("by_player_day_item", ["playerSlug", "dayDate", "itemKey"]),

  flowVotes: defineTable({
    dailyKey: v.string(),
    voterSlug: v.string(),
    voteeSlug: v.string(),
    at: v.number(),
  })
    .index("by_daily_key", ["dailyKey"])
    .index("by_daily_and_voter", ["dailyKey", "voterSlug"]),

  // ── NEW: POSTING WALL SYSTEM ───────────────────────────────────────
  posts: defineTable({
    authorSlug: v.string(),
    text: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  postComments: defineTable({
    postId: v.id("posts"),
    authorSlug: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_post", ["postId"]),

  postReactions: defineTable({
    postId: v.id("posts"),
    playerSlug: v.string(),
    emoji: v.string(),
    at: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_post_and_player", ["postId", "playerSlug"]),

  pushSubscriptions: defineTable({
    playerSlug: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_player", ["playerSlug"])
    .index("by_endpoint", ["endpoint"]),
});
