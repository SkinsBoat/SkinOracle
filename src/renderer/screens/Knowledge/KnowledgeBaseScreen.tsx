import React, { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import {
  KNOWLEDGE_ARTICLES,
  KNOWLEDGE_CATEGORIES,
  KnowledgeArticle,
  KnowledgeCategory,
} from "./knowledgeArticles";

const ALL_FILTER = "All";

type CategoryFilter = KnowledgeCategory | typeof ALL_FILTER;

export default function KnowledgeBaseScreen() {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>(ALL_FILTER);
  const [expandedId, setExpandedId] = useState<string | null>(
    KNOWLEDGE_ARTICLES[0]?.id ?? null,
  );

  const visibleArticles = useMemo(() => {
    if (activeFilter === ALL_FILTER) return KNOWLEDGE_ARTICLES;
    return KNOWLEDGE_ARTICLES.filter(
      (article) => article.category === activeFilter,
    );
  }, [activeFilter]);

  const toggleArticle = (article: KnowledgeArticle) => {
    setExpandedId((prev) => (prev === article.id ? null : article.id));
  };

  return (
    <div style={styles.container}>
      {/* ── Hero ── */}
      <div style={styles.heroBanner}>
        <div style={styles.heroGlow} />
        <div style={styles.heroRow}>
          <div style={styles.heroIconBox}>
            <BookOpen size={26} style={{ color: "var(--so-primary)" }} />
          </div>
          <div style={styles.heroTextWrap}>
            <div style={styles.heroTitleRow}>
              <h1 style={styles.heroTitle}>Trading Playbook</h1>
              <span style={styles.betaBadge}>Tips &amp; Tricks</span>
            </div>
            <p style={styles.heroDescription}>
              Field-tested workflows for calculating buy ceilings, scanning
              markets, and sniping SoClose deals — written for execution, not
              for reading.
            </p>
          </div>
          <div style={styles.heroStatBox}>
            <span style={styles.heroStatValue}>{KNOWLEDGE_ARTICLES.length}</span>
            <span style={styles.heroStatLabel}>
              {KNOWLEDGE_ARTICLES.length === 1 ? "Guide" : "Guides"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Category Filters ── */}
      <div style={styles.filterRow}>
        <FilterChip
          label={ALL_FILTER}
          active={activeFilter === ALL_FILTER}
          onSelect={() => setActiveFilter(ALL_FILTER)}
        />
        {KNOWLEDGE_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            label={category}
            active={activeFilter === category}
            onSelect={() => setActiveFilter(category)}
          />
        ))}
      </div>

      {/* ── Articles ── */}
      <div style={styles.articleList}>
        {visibleArticles.map((article) => {
          const isExpanded = expandedId === article.id;
          return (
            <div
              key={article.id}
              style={{
                ...styles.articleCard,
                borderColor: isExpanded
                  ? "var(--so-border-strong)"
                  : "var(--so-border-subtle)",
              }}
            >
              <button
                onClick={() => toggleArticle(article)}
                style={getArticleHeaderStyle(isExpanded)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--so-surface-card-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isExpanded
                    ? "var(--so-surface-card-hover)"
                    : "var(--so-surface-card)";
                }}
              >
                <div style={styles.articleHeaderInner}>
                  <div style={styles.articleIconBox}>{article.icon}</div>
                  <div style={styles.articleTitleWrap}>
                    <div style={styles.articleMetaRow}>
                      <span
                        style={getCategoryBadgeStyle(article.badgeColor)}
                      >
                        {article.category}
                      </span>
                      <span style={styles.readTime}>{article.readTime}</span>
                    </div>
                    <div style={styles.articleTitle}>{article.title}</div>
                    <div style={styles.articleSummary}>{article.summary}</div>
                  </div>
                </div>
                <div style={styles.toggleIconBox}>
                  {isExpanded ? (
                    <ChevronUp
                      size={18}
                      style={{ color: "var(--so-primary)" }}
                    />
                  ) : (
                    <ChevronDown
                      size={18}
                      style={{ color: "var(--so-text-muted)" }}
                    />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div style={styles.articleBody}>{article.content}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer Hint ── */}
      <div style={styles.footerHint}>
        <Lightbulb size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
        <span>
          New playbooks are added as workflows prove themselves. Have a trick
          worth documenting? Share it in the community Discord.
        </span>
      </div>
    </div>
  );
}

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onSelect: () => void;
}> = ({ label, active, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      style={getChipStyle(active, isHovered)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {label}
    </button>
  );
};

const getChipStyle = (
  active: boolean,
  isHovered: boolean,
): React.CSSProperties => ({
  padding: "6px 13px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
  border: `1px solid ${
    active ? "var(--so-primary)" : "var(--so-border-medium)"
  }`,
  backgroundColor: active
    ? "var(--so-primary)"
    : isHovered
      ? "var(--so-surface-card-hover)"
      : "var(--so-surface-card)",
  color: active ? "#ffffff" : "var(--so-text-secondary)",
});

const getArticleHeaderStyle = (isExpanded: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "16px 18px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  transition: "background-color 0.15s ease",
  backgroundColor: isExpanded
    ? "var(--so-surface-card-hover)"
    : "var(--so-surface-card)",
});

const getCategoryBadgeStyle = (color: string): React.CSSProperties => ({
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.5px",
  padding: "1px 7px",
  borderRadius: "4px",
  textTransform: "uppercase",
  color,
  border: `1px solid ${color}55`,
  backgroundColor: `${color}1a`,
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1050px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    paddingBottom: "48px",
  },
  heroBanner: {
    position: "relative",
    borderRadius: "var(--so-radius-lg)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    padding: "26px 30px",
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
  },
  heroGlow: {
    position: "absolute",
    top: "-90px",
    right: "-70px",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%)",
    pointerEvents: "none",
  },
  heroRow: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    position: "relative",
  },
  heroIconBox: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-strong)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "5px",
  },
  heroTitle: {
    fontSize: "23px",
    fontWeight: 800,
    letterSpacing: "-0.4px",
    color: "var(--so-text-primary)",
    margin: 0,
  },
  betaBadge: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    color: "#06b6d4",
    border: "1px solid rgba(6, 182, 212, 0.35)",
    textTransform: "uppercase",
  },
  heroDescription: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    margin: 0,
    lineHeight: 1.5,
  },
  heroStatBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 18px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-strong)",
    flexShrink: 0,
  },
  heroStatValue: {
    fontSize: "22px",
    fontWeight: 800,
    color: "var(--so-primary)",
    lineHeight: 1,
  },
  heroStatLabel: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
    marginTop: "4px",
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  articleList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  articleCard: {
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid",
    overflow: "hidden",
    transition: "border-color 0.18s ease",
  },
  articleHeaderInner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    flex: 1,
    minWidth: 0,
  },
  articleIconBox: {
    width: "38px",
    height: "38px",
    borderRadius: "9px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  articleTitleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    minWidth: 0,
  },
  articleMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  readTime: {
    fontSize: "10.5px",
    fontWeight: 600,
    color: "var(--so-text-muted)",
  },
  articleTitle: {
    fontSize: "14.5px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    lineHeight: 1.35,
  },
  articleSummary: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    lineHeight: 1.5,
  },
  toggleIconBox: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "8px",
  },
  articleBody: {
    padding: "18px 22px 22px 72px",
    borderTop: "1px solid var(--so-border-subtle)",
    backgroundColor: "var(--so-surface-panel)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  footerHint: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.2)",
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.5,
  },
};
