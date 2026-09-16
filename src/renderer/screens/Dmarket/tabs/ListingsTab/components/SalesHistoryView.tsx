import React from "react";
import { History, RotateCw, Loader2 } from "lucide-react";

export interface SalesHistoryViewProps {
  closedOffers: any[];
  closedOffersLoading: boolean;
  onFetchClosedOffers: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  closedOffers,
  closedOffersLoading,
  onFetchClosedOffers,
}) => {
  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      {closedOffers.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "50px 20px",
            color: "var(--so-text-muted)",
          }}
        >
          {closedOffersLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Loader2
                size={32}
                className="spin"
                style={{ color: "var(--so-primary)" }}
              />
              <div>Loading sales history from DMarket...</div>
            </div>
          ) : (
            <div>
              <History
                size={32}
                style={{ marginBottom: "10px", opacity: 0.5 }}
              />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "var(--so-text-primary)",
                  marginBottom: "4px",
                }}
              >
                No sales history loaded
              </div>
              <div style={{ fontSize: "12px", marginBottom: "14px" }}>
                Click below to sync your completed sales from DMarket.
              </div>
              <button
                onClick={onFetchClosedOffers}
                className="btn btn-primary btn-sm"
                style={{ padding: "6px 16px" }}
              >
                <RotateCw size={13} /> Sync Sales History
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "var(--so-surface-card)",
            border: "1px solid var(--so-border-medium)",
            borderRadius: "var(--so-radius-md)",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--so-surface-panel)",
                  borderBottom: "1px solid var(--so-border-medium)",
                  color: "var(--so-text-muted)",
                  fontSize: "11px",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "10px 14px" }}>Item</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>
                  Sold Price
                </th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Fee</th>
                <th style={{ padding: "10px 14px", textAlign: "center" }}>
                  Status
                </th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {closedOffers.map((trade, idx) => {
                const dateStr = trade.closedAt
                  ? new Date(trade.closedAt * 1000).toLocaleString()
                  : "Recent";
                return (
                  <tr
                    key={trade.offerId || idx}
                    style={{
                      borderBottom: "1px solid var(--so-border-subtle)",
                      backgroundColor:
                        idx % 2 === 0
                          ? "transparent"
                          : "rgba(255,255,255,0.01)",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <img
                        src={trade.imageUrl}
                        alt={trade.title}
                        style={{
                          width: "32px",
                          height: "32px",
                          objectFit: "contain",
                        }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = "0.3";
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--so-text-primary)",
                        }}
                      >
                        {trade.title}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontWeight: 800,
                        color: "var(--so-success-text)",
                      }}
                    >
                      ${trade.priceUSD}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        color: "var(--so-text-muted)",
                      }}
                    >
                      {trade.feeFormatted || "—"}
                    </td>
                    <td
                      style={{ padding: "10px 14px", textAlign: "center" }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 7px",
                          borderRadius: "10px",
                          backgroundColor: "rgba(16, 185, 129, 0.15)",
                          color: "var(--so-success-text)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          textTransform: "uppercase",
                        }}
                      >
                        {trade.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        color: "var(--so-text-muted)",
                      }}
                    >
                      {dateStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
