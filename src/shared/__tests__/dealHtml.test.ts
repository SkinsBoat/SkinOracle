import { describe, expect, it } from "vitest";
import { buildDealHtml } from "../dealHtml";
import type { DealExportPayload } from "../types/dealExport.types";

function payload(
  overrides: Partial<DealExportPayload> = {},
): DealExportPayload {
  return {
    roomId: "8f3a9b1c-1111-4222-8333-444455556666",
    marketplace: "skinport",
    sellerHandle: "Seller One",
    items: [
      {
        marketHashName: "AK-47 | Redline (Field-Tested)",
        exterior: "Field-Tested",
        floatValue: 0.22,
        listingPrice: 100,
        proposedPrice: 80,
        selected: true,
        status: "accepted",
      },
      {
        marketHashName: "AWP | Asiimov (Field-Tested)",
        exterior: "Field-Tested",
        listingPrice: 50,
        proposedPrice: 50,
        counterPrice: 48,
        selected: true,
        status: "accepted",
      },
    ],
    globalDiscountPct: -10,
    traderReady: true,
    sellerReady: true,
    dealLocked: true,
    exportedAt: "2026-10-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildDealHtml — locked deal PDF", () => {
  it("renders the public deal, adjusted offers, and totals", () => {
    const html = buildDealHtml(payload());

    expect(html).toContain("SKINORACLE");
    expect(html).toContain("Seller One");
    expect(html).toContain("Skinport");
    expect(html).toContain("8f3a9b1c-1111-4222-8333-444455556666");
    expect(html).toContain("AK-47 | Redline (Field-Tested)");
    expect(html).toContain("$72.00");
    expect(html).toContain("$45.00");
    expect(html).toContain("$117.00");
    expect(html).toContain("$150.00");
    expect(html).toContain("$33.00");
    expect(html).toContain("−10%");
    expect(html).toContain("Accepted");
  });

  it("renders buyer premiums and excluded items", () => {
    const html = buildDealHtml(
      payload({
        globalDiscountPct: 10,
        items: [
          {
            marketHashName: "M4A1-S | Printstream (FT)",
            listingPrice: 100,
            proposedPrice: 100,
            selected: true,
            status: "accepted",
          },
          {
            marketHashName: "Glock-18 | Fade (FN)",
            listingPrice: 900,
            proposedPrice: 800,
            selected: false,
            status: "rejected",
          },
        ],
      }),
    );

    expect(html).toContain("Premium");
    expect(html).toContain("+10%");
    expect(html).toContain("Excluded");
    expect(html).toContain("$110.00");
  });

  it("escapes untrusted seller and item text", () => {
    const html = buildDealHtml(
      payload({
        sellerHandle: "<script>alert(1)</script>",
        items: [
          {
            marketHashName: "<img src=x onerror=alert(2)>",
            listingPrice: 10,
            proposedPrice: 8,
            selected: true,
            status: "accepted",
          },
        ],
      }),
    );

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x");
  });

  it("does not serialize internal margin fields", () => {
    const html = buildDealHtml(payload());

    expect(html).not.toContain("profitPercent");
    expect(html).not.toContain("spread:");
    expect(html).not.toContain("buyCeiling");
  });
});
