import assert from 'node:assert';
import crypto from 'node:crypto';
import { db, seedDefaultCategories } from '../db.ts';
import { hashPassword, verifyPassword, createSession, invalidateSession } from '../auth.ts';

// Test runner suite
let passedCount = 0;
let failedCount = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('🧪 Running Backend & Database Integrity Test Suite...\n');

  const now = new Date().toISOString();
  const testRunId = crypto.randomUUID().slice(0, 8);

  // Setup test users
  const user1Email = `test.user1.${testRunId}@example.com`;
  const user2Email = `test.user2.${testRunId}@example.com`;
  const user1Id = crypto.randomUUID();
  const user2Id = crypto.randomUUID();

  // -------------------------------------------------------------
  // 1. Password Hashing & Verification Security
  // -------------------------------------------------------------
  console.log('1. Authentication & Cryptography Tests:');

  await test('Password hashing produces unique salted hashes for same password', () => {
    const rawPw = 'SecurePassword123!';
    const hash1 = hashPassword(rawPw);
    const hash2 = hashPassword(rawPw);

    assert.notStrictEqual(hash1, hash2, 'Hashes must have distinct random salts');
    assert.strictEqual(verifyPassword(rawPw, hash1), true, 'Hash 1 must verify correctly');
    assert.strictEqual(verifyPassword(rawPw, hash2), true, 'Hash 2 must verify correctly');
    assert.strictEqual(verifyPassword('WrongPassword123!', hash1), false, 'Wrong password must fail');
  });

  await test('User creation & default category seeding', async () => {
    const pwHash1 = hashPassword('PassUser1!');
    const pwHash2 = hashPassword('PassUser2!');

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Test User 1', 1, ?, ?)
    `).run(user1Id, user1Email, pwHash1, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Test User 2', 1, ?, ?)
    `).run(user2Id, user2Email, pwHash2, now, now);

    await seedDefaultCategories(user1Id);
    await seedDefaultCategories(user2Id);

    const user1Cats = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(user1Id) as any[];
    const user2Cats = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(user2Id) as any[];

    assert(user1Cats.length > 0, 'User 1 should have default categories');
    assert(user2Cats.length > 0, 'User 2 should have default categories');
    assert.notStrictEqual(user1Cats[0].id, user2Cats[0].id, 'Category IDs must belong strictly to respective users');
  });

  await test('Duplicate email registration is rejected by unique constraint', () => {
    assert.throws(() => {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, is_verified, created_at, updated_at)
        VALUES (?, ?, 'dummyhash', 'Duplicate Name', 1, ?, ?)
      `).run(crypto.randomUUID(), user1Email, now, now);
    }, /UNIQUE constraint failed/);
  });

  // -------------------------------------------------------------
  // 2. Multi-User Isolation & Privilege Escalation Protection
  // -------------------------------------------------------------
  console.log('\n2. Multi-User Isolation & Authorization Tests:');

  const u1Cats = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(user1Id) as any[];
  const u2Cats = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(user2Id) as any[];
  const u1CatId = u1Cats[0].id;
  const u2CatId = u2Cats[0].id;

  const trans1Id = crypto.randomUUID();
  const trans2Id = crypto.randomUUID();

  test('Create isolated transactions for User 1 and User 2', () => {
    db.prepare(`
      INSERT INTO transactions (id, user_id, category_id, type, amount, date, description, payment_method, notes, created_at, updated_at)
      VALUES (?, ?, ?, 'EXPENSE', 1500, '2026-09-01', 'User 1 Groceries', 'Cash', 'Personal note', ?, ?)
    `).run(trans1Id, user1Id, u1CatId, now, now);

    db.prepare(`
      INSERT INTO transactions (id, user_id, category_id, type, amount, date, description, payment_method, notes, created_at, updated_at)
      VALUES (?, ?, ?, 'EXPENSE', 3200, '2026-09-01', 'User 2 Flight Ticket', 'Credit Card', 'Private trip', ?, ?)
    `).run(trans2Id, user2Id, u2CatId, now, now);

    const user1Trans = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(user1Id) as any[];
    const user2Trans = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(user2Id) as any[];

    assert.strictEqual(user1Trans.length, 1);
    assert.strictEqual(user2Trans.length, 1);
    assert.strictEqual(user1Trans[0].description, 'User 1 Groceries');
    assert.strictEqual(user2Trans[0].description, 'User 2 Flight Ticket');
  });

  test('User 1 cannot query User 2 transaction using scoped query', () => {
    const row = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(trans2Id, user1Id);
    assert.strictEqual(row, undefined, 'User 1 must NOT be able to read User 2 transaction');
  });

  test('User 1 cannot update User 2 transaction', () => {
    const res = db.prepare(`
      UPDATE transactions
      SET description = 'Hacked by User 1'
      WHERE id = ? AND user_id = ?
    `).run(trans2Id, user1Id);

    assert.strictEqual(res.changes, 0, 'No rows should be updated when targeting another user transaction');

    const check = db.prepare('SELECT description FROM transactions WHERE id = ?').get(trans2Id) as any;
    assert.strictEqual(check.description, 'User 2 Flight Ticket', 'Original transaction description must remain untouched');
  });

  test('User 1 cannot delete User 2 transaction', () => {
    const res = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(trans2Id, user1Id);
    assert.strictEqual(res.changes, 0, 'No rows should be deleted when targeting another user transaction');

    const check = db.prepare('SELECT id FROM transactions WHERE id = ?').get(trans2Id);
    assert(check, 'User 2 transaction must still exist');
  });

  // -------------------------------------------------------------
  // 3. Database Constraints & Financial Integrity
  // -------------------------------------------------------------
  console.log('\n3. Financial Integrity & Database Constraint Tests:');

  test('Transactions must reject negative or zero amounts at database level', () => {
    assert.throws(() => {
      db.prepare(`
        INSERT INTO transactions (id, user_id, category_id, type, amount, date, description, created_at, updated_at)
        VALUES (?, ?, ?, 'EXPENSE', -500, '2026-09-01', 'Invalid Negative', ?, ?)
      `).run(crypto.randomUUID(), user1Id, u1CatId, now, now);
    }, /CHECK constraint failed/);

    assert.throws(() => {
      db.prepare(`
        INSERT INTO transactions (id, user_id, category_id, type, amount, date, description, created_at, updated_at)
        VALUES (?, ?, ?, 'EXPENSE', 0, '2026-09-01', 'Invalid Zero', ?, ?)
      `).run(crypto.randomUUID(), user1Id, u1CatId, now, now);
    }, /CHECK constraint failed/);
  });

  test('Budgets enforce uniqueness per user, category, and month', () => {
    const budgetId1 = crypto.randomUUID();
    const budgetId2 = crypto.randomUUID();
    const month = '2026-09';

    db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, amount, month, created_at, updated_at)
      VALUES (?, ?, ?, 5000, ?, ?, ?)
    `).run(budgetId1, user1Id, u1CatId, month, now, now);

    assert.throws(() => {
      db.prepare(`
        INSERT INTO budgets (id, user_id, category_id, amount, month, created_at, updated_at)
        VALUES (?, ?, ?, 7000, ?, ?, ?)
      `).run(budgetId2, user1Id, u1CatId, month, now, now);
    }, /UNIQUE constraint failed/);
  });

  test('Savings goals and atomic contributions tracking', () => {
    const goalId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, target_date, created_at, updated_at)
      VALUES (?, ?, 'New Laptop', 50000, 10000, '2027-01-01', ?, ?)
    `).run(goalId, user1Id, now, now);

    const contribId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO savings_contributions (id, goal_id, user_id, amount, note, date, created_at)
      VALUES (?, ?, ?, 5000, 'Monthly savings', '2026-09-05', ?)
    `).run(contribId, goalId, user1Id, now);

    db.prepare(`
      UPDATE savings_goals
      SET current_amount = current_amount + 5000, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(now, goalId, user1Id);

    const updatedGoal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(goalId) as any;
    assert.strictEqual(updatedGoal.current_amount, 15000, 'Current amount must accurately reflect contributions');
  });

  // -------------------------------------------------------------
  // 4. Session Invalidation & Token Cleanup
  // -------------------------------------------------------------
  console.log('\n4. Session Management Tests:');

  await test('Session creation, validation, and revocation', async () => {
    const dummyReq: any = { headers: { 'user-agent': 'TestRunner/1.0' }, ip: '127.0.0.1', socket: {} };
    const { token } = await createSession(user1Id, dummyReq);

    const sessionRow = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as any;
    assert(sessionRow, 'Session must exist in database');
    assert.strictEqual(sessionRow.user_id, user1Id);

    await invalidateSession(token);
    const expiredRow = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    assert.strictEqual(expiredRow, undefined, 'Session must be removed upon invalidation');
  });

  // Clean up test data
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(user1Id, user2Id);

  console.log('\n=============================================');
  console.log(`Results: ${passedCount} passed, ${failedCount} failed.`);
  console.log('=============================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
