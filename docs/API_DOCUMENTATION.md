# FinanceOS REST API Reference

This document provides a comprehensive reference for all backend endpoints in the Finance Management System.

---

## Base URL
All API routes are prefixed with `/api`.

---

## Authentication & Authorization Architecture

* **Authentication**: Session-based authentication using cryptographically secure tokens.
* **Credentials Storage**: Passwords are saved with `scrypt` hashing with 16-byte random salt and 64-byte key length.
* **Session Transport**: Either via `httpOnly` cookie (`session_token`) or `Authorization: Bearer <token>` header.
* **Multi-User Isolation**: All data queries enforce `WHERE user_id = ?` based strictly on the authenticated session. Any attempt to access, update, or delete another user's resource results in `404 Not Found` or `403 Forbidden`.

---

## API Endpoints

### 1. Authentication (`/api/auth`)

#### `POST /api/auth/register`
Registers a new user account, creates default user settings and categories, and initializes a secure session.
* **Request Body**:
  ```json
  {
    "full_name": "Alice Vance",
    "email": "alice@example.com",
    "password": "SecretPassword123!",
    "confirm_password": "SecretPassword123!"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful.",
    "user": {
      "id": "uuid",
      "email": "alice@example.com",
      "full_name": "Alice Vance",
      "is_verified": 1,
      "currency": "PHP",
      "monthly_income": 0,
      "timezone": "Asia/Manila",
      "onboarding_completed": 0
    },
    "token": "session_token_string"
  }
  ```

#### `POST /api/auth/login`
Authenticates user credentials and starts a new session.
* **Request Body**:
  ```json
  {
    "email": "alice@example.com",
    "password": "SecretPassword123!"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "Login successful.",
    "user": { ... },
    "token": "session_token_string"
  }
  ```

#### `POST /api/auth/logout`
Invalidates the current session token and clears session cookies.
* **Response (200 OK)**:
  ```json
  { "message": "Successfully logged out." }
  ```

#### `POST /api/auth/forgot-password`
Issues a secure, 1-hour expiring password reset token.
* **Request Body**: `{ "email": "user@example.com" }`

#### `POST /api/auth/reset-password`
Consumes an active reset token to securely change user password.
* **Request Body**: `{ "token": "...", "new_password": "...", "confirm_password": "..." }`

#### `POST /api/auth/verify-email`
Verifies user email token.
* **Request Body**: `{ "token": "..." }`

#### `GET /api/auth/sessions` & `DELETE /api/auth/sessions/:id`
Lists active user login sessions and revokes specific session tokens.

---

### 2. User Profile & Settings (`/api/me`, `/api/profile`, `/api/settings`)

#### `GET /api/me` / `GET /api/profile`
Returns safe profile data of the authenticated user.

#### `PATCH /api/me` / `PATCH /api/profile`
Updates profile and preferences (`full_name`, `currency`, `monthly_income`, `timezone`, `onboarding_completed`).

#### `GET /api/settings` & `PATCH /api/settings`
Fetches and updates user preferences.

---

### 3. Transactions (`/api/transactions`)

#### `GET /api/transactions`
Fetches a paginated, searchable, and filtered list of transactions.
* **Query Parameters**:
  * `page` (default: 1)
  * `limit` (default: 20)
  * `type` (`INCOME` | `EXPENSE`)
  * `category_id` (UUID or `all`)
  * `start_date` (`YYYY-MM-DD`)
  * `end_date` (`YYYY-MM-DD`)
  * `search` (text search in description/notes/category)
  * `sort_by` (`date`, `amount`, `created_at`, `description`)
  * `sort_order` (`ASC` | `DESC`)

#### `POST /api/transactions`
Creates a new financial transaction with server-side category verification.
* **Request Body**:
  ```json
  {
    "category_id": "category-uuid",
    "type": "EXPENSE",
    "amount": 1500.50,
    "date": "2026-09-18",
    "description": "Weekly Groceries",
    "payment_method": "Credit Card",
    "notes": "Pantry staples"
  }
  ```

#### `GET /api/transactions/:id`
Retrieves single transaction details (verifies user ownership).

#### `PATCH /api/transactions/:id`
Updates an existing transaction.

#### `DELETE /api/transactions/:id`
Deletes a transaction.

---

### 4. Categories (`/api/categories`)

* `GET /api/categories?type=INCOME|EXPENSE`
* `POST /api/categories` `{ name, type, icon, color }`
* `GET /api/categories/:id`
* `PATCH /api/categories/:id`
* `DELETE /api/categories/:id` (Safely prevents deletion if linked to transactions)

---

### 5. Budgets (`/api/budgets`)

* `GET /api/budgets?month=YYYY-MM` - Computes `budget_amount`, `spent`, `remaining`, `percentage`, `daily_average`, and threshold status (`HEALTHY`, `WARNING`, `CRITICAL`, `EXCEEDED`).
* `POST /api/budgets` - Upserts budget per `(user_id, category_id, month)`.
* `GET /api/budgets/:id`
* `PATCH /api/budgets/:id`
* `DELETE /api/budgets/:id`

---

### 6. Savings Goals (`/api/savings-goals`)

* `GET /api/savings-goals` - Lists goals with progress, target, current amount, and contribution timeline.
* `POST /api/savings-goals` `{ name, target_amount, initial_amount, target_date, description }`
* `GET /api/savings-goals/:id`
* `PATCH /api/savings-goals/:id`
* `DELETE /api/savings-goals/:id`
* `GET /api/savings-goals/:id/contributions`
* `POST /api/savings-goals/:id/contributions` `{ amount, note, date }` (Atomically updates goal balance)
* `DELETE /api/savings-goals/:id/contributions/:contributionId`

---

### 7. Dashboard & Analytics (`/api/dashboard`, `/api/analytics`)

* `GET /api/dashboard` / `GET /api/analytics/dashboard` - Returns total balance, current vs. previous month income/expense, change percentage, largest category, and category breakdown.
* `GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` - Aggregate period analytics, largest expenses, and category percentage breakdown.
* `GET /api/analytics/spending-overview?range=daily|weekly|monthly|yearly` - Chart data for cash flow trends.

---

### 8. Financial Reports (`/api/reports`)

* `GET /api/reports/summary?type=monthly|yearly&year=2026&month=9` - Detailed statement summary with top category, largest expense, savings rate, and category breakdowns.
* `GET /api/reports/export-csv` & `GET /api/reports/csv` - Stream downloadable CSV statement of filtered transaction data.
