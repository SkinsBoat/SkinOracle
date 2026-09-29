import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export const KnowledgeParagraph: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <p style={styles.paragraph}>{children}</p>;

export const KnowledgeHeading: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <h3 style={styles.heading}>{children}</h3>;

export const KnowledgeCode: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <code style={styles.code}>{children}</code>;

export const KnowledgeBullets: React.FC<{ items: React.ReactNode[] }> = ({
  items,
}) => (
  <ul style={styles.bulletList}>
    {items.map((item, index) => (
      <li key={index} style={styles.bulletItem}>
        <span style={styles.bulletDot} />
        <span style={styles.bulletText}>{item}</span>
      </li>
    ))}
  </ul>
);

export interface KnowledgeStep {
  title: string;
  body: React.ReactNode;
}

export const KnowledgeStepList: React.FC<{ steps: KnowledgeStep[] }> = ({
  steps,
}) => (
  <ol style={styles.stepList}>
    {steps.map((step, index) => (
      <li key={step.title} style={styles.stepItem}>
        <span style={styles.stepNumber}>{index + 1}</span>
        <div style={styles.stepContent}>
          <div style={styles.stepTitle}>{step.title}</div>
          <div style={styles.stepBody}>{step.body}</div>
        </div>
      </li>
    ))}
  </ol>
);

export type KnowledgeCalloutTone = "tip" | "warning" | "info";

export const KnowledgeCallout: React.FC<{
  tone?: KnowledgeCalloutTone;
  title: string;
  children: React.ReactNode;
}> = ({ tone = "tip", title, children }) => (
  <div style={getCalloutStyle(tone)}>
    <div style={styles.calloutHeader}>
      {getCalloutIcon(tone)}
      <span style={getCalloutTitleStyle(tone)}>{title}</span>
    </div>
    <div style={styles.calloutText}>{children}</div>
  </div>
);

const getCalloutIcon = (tone: KnowledgeCalloutTone): React.ReactNode => {
  const color =
    tone === "warning" ? "#fcd34d" : tone === "info" ? "#7dd3fc" : "#6ee7b7";
  const Icon =
    tone === "warning" ? AlertTriangle : tone === "info" ? Info : CheckCircle2;
  return <Icon size={15} style={{ color, flexShrink: 0 }} />;
};

const CALLOUT_TONES: Record<
  KnowledgeCalloutTone,
  { border: string; background: string; color: string }
> = {
  tip: {
    border: "rgba(52, 211, 153, 0.4)",
    background: "rgba(16, 185, 129, 0.14)",
    color: "#6ee7b7",
  },
  warning: {
    border: "rgba(251, 191, 36, 0.4)",
    background: "rgba(245, 158, 11, 0.14)",
    color: "#fcd34d",
  },
  info: {
    border: "rgba(125, 211, 252, 0.4)",
    background: "rgba(56, 189, 248, 0.14)",
    color: "#7dd3fc",
  },
};

const getCalloutStyle = (tone: KnowledgeCalloutTone): React.CSSProperties => {
  const palette = CALLOUT_TONES[tone];
  return {
    ...styles.callout,
    borderColor: palette.border,
    backgroundColor: palette.background,
  };
};

const getCalloutTitleStyle = (
  tone: KnowledgeCalloutTone,
): React.CSSProperties => ({
  ...styles.calloutTitle,
  color: CALLOUT_TONES[tone].color,
});

const styles: Record<string, React.CSSProperties> = {
  paragraph: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.6,
    margin: 0,
  },
  heading: {
    fontSize: "13.5px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: "6px 0 0 0",
    letterSpacing: "-0.2px",
  },
  code: {
    fontFamily: "var(--so-font-mono)",
    fontSize: "12px",
    padding: "1px 5px",
    borderRadius: "4px",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    color: "#7dd3fc",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  bulletList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  bulletItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "9px",
  },
  bulletDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    backgroundColor: "var(--so-primary)",
    flexShrink: 0,
    marginTop: "6px",
  },
  bulletText: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.55,
  },
  stepList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  stepItem: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "rgba(37, 99, 235, 0.16)",
    border: "1px solid rgba(37, 99, 235, 0.4)",
    color: "#60a5fa",
    fontSize: "12px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: "1px",
  },
  stepContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
  },
  stepTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    lineHeight: 1.4,
  },
  stepBody: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.55,
  },
  callout: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "12px 14px",
    borderRadius: "var(--so-radius-md)",
    border: "1px solid",
  },
  calloutHeader: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  calloutTitle: {
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  calloutText: {
    fontSize: "12.5px",
    color: "var(--so-text-primary)",
    lineHeight: 1.55,
  },
};
