import { describe, it, expect } from "vitest";
import { normalizeSkinscomApiKey } from "../skinscomKeyFormat";

describe("normalizeSkinscomApiKey", () => {
  it("accepts a well-formed key and trims surrounding whitespace", () => {
    const key = "a".repeat(32);
    expect(normalizeSkinscomApiKey(`  ${key}\n`)).toBe(key);
  });

  it("rejects non-strings", () => {
    expect(() => normalizeSkinscomApiKey(undefined)).toThrow();
    expect(() => normalizeSkinscomApiKey(1234567890123456)).toThrow();
  });

  it("rejects keys outside the length bounds", () => {
    expect(() => normalizeSkinscomApiKey("short")).toThrow();
    expect(() => normalizeSkinscomApiKey("a".repeat(513))).toThrow();
  });

  it("rejects interior whitespace and header-injection characters", () => {
    expect(() => normalizeSkinscomApiKey(`abc${"a".repeat(30)} def`)).toThrow();
    expect(() =>
      normalizeSkinscomApiKey(`abc\r\nX-Evil: 1${"a".repeat(20)}`),
    ).toThrow();
    expect(() => normalizeSkinscomApiKey(`abc\u0000${"a".repeat(20)}`)).toThrow();
  });
});
