import { describe, expect, it } from "vitest";
import { dailyWindow, weeklyWindow } from "./period.js";

describe("digest periods", () => {
  it("publishes the completed UTC day", () => {
    expect(dailyWindow(new Date("2026-07-20T01:07:00Z")).periodKey).toBe("2026-07-19");
  });

  it("returns the latest completed ISO week on every day so missed Mondays recover", () => {
    expect(weeklyWindow(new Date("2026-07-20T01:07:00Z")).periodKey).toBe("2026-W29");
    expect(weeklyWindow(new Date("2026-07-21T01:07:00Z")).periodKey).toBe("2026-W29");
    expect(weeklyWindow(new Date("2026-08-16T01:07:00Z")).periodKey).toBe("2026-W32");
  });
});
