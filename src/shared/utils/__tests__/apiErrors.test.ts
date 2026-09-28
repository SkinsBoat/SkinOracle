import { describe, it, expect } from "vitest";
import {
  isEngineRestartHoldError,
  isMaintenanceModeError,
  isRequestHeldError,
} from "../apiErrors";

describe("SaaS request hold helpers (maintenance & engine restart hold)", () => {
  it("detects ENGINE_RESTART_HOLD by explicit error code", () => {
    expect(
      isEngineRestartHoldError({
        statusCode: 503,
        code: "ENGINE_RESTART_HOLD",
        message:
          "The engine is currently preparing for server restart. Price calculation requests are temporarily paused.",
      }),
    ).toBe(true);
  });

  it("detects restart hold from legacy message-only payloads", () => {
    expect(
      isEngineRestartHoldError({
        statusCode: 503,
        message: "Server is preparing for server restart",
      }),
    ).toBe(true);
  });

  it("detects MAINTENANCE_MODE", () => {
    expect(
      isMaintenanceModeError({
        statusCode: 503,
        code: "MAINTENANCE_MODE",
        message: "The system is currently undergoing maintenance.",
      }),
    ).toBe(true);
  });

  it("treats both maintenance and restart hold as a held request", () => {
    expect(
      isRequestHeldError({ code: "ENGINE_RESTART_HOLD", message: "" }),
    ).toBe(true);
    expect(
      isRequestHeldError({ code: "MAINTENANCE_MODE", message: "" }),
    ).toBe(true);
  });

  it("does not flag ordinary validation or balance errors as held", () => {
    expect(
      isRequestHeldError({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "title must be a string",
      }),
    ).toBe(false);
    expect(
      isRequestHeldError({
        statusCode: 400,
        message: "Insufficient balance.",
      }),
    ).toBe(false);
    expect(isRequestHeldError(null)).toBe(false);
    expect(isRequestHeldError(undefined)).toBe(false);
  });
});
