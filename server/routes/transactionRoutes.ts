import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const transactionRouter = Router();
transactionRouter.use(requireAuth);

// GET /api/transactions - paginated, searchable, filterable
transactionRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      type,
      category_id,
      start_date,
      end_date,
      search,
      sort_by = 'date',
      sort_order = 'DESC',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ['t.user_id = ?'];
    const params: any[] = [userId];

    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      conditions.push('t.type = ?');
      params.push(type);
    }

    if (category_id && typeof category_id === 'string' && category_id !== 'all') {
      conditions.push('t.category_id = ?');
      params.push(category_id);
    }

    if (start_date && typeof start_date === 'string') {
      conditions.push('t.date >= ?');
      params.push(start_date);
    }

    if (end_date && typeof end_date === 'string') {
      conditions.push('t.date <= ?');
      params.push(end_date);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      conditions.push('(t.description LIKE ? OR t.notes LIKE ? OR c.name LIKE ?)');
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereClause = conditions.join(' AND ');

    // Total count for pagination
    const countSql = `
      SELECT COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
    `;
    const countResult = await db.prepare(countSql).get(...params) as any;
    const total = countResult ? countResult.count : 0;

    // Sorting safe whitelist
    const validSortCols: Record<string, string> = {
      date: 't.date',
      amount: 't.amount',
      created_at: 't.created_at',
      description: 't.description',
    };
    const sortCol = validSortCols[String(sort_by)] || 't.date';
    const direction = String(sort_order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT t.id, t.user_id, t.account_id, t.category_id, t.type, t.amount, t.date,
             t.description, t.payment_method, t.notes, t.created_at, t.updated_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.type as account_type, a.icon as account_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${direction}, t.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await db.prepare(dataSql).all(...params, limitNum, offset) as any[];
    const mappedRows = rows.map((r: any) => ({
      ...r,
      amount: Number(r.amount) || 0,
    }));

    // Overall summary sums for the current filter scope
    const sumSql = `
      SELECT
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as total_expense
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
    `;
    const sumResult = await db.prepare(sumSql).get(...params) as any;
    const totalIncome = Number(sumResult?.total_income) || 0;
    const totalExpense = Number(sumResult?.total_expense) || 0;
    const totalCount = Number(total) || 0;

    return res.json({
      transactions: mappedRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limitNum) || 1,
      },
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_amount: totalIncome - totalExpense,
      },
    });
  } catch (error: any) {
    console.error('List transactions error:', error);
    return res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

// GET /api/transactions/:id
transactionRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const transId = req.params.id;

    const row = await db.prepare(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.type as account_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(transId, userId) as any;

    if (!row) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    row.amount = Number(row.amount) || 0;
    return res.json({ transaction: row });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch transaction details.' });
  }
});

// POST /api/transactions
transactionRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      account_id,
      category_id,
      type,
      amount,
      date,
      description,
      payment_method = 'Cash',
      notes = '',
    } = req.body;

    if (!type || (type !== 'INCOME' && type !== 'EXPENSE')) {
      return res.status(400).json({ error: 'Invalid transaction type. Must be INCOME or EXPENSE.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid amount greater than 0.' });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter a description for this transaction.' });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Please provide a valid date in YYYY-MM-DD format.' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Please select a category.' });
    }

    // Authoritative verification: Category MUST belong to current user
    const catCheck = await db.prepare('SELECT id, name, icon, color FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId) as any;
    if (!catCheck) {
      return res.status(403).json({ error: 'Unauthorized: Category does not belong to your account.' });
    }

    // Optional account ownership verification
    let accId: string | null = null;
    let accName: string | null = null;
    if (account_id) {
      const accCheck = await db.prepare('SELECT id, name FROM accounts WHERE id = ? AND user_id = ?').get(account_id, userId) as any;
      if (accCheck) {
        accId = accCheck.id;
        accName = accCheck.name;
      }
    }

    const transId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, date, description, payment_method, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transId,
      userId,
      accId,
      category_id,
      type,
      numAmount,
      date,
      description.trim(),
      payment_method || 'Cash',
      notes ? String(notes).trim() : '',
      now,
      now
    );

    const inserted = {
      id: transId,
      user_id: userId,
      account_id: accId,
      account_name: accName,
      category_id,
      category_name: catCheck.name,
      category_icon: catCheck.icon,
      category_color: catCheck.color,
      type,
      amount: numAmount,
      date,
      description: description.trim(),
      payment_method: payment_method || 'Cash',
      notes: notes ? String(notes).trim() : '',
      created_at: now,
      updated_at: now,
    };

    return res.status(201).json({
      message: 'Transaction saved successfully.',
      transaction: inserted,
    });
  } catch (error: any) {
    console.error('Create transaction error:', error);
    return res.status(500).json({ error: 'Failed to create transaction.' });
  }
});

// PATCH /api/transactions/:id
transactionRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const transId = req.params.id;

    // Check ownership
    const existing = await db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(transId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const { account_id, category_id, type, amount, date, description, payment_method, notes } = req.body;

    const newType = type !== undefined ? type : existing.type;
    if (newType !== 'INCOME' && newType !== 'EXPENSE') {
      return res.status(400).json({ error: 'Invalid transaction type.' });
    }

    const newAmount = amount !== undefined ? Number(amount) : existing.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    const newDate = date !== undefined ? date : existing.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD).' });
    }

    const newCategoryId = category_id !== undefined ? category_id : existing.category_id;
    // Check category ownership
    const catCheck = await db.prepare('SELECT id, name, icon, color FROM categories WHERE id = ? AND user_id = ?').get(newCategoryId, userId) as any;
    if (!catCheck) {
      return res.status(403).json({ error: 'Selected category does not belong to your account.' });
    }

    let newAccountId = existing.account_id;
    if (account_id !== undefined) {
      if (account_id === null || account_id === '') {
        newAccountId = null;
      } else {
        const accCheck = await db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(account_id, userId);
        if (!accCheck) {
          return res.status(403).json({ error: 'Selected account does not belong to your account.' });
        }
        newAccountId = account_id;
      }
    }

    const newDesc = description !== undefined ? String(description).trim() : existing.description;
    const newPayment = payment_method !== undefined ? String(payment_method) : existing.payment_method;
    const newNotes = notes !== undefined ? String(notes).trim() : existing.notes;
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE transactions
      SET account_id = ?, category_id = ?, type = ?, amount = ?, date = ?, description = ?, payment_method = ?, notes = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(newAccountId, newCategoryId, newType, newAmount, newDate, newDesc, newPayment, newNotes, now, transId, userId);

    const updated = await db.prepare(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name, a.type as account_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(transId, userId) as any;

    if (updated) {
      updated.amount = Number(updated.amount) || 0;
    }

    return res.json({
      message: 'Transaction updated successfully.',
      transaction: updated,
    });
  } catch (error: any) {
    console.error('Update transaction error:', error);
    return res.status(500).json({ error: 'Failed to update transaction.' });
  }
});

// DELETE /api/transactions/:id
transactionRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const transId = req.params.id;

    const result = await db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(transId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found or already deleted.' });
    }

    return res.json({ message: 'Transaction deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete transaction.' });
  }
});
