import { describe, it, expect } from "vitest";
import { DAILY_SCAVENGER, dailyItemsFor, isDailyScavengerActive } from "../src/data/dailyScavenger.js";
import { itemById } from "../src/data/scavenger.js";

describe("DAILY_SCAVENGER data sanity", () => {
  it("has exactly 3 days covered (day-2, day-3, day-4)", () => {
    expect(Object.keys(DAILY_SCAVENGER).sort()).toEqual(["day-2", "day-3", "day-4"]);
  });

  it("each day has exactly 4 items", () => {
    for (const day of Object.keys(DAILY_SCAVENGER)) {
      expect(DAILY_SCAVENGER[day]).toHaveLength(4);
    }
  });

  it("each day's items cover all 4 categories (food, plant, animal, object)", () => {
    for (const day of Object.keys(DAILY_SCAVENGER)) {
      const categories = DAILY_SCAVENGER[day].map((id) => itemById(id)?.category).sort();
      expect(categories).toEqual(["animal", "food", "object", "plant"]);
    }
  });

  it("every itemId references a real scavenger item", () => {
    for (const day of Object.keys(DAILY_SCAVENGER)) {
      for (const id of DAILY_SCAVENGER[day]) {
        expect(itemById(id), `unknown itemId ${id} in ${day}`).toBeDefined();
      }
    }
  });

  it("itemIds are unique across the trip (no day picks the same item twice)", () => {
    const allIds = Object.values(DAILY_SCAVENGER).flat();
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe("dailyItemsFor", () => {
  it("returns the 4 items for a known day", () => {
    expect(dailyItemsFor("day-2")).toHaveLength(4);
  });
  it("returns null for an unknown day", () => {
    expect(dailyItemsFor("day-99")).toBeNull();
  });
});

describe("isDailyScavengerActive", () => {
  it("false for day-1 (practice)", () => {
    expect(isDailyScavengerActive("day-1")).toBe(false);
  });
  it("true for day-2 (real game)", () => {
    expect(isDailyScavengerActive("day-2")).toBe(true);
  });
  it("false for unknown days", () => {
    expect(isDailyScavengerActive("day-99")).toBe(false);
  });
});
