import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import {
  hexToBytes,
  bytesToHex,
  getNormalizedSecretKey,
  generateDmarketSignature,
  buildDmarketHeaders,
  buildDmarketSyncPayload,
  formatDmarketError,
  formatCreateOfferRequest,
  formatUpdateOfferRequest,
  formatDeleteOfferRequest,
} from "../dmarket.ipc";

describe("DMarket Ed25519 Signing Engine", () => {
  // Generate a known test keypair
  const testKeyPair = nacl.sign.keyPair();
  const testSecretKeyHex = bytesToHex(testKeyPair.secretKey);
  const testPublicKeyHex = bytesToHex(testKeyPair.publicKey);
  const testSeedHex = bytesToHex(testKeyPair.secretKey.slice(0, 32));

  it("should correctly convert between hex and bytes", () => {
    const original = "0123456789abcdef";
    const bytes = hexToBytes(original);
    expect(bytes.length).toBe(8);
    expect(bytesToHex(bytes)).toBe(original);
  });

  it("should handle 0x prefix and lowercase/uppercase hex gracefully", () => {
    const bytes1 = hexToBytes("0xabcd");
    const bytes2 = hexToBytes("ABCD");
    expect(bytesToHex(bytes1)).toBe("abcd");
    expect(bytesToHex(bytes2)).toBe("abcd");
  });

  it("should normalize both 32-byte seed and 64-byte secret key hex to valid 64-byte key", () => {
    const skFrom64 = getNormalizedSecretKey(testSecretKeyHex);
    expect(skFrom64.length).toBe(64);
    expect(bytesToHex(skFrom64)).toBe(testSecretKeyHex);

    const skFromSeed = getNormalizedSecretKey(testSeedHex);
    expect(skFromSeed.length).toBe(64);
    expect(bytesToHex(skFromSeed)).toBe(testSecretKeyHex);
  });

  it("should reject invalid secret key lengths", () => {
    expect(() => getNormalizedSecretKey("1234")).toThrow(
      /Invalid DMarket secret key length/,
    );
  });

  it("should produce a valid 64-byte (128 hex chars) Ed25519 signature verified by tweetnacl", () => {
    const method = "GET";
    const pathAndQuery =
      "/marketplace-api/v2/user/targets?gameId=a8db&limit=100";
    const bodyString = "";
    const timestamp = 1718000000;

    const signatureHex = generateDmarketSignature(
      method,
      pathAndQuery,
      bodyString,
      timestamp,
      testSecretKeyHex,
    );

    expect(signatureHex.length).toBe(128);

    // Verify cryptographic signature with public key
    const stringToSign = `${method}${pathAndQuery}${bodyString}${timestamp}`;
    const messageBytes = new TextEncoder().encode(stringToSign);
    const signatureBytes = hexToBytes(signatureHex);
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      testKeyPair.publicKey,
    );
    expect(isValid).toBe(true);
  });

  it("should produce verifiable signatures for POST requests with JSON bodies", () => {
    const method = "POST";
    const pathAndQuery = "/marketplace-api/v1/user-targets/create";
    const body = {
      GameID: "a8db",
      Targets: [
        {
          Amount: "1",
          Price: { Currency: "USD", Amount: 15.5 },
          Title: "AK-47 | Redline (Field-Tested)",
        },
      ],
    };
    const bodyString = JSON.stringify(body);
    const timestamp = 1718000000;

    const signatureHex = generateDmarketSignature(
      method,
      pathAndQuery,
      bodyString,
      timestamp,
      testSeedHex,
    );

    expect(signatureHex.length).toBe(128);

    const stringToSign = `${method}${pathAndQuery}${bodyString}${timestamp}`;
    const messageBytes = new TextEncoder().encode(stringToSign);
    const signatureBytes = hexToBytes(signatureHex);
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      testKeyPair.publicKey,
    );
    expect(isValid).toBe(true);
  });

  it("should construct required DMarket headers with dmar ed25519 prefix", () => {
    const headers = buildDmarketHeaders(
      "GET",
      "/account/v1/balance",
      "",
      testPublicKeyHex,
      testSecretKeyHex,
    );

    expect(headers["X-Api-Key"]).toBe(testPublicKeyHex.toLowerCase());
    expect(headers["X-Sign-Date"]).toBeDefined();
    expect(headers["X-Request-Sign"]).toMatch(/^dmar ed25519 [0-9a-f]{128}$/);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should generate the correct Steam inventory sync payload with GameID CSGO and Type Inventory", () => {
    const payload = buildDmarketSyncPayload();
    expect(payload).toEqual({
      Type: "Inventory",
      GameID: "CSGO",
    });
    // Ensure no invalid gameId or a8db is present in sync payload
    expect((payload as any).gameId).toBeUndefined();
  });

  it("should correctly extract error details from DMarket error responses", () => {
    // Stringified JSON inside Message field (as observed in DMarket 400 response)
    const errObj1 = {
      Code: "BadRequest",
      Message: '{"id":"BadRequest","code":400,"detail":"Bad request","status":"Bad Request"}',
    };
    expect(formatDmarketError(errObj1)).toBe("Bad request");

    // Standard message field
    expect(formatDmarketError({ message: "Invalid API key" })).toBe("Invalid API key");

    // Plain string error
    expect(formatDmarketError("Server error")).toBe("Server error");

    // Fallback when error data is empty
    expect(formatDmarketError(null, "Fallback error")).toBe("Fallback error");
  });

  it("should format batch create offer requests according to DMarket OpenAPI v2 schema without duplicate fields", () => {
    const assetUuid = "bc7773d0-707e-5ec8-84be-9c269eddf003";
    const req = formatCreateOfferRequest(assetUuid, 138);

    expect(req).toEqual({
      assetId: "bc7773d0-707e-5ec8-84be-9c269eddf003",
      priceCents: "138",
    });

    // Verify absence of duplicate snake_case proto fields
    expect((req as any).asset_id).toBeUndefined();
    expect((req as any).price_cents).toBeUndefined();

    // Rejects non-deposited steam IDs
    expect(() => formatCreateOfferRequest("8810763607:7993037582:53572993286:730", 100)).toThrow(
      /Item is currently in your Steam inventory/,
    );
  });

  it("should format batch update offer requests with offerId and priceCents", () => {
    const offerId = "c3d4e5f6-a7b8-9012-cdef-345678901234";
    const req = formatUpdateOfferRequest(offerId, 1799);

    expect(req).toEqual({
      offerId: "c3d4e5f6-a7b8-9012-cdef-345678901234",
      priceCents: "1799",
    });

    expect((req as any).offer_id).toBeUndefined();
    expect((req as any).price_cents).toBeUndefined();
  });

  it("should format batch delete offer requests with offerId", () => {
    const offerId = "c3d4e5f6-a7b8-9012-cdef-345678901234";
    const req = formatDeleteOfferRequest(offerId);

    expect(req).toEqual({
      offerId: "c3d4e5f6-a7b8-9012-cdef-345678901234",
    });

    expect((req as any).offer_id).toBeUndefined();
    expect((req as any).asset_id).toBeUndefined();
  });
});
