import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  safeGetItem,
  safeSetItem,
  getPersistedThreshold,
  setPersistedThreshold,
  getSavedStoreUrl,
  setSavedStoreUrl,
  getStoreLinks,
  addStoreLink,
  updateStoreLink,
  removeStoreLink,
  setDefaultStoreLink,
  getDefaultStoreLink,
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
      const url = "https://csfloat.com/stall/76561190000000000";
      setSavedStoreUrl("csfloat", url);
      expect(getSavedStoreUrl("csfloat")).toBe(url);
      expect(getSavedStoreUrl("CSFLOAT")).toBe(url);
    });

    it("saves and retrieves DMarket personal store url", () => {
      const url = "https://dmarket.com/ingame-items/item-list/csgo-skins?sagaAddress=0x1111111111111111111111111111111111111111";
      setSavedStoreUrl("dmarket", url);
      expect(getSavedStoreUrl("dmarket")).toBe(url);
      expect(getSavedStoreUrl("DMARKET")).toBe(url);
    });
  });

  describe("seller store link registry", () => {
    it("returns an empty registry when nothing is configured", () => {
      expect(getStoreLinks()).toEqual([]);
      expect(getDefaultStoreLink("csfloat")).toBeNull();
    });

    it("adds the first link for a market as default", () => {
      const link = addStoreLink({
        marketplace: "csfloat",
        label: "Main Stall",
        url: "https://csfloat.com/stall/111",
      });

      expect(link.isDefault).toBe(true);
      expect(getStoreLinks()).toHaveLength(1);
      expect(getDefaultStoreLink("csfloat")?.url).toBe(
        "https://csfloat.com/stall/111",
      );
    });

    it("keeps additional links non-default until promoted", () => {
      addStoreLink({
        marketplace: "csfloat",
        label: "Main",
        url: "https://csfloat.com/stall/111",
      });
      const second = addStoreLink({
        marketplace: "csfloat",
        label: "Alt",
        url: "https://csfloat.com/stall/222",
      });

      expect(second.isDefault).toBe(false);

      setDefaultStoreLink(second.id);
      expect(getDefaultStoreLink("csfloat")?.id).toBe(second.id);
      expect(
        getStoreLinks().filter((l) => l.isDefault),
      ).toHaveLength(1);
    });

    it("updates an existing link", () => {
      const link = addStoreLink({
        marketplace: "dmarket",
        url: "https://dmarket.com/store/old",
      });
      updateStoreLink(link.id, {
        label: "Renamed",
        url: "https://dmarket.com/store/new",
      });

      const updated = getStoreLinks().find((l) => l.id === link.id);
      expect(updated?.label).toBe("Renamed");
      expect(updated?.url).toBe("https://dmarket.com/store/new");
    });

    it("removes a link and promotes a replacement default", () => {
      const first = addStoreLink({
        marketplace: "csfloat",
        url: "https://csfloat.com/stall/111",
      });
      const second = addStoreLink({
        marketplace: "csfloat",
        url: "https://csfloat.com/stall/222",
      });

      removeStoreLink(first.id);

      const remaining = getStoreLinks();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(second.id);
      expect(remaining[0].isDefault).toBe(true);
    });

    it("syncs legacy setSavedStoreUrl into the registry default", () => {
      setSavedStoreUrl("csfloat", "https://csfloat.com/stall/999");

      const links = getStoreLinks();
      expect(links).toHaveLength(1);
      expect(links[0].isDefault).toBe(true);
      expect(getSavedStoreUrl("csfloat")).toBe(
        "https://csfloat.com/stall/999",
      );

      setSavedStoreUrl("csfloat", "https://csfloat.com/stall/1000");
      expect(getStoreLinks()).toHaveLength(1);
      expect(getSavedStoreUrl("csfloat")).toBe(
        "https://csfloat.com/stall/1000",
      );
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
