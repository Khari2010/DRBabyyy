/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _seedData_challenges from "../_seedData/challenges.js";
import type * as activityComments from "../activityComments.js";
import type * as activitySuggestions from "../activitySuggestions.js";
import type * as activityVotes from "../activityVotes.js";
import type * as admin from "../admin.js";
import type * as answers from "../answers.js";
import type * as auth from "../auth.js";
import type * as challenges from "../challenges.js";
import type * as dayComments from "../dayComments.js";
import type * as entries from "../entries.js";
import type * as flowVotes from "../flowVotes.js";
import type * as gameState from "../gameState.js";
import type * as helpers from "../helpers.js";
import type * as itemRsvps from "../itemRsvps.js";
import type * as leaderboard from "../leaderboard.js";
import type * as leaderboardNotifications from "../leaderboardNotifications.js";
import type * as players from "../players.js";
import type * as postComments from "../postComments.js";
import type * as postReactions from "../postReactions.js";
import type * as posts from "../posts.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushNotificationsActions from "../pushNotificationsActions.js";
import type * as pushNotificationsQueries from "../pushNotificationsQueries.js";
import type * as rollovers from "../rollovers.js";
import type * as scavenger from "../scavenger.js";
import type * as seed from "../seed.js";
import type * as seedChallenges from "../seedChallenges.js";
import type * as suggestions from "../suggestions.js";
import type * as welcome from "../welcome.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_seedData/challenges": typeof _seedData_challenges;
  activityComments: typeof activityComments;
  activitySuggestions: typeof activitySuggestions;
  activityVotes: typeof activityVotes;
  admin: typeof admin;
  answers: typeof answers;
  auth: typeof auth;
  challenges: typeof challenges;
  dayComments: typeof dayComments;
  entries: typeof entries;
  flowVotes: typeof flowVotes;
  gameState: typeof gameState;
  helpers: typeof helpers;
  itemRsvps: typeof itemRsvps;
  leaderboard: typeof leaderboard;
  leaderboardNotifications: typeof leaderboardNotifications;
  players: typeof players;
  postComments: typeof postComments;
  postReactions: typeof postReactions;
  posts: typeof posts;
  pushNotifications: typeof pushNotifications;
  pushNotificationsActions: typeof pushNotificationsActions;
  pushNotificationsQueries: typeof pushNotificationsQueries;
  rollovers: typeof rollovers;
  scavenger: typeof scavenger;
  seed: typeof seed;
  seedChallenges: typeof seedChallenges;
  suggestions: typeof suggestions;
  welcome: typeof welcome;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
