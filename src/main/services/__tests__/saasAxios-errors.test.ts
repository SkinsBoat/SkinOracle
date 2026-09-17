import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron before importing saasAxios
const mockSend = vi.fn();
const mockGetAllWindows = vi.fn(() => [
  {
    webContents: {
      send: mockSend,
    },
  },
]);

vi.mock("electron", () => ({
  app: {
    getVersion: () => "0.1.7",
    getPath: vi.fn().mockReturnValue("/tmp"),
  },
  BrowserWindow: {
    getAllWindows: () => mockGetAllWindows(),
  },
  ipcMain: {
    handle: vi.fn(),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(false),
    encryptString: vi.fn((str: string) => Buffer.from(str)),
    decryptString: vi.fn((buf: Buffer) => buf.toString()),
  },
}));

// Mock secure-store
vi.mock("../../../storage/secure-store", () => ({
  secureGet: vi.fn(),
  secureSet: vi.fn(),
  secureDelete: vi.fn(),
  STORAGE_KEYS: {
    JWT: "auth_jwt_token",
  },
}));

import {
  extractApiErrorDetails,
  responseErrorInterceptor,
} from "../saasAxios";
import { secureDelete, STORAGE_KEYS } from "../../../storage/secure-store";

describe("saasAxios Error Interception & Diagnostic Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractApiErrorDetails", () => {
    it("extracts and formats DATABASE_SCHEMA_ERROR with reference errorId", () => {
      const mockAxiosErr = {
        response: {
          status: 503,
          data: {
            success: false,
            error: {
              statusCode: 503,
              message:
                "Database service is initializing or pending migration. Please try again shortly.",
              code: "DATABASE_SCHEMA_ERROR",
              errorId: "err_mu5l_9a2b",
              help: "A required database table or schema update is pending.",
            },
          },
        },
      };

      const result = extractApiErrorDetails(mockAxiosErr);
      expect(result.statusCode).toBe(503);
      expect(result.code).toBe("DATABASE_SCHEMA_ERROR");
      expect(result.errorId).toBe("err_mu5l_9a2b");
      expect(result.help).toBe("A required database table or schema update is pending.");
      expect(result.displayMessage).toBe(
        "Database service is initializing or pending migration. Please try again shortly. (Ref: err_mu5l_9a2b)",
      );
    });

    it("extracts and formats INTERNAL_SERVER_ERROR with reference errorId", () => {
      const mockAxiosErr = {
        response: {
          status: 500,
          data: {
            success: false,
            error: {
              statusCode: 500,
              message: "An internal server error occurred. Our team has been notified.",
              code: "INTERNAL_SERVER_ERROR",
              errorId: "err_crash_4411",
            },
          },
        },
      };

      const result = extractApiErrorDetails(mockAxiosErr);
      expect(result.displayMessage).toBe(
        "An internal server error occurred. Our team has been notified. (Ref: err_crash_4411)",
      );
    });

    it("falls back gracefully when response body is not in standard shape", () => {
      const mockErr = {
        message: "Network Error",
      };

      const result = extractApiErrorDetails(mockErr);
      expect(result.statusCode).toBe(500);
      expect(result.displayMessage).toBe("Network Error");
    });
  });

  describe("responseErrorInterceptor actions", () => {
    it("intercepts 503 MAINTENANCE_MODE and broadcasts app:force-maintenance", async () => {
      const mockMaintenanceErr = {
        response: {
          status: 503,
          data: {
            success: false,
            error: {
              statusCode: 503,
              code: "MAINTENANCE_MODE",
              error: "MAINTENANCE_MODE",
              message: "The system is currently undergoing maintenance. Please try again later.",
            },
          },
        },
      };

      await expect(responseErrorInterceptor(mockMaintenanceErr)).rejects.toThrow(
        "The system is currently undergoing maintenance. Please try again later.",
      );

      expect(mockSend).toHaveBeenCalledWith("app:force-maintenance");
    });

    it("intercepts 426 Upgrade Required and broadcasts app:force-version-block with minVersion", async () => {
      const mock426Err = {
        response: {
          status: 426,
          data: {
            success: false,
            error: {
              statusCode: 426,
              code: "UPGRADE_REQUIRED",
              minVersion: "0.2.0",
              message: "Version 0.1.7 is outdated. Please update to v0.2.0.",
            },
          },
        },
      };

      await expect(responseErrorInterceptor(mock426Err)).rejects.toThrow(
        "Version 0.1.7 is outdated. Please update to v0.2.0.",
      );

      expect(mockSend).toHaveBeenCalledWith("app:force-version-block", {
        allowed: false,
        reason: "Version 0.1.7 is outdated. Please update to v0.2.0.",
        minVersion: "0.2.0",
        currentVersion: "0.1.7",
      });
    });

    it("intercepts 401 Unauthorized and broadcasts auth:session-expired for non-auth routes", async () => {
      const mock401Err = {
        config: { url: "/balance" },
        response: {
          status: 401,
          data: {
            success: false,
            error: {
              statusCode: 401,
              message: "Unauthorized",
            },
          },
        },
      };

      await expect(responseErrorInterceptor(mock401Err)).rejects.toThrow(
        "Authentication expired. Please log in again.",
      );

      expect(secureDelete).toHaveBeenCalledWith(STORAGE_KEYS.JWT);
      expect(mockSend).toHaveBeenCalledWith("auth:session-expired");
    });

    it("passes through ENGINE_RESTART_HOLD without sending app:force-maintenance", async () => {
      const mockHoldErr = {
        response: {
          status: 503,
          data: {
            success: false,
            error: {
              statusCode: 503,
              code: "ENGINE_RESTART_HOLD",
              error: "ENGINE_RESTART_HOLD",
              message:
                "The engine is currently preparing for server restart. Price calculation requests are temporarily paused.",
            },
          },
        },
      };

      try {
        await responseErrorInterceptor(mockHoldErr);
        expect.unreachable();
      } catch (err: any) {
        expect(err.message).toContain("preparing for server restart");
        expect(err.code).toBe("ENGINE_RESTART_HOLD");
        expect(err.statusCode).toBe(503);
      }

      // Should NOT force maintenance for transient restart hold
      expect(mockSend).not.toHaveBeenCalledWith("app:force-maintenance");
    });

    it("attaches rich diagnostic properties onto rejected Error instance", async () => {
      const mockSchemaErr = {
        response: {
          status: 503,
          data: {
            success: false,
            error: {
              statusCode: 503,
              code: "DATABASE_SCHEMA_ERROR",
              errorId: "err_table_missing",
              help: "Table pending migration",
              message: "Database service is initializing or pending migration.",
            },
          },
        },
      };

      try {
        await responseErrorInterceptor(mockSchemaErr);
        expect.unreachable();
      } catch (err: any) {
        expect(err.statusCode).toBe(503);
        expect(err.code).toBe("DATABASE_SCHEMA_ERROR");
        expect(err.errorId).toBe("err_table_missing");
        expect(err.help).toBe("Table pending migration");
        expect(err.message).toBe(
          "Database service is initializing or pending migration. (Ref: err_table_missing)",
        );
      }
    });
  });
});
