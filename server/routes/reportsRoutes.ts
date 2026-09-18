import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const reportRouter = Router();
reportRouter.use(requireAuth);

// GET /api/reports/summary?type=monthly|yearly|category|budget|savings&period=...
reportRouter.get('/summary', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type = 'monthly', year, month } = req.query;

    const today = new Date();
    const targetYear = year ? parseInt(String(year), 10) : today.getFullYear();
    const targetMonth = month ? parseInt(String(month), 10) : (today.getMonth() + 1);
    const monthPad = String(targetMonth).padStart(2, '0');

    let startDate = `${targetYear}-01-01`;
    let endDate = `${targetYear}-12-31`;

    if (type === 'monthly') {
      startDate = `${targetYear}-${monthPad}-01`;
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      endDate = `${targetYear}-${monthPad}-${String(daysInMonth).padStart(2, '0')}`;
    }

    // High level totals
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as total_expense,
        COUNT(id) as total_transactions
      FROM transactions
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).get(userId, startDate, endDate) as any;

    const totalIncome = totals?.total_income || 0;
    const totalExpense = totals?.total_expense || 0;
    const netAmount = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

    // Top spending category
    const topCategory = db.prepare(`
      SELECT c.name, c.color, c.icon, SUM(t.amount) as amount
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.date >= ? AND t.date <= ?
      GROUP BY c.id
      ORDER BY amount DESC
      LIMIT 1
    `).get(userId, startDate, endDate) as any;

    // Largest expense
    const largestExpense = db.prepare(`
      SELECT t.id, t.amount, t.description, t.date, c.name as category_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.date >= ? AND t.date <= ?
      ORDER BY t.amount DESC
      LIMIT 1
    `).get(userId, startDate, endDate) as any;

    // Category breakdown
    const categoryBreakdown = db.prepare(`
      SELECT c.name, c.color, c.icon, c.type, SUM(t.amount) as amount, COUNT(t.id) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
      GROUP BY c.id
      ORDER BY amount DESC
    `).all(userId, startDate, endDate) as any[];

    // Monthly breakdown if yearly report
    let monthlyBreakdown = null;
    if (type === 'yearly') {
      monthlyBreakdown = [];
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const mStart = `${targetYear}-${mStr}-01`;
        const days = new Date(targetYear, m, 0).getDate();
        const mEnd = `${targetYear}-${mStr}-${String(days).padStart(2, '0')}`;

        const mRow = db.prepare(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
          FROM transactions
          WHERE user_id = ? AND date >= ? AND date <= ?
        `).get(userId, mStart, mEnd) as any;

        const mName = new Date(targetYear, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        monthlyBreakdown.push({
          month: mName,
          income: mRow?.income || 0,
          expense: mRow?.expense || 0,
          net: (mRow?.income || 0) - (mRow?.expense || 0),
        });
      }
    }

    return res.json({
      period: {
        type,
        year: targetYear,
        month: type === 'monthly' ? targetMonth : null,
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_amount: netAmount,
        savings_rate: savingsRate,
        transaction_count: totals?.total_transactions || 0,
        top_category: topCategory || null,
        largest_expense: largestExpense || null,
      },
      categories: categoryBreakdown,
      monthly_breakdown: monthlyBreakdown,
    });
  } catch (error: any) {
    console.error('Report summary error:', error);
    return res.status(500).json({ error: 'Failed to generate financial report.' });
  }
});

// GET /api/reports/export-csv and /api/reports/csv
const handleExportCSV = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, type } = req.query;

    let sql = `
      SELECT t.date, t.type, c.name as category, t.description, t.payment_method, t.amount, t.notes
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params: any[] = [userId];

    if (start_date) {
      sql += ' AND t.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND t.date <= ?';
      params.push(end_date);
    }
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      sql += ' AND t.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY t.date DESC, t.created_at DESC';

    const rows = db.prepare(sql).all(...params) as any[];

    // Build CSV string
    const headers = ['Date', 'Type', 'Category', 'Description', 'Payment Method', 'Amount', 'Notes'];
    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const line = [
        `"${r.date}"`,
        `"${r.type}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${(r.payment_method || '').replace(/"/g, '""')}"`,
        r.amount,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
      csvLines.push(line);
    }

    const csvContent = csvLines.join('\r\n');
    const filename = `finance_transactions_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error: any) {
    console.error('CSV export error:', error);
    return res.status(500).json({ error: 'Failed to export CSV.' });
  }
};

reportRouter.get('/export-csv', handleExportCSV);
reportRouter.get('/csv', handleExportCSV);
