import React from "react";
import { Tag, RotateCw, Loader2 } from "lucide-react";
import { DmarketOfferItem, ListingAnalysis } from "../../../../../../shared/types";
import { ActiveOfferCard } from "./ActiveOfferCard";

export interface ActiveListingsViewProps {
  offers: DmarketOfferItem[];
  filteredOffers: DmarketOfferItem[];
  offersLoading: boolean;
  listingAnalysis: Record<string, ListingAnalysis>;
  selectedOffers: Record<string, boolean>;
  selectedOfferCount: number;
  listingProcessingId: string | null;
  onToggleSelect: (id: string) => void;
  onFetchOffers: () => void;
  onResetFilters: () => void;
  onOpenMarket: (title: string) => void;
  onOpenLookupModal: (
    title: string,
    targetPrice?: number,
    currentPriceDollar?: number,
    imageUrl?: string,
  ) => void;
  onQuickUpdate: (offer: DmarketOfferItem, targetPrice: number) => void;
  onEdit: (offer: DmarketOfferItem) => void;
  onDelete: (offer: DmarketOfferItem) => void;
  getItemCooldown?: (
    target: string | { id?: string; offerId?: string; assetId?: string },
  ) => { remainingSeconds: number; formatted: string } | null;
}

export const ActiveListingsView: React.FC<ActiveListingsViewProps> = ({
  offers,
  filteredOffers,
  offersLoading,
  listingAnalysis,
  selectedOffers,
  selectedOfferCount,
  listingProcessingId,
  getItemCooldown,
  onToggleSelect,
  onFetchOffers,
  onResetFilters,
  onOpenMarket,
  onOpenLookupModal,
  onQuickUpdate,
  onEdit,
  onDelete,
}) => {
  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      {offers.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "50px 20px",
            color: "var(--so-text-muted)",
          }}
        >
          {offersLoading ? (
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
              <div>Loading active sell offers from DMarket...</div>
            </div>
          ) : (
            <div>
              <Tag
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
                No active sell offers found
              </div>
              <div style={{ fontSize: "12px", marginBottom: "14px" }}>
                You currently have no items listed for sale on DMarket or
                they have not been synced yet.
              </div>
              <button
                onClick={onFetchOffers}
                className="btn btn-primary btn-sm"
                style={{ padding: "6px 16px" }}
              >
                <RotateCw size={13} /> Sync Active Listings
              </button>
            </div>
          )}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--so-text-muted)",
          }}
        >
          <div>No listings match the current filter.</div>
          <button
            onClick={onResetFilters}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "10px" }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
            gap: "10px",
            paddingBottom: selectedOfferCount > 0 ? "75px" : "12px",
          }}
        >
          {filteredOffers.map((offer) => (
            <ActiveOfferCard
              key={offer.id}
              offer={offer}
              analysis={listingAnalysis[offer.id]}
              isSelected={!!selectedOffers[offer.id]}
              isProcessing={listingProcessingId === offer.id}
              cooldown={getItemCooldown ? getItemCooldown(offer) : null}
              onToggleSelect={onToggleSelect}
              onOpenMarket={onOpenMarket}
              onOpenLookupModal={onOpenLookupModal}
              onQuickUpdate={onQuickUpdate}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
