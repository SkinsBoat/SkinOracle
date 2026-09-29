import React from "react";
import { ShieldAlert, Target } from "lucide-react";
import {
  KnowledgeBullets,
  KnowledgeCallout,
  KnowledgeCode,
  KnowledgeHeading,
  KnowledgeParagraph,
  KnowledgeStepList,
} from "./components/KnowledgeBlocks";

export type KnowledgeCategory =
  | "Snipe Flow"
  | "Valuation"
  | "Execution"
  | "Risk & Safety";

export interface KnowledgeArticle {
  id: string;
  category: KnowledgeCategory;
  title: string;
  summary: string;
  readTime: string;
  badgeColor: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "Snipe Flow",
  "Valuation",
  "Execution",
  "Risk & Safety",
];

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: "soclose-flow",
    category: "Snipe Flow",
    title: "Managing the SoClose Flow — Widen to Calculate, Narrow to Snipe",
    summary:
      "Build your accepted prices on a wide, stable market baseline (8–15 markets), then stream live only your main execution venues. You never need to keep refreshing markets you do not snipe on.",
    readTime: "4 min read",
    badgeColor: "#38bdf8",
    icon: <Target size={18} style={{ color: "#38bdf8" }} />,
    content: (
      <>
        <KnowledgeParagraph>
          SoClose is a sniping terminal — it only compares live listings against
          the <strong>accepted prices (buy ceilings)</strong> you already
          calculated. The quality of your deals is decided long before you press{" "}
          <KnowledgeCode>Scan</KnowledgeCode>. Treat the two stages as separate
          jobs: a <strong>wide baseline</strong> to decide the price, and a{" "}
          <strong>narrow stream</strong> to hunt the deal.
        </KnowledgeParagraph>

        <KnowledgeCallout tone="tip" title="Golden Rule">
          Widen to calculate. Narrow to snipe. Use many stable markets to build
          the buy ceiling, but refresh only the marketplaces you can actually
          execute on.
        </KnowledgeCallout>

        <KnowledgeHeading>
          Step 1 — Anchor Buy Ceilings on 8–15 Stable Markets
        </KnowledgeHeading>
        <KnowledgeParagraph>
          Accepted prices are a consensus. The more independent, stable cash
          markets feed the calculation, the harder it is for one spoofed ask or
          a thin order book to drag your ceiling in the wrong direction. Aim for
          roughly <strong>8–15 stable markets</strong> before you calculate.
        </KnowledgeParagraph>
        <KnowledgeBullets
          items={[
            <>
              <strong>Stable</strong> means real cash listings on liquid,
              high-volume marketplaces such as CSFloat, BUFF163, Skinport,
              DMarket, Market.CSGO, and LIS-SKINS.
            </>,
            <>
              Use the <strong>Hide Trade</strong> toggle in{" "}
              <strong>Pricing Central &gt; Step 1</strong> to strip
              virtual-credit and trade-bot venues — Steam, CS.MONEY (Trade),
              Tradeit.gg (Trade), Swap.gg, SkinsMonkey, and LOOT.Farm — because
              their inflated balances distort cash averaging.
            </>,
            <>
              Add markets for breadth, but keep every one of them a genuine cash
              market. Ten solid sources beat twenty shaky ones.
            </>,
          ]}
        />

        <KnowledgeCallout tone="warning" title="Never anchor on trade credit">
          Steam wallet funds and swap-site credit carry a hidden markup. Mixing
          them into your consensus makes a buy ceiling look safe while your real
          cash exit sits far lower.
        </KnowledgeCallout>

        <KnowledgeHeading>
          Step 2 — Calculate Accepted Prices (Buy Ceilings)
        </KnowledgeHeading>
        <KnowledgeParagraph>
          In Pricing Central, load your price cache and calculate accepted
          prices. They persist locally and are reused by every workstation —
          CSFloat, DMarket, and SoClose. Think of them as a running estimate you
          keep current with normal use, not a fixed reference.
        </KnowledgeParagraph>

        <KnowledgeHeading>
          Step 3 — In SoClose, Select Only Your Execution Venues
        </KnowledgeHeading>
        <KnowledgeParagraph>
          Open SoClose and set <strong>Scanner Parameters</strong> to the
          marketplaces you can actually buy on and want to snipe from. The
          scanner evaluates cached prices only for the markets selected here —
          so this is your execution scope, not your valuation scope.
        </KnowledgeParagraph>

        <KnowledgeHeading>
          Step 4 — Refresh Only the Markets You Snipe On
        </KnowledgeHeading>
        <KnowledgeParagraph>
          This is the core trick. You do not need to keep refreshing markets you
          will never buy from. Once the baseline is set and accepted prices are
          stored, keep your live refresh and scan loop on your{" "}
          <strong>main marketplaces only</strong>. Everything else was a
          one-time input to the ceiling, not a live hunting ground.
        </KnowledgeParagraph>
        <KnowledgeBullets
          items={[
            <>
              Fewer refreshed markets means more headroom in provider rate
              limits and a faster, tighter scan.
            </>,
            <>
              The deals that matter are the ones you can execute. Dead-market
              listings only add noise.
            </>,
            <>
              A full multi-market pull belongs with your accepted-price work,
              not with live deal sniping.
            </>,
          ]}
        />

        <KnowledgeHeading>
          Step 5 — Keep Your Ceilings Current
        </KnowledgeHeading>
        <KnowledgeParagraph>
          Accepted prices reflect the market only at the moment you calculated
          them. Prices move constantly, so treat your buy ceilings as something
          you keep current in normal use — not something you set once and lean
          on for a long time.
        </KnowledgeParagraph>

        <KnowledgeCallout tone="info" title="Your Edge, Your Call">
          You know the markets you trade. Stay aware of how old your accepted
          prices are and keep them current as part of how you work.
        </KnowledgeCallout>

        <KnowledgeStepList
          steps={[
            {
              title: "Wide baseline",
              body: "Scan 8–15 stable cash markets and calculate accepted prices (buy ceilings).",
            },
            {
              title: "Narrow execution",
              body: "In SoClose, select your main marketplaces and keep the live refresh loop on those only.",
            },
            {
              title: "Stay current",
              body: "Keep your accepted prices current in normal use rather than relying on a single older snapshot.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "third-party-execution-safety",
    category: "Risk & Safety",
    title: "Third-Party Marketplace Execution — Verify Before You Rely On It",
    summary:
      "Marketplace APIs, endpoints, and execution logic can change without notice. Update, re-check, and validate every action with dust items before trusting it with real inventory.",
    readTime: "2 min read",
    badgeColor: "#f59e0b",
    icon: <ShieldAlert size={18} style={{ color: "#f59e0b" }} />,
    content: (
      <>
        <KnowledgeCallout
          tone="warning"
          title="Execution Can Break Without Warning"
        >
          Marketplace APIs, endpoints, and execution logic can change without
          notice, and third-party integrations may return unexpected or
          incorrect results. A flow that worked yesterday is not guaranteed to
          work today.
        </KnowledgeCallout>

        <KnowledgeHeading>Stay Current</KnowledgeHeading>
        <KnowledgeParagraph>
          Run the latest Skin Oracle release and re-check every execution path
          after an update. When a marketplace changes its API or rules, old
          assumptions can silently fail — sometimes placing an order you did not
          intend.
        </KnowledgeParagraph>

        <KnowledgeHeading>Test With Dust Items First</KnowledgeHeading>
        <KnowledgeParagraph>
          Before trusting any feature with real inventory, test it end-to-end
          with <strong>dust items</strong> (cheap skins). Validate that every
          action behaves safely for your operations:
        </KnowledgeParagraph>
        <KnowledgeBullets
          items={[
            <>Placing buy orders and DMarket targets at your intended prices.</>,
            <>
              Creating listings and targets — and confirming the price, fee, and
              quantity are correct.
            </>,
            <>Editing and cancelling orders without leaving open exposure.</>,
            <>
              Sniping a SoClose deal end-to-end and confirming the resulting
              position matches what you expected.
            </>,
          ]}
        />

        <KnowledgeCallout tone="tip" title="Rule of thumb">
          If you have not personally executed the exact flow on a dust item
          after the last app or marketplace update, treat it as untested.
        </KnowledgeCallout>
      </>
    ),
  },
];
