import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const budgetRouter = Router();
budgetRouter.use(requireAuth);

// GET /api/budgets?month=YYYY-MM
budgetRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    const curYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = (req.query.month as string) || curYearMonth;

    // Fetch user's budgets for this month
    const budgetRows = await db.prepare(`
      SELECT b.id, b.user_id, b.category_id, b.amount as budget_amount, b.month,
             b.created_at, b.updated_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.month = ?
      ORDER BY b.amount DESC
    `).all(userId, targetMonth) as any[];

    // Calculate days passed in target month for daily average
    const [tYear, tMonth] = targetMonth.split('-').map(Number);
    const isCurrentMonth = tYear === today.getFullYear() && tMonth === (today.getMonth() + 1);
    const daysInMonth = new Date(tYear, tMonth, 0).getDate();
    const daysPassed = isCurrentMonth ? Math.max(1, today.getDate()) : daysInMonth;

    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-${String(daysInMonth).padStart(2, '0')}`;

    const enrichedBudgets = await Promise.all(budgetRows.map(async b => {
      // Calculate actual spent in this category for the month
      const spentRow = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM transactions
        WHERE user_id = ? AND category_id = ? AND type = 'EXPENSE'
          AND date >= ? AND date <= ?
      `).get(userId, b.category_id, startDate, endDate) as any;

      const spent = Number(spentRow ? spentRow.total_spent : 0);
      const budgetAmount = Number(b.budget_amount);
      const remaining = budgetAmount - spent;
      const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;
      const dailyAverage = Math.round(spent / daysPassed);

      let status = 'HEALTHY'; // < 75%
      let statusWarning = null;
      if (percentage >= 100) {
        status = 'EXCEEDED';
        statusWarning = `You have reached or exceeded your ${b.category_name} budget.`;
      } else if (percentage >= 90) {
        status = 'CRITICAL';
        statusWarning = `You've used ${percentage}% of your ${b.category_name} budget.`;
      } else if (percentage >= 75) {
        status = 'WARNING';
        statusWarning = `You've used ${percentage}% of your ${b.category_name} budget.`;
      }

      // Recent 3 expenses in this category
      const recentExpenses = await db.prepare(`
        SELECT id, amount, date, description, payment_method
        FROM transactions
        WHERE user_id = ? AND category_id = ? AND type = 'EXPENSE'
          AND date >= ? AND date <= ?
        ORDER BY date DESC, created_at DESC
        LIMIT 3
      `).all(userId, b.category_id, startDate, endDate);

      return {
        ...b,
        spent,
        remaining,
        percentage,
        daily_average: dailyAverage,
        status,
        status_warning: statusWarning,
        recent_expenses: recentExpenses,
      };
    }));

    const totalBudget = enrichedBudgets.reduce((acc, curr) => acc + curr.budget_amount, 0);
    const totalSpent = enrichedBudgets.reduce((acc, curr) => acc + curr.spent, 0);

    return res.json({
      month: targetMonth,
      budgets: enrichedBudgets,
      summary: {
        total_budget: totalBudget,
        total_spent: totalSpent,
        total_remaining: totalBudget - totalSpent,
        overall_percentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('Fetch budgets error:', error);
    return res.status(500).json({ error: 'Failed to retrieve budgets.' });
  }
});

// POST /api/budgets
budgetRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { category_id, amount, month } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Budget amount must be greater than zero.' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Valid month in YYYY-MM format is required.' });
    }

    // Verify category ownership
    const cat = await db.prepare('SELECT id, name FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId);
    if (!cat) {
      return res.status(403).json({ error: 'Category does not belong to your account.' });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Upsert budget for (user_id, category_id, month)
    await db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, amount, month, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, category_id, month) DO UPDATE SET
        amount = excluded.amount,
        updated_at = excluded.updated_at
    `).run(id, userId, category_id, numAmount, month, now, now);

    return res.status(201).json({ message: 'Budget saved successfully.' });
  } catch (error: any) {
    console.error('Save budget error:', error);
    return res.status(500).json({ error: 'Failed to save budget.' });
  }
});

// GET /api/budgets/:id
budgetRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const budgetId = req.params.id;

    const budget = await db.prepare(`
      SELECT b.id, b.user_id, b.category_id, b.amount as budget_amount, b.month,
             b.created_at, b.updated_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.id = ? AND b.user_id = ?
    `).get(budgetId, userId) as any;

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found.' });
    }

    return res.json({ budget });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve budget.' });
  }
});

// PATCH /api/budgets/:id
budgetRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const budgetId = req.params.id;

    const existing = await db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(budgetId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Budget not found.' });
    }

    const { amount, category_id, month } = req.body;
    const newAmount = amount !== undefined ? Number(amount) : existing.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({ error: 'Budget amount must be greater than zero.' });
    }

    const newCatId = category_id !== undefined ? category_id : existing.category_id;
    if (category_id !== undefined) {
      const cat = await db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(newCatId, userId);
      if (!cat) {
        return res.status(403).json({ error: 'Category does not belong to your account.' });
      }
    }

    const newMonth = month !== undefined ? month : existing.month;
    if (!/^\d{4}-\d{2}$/.test(newMonth)) {
      return res.status(400).json({ error: 'Valid month format (YYYY-MM) is required.' });
    }

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE budgets
      SET amount = ?, category_id = ?, month = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(newAmount, newCatId, newMonth, now, budgetId, userId);

    const updated = await db.prepare(`
      SELECT b.id, b.user_id, b.category_id, b.amount as budget_amount, b.month,
             b.created_at, b.updated_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.id = ? AND b.user_id = ?
    `).get(budgetId, userId);

    return res.json({ message: 'Budget updated successfully.', budget: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update budget.' });
  }
});

// DELETE /api/budgets/:id
budgetRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const budgetId = req.params.id;

    const result = await db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(budgetId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Budget not found.' });
    }

    return res.json({ message: 'Budget deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete budget.' });
  }
});
