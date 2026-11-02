import { describe, expect, it } from "vitest";
import {
  SNOOZE_OPTIONS,
  getSmartSnoozeSuggestion,
  makeSnoozeKey,
} from "../useSnoozeStore";

describe("useSnoozeStore helpers", () => {
  it("keys snoozes by name and market", () => {
    expect(
      makeSnoozeKey({
        name: "AK-47 | Redline (Field-Tested)",
        market: "csfloat",
      }),
    ).toBe("AK-47 | Redline (Field-Tested)__csfloat");
    expect(makeSnoozeKey({ name: "Glock-18 | Fade" })).toBe(
      "Glock-18 | Fade__unknown",
    );
  });

  it("exposes the four supported snooze durations", () => {
    expect(SNOOZE_OPTIONS.map((option) => option.id)).toEqual([
      "15m",
      "1h",
      "3h",
      "session",
    ]);
    expect(SNOOZE_OPTIONS[3].durationMs).toBeNull();
  });

  it("recommends 15 minutes for an instant deal", () => {
    const suggestion = getSmartSnoozeSuggestion({
      closeness: 0.98,
      currentMarketPrice: 80,
      supplyStabilityScore: 1.6,
    });
    expect(suggestion.optionId).toBe("15m");
    expect(suggestion.reason).toContain("already taken");
  });

  it("recommends 15 minutes for a hot low-value item", () => {
    const suggestion = getSmartSnoozeSuggestion({
      closeness: 1.01,
      currentMarketPrice: 20,
      supplyStabilityScore: 1.6,
    });
    expect(suggestion.optionId).toBe("15m");
    expect(suggestion.reason).toContain("low-value");
  });

  it("recommends 1 hour for a mid-value item near the ceiling", () => {
    const suggestion = getSmartSnoozeSuggestion({
      closeness: 1.04,
      currentMarketPrice: 60,
      supplyStabilityScore: 1.6,
    });
    expect(suggestion.optionId).toBe("1h");
    expect(suggestion.reason).toContain("Mid-value");
  });

  it("recommends 1 hour for a high-value item inside the mid-value band", () => {
    const suggestion = getSmartSnoozeSuggestion({
      closeness: 1.04,
      currentMarketPrice: 200,
      supplyStabilityScore: 1.6,
    });
    expect(suggestion.optionId).toBe("1h");
  });

  it("recommends 3 hours for a high-value item beyond the mid-value band", () => {
    const suggestion = getSmartSnoozeSuggestion({
      closeness: 1.06,
      currentMarketPrice: 200,
      supplyStabilityScore: 1.6,
    });
    expect(suggestion.optionId).toBe("3h");
    expect(suggestion.reason).toContain("High-value");
  });

  it("recommends 3 hours when supply stability is low", () => {
    const suggestion = getSmartSnoozeSuggestion({
      closeness: 1.07,
      currentMarketPrice: 40,
      supplyStabilityScore: 1.1,
    });
    expect(suggestion.optionId).toBe("3h");
    expect(suggestion.reason).toContain("supply stability");
  });

  it("falls back to 1 hour when no signal matches", () => {
    expect(
      getSmartSnoozeSuggestion({
        closeness: 1.07,
        currentMarketPrice: 40,
        supplyStabilityScore: 1.5,
      }).optionId,
    ).toBe("1h");
    expect(
      getSmartSnoozeSuggestion({
        closeness: 1.07,
        currentMarketPrice: 40,
      }).optionId,
    ).toBe("1h");
  });
});
