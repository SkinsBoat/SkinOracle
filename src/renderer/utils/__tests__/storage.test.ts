import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  safeGetItem,
  safeSetItem,
  getPersistedThreshold,
  setPersistedThreshold,
  getSavedStoreUrl,
  setSavedStoreUrl,
  extractWearFromName,
} from "../storage";

describe("storage utils", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    (globalThis as any).window = {
      localStorage: {
        getItem: (key: string) => mockStore[key] ?? null,
        setItem: (key: string, value: string) => {
          mockStore[key] = String(value);
        },
        removeItem: (key: string) => {
          delete mockStore[key];
        },
        clear: () => {
          mockStore = {};
        },
      },
    };
  });

  afterAll(() => {
    delete (globalThis as any).window;
  });

  describe("safeGetItem & safeSetItem", () => {
    it("returns fallback when key does not exist", () => {
      expect(safeGetItem("non_existent", "default_val")).toBe("default_val");
      expect(safeGetItem("non_existent")).toBeNull();
    });

    it("stores and retrieves string values", () => {
      safeSetItem("test_key", "hello");
      expect(safeGetItem("test_key")).toBe("hello");
    });
  });

  describe("getPersistedThreshold & setPersistedThreshold", () => {
    it("returns default value (2) when not set", () => {
      expect(getPersistedThreshold("csfloat_drift_threshold_percent")).toBe(2);
    });

    it("returns custom default when specified and not set", () => {
      expect(
        getPersistedThreshold("csfloat_drift_threshold_percent", undefined, 5),
      ).toBe(5);
    });

    it("saves and retrieves primary threshold value", () => {
      setPersistedThreshold("csfloat_drift_threshold_percent", 3.5);
      expect(getPersistedThreshold("csfloat_drift_threshold_percent")).toBe(
        3.5,
      );
    });

    it("saves to fallbackKey if provided and retrieves via fallback if primary is missing", () => {
      setPersistedThreshold(
        "csfloat_drift_threshold_percent",
        4,
        "workstation_buyorders_drift_threshold",
      );
      // Both keys should be set
      expect(
        window.localStorage.getItem("csfloat_drift_threshold_percent"),
      ).toBe("4");
      expect(
        window.localStorage.getItem("workstation_buyorders_drift_threshold"),
      ).toBe("4");

      // Another workstation without its own key gets the fallback
      expect(
        getPersistedThreshold(
          "dmarket_drift_threshold_percent",
          "workstation_buyorders_drift_threshold",
        ),
      ).toBe(4);
    });

    it("persists 0% threshold without resetting to 2", () => {
      setPersistedThreshold("csfloat_drift_threshold_percent", 0);
      expect(getPersistedThreshold("csfloat_drift_threshold_percent")).toBe(0);
    });

    it("ignores negative or invalid numbers and returns default", () => {
      safeSetItem("corrupted_key", "not-a-number");
      expect(getPersistedThreshold("corrupted_key")).toBe(2);

      safeSetItem("negative_key", "-5");
      expect(getPersistedThreshold("negative_key")).toBe(2);
    });
  });

  describe("getSavedStoreUrl & setSavedStoreUrl", () => {
    it("returns empty string when no store url is saved", () => {
      expect(getSavedStoreUrl("csfloat")).toBe("");
      expect(getSavedStoreUrl("dmarket")).toBe("");
    });

    it("saves and retrieves CSFloat stall url", () => {
      const url = "https://csfloat.com/stall/76561199736567863";
      setSavedStoreUrl("csfloat", url);
      expect(getSavedStoreUrl("csfloat")).toBe(url);
      expect(getSavedStoreUrl("CSFLOAT")).toBe(url);
    });

    it("saves and retrieves DMarket personal store url", () => {
      const url = "https://dmarket.com/ingame-items/item-list/csgo-skins?sagaAddress=0xc232b9755d49d5d68804b306f0C16f5118f58A03";
      setSavedStoreUrl("dmarket", url);
      expect(getSavedStoreUrl("dmarket")).toBe(url);
      expect(getSavedStoreUrl("DMARKET")).toBe(url);
    });
  });

  describe("extractWearFromName", () => {
    it("correctly extracts wear abbreviations", () => {
      expect(extractWearFromName("AK-47 | Redline (Field-Tested)")).toBe("FT");
      expect(extractWearFromName("AWP | Asiimov (Battle-Scarred)")).toBe("BS");
      expect(extractWearFromName("M4A4 | Howl (Factory New)")).toBe("FN");
      expect(extractWearFromName("Desert Eagle | Blaze (Minimal Wear)")).toBe("MW");
      expect(extractWearFromName("USP-S | Kill Confirmed (Well-Worn)")).toBe("WW");
    });

    it("falls back to FT when no wear pattern is found", () => {
      expect(extractWearFromName("StatTrak Music Kit")).toBe("FT");
      expect(extractWearFromName("")).toBe("FT");
    });
  });
});
