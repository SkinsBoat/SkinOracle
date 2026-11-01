import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 4 }: SkeletonProps) {
  return <div style={{ ...styles.skeleton, width, height, borderRadius }} />;
}

interface SkeletonRowProps {
  columns: number[];
}

export function SkeletonRow({ columns }: SkeletonRowProps) {
  return (
    <tr>
      {columns.map((width, idx) => (
        <td key={idx} style={styles.cell}>
          <Skeleton width={width} height={12} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div style={styles.card}>
      <Skeleton width={80} height={10} />
      <div style={styles.spacer} />
      <Skeleton width={60} height={20} />
    </div>
  );
}

const styles = {
  skeleton: {
    backgroundColor: "var(--so-surface-3)",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  cell: {
    padding: "10px 12px",
  },
  card: {
    padding: "12px 16px",
    backgroundColor: "var(--so-surface-1)",
    borderRadius: "var(--so-radius-md)",
    border: "1px solid var(--so-border-1)",
  },
  spacer: {
    height: "8px",
  },
};
