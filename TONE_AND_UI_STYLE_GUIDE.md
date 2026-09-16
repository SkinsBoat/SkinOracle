# Skin Oracle — UI/UX & Code Architecture Principles

Keep this simple and lightweight. When writing UI copy or React TSX components, follow these 3 core pillars:

---

### 1. Speak Trader Intent (Not Developer Plumbing)
Write copy from the perspective of an institutional CS2 trader, not a backend engineer:
- **Use Trader Verbs (Never Developer Verbs):**
  - ❌ "Fetch" ➔ ✅ **Scan**, **Stream**, or **Refresh**
  - ❌ "Build / Rebuild" ➔ ✅ **Calculate / Recalculate** (for buy ceilings) or **Generate / Regenerate** (for sell listings)
- **Clear Intent Separation:**
  - **Accepted Prices** = **Buy Ceilings** (the max price you pay when purchasing/sniping).
  - **Listing Prices** = **Sell Targets** (the price you list your items for sale).
- **Respect Native Platform Naming:**
  - On **DMarket**, purchasing orders are natively called **"Targets"** (`Create Target`, `Target List`). Keep this intact; do not rename them to "Buy Orders".

---

### 2. React TSX: Styles at the Bottom
Keep JSX clean, readable, and free of inline style clutter:
- **Extract Styles:** Place all static styles in a `const styles: Record<string, React.CSSProperties> = { ... }` object at the **bottom of the file** (outside the component function).
- **Dynamic Styles:** Use pure helper functions placed below the component (e.g., `getModeButtonStyle(...)`), returning `React.CSSProperties`.
- **No Inline Bloat:** Never write large style objects directly inside JSX return tags.

---

### 3. Modular Files (Avoid Monoliths)
- Avoid monolithic, overly long single files (>800–1000 lines).
- When a view or workstation grows complex, decompose toolbars, modals, panels, and tabs into focused subcomponents under a dedicated folder (e.g., `components/step2/`, `tabs/TargetTab/components/`).

---

### Quick Checklist Before Finishing Any Task
1. **User Copy:** Trader-friendly? (*Scan, Calculate, Generate — zero "fetch" or "build prices"*).
2. **React Styles:** Extracted to the bottom `styles` object?
3. **Verification:** Ran `npx tsc --noEmit` and `npm run test` with 0 errors?
