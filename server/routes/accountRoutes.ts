import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db, seedDefaultAccount } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const accountRouter = Router();
accountRouter.use(requireAuth);

// GET /api/accounts - List user's accounts / wallets with calculated real balance
accountRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let rows = await db.prepare(`
      SELECT a.*,
        COALESCE(
          (SELECT SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END)
           FROM transactions t
           WHERE t.account_id = a.id AND t.user_id = a.user_id), 0
        ) as net_activity
      FROM accounts a
      WHERE a.user_id = ?
      ORDER BY a.is_default DESC, a.created_at ASC
    `).all(userId) as any[];

    // If no accounts exist yet, automatically seed Philippine wallet defaults
    if (rows.length === 0) {
      await seedDefaultAccount(userId);
      rows = await db.prepare(`
        SELECT a.*,
          COALESCE(
            (SELECT SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END)
             FROM transactions t
             WHERE t.account_id = a.id AND t.user_id = a.user_id), 0
          ) as net_activity
        FROM accounts a
        WHERE a.user_id = ?
        ORDER BY a.is_default DESC, a.created_at ASC
      `).all(userId) as any[];
    } else if (rows.length === 1 && rows[0].name === 'Cash Wallet') {
      // Upgrade single legacy 'Cash Wallet' into full suite: Cash on-hand, GCash, GoTyme Bank, Landbank
      await db.prepare('UPDATE accounts SET name = ?, icon = ? WHERE id = ?').run('Cash on-hand', 'Banknote', rows[0].id);
      const now = new Date().toISOString();
      const extraAccounts = [
        { name: 'GCash', type: 'WALLET', color: '#007DFE', icon: 'Smartphone', is_default: 0 },
        { name: 'GoTyme Bank', type: 'BANK', color: '#00D2C4', icon: 'CreditCard', is_default: 0 },
        { name: 'Landbank', type: 'BANK', color: '#007B3E', icon: 'Building2', is_default: 0 },
      ];
      for (const acc of extraAccounts) {
        await db.prepare(`
          INSERT INTO accounts (id, user_id, name, type, balance, currency, color, icon, is_default, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, 'PHP', ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), userId, acc.name, acc.type, acc.color, acc.icon, acc.is_default, now, now);
      }
      rows = await db.prepare(`
        SELECT a.*,
          COALESCE(
            (SELECT SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END)
             FROM transactions t
             WHERE t.account_id = a.id AND t.user_id = a.user_id), 0
          ) as net_activity
        FROM accounts a
        WHERE a.user_id = ?
        ORDER BY a.is_default DESC, a.created_at ASC
      `).all(userId) as any[];
    }

    const enrichedAccounts = rows.map(acc => {
      const baseBalance = Number(acc.balance || 0);
      const activity = Number(acc.net_activity || 0);
      const currentBalance = baseBalance + activity;
      return {
        ...acc,
        balance: baseBalance,
        base_balance: baseBalance,
        current_balance: currentBalance,
      };
    });

    const totalNetWorth = enrichedAccounts.reduce((sum, a) => sum + a.current_balance, 0);

    return res.json({
      accounts: enrichedAccounts,
      summary: {
        total_accounts: enrichedAccounts.length,
        total_net_worth: totalNetWorth,
      },
    });
  } catch (error: any) {
    console.error('Fetch accounts error:', error);
    return res.status(500).json({ error: 'Failed to retrieve accounts.' });
  }
});

// POST /api/accounts - Create a new account / wallet
accountRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, type = 'WALLET', balance = 0, currency = 'PHP', color = '#2563EB', icon = 'Wallet' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Account name is required.' });
    }

    const validTypes = ['CASH', 'BANK', 'WALLET', 'CREDIT', 'INVESTMENT', 'OTHER'];
    const accType = String(type).toUpperCase();
    if (!validTypes.includes(accType)) {
      return res.status(400).json({ error: `Invalid account type. Must be one of: ${validTypes.join(', ')}` });
    }

    const initBalance = Number(balance);
    if (isNaN(initBalance)) {
      return res.status(400).json({ error: 'Initial balance must be a valid number.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO accounts (id, user_id, name, type, balance, currency, color, icon, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, userId, name.trim(), accType, initBalance, currency || 'PHP', color || '#2563EB', icon || 'Wallet', now, now);

    const inserted = await db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;

    return res.status(201).json({
      message: 'Account created successfully.',
      account: {
        ...inserted,
        balance: Number(inserted.balance || 0),
        base_balance: Number(inserted.balance || 0),
        current_balance: initBalance,
      },
    });
  } catch (error: any) {
    console.error('Create account error:', error);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

// PATCH /api/accounts/:id - Update account details
accountRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    const existing = await db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const { name, type, balance, current_balance, color, icon } = req.body;

    // Fetch existing transaction activity for accurate current balance mapping
    const actRow = await db.prepare(`
      SELECT COALESCE(
        (SELECT SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END)
         FROM transactions t
         WHERE t.account_id = ? AND t.user_id = ?), 0
      ) as net_activity
    `).get(accountId, userId) as any;
    const netActivity = Number(actRow?.net_activity || 0);

    const newName = name !== undefined ? String(name).trim() : existing.name;
    const newType = type !== undefined ? String(type).toUpperCase() : existing.type;

    let newBalance = Number(existing.balance || 0);
    if (current_balance !== undefined) {
      const numCurrent = Number(current_balance);
      if (isNaN(numCurrent)) {
        return res.status(400).json({ error: 'Invalid balance specified.' });
      }
      newBalance = numCurrent - netActivity;
    } else if (balance !== undefined) {
      const numBase = Number(balance);
      if (isNaN(numBase)) {
        return res.status(400).json({ error: 'Invalid balance specified.' });
      }
      newBalance = numBase;
    }

    const newColor = color !== undefined ? String(color) : existing.color;
    const newIcon = icon !== undefined ? String(icon) : existing.icon;

    if (!newName) {
      return res.status(400).json({ error: 'Account name cannot be empty.' });
    }

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE accounts
      SET name = ?, type = ?, balance = ?, color = ?, icon = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(newName, newType, newBalance, newColor, newIcon, now, accountId, userId);

    const updated = await db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any;
    const baseBal = Number(updated.balance || 0);
    const finalBalance = baseBal + netActivity;

    return res.json({
      message: 'Account updated successfully.',
      account: {
        ...updated,
        balance: baseBal,
        base_balance: baseBal,
        current_balance: finalBalance,
      },
    });
  } catch (error: any) {
    console.error('Update account error:', error);
    return res.status(500).json({ error: 'Failed to update account.' });
  }
});

// DELETE /api/accounts/:id - Remove an account
accountRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    const existing = await db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const countRow = await db.prepare('SELECT COUNT(*) as count FROM accounts WHERE user_id = ?').get(userId) as any;
    if (Number(countRow?.count || 0) <= 1) {
      return res.status(400).json({ error: 'You must maintain at least one active wallet or account.' });
    }

    // Transactions tied to this account will have account_id set to null via foreign key ON DELETE SET NULL
    await db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(accountId, userId);

    return res.json({ message: 'Account deleted successfully.' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
});
