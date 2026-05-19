import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { playerBySlug } from "../data/players.js";

// Pure resolver: prefers a player's holiday name over their legal name.
// `map` is the {slug: holidayName} object returned by players.holidayNameMap.
// `fallback` lets callers override the legal-name fallback (e.g. slug itself).
export function displayName(slug, map, fallback) {
  if (map && map[slug]) return map[slug];
  if (fallback !== undefined) return fallback;
  return playerBySlug(slug)?.name ?? slug;
}

// Hook for a single slug. Subscribes to the live holiday-name map and
// returns the resolved display name reactively.
export function useDisplayName(slug) {
  const map = useQuery(api.players.holidayNameMap) ?? {};
  return displayName(slug, map);
}

// Hook for components that render many names — returns the map so the
// caller can resolve each row without re-subscribing.
export function useHolidayNameMap() {
  return useQuery(api.players.holidayNameMap) ?? {};
}
