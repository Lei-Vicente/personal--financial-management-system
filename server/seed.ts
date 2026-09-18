import crypto from 'node:crypto';
import { db, seedDefaultCategories } from './db.ts';
import { hashPassword } from './auth.ts';

export function seedDatabase() {
  console.log('🌱 Starting database seed for multi-user isolation verification...');

  const now = new Date().toISOString();
  const curYear = new Date().getFullYear();
  const curMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthStr = `${curYear}-${curMonth}`;

  // Helper to format dates in current month
  const d = (day: number) => `${curYear}-${curMonth}-${String(day).padStart(2, '0')}`;

  // -------------------------------------------------------------
  // USER A: Alice Vance (alice@example.com)
  // -------------------------------------------------------------
  let userA = db.prepare('SELECT id FROM users WHERE email = ?').get('alice@example.com') as any;
  let userAId = userA?.id;

  if (!userAId) {
    userAId = crypto.randomUUID();
    const pwHash = hashPassword('AlicePassword123!');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, is_verified, created_at, updated_at)
      VALUES (?, 'alice@example.com', ?, 'Alice Vance', 1, ?, ?)
    `).run(userAId, pwHash, now, now);

    db.prepare(`
      INSERT INTO user_settings (id, user_id, currency, monthly_income, timezone, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, 'PHP', 65000, 'Asia/Manila', 1, ?, ?)
    `).run(crypto.randomUUID(), userAId, now, now);

    seedDefaultCategories(userAId);
  }

  // Fetch Alice's categories
  const catsA = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(userAId) as any[];
  const mapA = new Map(catsA.map(c => [c.name, c.id]));

  // Clear existing transactions/budgets/savings for User A to ensure idempotent seed
  db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userAId);
  db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userAId);
  db.prepare('DELETE FROM savings_goals WHERE user_id = ?').run(userAId);

  const insertTrans = db.prepare(`
    INSERT INTO transactions (id, user_id, category_id, type, amount, date, description, payment_method, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  if (mapA.get('Salary')) insertTrans.run(crypto.randomUUID(), userAId, mapA.get('Salary'), 'INCOME', 55000, d(1), 'Primary Tech Consulting Salary', 'Bank Transfer', 'Regular payout', now, now);
  if (mapA.get('Freelance & Extra')) insertTrans.run(crypto.randomUUID(), userAId, mapA.get('Freelance & Extra'), 'INCOME', 15000, d(12), 'Frontend Architecture Audit', 'GCash', 'Client bonus', now, now);
  if (mapA.get('Housing & Bills')) insertTrans.run(crypto.randomUUID(), userAId, mapA.get('Housing & Bills'), 'EXPENSE', 14000, d(2), 'Condo Rental & Association Dues', 'Bank Transfer', 'Makati studio', now, now);
  if (mapA.get('Food & Dining')) insertTrans.run(crypto.randomUUID(), userAId, mapA.get('Food & Dining'), 'EXPENSE', 4500, d(4), 'Weekly Organic Groceries', 'Credit Card', 'Healthy meal prep', now, now);
  if (mapA.get('Food & Dining')) insertTrans.run(crypto.randomUUID(), userAId, mapA.get('Food & Dining'), 'EXPENSE', 1200, d(8), 'Dinner at Italian Bistro', 'Credit Card', 'Team catchup', now, now);
  if (mapA.get('Transportation')) insertTrans.run(crypto.randomUUID(), userAId, mapA.get('Transportation'), 'EXPENSE', 650, d(9), 'Grab Rides to Meeting', 'Credit Card', 'Client presentation', now, now);
  if (mapA.get('Utilities')) insertTrans.run(crypto.randomUUID(), userAId, mapA.get('Utilities'), 'EXPENSE', 3200, d(11), 'Fiber Internet & Power Bill', 'Online Banking', 'Electricity + Meralco', now, now);
  if (mapA.get('Shopping')) insertTrans.run(crypto.randomUUID(), userAId, mapA.get('Shopping'), 'EXPENSE', 2800, d(14), 'Mechanical Keyboard & Desk Mat', 'Credit Card', 'Workstation ergonomics', now, now);

  // User A Budgets
  const insertBudget = db.prepare(`
    INSERT INTO budgets (id, user_id, category_id, amount, month, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  if (mapA.get('Food & Dining')) insertBudget.run(crypto.randomUUID(), userAId, mapA.get('Food & Dining'), 12000, monthStr, now, now);
  if (mapA.get('Housing & Bills')) insertBudget.run(crypto.randomUUID(), userAId, mapA.get('Housing & Bills'), 16000, monthStr, now, now);
  if (mapA.get('Transportation')) insertBudget.run(crypto.randomUUID(), userAId, mapA.get('Transportation'), 4000, monthStr, now, now);
  if (mapA.get('Shopping')) insertBudget.run(crypto.randomUUID(), userAId, mapA.get('Shopping'), 6000, monthStr, now, now);

  // User A Savings Goal
  const goalAId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, target_date, description, created_at, updated_at)
    VALUES (?, ?, 'Tokyo Summer Vacation Fund', 90000, 35000, ?, 'Autumn trip savings', ?, ?)
  `).run(goalAId, userAId, `${curYear + 1}-10-15`, now, now);

  db.prepare(`
    INSERT INTO savings_contributions (id, goal_id, user_id, amount, note, date, created_at)
    VALUES (?, ?, ?, 15000, 'Initial deposit from project dividend', ?, ?)
  `).run(crypto.randomUUID(), goalAId, userAId, d(3), now);

  // -------------------------------------------------------------
  // USER B: Bob Chen (bob@example.com)
  // -------------------------------------------------------------
  let userB = db.prepare('SELECT id FROM users WHERE email = ?').get('bob@example.com') as any;
  let userBId = userB?.id;

  if (!userBId) {
    userBId = crypto.randomUUID();
    const pwHash = hashPassword('BobPassword123!');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, is_verified, created_at, updated_at)
      VALUES (?, 'bob@example.com', ?, 'Bob Chen', 1, ?, ?)
    `).run(userBId, pwHash, now, now);

    db.prepare(`
      INSERT INTO user_settings (id, user_id, currency, monthly_income, timezone, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, 'USD', 4200, 'America/New_York', 1, ?, ?)
    `).run(crypto.randomUUID(), userBId, now, now);

    seedDefaultCategories(userBId);
  }

  const catsB = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(userBId) as any[];
  const mapB = new Map(catsB.map(c => [c.name, c.id]));

  db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userBId);
  db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userBId);
  db.prepare('DELETE FROM savings_goals WHERE user_id = ?').run(userBId);

  if (mapB.get('Salary')) insertTrans.run(crypto.randomUUID(), userBId, mapB.get('Salary'), 'INCOME', 4200, d(1), 'Bi-weekly Developer Salary', 'Direct Deposit', 'Corporate salary', now, now);
  if (mapB.get('Housing & Bills')) insertTrans.run(crypto.randomUUID(), userBId, mapB.get('Housing & Bills'), 'EXPENSE', 1450, d(3), 'Apartment Rent NY', 'ACH', 'Rent', now, now);
  if (mapB.get('Food & Dining')) insertTrans.run(crypto.randomUUID(), userBId, mapB.get('Food & Dining'), 'EXPENSE', 620, d(5), 'Trader Joes Groceries', 'Credit Card', 'Pantry items', now, now);
  if (mapB.get('Entertainment')) insertTrans.run(crypto.randomUUID(), userBId, mapB.get('Entertainment'), 'EXPENSE', 85, d(7), 'Concert Ticket', 'Debit Card', 'Indie show', now, now);

  if (mapB.get('Food & Dining')) insertBudget.run(crypto.randomUUID(), userBId, mapB.get('Food & Dining'), 900, monthStr, now, now);
  if (mapB.get('Housing & Bills')) insertBudget.run(crypto.randomUUID(), userBId, mapB.get('Housing & Bills'), 1500, monthStr, now, now);

  const goalBId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, target_date, description, created_at, updated_at)
    VALUES (?, ?, 'Emergency Liquidity Reserve', 12000, 4500, ?, '6-month emergency buffer', ?, ?)
  `).run(goalBId, userBId, `${curYear + 1}-12-31`, now, now);

  db.prepare(`
    INSERT INTO savings_contributions (id, goal_id, user_id, amount, note, date, created_at)
    VALUES (?, ?, ?, 1000, 'Monthly allocation', ?, ?)
  `).run(crypto.randomUUID(), goalBId, userBId, d(2), now);

  console.log('✅ Successfully seeded multi-user database:');
  console.log('   - User A: alice@example.com (Password: AlicePassword123!)');
  console.log('   - User B: bob@example.com (Password: BobPassword123!)');
}

if (process.argv[1]?.includes('seed')) {
  seedDatabase();
}
