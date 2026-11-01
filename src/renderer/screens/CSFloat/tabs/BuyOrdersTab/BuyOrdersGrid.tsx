import React from "react";
import { ShoppingCart } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";
import { Skeleton } from "../../../../components/Skeleton";
import {
  CSFloatOrderCard,
  OrderDriftDetails,
} from "../../components/CSFloatOrderCard";
import { BuyOrderStatusFilter } from "./BuyOrdersToolbar";

export interface BuyOrdersGridProps {
  orders: any[];
  displayedOrders: any[];
  loading: boolean;
  statusFilter: BuyOrderStatusFilter;
  selectedItems: Record<string, boolean>;
  processingId: string | null;
  pricesLoaded: boolean;
  userBalance?: number;
  hasSelection: boolean;
  onToggleSelect: (orderId: string) => void;
  getOrderDriftDetails: (order: any) => OrderDriftDetails | null;
  onManualUpdate: (
    orderId: string,
    marketHashName: string,
    targetPrice: number,
    quantity: number,
  ) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (
    name: string,
    acceptedPrice?: number,
    currentPrice?: number,
  ) => void;
  onUpdateQuantity: (orderId: string, newQty: number) => void;
  onResetFilter: () => void;
  onSync: () => void;
}

export const BuyOrdersGrid: React.FC<BuyOrdersGridProps> = ({
  orders,
  displayedOrders,
  loading,
  statusFilter,
  selectedItems,
  processingId,
  pricesLoaded,
  userBalance,
  hasSelection,
  onToggleSelect,
  getOrderDriftDetails,
  onManualUpdate,
  onDeleteOrder,
  onOpenMarket,
  onOpenLookup,
  onUpdateQuantity,
  onResetFilter,
  onSync,
}) => {
  return (
    <div style={styles.gridScrollView}>
      {orders.length === 0 ? (
        loading ? (
          <div style={styles.skeletonGrid}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} style={styles.skeletonCard}>
                <Skeleton width="70%" height={12} />
                <Skeleton width="100%" height={90} borderRadius={8} />
                <Skeleton width="85%" height={12} />
                <Skeleton width="60%" height={12} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={styles.emptyCard}>
            <EmptyState
              icon={<ShoppingCart size={40} />}
              title="No Buy Orders Configured"
              description="Sync your active CSFloat buy orders to audit ceilings, drift, and capital exposure from one book."
              action={{ label: "Sync Buy Orders", onClick: onSync }}
            />
          </div>
        )
      ) : displayedOrders.length === 0 ? (
        <div className="card" style={styles.emptyCard}>
          <EmptyState
            icon={<ShoppingCart size={40} />}
            title={`No Orders Match Filter "${statusFilter.toUpperCase()}"`}
            description="This filter has no matching orders right now. Reset to the full book to continue."
            action={{
              label: `Show All Orders (${orders.length})`,
              onClick: onResetFilter,
            }}
          />
        </div>
      ) : (
        <div style={getCardsGridStyle(hasSelection)}>
          {displayedOrders.map((order) => {
            const driftDetails = getOrderDriftDetails(order);
            const isSelected = !!selectedItems[order.id];
            const isProcessing = processingId === order.id;

            return (
              <CSFloatOrderCard
                key={order.id}
                order={order}
                isSelected={isSelected}
                onToggleSelect={() => onToggleSelect(order.id)}
                driftDetails={driftDetails}
                isProcessing={isProcessing}
                userBalance={userBalance}
                isUnmatched={pricesLoaded && !driftDetails?.acceptedPrice}
                onManualUpdate={onManualUpdate}
                onDelete={onDeleteOrder}
                onOpenMarket={onOpenMarket}
                onOpenLookup={onOpenLookup}
                onUpdateQuantity={onUpdateQuantity}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const getCardsGridStyle = (hasSelection: boolean): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "10px",
  paddingBottom: hasSelection ? "75px" : "12px",
});

const styles: Record<string, React.CSSProperties> = {
  gridScrollView: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
  },
  emptyCard: {
    padding: "10px",
  },
  skeletonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "10px",
  },
  skeletonCard: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
  },
};
