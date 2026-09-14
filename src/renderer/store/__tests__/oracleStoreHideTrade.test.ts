import { describe, it, expect, beforeEach } from "vitest";
import { useOracleStore } from "../useOracleStore";
import { SKINSNIPE_AVAILABLE_MARKETS } from "../../screens/Oracle/components/Step1MarketCache";
import { CS2CAP_PROVIDERS } from "../../../shared/cs2capProviders";
import { isTradeMarket } from "../../../shared/canonicalMarkets";

describe("useOracleStore - hideTradeMarkets & smart Select All", () => {
  beforeEach(() => {
    useOracleStore.setState({
      hideTradeMarkets: false,
    });
  });

  it("defaults hideTradeMarkets to false", () => {
    expect(useOracleStore.getState().hideTradeMarkets).toBe(false);
  });

  it("updates hideTradeMarkets via setHideTradeMarkets", () => {
    useOracleStore.getState().setHideTradeMarkets(true);
    expect(useOracleStore.getState().hideTradeMarkets).toBe(true);

    useOracleStore.getState().setHideTradeMarkets(false);
    expect(useOracleStore.getState().hideTradeMarkets).toBe(false);

    // Functional update
    useOracleStore.getState().setHideTradeMarkets((prev) => !prev);
    expect(useOracleStore.getState().hideTradeMarkets).toBe(true);
  });

  describe("Skinsnipe Smart Select All", () => {
    it("selects only non-trade markets when hideTradeMarkets is true", () => {
      useOracleStore.getState().setHideTradeMarkets(true);
      const hideTrade = useOracleStore.getState().hideTradeMarkets;

      const targets = hideTrade
        ? SKINSNIPE_AVAILABLE_MARKETS.filter((m) => !isTradeMarket(m.id)).map((m) => m.id)
        : SKINSNIPE_AVAILABLE_MARKETS.map((m) => m.id);

      useOracleStore.getState().selectAllMarkets(targets);
      const selected = useOracleStore.getState().selectedMarkets;

      // Ensure every selected market is NOT a trade market
      expect(selected.length).toBeGreaterThan(0);
      expect(selected.length).toBeLessThan(SKINSNIPE_AVAILABLE_MARKETS.length);
      for (const id of selected) {
        expect(isTradeMarket(id)).toBe(false);
      }

      // Explicitly verify known trade-bot markets are excluded
      expect(selected).not.toContain("cstrade");
      expect(selected).not.toContain("skinsmonkey");
      expect(selected).not.toContain("csmoney_trade");
      expect(selected).not.toContain("tradeitgg");

      // Verify legitimate cash markets are retained
      expect(selected).toContain("csgofloat");
      expect(selected).toContain("dmarket");
      expect(selected).toContain("skinport");
    });

    it("selects all markets including trade markets when hideTradeMarkets is false", () => {
      useOracleStore.getState().setHideTradeMarkets(false);
      const hideTrade = useOracleStore.getState().hideTradeMarkets;

      const targets = hideTrade
        ? SKINSNIPE_AVAILABLE_MARKETS.filter((m) => !isTradeMarket(m.id)).map((m) => m.id)
        : SKINSNIPE_AVAILABLE_MARKETS.map((m) => m.id);

      useOracleStore.getState().selectAllMarkets(targets);
      const selected = useOracleStore.getState().selectedMarkets;

      expect(selected.length).toBe(SKINSNIPE_AVAILABLE_MARKETS.length);
      expect(selected).toContain("cstrade");
      expect(selected).toContain("skinsmonkey");
    });
  });

  describe("CS2Cap Smart Select All", () => {
    it("selects only non-trade providers when hideTradeMarkets is true", () => {
      useOracleStore.getState().setHideTradeMarkets(true);
      const hideTrade = useOracleStore.getState().hideTradeMarkets;

      const targets = hideTrade
        ? CS2CAP_PROVIDERS.filter((p) => !isTradeMarket(p.id)).map((p) => p.id)
        : CS2CAP_PROVIDERS.map((p) => p.id);

      useOracleStore.getState().setSelectedCs2capProviders(targets);
      const selected = useOracleStore.getState().selectedCs2capProviders;

      expect(selected.length).toBeGreaterThan(0);
      expect(selected.length).toBeLessThan(CS2CAP_PROVIDERS.length);
      for (const id of selected) {
        expect(isTradeMarket(id)).toBe(false);
      }

      // Explicitly verify known trade-bot providers are excluded
      expect(selected).not.toContain("cstrade");
      expect(selected).not.toContain("skinsmonkey");
      expect(selected).not.toContain("csmoney_t");
      expect(selected).not.toContain("skinswap_t");
      expect(selected).not.toContain("swapgg");
      expect(selected).not.toContain("lootfarm");

      // Cash marketplaces are included
      expect(selected).toContain("csfloat");
      expect(selected).toContain("buff163");
      expect(selected).toContain("dmarket");
    });

    it("selects all providers including trade-bots when hideTradeMarkets is false", () => {
      useOracleStore.getState().setHideTradeMarkets(false);
      const hideTrade = useOracleStore.getState().hideTradeMarkets;

      const targets = hideTrade
        ? CS2CAP_PROVIDERS.filter((p) => !isTradeMarket(p.id)).map((p) => p.id)
        : CS2CAP_PROVIDERS.map((p) => p.id);

      useOracleStore.getState().setSelectedCs2capProviders(targets);
      const selected = useOracleStore.getState().selectedCs2capProviders;

      expect(selected.length).toBe(CS2CAP_PROVIDERS.length);
      expect(selected).toContain("csmoney_t");
      expect(selected).toContain("cstrade");
    });
  });
});
