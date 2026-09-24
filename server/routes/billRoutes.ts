import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const billRouter = Router();
billRouter.use(requireAuth);

// GET /api/bills - List user's bills with optional status filtering
billRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status = 'all' } = req.query;

    const conditions: string[] = ['b.user_id = ?'];
    const params: any[] = [userId];

    if (status === 'unpaid') {
      conditions.push('b.is_paid = 0');
    } else if (status === 'paid') {
      conditions.push('b.is_paid = 1');
    }

    const whereClause = conditions.join(' AND ');

    const rows = await db.prepare(`
      SELECT b.*,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon, a.type as account_type
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN accounts a ON b.account_id = a.id
      WHERE ${whereClause}
      ORDER BY b.is_paid ASC, b.due_date ASC, b.created_at DESC
    `).all(...params) as any[];

    const todayStr = new Date().toISOString().split('T')[0];

    const mappedBills = rows.map((b: any) => {
      const isOverdue = b.is_paid === 0 && b.due_date < todayStr;
      const daysUntilDue = Math.ceil(
        (new Date(b.due_date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      const isDueSoon = b.is_paid === 0 && daysUntilDue >= 0 && daysUntilDue <= 7;

      return {
        ...b,
        amount: Number(b.amount) || 0,
        is_paid: Boolean(b.is_paid),
        is_overdue: isOverdue,
        is_due_soon: isDueSoon,
        days_until_due: daysUntilDue,
      };
    });

    const unpaidBills = mappedBills.filter(b => !b.is_paid);
    const unpaidTotal = unpaidBills.reduce((acc, b) => acc + b.amount, 0);
    const dueSoonCount = unpaidBills.filter(b => b.is_due_soon || b.is_overdue).length;

    return res.json({
      bills: mappedBills,
      summary: {
        total_count: mappedBills.length,
        unpaid_count: unpaidBills.length,
        unpaid_total: unpaidTotal,
        due_soon_count: dueSoonCount,
      },
    });
  } catch (error: any) {
    console.error('List bills error:', error);
    return res.status(500).json({ error: 'Failed to retrieve bills.' });
  }
});

// POST /api/bills - Create new bill
billRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      name,
      amount,
      due_date,
      frequency = 'MONTHLY',
      category_id,
      account_id,
      notes = '',
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter a bill name (e.g. Electric Bill, Internet, Rent).' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid bill amount greater than 0.' });
    }

    if (!due_date || !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return res.status(400).json({ error: 'Please provide a valid due date (YYYY-MM-DD).' });
    }

    const validFreqs = ['ONCE', 'WEEKLY', 'MONTHLY', 'YEARLY'];
    const resolvedFreq = validFreqs.includes(String(frequency).toUpperCase())
      ? String(frequency).toUpperCase()
      : 'MONTHLY';

    let resolvedCatId: string | null = null;
    if (category_id) {
      const catCheck = await db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId) as any;
      if (!catCheck) {
        return res.status(403).json({ error: 'Selected category does not belong to your account.' });
      }
      resolvedCatId = catCheck.id;
    }

    let resolvedAccId: string | null = null;
    if (account_id) {
      const accCheck = await db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(account_id, userId) as any;
      if (!accCheck) {
        return res.status(403).json({ error: 'Selected account does not belong to your account.' });
      }
      resolvedAccId = accCheck.id;
    }

    const billId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO bills (id, user_id, name, amount, due_date, frequency, category_id, account_id, is_paid, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      billId,
      userId,
      name.trim(),
      numAmount,
      due_date,
      resolvedFreq,
      resolvedCatId,
      resolvedAccId,
      notes ? String(notes).trim() : '',
      now,
      now
    );

    const inserted = await db.prepare(`
      SELECT b.*,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon, a.type as account_type
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN accounts a ON b.account_id = a.id
      WHERE b.id = ? AND b.user_id = ?
    `).get(billId, userId) as any;

    if (inserted) {
      inserted.amount = Number(inserted.amount) || 0;
      inserted.is_paid = Boolean(inserted.is_paid);
    }

    return res.status(201).json({
      message: 'Bill created successfully.',
      bill: inserted,
    });
  } catch (error: any) {
    console.error('Create bill error:', error);
    return res.status(500).json({ error: 'Failed to create bill.' });
  }
});

// POST /api/bills/:id/pay - Mark bill as paid (optionally recording an expense transaction)
billRouter.post('/:id/pay', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const billId = req.params.id;
    const { record_transaction = true, account_id } = req.body;

    const bill = await db.prepare('SELECT * FROM bills WHERE id = ? AND user_id = ?').get(billId, userId) as any;
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const chosenAccountId = account_id || bill.account_id;

    // Record an authoritative expense transaction if requested and not already paid
    if (record_transaction && !bill.is_paid) {
      const transId = crypto.randomUUID();
      let catId = bill.category_id;
      if (!catId) {
        const defaultCat = await db.prepare("SELECT id FROM categories WHERE user_id = ? AND type = 'EXPENSE' LIMIT 1").get(userId) as any;
        catId = defaultCat?.id || null;
      }

      await db.prepare(`
        INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, date, description, payment_method, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'EXPENSE', ?, ?, ?, 'Bill Payment', ?, ?, ?)
      `).run(
        transId,
        userId,
        chosenAccountId,
        catId,
        Number(bill.amount),
        todayStr,
        `Bill Payment: ${bill.name}`,
        `Payment for bill due on ${bill.due_date}`,
        now,
        now
      );
    }

    await db.prepare(`
      UPDATE bills
      SET is_paid = 1, paid_date = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(todayStr, now, billId, userId);

    return res.json({
      message: 'Bill marked as paid successfully.',
      paid_date: todayStr,
    });
  } catch (error: any) {
    console.error('Pay bill error:', error);
    return res.status(500).json({ error: 'Failed to record bill payment.' });
  }
});

// PATCH /api/bills/:id - Update bill
billRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const billId = req.params.id;

    const existing = await db.prepare('SELECT * FROM bills WHERE id = ? AND user_id = ?').get(billId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    const { name, amount, due_date, frequency, category_id, account_id, is_paid, notes } = req.body;

    const newName = name !== undefined ? String(name).trim() : existing.name;
    const newAmount = amount !== undefined ? Number(amount) : existing.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    const newDueDate = due_date !== undefined ? due_date : existing.due_date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD).' });
    }

    const newFreq = frequency !== undefined ? String(frequency).toUpperCase() : existing.frequency;
    const newCatId = category_id !== undefined ? category_id : existing.category_id;
    const newAccId = account_id !== undefined ? account_id : existing.account_id;
    const newIsPaid = is_paid !== undefined ? (is_paid ? 1 : 0) : existing.is_paid;
    const newNotes = notes !== undefined ? String(notes).trim() : existing.notes;
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE bills
      SET name = ?, amount = ?, due_date = ?, frequency = ?, category_id = ?, account_id = ?, is_paid = ?, notes = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(newName, newAmount, newDueDate, newFreq, newCatId, newAccId, newIsPaid, newNotes, now, billId, userId);

    const updated = await db.prepare(`
      SELECT b.*,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.icon as account_icon, a.type as account_type
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN accounts a ON b.account_id = a.id
      WHERE b.id = ? AND b.user_id = ?
    `).get(billId, userId) as any;

    if (updated) {
      updated.amount = Number(updated.amount) || 0;
      updated.is_paid = Boolean(updated.is_paid);
    }

    return res.json({
      message: 'Bill updated successfully.',
      bill: updated,
    });
  } catch (error: any) {
    console.error('Update bill error:', error);
    return res.status(500).json({ error: 'Failed to update bill.' });
  }
});

// DELETE /api/bills/:id - Delete bill
billRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const billId = req.params.id;

    const result = await db.prepare('DELETE FROM bills WHERE id = ? AND user_id = ?').run(billId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bill not found or already deleted.' });
    }

    return res.json({ message: 'Bill deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete bill.' });
  }
});
