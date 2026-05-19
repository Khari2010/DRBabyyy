// convex/helpers.ts
// Shared helpers for auth, admin checks, gameState lookup, and derived values.
import type { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireSession(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<{ playerSlug: string }> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session) throw new Error("invalid session");
  return { playerSlug: session.playerSlug };
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  slug: string,
): Promise<void> {
  const role = await ctx.db
    .query("adminRoles")
    .withIndex("by_slug", (q) => q.eq("playerSlug", slug))
    .unique();
  if (!role) throw new Error("admin only");
}

export async function getGameState(ctx: QueryCtx | MutationCtx) {
  return await ctx.db.query("gameState").first();
}

export function deriveDifficulty(points: number): "easy" | "medium" | "wild" {
  if (points >= 70) return "wild";
  if (points >= 20) return "medium";
  return "easy";
}
