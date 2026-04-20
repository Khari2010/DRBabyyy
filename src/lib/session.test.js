import { describe, it, expect, beforeEach } from "vitest";
import { saveSession, loadSession, clearSession, SESSION_KEY } from "./session.js";

describe("session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saveSession writes slug + token to localStorage", () => {
    saveSession({ slug: "candice", token: "abc123" });
    const raw = localStorage.getItem(SESSION_KEY);
    expect(JSON.parse(raw)).toEqual({ slug: "candice", token: "abc123" });
  });

  it("loadSession returns the saved object", () => {
    saveSession({ slug: "kai", token: "xyz" });
    expect(loadSession()).toEqual({ slug: "kai", token: "xyz" });
  });

  it("loadSession returns null when nothing stored", () => {
    expect(loadSession()).toBeNull();
  });

  it("loadSession returns null for corrupt data", () => {
    localStorage.setItem(SESSION_KEY, "not-json");
    expect(loadSession()).toBeNull();
  });

  it("clearSession removes the key", () => {
    saveSession({ slug: "miles", token: "t" });
    clearSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
