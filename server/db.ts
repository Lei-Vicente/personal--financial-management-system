import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Use DATABASE_URL when a host provides a persistent disk (for example, Render).
// Fall back to the local project data directory for development.
const dbPath = process.env.DATABASE_URL
  ? path.resolve(process.env.DATABASE_URL)
  : path.join(process.cwd(), 'data', 'finance.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for performance and relational integrity
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    currency TEXT DEFAULT 'PHP',
    monthly_income REAL DEFAULT 0,
    timezone TEXT DEFAULT 'Asia/Manila',
    onboarding_completed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('EXPENSE', 'INCOME')),
    icon TEXT DEFAULT 'tag',
    color TEXT DEFAULT '#2563EB',
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('EXPENSE', 'INCOME')),
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    month TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(user_id, category_id, month)
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL CHECK(target_amount > 0),
    current_amount REAL DEFAULT 0 CHECK(current_amount >= 0),
    target_date TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS savings_contributions (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    note TEXT,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_trans_user_date ON transactions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_trans_category ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_cat_user ON categories(user_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
  CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
  CREATE INDEX IF NOT EXISTS idx_goals_user ON savings_goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_contrib_goal ON savings_contributions(goal_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_verif_tokens ON verification_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_pwreset_tokens ON password_reset_tokens(token);
`);

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', type: 'EXPENSE', icon: 'Utensils', color: '#F97316' },
  { name: 'Transportation', type: 'EXPENSE', icon: 'Car', color: '#0EA5E9' },
  { name: 'Housing & Bills', type: 'EXPENSE', icon: 'Home', color: '#8B5CF6' },
  { name: 'Shopping', type: 'EXPENSE', icon: 'ShoppingBag', color: '#EC4899' },
  { name: 'Entertainment', type: 'EXPENSE', icon: 'Film', color: '#EAB308' },
  { name: 'Healthcare', type: 'EXPENSE', icon: 'HeartPulse', color: '#EF4444' },
  { name: 'Education', type: 'EXPENSE', icon: 'GraduationCap', color: '#10B981' },
  { name: 'Utilities', type: 'EXPENSE', icon: 'Zap', color: '#6366F1' },
  { name: 'Salary', type: 'INCOME', icon: 'Briefcase', color: '#15803D' },
  { name: 'Freelance & Extra', type: 'INCOME', icon: 'Laptop', color: '#0D9488' },
  { name: 'Investments', type: 'INCOME', icon: 'TrendingUp', color: '#2563EB' },
  { name: 'Other', type: 'EXPENSE', icon: 'MoreHorizontal', color: '#6B7280' },
];

export function seedDefaultCategories(userId: string) {
  const insertStmt = db.prepare(`
    INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const now = new Date().toISOString();
  for (const cat of DEFAULT_CATEGORIES) {
    insertStmt.run(crypto.randomUUID(), userId, cat.name, cat.type, cat.icon, cat.color, now);
  }
}
