// convex/gameState.ts
import { query } from "./_generated/server";
import { getGameState } from "./helpers";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await getGameState(ctx);
  },
});
