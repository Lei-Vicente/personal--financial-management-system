# Database Schema & Relational Architecture Documentation

## Overview
The application utilizes an embedded relational database (SQLite via Node.js native `DatabaseSync`) configured with:
* **Write-Ahead Logging (WAL Mode)** (`PRAGMA journal_mode = WAL`) for concurrent read/write operations and high throughput.
* **Foreign Key Constraints** (`PRAGMA foreign_keys = ON`) ensuring strict referential integrity.
* **Database Constraints**: `NOT NULL`, `CHECK`, `UNIQUE`, and `ON DELETE CASCADE / RESTRICT` enforcing domain rules at the storage level.

---

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--|| USER_SETTINGS : "has settings"
    USERS ||--o{ CATEGORIES : "owns"
    USERS ||--o{ TRANSACTIONS : "records"
    USERS ||--o{ BUDGETS : "allocates"
    USERS ||--o{ SAVINGS_GOALS : "targets"
    USERS ||--o{ SESSIONS : "authenticates"
    USERS ||--o{ VERIFICATION_TOKENS : "verifies"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "resets"

    CATEGORIES ||--o{ TRANSACTIONS : "categorizes"
    CATEGORIES ||--o{ BUDGETS : "limits"

    SAVINGS_GOALS ||--o{ SAVINGS_CONTRIBUTIONS : "accumulates"
    USERS ||--o{ SAVINGS_CONTRIBUTIONS : "contributes"

    USERS {
        TEXT id PK
        TEXT email UK
        TEXT password_hash
        TEXT full_name
        INTEGER is_verified
        TEXT created_at
        TEXT updated_at
        TEXT last_login_at
    }

    USER_SETTINGS {
        TEXT id PK
        TEXT user_id FK, UK
        TEXT currency
        REAL monthly_income
        TEXT timezone
        INTEGER onboarding_completed
        TEXT created_at
        TEXT updated_at
    }

    CATEGORIES {
        TEXT id PK
        TEXT user_id FK
        TEXT name
        TEXT type
        TEXT icon
        TEXT color
        INTEGER is_default
        TEXT created_at
    }

    TRANSACTIONS {
        TEXT id PK
        TEXT user_id FK
        TEXT category_id FK
        TEXT type
        REAL amount
        TEXT date
        TEXT description
        TEXT payment_method
        TEXT notes
        TEXT created_at
        TEXT updated_at
    }

    BUDGETS {
        TEXT id PK
        TEXT user_id FK
        TEXT category_id FK
        REAL amount
        TEXT month
        TEXT created_at
        TEXT updated_at
    }

    SAVINGS_GOALS {
        TEXT id PK
        TEXT user_id FK
        TEXT name
        REAL target_amount
        REAL current_amount
        TEXT target_date
        TEXT description
        TEXT created_at
        TEXT updated_at
    }

    SAVINGS_CONTRIBUTIONS {
        TEXT id PK
        TEXT goal_id FK
        TEXT user_id FK
        REAL amount
        TEXT note
        TEXT date
        TEXT created_at
    }

    SESSIONS {
        TEXT id PK
        TEXT user_id FK
        TEXT token UK
        TEXT user_agent
        TEXT ip_address
        TEXT expires_at
        TEXT created_at
    }

    VERIFICATION_TOKENS {
        TEXT id PK
        TEXT user_id FK
        TEXT token UK
        TEXT expires_at
        TEXT used_at
        TEXT created_at
    }

    PASSWORD_RESET_TOKENS {
        TEXT id PK
        TEXT user_id FK
        TEXT token UK
        TEXT expires_at
        TEXT used_at
        TEXT created_at
    }
```

---

## Performance Indexes
* `idx_trans_user_date` on `transactions(user_id, date)`
* `idx_trans_category` on `transactions(category_id)`
* `idx_cat_user` on `categories(user_id)`
* `idx_budgets_user_month` on `budgets(user_id, month)`
* `idx_budgets_category` on `budgets(category_id)`
* `idx_goals_user` on `savings_goals(user_id)`
* `idx_contrib_goal` on `savings_contributions(goal_id, user_id)`
* `idx_sessions_token` on `sessions(token)`
* `idx_verif_tokens` on `verification_tokens(token)`
* `idx_pwreset_tokens` on `password_reset_tokens(token)`
