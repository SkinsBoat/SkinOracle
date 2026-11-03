import { describe, expect, it } from "vitest";
import {
  SNOOZE_OPTIONS,
  makeSnoozeKey,
  useSnoozeStore,
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

  it("keeps session snoozes in module-scoped state across mounts", () => {
    const key = "AWP | Asiimov (Field-Tested)__csfloat";
    useSnoozeStore.getState().snoozeItem(key, null);

    expect(useSnoozeStore.getState().snoozedItems.get(key)).toEqual({
      expiresAt: null,
    });

    useSnoozeStore.getState().unsnoozeItem(key);
    expect(useSnoozeStore.getState().snoozedItems.has(key)).toBe(false);
  });
});
