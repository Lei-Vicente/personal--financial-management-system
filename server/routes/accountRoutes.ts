import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const accountRouter = Router();
accountRouter.use(requireAuth);

// GET /api/accounts - List user's accounts / wallets with calculated real balance
accountRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const rows = await db.prepare(`
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

    const enrichedAccounts = rows.map(acc => {
      const baseBalance = Number(acc.balance || 0);
      const activity = Number(acc.net_activity || 0);
      const currentBalance = baseBalance + activity;
      return {
        ...acc,
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

    const inserted = await db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);

    return res.status(201).json({
      message: 'Account created successfully.',
      account: {
        ...inserted,
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

    const { name, type, balance, color, icon } = req.body;

    const newName = name !== undefined ? String(name).trim() : existing.name;
    const newType = type !== undefined ? String(type).toUpperCase() : existing.type;
    const newBalance = balance !== undefined ? Number(balance) : existing.balance;
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

    const updated = await db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);

    return res.json({
      message: 'Account updated successfully.',
      account: updated,
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

    // Transactions tied to this account will have account_id set to null via foreign key ON DELETE SET NULL
    await db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(accountId, userId);

    return res.json({ message: 'Account deleted successfully.' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
});
