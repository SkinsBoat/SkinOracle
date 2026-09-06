import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import {
  hexToBytes,
  bytesToHex,
  getNormalizedSecretKey,
  generateDmarketSignature,
  buildDmarketHeaders,
} from '../dmarket.ipc';

describe('DMarket Ed25519 Signing Engine', () => {
  // Generate a known test keypair
  const testKeyPair = nacl.sign.keyPair();
  const testSecretKeyHex = bytesToHex(testKeyPair.secretKey);
  const testPublicKeyHex = bytesToHex(testKeyPair.publicKey);
  const testSeedHex = bytesToHex(testKeyPair.secretKey.slice(0, 32));

  it('should correctly convert between hex and bytes', () => {
    const original = '0123456789abcdef';
    const bytes = hexToBytes(original);
    expect(bytes.length).toBe(8);
    expect(bytesToHex(bytes)).toBe(original);
  });

  it('should handle 0x prefix and lowercase/uppercase hex gracefully', () => {
    const bytes1 = hexToBytes('0xabcd');
    const bytes2 = hexToBytes('ABCD');
    expect(bytesToHex(bytes1)).toBe('abcd');
    expect(bytesToHex(bytes2)).toBe('abcd');
  });

  it('should normalize both 32-byte seed and 64-byte secret key hex to valid 64-byte key', () => {
    const skFrom64 = getNormalizedSecretKey(testSecretKeyHex);
    expect(skFrom64.length).toBe(64);
    expect(bytesToHex(skFrom64)).toBe(testSecretKeyHex);

    const skFromSeed = getNormalizedSecretKey(testSeedHex);
    expect(skFromSeed.length).toBe(64);
    expect(bytesToHex(skFromSeed)).toBe(testSecretKeyHex);
  });

  it('should reject invalid secret key lengths', () => {
    expect(() => getNormalizedSecretKey('1234')).toThrow(/Invalid DMarket secret key length/);
  });

  it('should produce a valid 64-byte (128 hex chars) Ed25519 signature verified by tweetnacl', () => {
    const method = 'GET';
    const pathAndQuery = '/marketplace-api/v2/user/targets?gameId=a8db&limit=100';
    const bodyString = '';
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
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, testKeyPair.publicKey);
    expect(isValid).toBe(true);
  });

  it('should produce verifiable signatures for POST requests with JSON bodies', () => {
    const method = 'POST';
    const pathAndQuery = '/marketplace-api/v1/user-targets/create';
    const body = {
      GameID: 'a8db',
      Targets: [
        {
          Amount: '1',
          Price: { Currency: 'USD', Amount: 15.5 },
          Title: 'AK-47 | Redline (Field-Tested)',
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
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, testKeyPair.publicKey);
    expect(isValid).toBe(true);
  });

  it('should construct required DMarket headers with dmar ed25519 prefix', () => {
    const headers = buildDmarketHeaders(
      'GET',
      '/account/v1/balance',
      '',
      testPublicKeyHex,
      testSecretKeyHex,
    );

    expect(headers['X-Api-Key']).toBe(testPublicKeyHex.toLowerCase());
    expect(headers['X-Sign-Date']).toBeDefined();
    expect(headers['X-Request-Sign']).toMatch(/^dmar ed25519 [0-9a-f]{128}$/);
    expect(headers['Content-Type']).toBe('application/json');
  });
});
