import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useGameState() {
  const state = useQuery(api.gameState.get);
  return {
    loading: state === undefined,
    gamesLive: state?.gamesLive ?? false,
    currentDayNumber: state?.currentDayNumber ?? 0,
    currentDailyKey: state?.currentDailyKey ?? "pre-trip",
  };
}
