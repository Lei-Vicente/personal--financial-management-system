# Design

## Intent
- **Who it's for:** Personal finance trackers and household budgeters managing daily transactions, bills, savings goals, and cash flow.
- **Core job:** Provide clear visibility into money in/out, upcoming liabilities, and savings progress with zero cognitive overload.
- **Worst-case failure:** Accidental data loss (deleting transactions/accounts), incorrect financial math, or silent submission failures.
- **Density:** Compact, high-utility table and card layouts with tabular numerals for easy visual scanning.
- **Tone:** Calm, precise, editorial, trustworthy (warm stone neutrals rather than clinical cold greys).

## Character
- **Type:** Inter with `tabular-nums` for all currency amounts to ensure perfect columnar alignment and clarity.
- **Color:** Warm stone neutral canvas (`#F5F5F3`) with crisp white surface cards (`#FFFFFF`) and dark charcoal primary ink (`#111111`).
- **Accent & Semantics:** Purpose-driven functional colors: `#15803D` for income/surplus, `#B91C1C` for expense/danger, `#B45309` for pending/upcoming, `#2563EB` for transfers/links.
- **Space:** 4px base scale (4px, 8px, 12px, 16px, 24px, 32px) maintaining consistent rhythm between inputs and cards.
- **Finish:** Subtle 1px borders (`#D9D9D4`) paired with soft drop shadows (`shadow-sm` / `shadow-md`), rounded corners (`rounded-xl` for cards, `rounded-lg` for controls).

## Tokens
```css
:root {
  /* Surfaces & Backgrounds */
  --bg-main: #F5F5F3;
  --bg-surface: #FFFFFF;
  --bg-subtle: #EBEBE7;
  --border-color: #D9D9D4;

  /* Typography */
  --text-primary: #111111;
  --text-secondary: #6B6B67;
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  /* Semantic Financial Accents */
  --color-income: #15803D;
  --color-expense: #B91C1C;
  --color-warning: #B45309;
  --color-info: #2563EB;

  /* Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radius & Shadows */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Motion */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --dur-fast: 150ms;
  --dur-normal: 250ms;
}

.dark {
  --bg-main: #121212;
  --bg-surface: #1E1E1E;
  --bg-subtle: #2A2A28;
  --border-color: #333330;
  --text-primary: #F5F5F3;
  --text-secondary: #A1A19D;
  --color-income: #4ADE80;
  --color-expense: #F87171;
  --color-warning: #FBBF24;
  --color-info: #60A5FA;
}
```

## Hierarchy Rules
- **Primary Actions:** Solid dark charcoal (`bg-[#111111]` text-white in light mode; `bg-[#262624]` border-[#3E3E3A] in dark mode). Exactly one primary action per view (e.g. "Add Transaction", "Create Budget").
- **Secondary Actions:** Neutral card or outline buttons (`bg-[#EBEBE7]` hover: `bg-[#D9D9D4]` or border outline with text `#111111`).
- **Tertiary Actions:** Icon-only or plain ghost text links with visible hover feedback (`text-[#6B6B67]` hover: `text-[#111111]`).
- **Destructive Actions:** Tinted red border/background (`text-[#B91C1C] hover:bg-red-50`), never styled identically to primary actions.
- **Numbers & Metrics:** Large display weight (`text-2xl font-bold tracking-tight tabular-nums`) placed top of metrics cards.

## Components
- **Metric Card:** Displays aggregate KPI (Total Balance, Monthly Inflow/Outflow). Requires loading skeleton and currency formatting.
- **Data Table / List:** Compact row height, right-aligned monetary values, category badge, and direct edit/delete affordances.
- **Modal Dialog:** Centered overlay with backdrop blur, explicit close icon, clear title, single submit button with pending spinner.
- **Badge / Pill:** Rounded-full container with tinted background (e.g., `bg-green-50 text-green-700`) and 12px font size.

## Patterns
- **Form UX:** Labels always visible above inputs. Inputs use `inputmode="decimal"` or `type="number"` for monetary amounts.
- **Validation Timing:** Validate on blur or form submit. Provide immediate clearing upon valid input.
- **Destructive Confirmation:** Irreversible deletes (e.g. deleting an account or budget) require explicit confirmation dialog naming the target item.
- **Empty States:** When a list is empty, state clearly why (e.g., "No transactions found") and provide a direct CTA button (e.g. "Add your first transaction").
- **Error States:** Display user-friendly error banners with retry capability; never wipe out previously entered form values.

## Motion
- **Durations:** 150ms for button clicks / hover states; 200–250ms for modal enters and drawer exits.
- **Easing:** `cubic-bezier(0.23, 1, 0.32, 1)` for entrances; scale never starts below `0.95`.
- **Reduced Motion:** Honor `prefers-reduced-motion: reduce` by replacing spatial transitions with instant opacity fades.

## Don't
- **No pure saturated harsh primaries:** Never use generic neon blues or raw saturated red/green backgrounds.
- **No layout jumps:** Skeleton loaders must strictly match the geometry of final loaded cards and tables.
- **No unlabeled interactive elements:** All icon buttons must provide `aria-label` or title tooltips.
- **No unformatted currency:** All monetary values must use `formatMoney` or `.tabular-nums`.
