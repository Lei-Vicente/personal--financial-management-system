# Personal Financial Management System

A secure, high-performance, multi-user personal finance management system engineered with React, TypeScript, Express, and a dual-engine database architecture supporting both local SQLite (zero-config local development) and Supabase PostgreSQL (scalable production cloud deployment with Row-Level Security).

---

## 1. Overview

The **Personal Financial Management System** gives users complete ownership over their financial life. Designed from the ground up around a **transaction-ledger-as-source-of-truth** model, the platform allows individuals to manage multiple accounts/wallets (e.g., Cash on-hand, GCash, GoTyme, Landbank, BPI), record granular income and expense transactions, execute zero-sum inter-wallet transfers, establish category-specific monthly spending budgets, track progress toward ambitious savings goals, and manage upcoming recurring bills and scheduled commitments.

All user data is strictly isolated both at the API service layer and through database constraints/Row-Level Security (RLS) policies, preventing unauthorized cross-tenant data access.

---

## 2. Core Features

- **Multi-Wallet / Account Management:**
  - Create and manage distinct financial accounts (Cash, Bank Accounts, E-Wallets, Investments, Credit Cards).
  - Track authoritative real-time balances computed dynamically via:
    $$\text{Current Balance} = \text{Opening Balance} + \sum(\text{Income}) - \sum(\text{Expense}) \pm \sum(\text{Transfers})$$
  - Customize wallet colors, icons, and display orders.

- **Authoritative Transaction Ledger:**
  - Support for `INCOME`, `EXPENSE`, and `TRANSFER` operations.
  - Inter-wallet money movement: decreases source wallet, increases destination wallet, while user's net worth remains identical (no artificial inflation of expense or income figures).
  - Search, filter by date range, transaction type, category, or wallet, and export to CSV.

- **Upcoming Bills & Recurring Commitments:**
  - Track fixed and recurring bills (Internet, Electricity, Subscriptions) with status flags (`is_paid`) and due date proximity alerts (`Due Today`, `Overdue`, `In X days`).
  - One-click bill payment with automated generation of authoritative expense transactions.
  - Automated scheduling engine with idempotent processing that advances `next_date` based on frequency (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`).

- **Category-Based Budgets:**
  - Monthly spending thresholds per category.
  - Real-time progress bars, warning states (80%+ threshold), and over-budget alerts calculated directly from transaction records.

- **Savings Goals & Milestone Tracking:**
  - Target amount, target completion dates, and contribution ledgers.
  - Atomic contributions recorded with history, timestamps, and optional notes.

- **Interactive Financial Analytics & Reports:**
  - Visual cash flow summaries, spending breakdowns by category, monthly trend charts, and highest spending categories.
  - Financial health indicators including Savings Rate ($(\text{Savings} / \text{Income}) \times 100$) and Net Cash Flow.

- **Multi-User Isolation & Security:**
  - Salted `scrypt` cryptographic password hashing.
  - Stateful session authentication with database verification.
  - Server-side authorization checks on every protected endpoint.
  - Database-level `CHECK` constraints rejecting invalid types, negative amounts, or unauthorized foreign key references.

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & Icons** | TailwindCSS, Lucide React |
| **Data Fetching & Cache** | Stale-While-Revalidate (SWR) in-memory cache with instantaneous 0ms rendering |
| **Backend Runtime** | Node.js (>= 22.5.0), Express, TypeScript (`tsx` / `esbuild`) |
| **Local Database** | Node.js built-in `node:sqlite` (zero external C++ binary dependencies) |
| **Cloud Database** | PostgreSQL via Supabase (`pg` connection pool with SSL) |
| **Security & Auth** | Node.js `crypto` (`scryptSync` + random 16-byte salt), Session Tokens |
| **Testing** | Node.js Native Test Runner (`node:assert`, `tsx server/tests/backend.test.ts`) |

---

## 4. Architecture

The application adopts a **Domain-Driven, Decoupled Architecture**:

```text
┌─────────────────────────────────────────────────────────────┐
│                 Client Layer (React / Vite)                 │
│  - Instant UI (SWR In-Memory Cache)                         │
│  - Responsive Views (Dashboard, Wallets, Ledger, Bills)    │
│  - Semantic Modals & Accessible Form Controls               │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Server Layer (Express API)                  │
│  - Request Validation & Scoped Parameter Parsing            │
│  - Session Authentication Middleware (`requireAuth`)        │
│  - Scoped Domain Handlers (Auth, Wallets, Transactions, ...)│
│  - Automated Recurring Schedule Processor                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Parameterized SQL
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Database Layer (SQLite / Postgres)            │
│  - Local Dev: node:sqlite with WAL Mode                     │
│  - Production: Supabase PostgreSQL with RLS                 │
│  - Strict Referential Integrity & Cascade Deletes           │
│  - Authoritative Transaction Ledger Math                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Project Structure

```text
finance-management-system/
├── dist/                          # Production client & server builds
├── server/                        # Express API & Backend Services
│   ├── routes/
│   │   ├── accountRoutes.ts       # Wallets CRUD & dynamic balance calculations
│   │   ├── analyticsRoutes.ts     # Aggregated spending, cash flow, and health metrics
│   │   ├── authRoutes.ts          # Register, login, logout, profile, and password reset
│   │   ├── billRoutes.ts          # Bills CRUD and one-click payment processing
│   │   ├── budgetRoutes.ts        # Category monthly budgets & actual spending comparisons
│   │   ├── categoryRoutes.ts      # User categories & default seeding
│   │   ├── recurringRoutes.ts     # Recurring rules & idempotent process engine
│   │   ├── savingsRoutes.ts       # Goals & atomic contribution records
│   │   └── transactionRoutes.ts   # Ledger CRUD, filters, transfers, and CSV export
│   ├── tests/
│   │   └── backend.test.ts        # 16-suite integration test verifying security & math
│   ├── auth.ts                    # Password hashing (scrypt) & session management
│   ├── db.ts                      # Dual SQLite/Postgres connection & migration engine
│   └── seed.ts                    # Sample development seed data
├── src/                           # Frontend React Application
│   ├── components/
│   │   ├── BillModal.tsx          # Create/edit bills modal
│   │   ├── BudgetModal.tsx        # Create/edit category budget modal
│   │   ├── InteractiveCards.tsx   # Stat cards, budget progress, transaction rows
│   │   ├── Navigation.tsx         # Responsive sidebar & mobile bottom bar
│   │   ├── RecurringModal.tsx     # Recurring schedule modal
│   │   ├── SavingsModal.tsx       # Goal and contribution modals
│   │   ├── TransactionModal.tsx   # Income, Expense & Transfer modal
│   │   └── WalletSection.tsx      # Interactive wallet cards with quick transfer
│   ├── views/
│   │   ├── AnalyticsView.tsx      # Charts, cash flow, and category breakdowns
│   │   ├── BillsView.tsx          # Tabbed view for bills & recurring transactions
│   │   ├── BudgetsView.tsx        # Budgets overview & progress
│   │   ├── DashboardView.tsx      # Master financial control center
│   │   ├── SavingsView.tsx        # Goals and milestone tracking
│   │   ├── SettingsView.tsx       # Profile, password, and export preferences
│   │   └── TransactionsView.tsx   # Paginated ledger with search and filters
│   ├── types.ts                   # Unified TypeScript interfaces
│   ├── utils.tsx                  # Formatting helpers, SWR cache, and API fetcher
│   ├── App.tsx                    # Root component with routing and modal state
│   └── main.tsx                   # React DOM bootstrap
├── supabase/
│   └── schema.sql                 # PostgreSQL DDL with Row-Level Security (RLS)
├── package.json                   # Scripts and project dependencies
├── server.ts                      # Backend entry point and route registration
├── tsconfig.json                  # TypeScript compiler configuration
└── vite.config.ts                 # Vite bundler configuration
```

---

## 6. Database Schema & Entity Relationships

### Entity Relationship Diagram (ERD)

```text
┌───────────────────────┐
│         USERS         │
│───────────────────────│
│ id (PK)               │◄───┐
│ email (UQ)            │    │
│ password_hash         │    │
│ full_name             │    │
│ is_verified           │    │
│ created_at            │    │
└───────────────────────┘    │
         │                   │
         │ 1:N               │
         ├───────────────────┼───────────────────┬───────────────────┐
         ▼                   ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    ACCOUNTS     │ │   CATEGORIES    │ │     BUDGETS     │ │  SAVINGS_GOALS  │
│─────────────────│ │─────────────────│ │─────────────────│ │─────────────────│
│ id (PK)         │ │ id (PK)         │ │ id (PK)         │ │ id (PK)         │
│ user_id (FK)    │ │ user_id (FK)    │ │ user_id (FK)    │ │ user_id (FK)    │
│ name            │ │ name            │ │ category_id (FK)│ │ name            │
│ type            │ │ type            │ │ amount          │ │ target_amount   │
│ balance (opening│ │ icon, color     │ │ month (YYYY-MM) │ │ current_amount  │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
         │                   │                                       │ 1:N
         │                   │                                       ▼
         │                   │                             ┌─────────────────┐
         │                   │                             │  CONTRIBUTIONS  │
         │                   │                             │─────────────────│
         │                   │                             │ id (PK)         │
         │                   │                             │ goal_id (FK)    │
         │                   │                             │ amount, date    │
         │                   │                             └─────────────────┘
         ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                        TRANSACTIONS                         │
│─────────────────────────────────────────────────────────────│
│ id (PK)                                                     │
│ user_id (FK)                                                │
│ account_id (FK, Source Wallet)                              │
│ to_account_id (FK, Destination Wallet, for TRANSFERS)       │
│ category_id (FK)                                            │
│ type (CHECK: 'INCOME', 'EXPENSE', 'TRANSFER')               │
│ amount (CHECK: amount > 0)                                  │
│ date                                                        │
│ description, payment_method, notes                          │
└─────────────────────────────────────────────────────────────┘
         ▲                                   ▲
         │                                   │
         │ generated by                      │ paid via
┌─────────────────┐                 ┌─────────────────┐
│    RECURRING    │                 │      BILLS      │
│─────────────────│                 │─────────────────│
│ id (PK)         │                 │ id (PK)         │
│ user_id (FK)    │                 │ user_id (FK)    │
│ frequency       │                 │ due_date        │
│ next_date       │                 │ is_paid         │
│ is_active       │                 │ amount          │
└─────────────────┘                 └─────────────────┘
```

---

## 7. The Transaction & Wallet Balance Model

Instead of storing volatile, mutable balance counters that risk drift during simultaneous writes, account balances are dynamically computed from the immutable transaction ledger:

### Mathematical Formula
For any account $A_i$ owned by user $U$:

$$\text{Net Activity} = \sum_{\substack{t \in T \\ t.\text{type} = \text{INCOME} \\ t.\text{account} = A_i}} \text{amount} - \sum_{\substack{t \in T \\ t.\text{type} = \text{EXPENSE} \\ t.\text{account} = A_i}} \text{amount} - \sum_{\substack{t \in T \\ t.\text{type} = \text{TRANSFER} \\ t.\text{source} = A_i}} \text{amount} + \sum_{\substack{t \in T \\ t.\text{type} = \text{TRANSFER} \\ t.\text{dest} = A_i}} \text{amount}$$

$$\text{Current Balance}(A_i) = \text{Opening Balance}(A_i) + \text{Net Activity}(A_i)$$

### Transfer Mechanics
When transferring ₱3,000 from **GCash** to **BPI**:
1. `transactions.account_id` = `GCash.id` (Source)
2. `transactions.to_account_id` = `BPI.id` (Destination)
3. `transactions.type` = `'TRANSFER'`
4. Net user cash flow change = $-3000 + 3000 = 0$.
5. GCash balance decreases by ₱3,000; BPI balance increases by ₱3,000. Total net worth remains exact.

---

## 8. Authentication & Authorization

### Password Security
- Passwords are never stored in plaintext.
- We utilize Node.js native `crypto.scryptSync` with an independent 16-byte cryptographically secure random salt per user.
- Output hashes follow format: `salt:derivedKeyHex`.

### Session Architecture
- Stateful session tokens stored in the `sessions` table with user-agent, IP tracking, and automatic expiration.
- The `requireAuth` middleware extracts the Bearer token or cookie, verifies active status in the database, and injects `req.user = { id, email, full_name }`.

### Multi-Tenant Data Isolation
Every SQL query enforces ownership:
```sql
-- Safe: strictly scoped to authenticated user
SELECT * FROM transactions WHERE id = ? AND user_id = ?;
UPDATE accounts SET name = ? WHERE id = ? AND user_id = ?;
DELETE FROM bills WHERE id = ? AND user_id = ?;
```
If User A requests an ID belonging to User B, the query matches 0 rows and returns a `404 Not Found` or `403 Forbidden`, preventing privilege escalation.

---

## 9. API Architecture

All endpoints follow REST conventions and return consistent JSON structures:

| Route | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Create new account & seed default categories/wallets |
| `/api/auth/login` | `POST` | Authenticate credentials & issue session token |
| `/api/auth/me` | `GET` | Retrieve authenticated user profile |
| `/api/auth/logout` | `POST` | Invalidate and purge session token |
| `/api/accounts` | `GET`, `POST` | List wallets with computed balances; create wallet |
| `/api/accounts/:id` | `PATCH`, `DELETE` | Update wallet details or archive wallet |
| `/api/transactions` | `GET`, `POST` | Query paginated ledger with filters; record transaction |
| `/api/transactions/:id`| `PATCH`, `DELETE` | Edit or delete transaction record |
| `/api/transactions/export/csv` | `GET` | Export filtered transaction ledger to CSV |
| `/api/budgets` | `GET`, `POST` | List monthly category budgets; set budget |
| `/api/savings-goals` | `GET`, `POST` | List savings goals; create new goal |
| `/api/savings-goals/:id/contributions` | `POST` | Record atomic contribution to a goal |
| `/api/bills` | `GET`, `POST` | Query bills with due-date alerts; add new bill |
| `/api/bills/:id/pay` | `POST` | Mark bill as paid & optionally log expense transaction |
| `/api/recurring-transactions` | `GET`, `POST` | Manage recurring rules |
| `/api/recurring-transactions/process` | `POST` | Process due recurring schedules (idempotent) |
| `/api/analytics/dashboard` | `GET` | Aggregated balances, month-over-month income/expenses |
| `/api/analytics/reports` | `GET` | Comprehensive monthly breakdown & category distributions |

---

## 10. Responsive Design Specifications

The frontend implements responsive design across all breakpoints:
- **Mobile (320px – 414px):** Single-column stacked cards, bottom navigation bar, touch-friendly tap targets (minimum 44px), horizontally scrollable wallet carousel, responsive transaction feed.
- **Tablet (768px):** Two-column metrics grid, adaptive modal dialogs, collapsable controls.
- **Desktop (1024px – 1440px+):** Fixed sidebar navigation, 3-column financial summary cards, side-by-side Budgets and Savings Goals widgets, full ledger view with instant search.

---

## 11. Installation & Local Setup

### Prerequisites
- **Node.js** >= 22.5.0 (for native `node:sqlite` and modern ECMAScript support)
- **npm** >= 10.0.0

### Step-by-Step Installation

1. **Clone repository:**
   ```bash
   git clone https://github.com/Lei-Vicente/personal--financial-management-system.git
   cd personal--financial-management-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3001
   NODE_ENV=development
   
   # Optional: Leave unset to automatically use local zero-config SQLite (data/finance.db)
   # DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   - Vite Client: `http://localhost:5173`
   - Express Server: `http://localhost:3001`

---

## 12. Testing & Verification

The repository includes a comprehensive 16-suite integration test covering cryptography, multi-tenant isolation, database constraints, transfer math, bills, and recurring transactions:

```bash
# Execute integration test suite
npm test
```

Expected output:
```text
🧪 Running Backend & Database Integrity Test Suite...

1. Authentication & Cryptography Tests:
  ✓ Password hashing produces unique salted hashes for same password
  ✓ User creation & default category seeding
  ✓ Duplicate email registration is rejected by unique constraint

2. Multi-User Isolation & Authorization Tests:
  ✓ Create isolated transactions for User 1 and User 2
  ✓ User 1 cannot query User 2 transaction using scoped query
  ✓ User 1 cannot update User 2 transaction
  ✓ User 1 cannot delete User 2 transaction

3. Financial Integrity & Database Constraint Tests:
  ✓ Transactions must reject negative or zero amounts at database level
  ✓ Budgets enforce uniqueness per user, category, and month
  ✓ Savings goals and atomic contributions tracking

4. Session Management Tests:
  ✓ Session creation, validation, and revocation

5. Wallet & Transfer Mathematical Tests:
  ✓ Create accounts with opening balances
  ✓ Transfer moves money between wallets without altering total net balance

6. Bills Management & Isolation Tests:
  ✓ Create bill and verify multi-user isolation
  ✓ Pay bill marks status and sets paid date

7. Recurring Transactions Tests:
  ✓ Create recurring transaction rule and process schedule

=============================================
Results: 16 passed, 0 failed.
=============================================
```

To run TypeScript verification:
```bash
npx tsc --noEmit
```

---

## 13. Production Build & Deployment

To compile client assets and server bundle:
```bash
npm run build
```

This creates:
- `dist/index.html` and bundled client assets via Vite.
- `dist/server.cjs` and source maps via `esbuild`.

To start the production server:
```bash
npm start
```

---

## 14. License

Developed by Leibern Vicente as a capstone project for Bachelor of Science in Information Technology.
Licensed under the [MIT License](LICENSE).
