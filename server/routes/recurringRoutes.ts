import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const recurringRouter = Router();
recurringRouter.use(requireAuth);

function advanceDate(dateStr: string, frequency: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  switch (frequency) {
    case 'DAILY':
      dt.setUTCDate(dt.getUTCDate() + 1);
      break;
    case 'WEEKLY':
      dt.setUTCDate(dt.getUTCDate() + 7);
      break;
    case 'MONTHLY': {
      const currentMonth = dt.getUTCMonth();
      dt.setUTCMonth(currentMonth + 1);
      // Handle month rollover (e.g. Jan 31 -> Feb 28)
      if (dt.getUTCMonth() > (currentMonth + 1) % 12) {
        dt.setUTCDate(0);
      }
      break;
    }
    case 'YEARLY':
      dt.setUTCFullYear(dt.getUTCFullYear() + 1);
      break;
    default:
      dt.setUTCMonth(dt.getUTCMonth() + 1);
  }

  return dt.toISOString().split('T')[0];
}

// GET /api/recurring-transactions - List recurring transaction rules
recurringRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const rows = await db.prepare(`
      SELECT r.*,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon, a.type as account_type
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.user_id = ?
      ORDER BY r.is_active DESC, r.next_date ASC
    `).all(userId) as any[];

    const mapped = rows.map((r: any) => ({
      ...r,
      amount: Number(r.amount) || 0,
      is_active: Boolean(r.is_active),
    }));

    return res.json({ recurring_transactions: mapped });
  } catch (error: any) {
    console.error('List recurring transactions error:', error);
    return res.status(500).json({ error: 'Failed to retrieve recurring schedules.' });
  }
});

// POST /api/recurring-transactions - Create new recurring transaction rule
recurringRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      account_id,
      category_id,
      type = 'EXPENSE',
      amount,
      description,
      frequency = 'MONTHLY',
      start_date,
      end_date = null,
      payment_method = 'Cash',
      notes = '',
    } = req.body;

    if (!type || (type !== 'INCOME' && type !== 'EXPENSE')) {
      return res.status(400).json({ error: 'Invalid type. Must be INCOME or EXPENSE.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid amount greater than 0.' });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter a description for the recurring item.' });
    }

    const validFreqs = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
    const resolvedFreq = validFreqs.includes(String(frequency).toUpperCase())
      ? String(frequency).toUpperCase()
      : 'MONTHLY';

    if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return res.status(400).json({ error: 'Please provide a valid start date (YYYY-MM-DD).' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Please select a category.' });
    }

    const catCheck = await db.prepare('SELECT id, name, icon, color FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId) as any;
    if (!catCheck) {
      return res.status(403).json({ error: 'Category does not belong to your account.' });
    }

    let resolvedAccId: string | null = null;
    if (account_id) {
      const accCheck = await db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(account_id, userId) as any;
      if (!accCheck) {
        return res.status(403).json({ error: 'Account does not belong to your account.' });
      }
      resolvedAccId = accCheck.id;
    }

    const recId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO recurring_transactions (
        id, user_id, account_id, category_id, type, amount, description, frequency,
        start_date, end_date, next_date, is_active, payment_method, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      recId,
      userId,
      resolvedAccId,
      category_id,
      type,
      numAmount,
      description.trim(),
      resolvedFreq,
      start_date,
      end_date || null,
      start_date,
      payment_method || 'Cash',
      notes ? String(notes).trim() : '',
      now,
      now
    );

    const inserted = await db.prepare(`
      SELECT r.*,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon, a.type as account_type
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.id = ? AND r.user_id = ?
    `).get(recId, userId) as any;

    if (inserted) {
      inserted.amount = Number(inserted.amount) || 0;
      inserted.is_active = Boolean(inserted.is_active);
    }

    return res.status(201).json({
      message: 'Recurring schedule created successfully.',
      recurring_transaction: inserted,
    });
  } catch (error: any) {
    console.error('Create recurring transaction error:', error);
    return res.status(500).json({ error: 'Failed to create recurring transaction.' });
  }
});

// POST /api/recurring-transactions/process - Idempotently process due recurring transactions
recurringRouter.post('/process', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const dueItems = await db.prepare(`
      SELECT *
      FROM recurring_transactions
      WHERE user_id = ? AND is_active = 1 AND next_date <= ?
    `).all(userId, todayStr) as any[];

    let generatedCount = 0;

    for (const item of dueItems) {
      let currentDate = item.next_date;

      // Advance and generate each occurrence up to today
      while (currentDate <= todayStr && (!item.end_date || currentDate <= item.end_date)) {
        // Prevent duplicate transaction if already recorded for this recurring rule and exact date
        const existingTrans = await db.prepare(`
          SELECT id FROM transactions
          WHERE user_id = ? AND date = ? AND description = ? AND amount = ?
        `).get(userId, currentDate, item.description, Number(item.amount));

        if (!existingTrans) {
          const transId = crypto.randomUUID();
          await db.prepare(`
            INSERT INTO transactions (
              id, user_id, account_id, category_id, type, amount, date, description, payment_method, notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            transId,
            userId,
            item.account_id,
            item.category_id,
            item.type,
            Number(item.amount),
            currentDate,
            item.description,
            item.payment_method || 'Recurring Auto',
            `Automatically generated from recurring schedule (${item.frequency})`,
            now,
            now
          );
          generatedCount++;
        }

        currentDate = advanceDate(currentDate, item.frequency);
      }

      // Check if end_date was passed
      const shouldDeactivate = item.end_date && currentDate > item.end_date ? 0 : 1;

      await db.prepare(`
        UPDATE recurring_transactions
        SET next_date = ?, is_active = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(currentDate, shouldDeactivate, now, item.id, userId);
    }

    return res.json({
      message: `Processed recurring schedules successfully.`,
      generated_count: generatedCount,
    });
  } catch (error: any) {
    console.error('Process recurring transactions error:', error);
    return res.status(500).json({ error: 'Failed to process recurring transactions.' });
  }
});

// PATCH /api/recurring-transactions/:id - Update schedule
recurringRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const recId = req.params.id;

    const existing = await db.prepare('SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?').get(recId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Recurring schedule not found.' });
    }

    const {
      account_id,
      category_id,
      type,
      amount,
      description,
      frequency,
      start_date,
      end_date,
      next_date,
      is_active,
      payment_method,
      notes,
    } = req.body;

    const newType = type !== undefined ? type : existing.type;
    const newAmount = amount !== undefined ? Number(amount) : existing.amount;
    const newDesc = description !== undefined ? String(description).trim() : existing.description;
    const newFreq = frequency !== undefined ? String(frequency).toUpperCase() : existing.frequency;
    const newStartDate = start_date !== undefined ? start_date : existing.start_date;
    const newEndDate = end_date !== undefined ? end_date : existing.end_date;
    const newNextDate = next_date !== undefined ? next_date : existing.next_date;
    const newIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;
    const newPayment = payment_method !== undefined ? String(payment_method) : existing.payment_method;
    const newNotes = notes !== undefined ? String(notes).trim() : existing.notes;
    const newCatId = category_id !== undefined ? category_id : existing.category_id;
    const newAccId = account_id !== undefined ? account_id : existing.account_id;
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE recurring_transactions
      SET account_id = ?, category_id = ?, type = ?, amount = ?, description = ?, frequency = ?,
          start_date = ?, end_date = ?, next_date = ?, is_active = ?, payment_method = ?, notes = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      newAccId,
      newCatId,
      newType,
      newAmount,
      newDesc,
      newFreq,
      newStartDate,
      newEndDate,
      newNextDate,
      newIsActive,
      newPayment,
      newNotes,
      now,
      recId,
      userId
    );

    const updated = await db.prepare(`
      SELECT r.*,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon, a.type as account_type
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.id = ? AND r.user_id = ?
    `).get(recId, userId) as any;

    if (updated) {
      updated.amount = Number(updated.amount) || 0;
      updated.is_active = Boolean(updated.is_active);
    }

    return res.json({
      message: 'Recurring schedule updated successfully.',
      recurring_transaction: updated,
    });
  } catch (error: any) {
    console.error('Update recurring transaction error:', error);
    return res.status(500).json({ error: 'Failed to update recurring transaction.' });
  }
});

// DELETE /api/recurring-transactions/:id - Delete schedule
recurringRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const recId = req.params.id;

    const result = await db.prepare('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?').run(recId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recurring schedule not found or already deleted.' });
    }

    return res.json({ message: 'Recurring schedule deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete recurring schedule.' });
  }
});
