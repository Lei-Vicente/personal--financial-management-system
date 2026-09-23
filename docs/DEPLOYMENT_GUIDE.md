# Deployment Guide: Supabase (PostgreSQL) + Vercel

This guide walks you through deploying your **Personal Financial Management System** to **Vercel** with a hosted **Supabase (PostgreSQL)** database.

---

## 1. Supabase Setup (Database)

### Step 1.1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com).
2. Click **"New Project"**.
3. Choose your organization, project name (e.g. `personal-finance`), database password, and region (e.g. Singapore or nearest to your users).
4. Wait 1–2 minutes for the PostgreSQL instance to spin up.

### Step 1.2: Execute the Database Schema
1. In the Supabase Dashboard left navigation, click **SQL Editor**.
2. Click **"New query"**.
3. Open the file [`supabase/schema.sql`](../supabase/schema.sql) from this repository.
4. Copy its entire content, paste it into the SQL Editor, and click **Run**.
5. You should see `Success. No rows returned`. All tables, constraints, foreign keys, indexes, and Row Level Security (RLS) are now ready.

### Step 1.3: Retrieve Connection String
1. Go to **Project Settings** (gear icon at the bottom left) → **Database**.
2. Under **Connection string**, select the **URI** tab.
3. Select **Mode: Transaction** (recommended for serverless Vercel) or **Session**.
4. Copy the connection URI:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   ```
   *(Be sure to replace `[YOUR-PASSWORD]` with your actual database password).*

---

## 2. Vercel Setup (Deployment)

### Step 2.1: Push Your Code to GitHub
Ensure your latest code is committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure Supabase and Vercel deployment"
git push origin <your-branch>
```

### Step 2.2: Import Repository into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Select your `finance-management-system` repository.
4. Set the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 2.3: Configure Environment Variables
In the Vercel project configuration, expand **Environment Variables** and add:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production optimizations |
| `DATABASE_URL` | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require` | Supabase Postgres URI |
| `AUTH_SECRET` | *(Random 32+ characters string)* | Secret for auth encryption |
| `SESSION_TTL_DAYS` | `7` | Duration of login cookies |
| `GEMINI_API_KEY` | *(Your Gemini API Key)* | Optional for AI financial analysis |

5. Click **Deploy**.

---

## 3. Post-Deployment Verification

1. Once Vercel finishes deploying, visit your live URL: `https://your-app.vercel.app`.
2. Test **Registration**: Register an account with your email.
3. Check Supabase: In the **Table Editor**, verify that:
   - A row was inserted into `users`.
   - Default categories were seeded in `categories`.
   - A default wallet was created in `accounts`.
   - A row was created in `user_settings`.
4. Test **Transactions & Budgets**:
   - Add a test income and expense.
   - Verify that your wallet balance and dashboard reflect the changes.
5. Multi-User Isolation:
   - Log out or open an Incognito window, register a second user, and verify that User 2 sees zero data from User 1.
