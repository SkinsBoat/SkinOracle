import { describe, it, expect, beforeEach } from "vitest";
import {
  useOracleStore,
  DEFAULT_SELECTED_MARKETS,
  DEFAULT_SKINSNIPE_SNIPE_MARKETS,
  DEFAULT_CS2CAP_SNIPE_MARKETS,
} from "../useOracleStore";
import { DEFAULT_CS2CAP_PROVIDERS } from "../../../shared/cs2capProviders";

const resetStore = () =>
  useOracleStore.setState({
    activeScope: "baseline",
    selectedMarkets: [...DEFAULT_SELECTED_MARKETS],
    selectedCs2capProviders: [...DEFAULT_CS2CAP_PROVIDERS],
    skinsnipeScopes: {
      baseline: [...DEFAULT_SELECTED_MARKETS],
      snipe: [...DEFAULT_SKINSNIPE_SNIPE_MARKETS],
    },
    cs2capScopes: {
      baseline: [...DEFAULT_CS2CAP_PROVIDERS],
      snipe: [...DEFAULT_CS2CAP_SNIPE_MARKETS],
    },
  });

describe("useOracleStore - Market Scope presets", () => {
  beforeEach(resetStore);

  it("seeds distinct baseline and snipe scopes per provider", () => {
    const s = useOracleStore.getState();
    expect(s.activeScope).toBe("baseline");
    expect(s.skinsnipeScopes.baseline).toEqual(DEFAULT_SELECTED_MARKETS);
    expect(s.skinsnipeScopes.snipe).toEqual(DEFAULT_SKINSNIPE_SNIPE_MARKETS);
    expect(s.cs2capScopes.baseline).toEqual(DEFAULT_CS2CAP_PROVIDERS);
    expect(s.cs2capScopes.snipe).toEqual(DEFAULT_CS2CAP_SNIPE_MARKETS);
  });

  it("applies the selected scope's markets to both providers instantly", () => {
    useOracleStore.getState().setActiveScope("snipe");
    let s = useOracleStore.getState();
    expect(s.selectedMarkets).toEqual(DEFAULT_SKINSNIPE_SNIPE_MARKETS);
    expect(s.selectedCs2capProviders).toEqual(DEFAULT_CS2CAP_SNIPE_MARKETS);

    useOracleStore.getState().setActiveScope("baseline");
    s = useOracleStore.getState();
    expect(s.selectedMarkets).toEqual(DEFAULT_SELECTED_MARKETS);
    expect(s.selectedCs2capProviders).toEqual(DEFAULT_CS2CAP_PROVIDERS);
  });

  it("auto-saves Skinsnipe chip edits into the active scope only", () => {
    useOracleStore.getState().setActiveScope("snipe");
    useOracleStore.getState().toggleMarket("skinport");

    const s = useOracleStore.getState();
    expect(s.skinsnipeScopes.snipe).toContain("skinport");
    expect(s.skinsnipeScopes.baseline).not.toContain("skinport");
    expect(s.selectedMarkets).toContain("skinport");

    // Baseline must be unaffected when switching back
    useOracleStore.getState().setActiveScope("baseline");
    expect(useOracleStore.getState().selectedMarkets).not.toContain("skinport");
  });

  it("keeps provider scopes isolated when editing CS2Cap", () => {
    useOracleStore.getState().setActiveScope("snipe");
    useOracleStore.getState().toggleCs2capProvider("skinport");

    const s = useOracleStore.getState();
    expect(s.cs2capScopes.snipe).toContain("skinport");
    expect(s.cs2capScopes.baseline).toEqual(DEFAULT_CS2CAP_PROVIDERS);
    // Skinsnipe snipe scope is untouched by a CS2Cap edit
    expect(s.skinsnipeScopes.snipe).toEqual(DEFAULT_SKINSNIPE_SNIPE_MARKETS);
  });

  it("resets the active scope to its own default", () => {
    useOracleStore.getState().setActiveScope("snipe");
    useOracleStore.getState().toggleMarket("skinport");
    expect(useOracleStore.getState().skinsnipeScopes.snipe).toContain(
      "skinport",
    );

    useOracleStore.getState().resetDefaultMarkets();
    const s = useOracleStore.getState();
    expect(s.skinsnipeScopes.snipe).toEqual(DEFAULT_SKINSNIPE_SNIPE_MARKETS);
    expect(s.skinsnipeScopes.baseline).toEqual(DEFAULT_SELECTED_MARKETS);
  });
});
