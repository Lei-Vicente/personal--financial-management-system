import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import pg from 'pg';

const req = typeof require === 'function' ? require : createRequire(path.join(process.cwd(), 'package.json'));
const { Pool } = pg;

// Determine database mode:
// If DATABASE_URL starts with postgres:// or postgresql://, use PostgreSQL (Supabase).
// Otherwise, fall back to SQLite for zero-config offline development or tests.
const rawDatabaseUrl = process.env.DATABASE_URL || '';
export const isPostgres = rawDatabaseUrl.startsWith('postgres://') || rawDatabaseUrl.startsWith('postgresql://');

let pgPool: pg.Pool | null = null;
let sqliteDb: any = null;

if (isPostgres) {
  pgPool = new Pool({
    connectionString: rawDatabaseUrl,
    ssl: rawDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });
  console.log('Database connected: Supabase PostgreSQL');
} else {
  const dbPath = rawDatabaseUrl && !rawDatabaseUrl.startsWith('data/') && !rawDatabaseUrl.startsWith('./')
    ? path.resolve(rawDatabaseUrl)
    : path.join(process.cwd(), 'data', 'finance.db');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    const { DatabaseSync } = req('node:sqlite');
    sqliteDb = new DatabaseSync(dbPath);
  } catch (err) {
    console.error('Failed to initialize SQLite. Ensure Node.js >= 22.5.0 or use PostgreSQL:', err);
  }

  if (sqliteDb) {
    sqliteDb.exec(`
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

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('CASH', 'BANK', 'WALLET', 'CREDIT', 'INVESTMENT', 'OTHER')),
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'PHP',
      color TEXT DEFAULT '#2563EB',
      icon TEXT DEFAULT 'Wallet',
      is_default INTEGER DEFAULT 0,
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
      account_id TEXT,
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
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE SET NULL,
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

  // Migration helper for existing local SQLite databases: add account_id to transactions if missing
  try {
    const cols = sqliteDb.prepare("PRAGMA table_info(transactions)").all() as any[];
    const hasAccountId = cols.some(c => c.name === 'account_id');
    if (!hasAccountId) {
      sqliteDb.exec(`
        ALTER TABLE transactions ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;
      `);
    }
    sqliteDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_trans_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
    `);
  } catch (e) {
    // Column already exists or table freshly initialized
  }
    console.log('Database connected: SQLite (Local development)');
  }
}

// Convert SQLite '?' parameter placeholders to PostgreSQL '$1, $2, ...' syntax
function convertSqlPlaceholders(sql: string): string {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Unified Database Interface supporting both SQLite and PostgreSQL
export const db = {
  prepare(sql: string) {
    if (!isPostgres) {
      return sqliteDb!.prepare(sql);
    }

    const pgSql = convertSqlPlaceholders(sql);
    return {
      async run(...params: any[]) {
        const res = await pgPool!.query(pgSql, params);
        return { changes: res.rowCount || 0 };
      },
      async get(...params: any[]) {
        const res = await pgPool!.query(pgSql, params);
        return (res.rows[0] as any) || null;
      },
      async all(...params: any[]) {
        const res = await pgPool!.query(pgSql, params);
        return res.rows as any[];
      }
    };
  },
  exec(sql: string) {
    if (!isPostgres) {
      return sqliteDb!.exec(sql);
    }
    return pgPool!.query(sql);
  },
  // Async query methods for portable production code
  async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (isPostgres) {
      const pgSql = convertSqlPlaceholders(sql);
      const res = await pgPool!.query(pgSql, params);
      return res.rows as T[];
    }
    return sqliteDb!.prepare(sql).all(...params) as T[];
  },
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    if (isPostgres) {
      const pgSql = convertSqlPlaceholders(sql);
      const res = await pgPool!.query(pgSql, params);
      return (res.rows[0] as T) || null;
    }
    const row = sqliteDb!.prepare(sql).get(...params);
    return (row as T) || null;
  },
  async execute(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
    if (isPostgres) {
      const pgSql = convertSqlPlaceholders(sql);
      const res = await pgPool!.query(pgSql, params);
      return { rowCount: res.rowCount || 0 };
    }
    const stmt = sqliteDb!.prepare(sql);
    const res = stmt.run(...params);
    return { rowCount: Number(res.changes || 0) };
  }
};

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

export async function seedDefaultCategories(userId: string) {
  const now = new Date().toISOString();
  for (const cat of DEFAULT_CATEGORIES) {
    await db.prepare(`
      INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(crypto.randomUUID(), userId, cat.name, cat.type, cat.icon, cat.color, now);
  }
}

export async function seedDefaultCategoriesAsync(userId: string) {
  return seedDefaultCategories(userId);
}

export async function seedDefaultAccount(userId: string) {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO accounts (id, user_id, name, type, balance, currency, color, icon, is_default, created_at, updated_at)
    VALUES (?, ?, 'Cash Wallet', 'CASH', 0, 'PHP', '#10B981', 'Wallet', 1, ?, ?)
  `).run(crypto.randomUUID(), userId, now, now);
}

export async function seedDefaultAccountAsync(userId: string) {
  return seedDefaultAccount(userId);
}
