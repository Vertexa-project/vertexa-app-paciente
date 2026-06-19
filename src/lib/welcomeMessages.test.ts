import { describe, it, expect } from "vitest";
import { pickWelcomeMessage } from "./welcomeMessages";

describe("pickWelcomeMessage", () => {
  it("interpolates [nome] using only the first name", () => {
    // Sweep two weeks so we are guaranteed to hit a day whose chosen phrase
    // contains the [nome] token (e.g. Monday has two such phrases out of three).
    let interpolated = "";
    for (let d = 0; d < 14; d++) {
      const date = new Date(2026, 5, 1 + d);
      const msg = pickWelcomeMessage({ name: "Mariana Albuquerque", date });
      if (msg.includes("Mariana")) {
        interpolated = msg;
        break;
      }
    }
    expect(interpolated).toContain("Mariana");
    expect(interpolated).not.toContain("Albuquerque"); // only the first name
    expect(interpolated).not.toContain("[nome]");
  });

  it("is deterministic: same (name, date) always returns the same phrase", () => {
    const date = new Date(2026, 5, 17);
    const first = pickWelcomeMessage({ name: "Mariana", date });
    const second = pickWelcomeMessage({ name: "Mariana", date });
    expect(second).toBe(first);
  });

  it("returns a non-empty, placeholder-free string for every weekday (getDay 0..6)", () => {
    const weekdaysSeen = new Set<number>();
    for (let d = 0; d < 7; d++) {
      const date = new Date(2026, 5, 14 + d);
      weekdaysSeen.add(date.getDay());
      const msg = pickWelcomeMessage({ name: "Ana", date });
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
      expect(msg).not.toContain("[nome]");
    }
    // 7 consecutive days must span all weekday indices 0..6.
    expect(weekdaysSeen.size).toBe(7);
  });
});