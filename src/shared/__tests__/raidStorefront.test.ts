import { describe, it, expect } from "vitest";
import { parseStorefrontClipboard } from "../raidStorefront";

// Synthetic identifiers — never real accounts.
const STEAM_ID = "76561190000000001";
const DMARKET_ADDR = "0x1111111111111111111111111111111111111111";

describe("parseStorefrontClipboard", () => {
  it("parses a bare SteamID64 as a CSFloat stall", () => {
    const result = parseStorefrontClipboard(`  ${STEAM_ID}  `);
    expect(result.ok).toBe(true);
    expect(result.ref?.marketplace).toBe("csfloat");
    expect(result.ref?.handle).toBe(STEAM_ID);
    expect(result.ref?.canonicalUrl).toBe(
      `https://csfloat.com/stall/${STEAM_ID}`,
    );
  });

  it("parses a bare DMarket saga address", () => {
    const result = parseStorefrontClipboard(DMARKET_ADDR);
    expect(result.ok).toBe(true);
    expect(result.ref?.marketplace).toBe("dmarket");
    expect(result.ref?.handle).toBe(DMARKET_ADDR);
  });

  it("parses an explicit Skinport storefront URL", () => {
    const result = parseStorefrontClipboard(
      "https://skinport.com/shop/example-shop",
    );
    expect(result.ok).toBe(true);
    expect(result.ref?.marketplace).toBe("skinport");
    expect(result.ref?.handle).toBe("example-shop");
  });

  it("rejects a bare slug (could be an API key/token on the clipboard)", () => {
    expect(parseStorefrontClipboard("example-shop").ok).toBe(false);
    expect(parseStorefrontClipboard("sk_live_abc123").ok).toBe(false);
  });

  it("rejects unsupported URLs without echoing the raw clipboard text", () => {
    const secret = "SUPERSECRET_TOKEN_123";
    const result = parseStorefrontClipboard(
      `https://example.com/path?token=${secret}`,
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain("example.com");
  });

  it("rejects an empty clipboard", () => {
    expect(parseStorefrontClipboard("   ").ok).toBe(false);
    expect(parseStorefrontClipboard("").ok).toBe(false);
  });
});
