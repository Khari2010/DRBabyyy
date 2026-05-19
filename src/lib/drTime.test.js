import { describe, it, expect } from "vitest";
import { drDayOfMonth, currentTripDayIndex } from "./drTime.js";

describe("drDayOfMonth", () => {
  it("returns the day-of-month in DR time (UTC-4)", () => {
    const utc = new Date(Date.UTC(2026, 4, 18, 3, 0, 0));
    expect(drDayOfMonth(utc)).toBe(17);
  });

  it("returns same day when UTC and DR are on the same calendar day", () => {
    const utc = new Date(Date.UTC(2026, 4, 19, 18, 0, 0));
    expect(drDayOfMonth(utc)).toBe(19);
  });
});

describe("currentTripDayIndex", () => {
  const TRIP_DAYS = [
    { date: "18 May" }, { date: "19 May" }, { date: "20 May" },
    { date: "21 May" }, { date: "22 May" }, { date: "23 May" },
    { date: "24 May" }, { date: "25 May" }, { date: "26 May" },
    { date: "27 May" }, { date: "28 May" }, { date: "29 May" },
  ];

  it("returns 0 before trip starts", () => {
    const utc = new Date(Date.UTC(2026, 4, 16, 12, 0, 0));
    expect(currentTripDayIndex(TRIP_DAYS, utc)).toBe(0);
  });

  it("returns matching index when today is a trip day", () => {
    const utc = new Date(Date.UTC(2026, 4, 21, 14, 0, 0));
    expect(currentTripDayIndex(TRIP_DAYS, utc)).toBe(3);
  });

  it("returns last index when trip is over", () => {
    const utc = new Date(Date.UTC(2026, 5, 5, 12, 0, 0));
    expect(currentTripDayIndex(TRIP_DAYS, utc)).toBe(TRIP_DAYS.length - 1);
  });
});
