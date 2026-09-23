import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

export const handleDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonthNum = today.getMonth() + 1;
    const curMonthStr = `${curYear}-${String(curMonthNum).padStart(2, '0')}`;

    // Previous month string
    const prevDate = new Date(curYear, today.getMonth() - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthNum = prevDate.getMonth() + 1;
    const prevMonthStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

    // 1. Total all-time balance
    const allTimeRow = await db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE user_id = ?
    `).get(userId) as any;

    const allTimeBalance = (allTimeRow.total_income || 0) - (allTimeRow.total_expense || 0);

    // 2. Current month totals
    const curMonthRow = await db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).get(userId, `${curMonthStr}-01`, `${curMonthStr}-31`) as any;

    const curIncome = curMonthRow?.income || 0;
    const curExpense = curMonthRow?.expense || 0;
    const curNet = curIncome - curExpense;

    // 3. Previous month totals
    const prevMonthRow = await db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).get(userId, `${prevMonthStr}-01`, `${prevMonthStr}-31`) as any;

    const prevIncome = prevMonthRow?.income || 0;
    const prevExpense = prevMonthRow?.expense || 0;
    const prevNet = prevIncome - prevExpense;

    // Percentage changes
    const incomeChangePct = prevIncome > 0 ? Math.round(((curIncome - prevIncome) / prevIncome) * 100 * 10) / 10 : 0;
    const expenseChangePct = prevExpense > 0 ? Math.round(((curExpense - prevExpense) / prevExpense) * 100 * 10) / 10 : 0;
    const balanceChangePct = prevNet !== 0 ? Math.round(((curNet - prevNet) / Math.abs(prevNet)) * 100 * 10) / 10 : 0;

    // 4. Largest expense category this month
    const largestCatRow = await db.prepare(`
      SELECT c.name, c.color, c.icon, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.date >= ? AND t.date <= ?
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total DESC
      LIMIT 1
    `).get(userId, `${curMonthStr}-01`, `${curMonthStr}-31`) as any;

    // 5. Category breakdown for current month
    const categoryBreakdown = await db.prepare(`
      SELECT c.id, c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(t.id) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.date >= ? AND t.date <= ?
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total DESC
    `).all(userId, `${curMonthStr}-01`, `${curMonthStr}-31`) as any[];

    const enrichedCategoryBreakdown = categoryBreakdown.map(c => ({
      ...c,
      percentage: curExpense > 0 ? Math.round((c.total / curExpense) * 100) : 0,
    }));

    return res.json({
      balance: {
        total_balance: allTimeBalance,
        change_pct: balanceChangePct,
        current_net: curNet,
        previous_net: prevNet,
      },
      income: {
        current_month: curIncome,
        previous_month: prevIncome,
        change_pct: incomeChangePct,
      },
      expense: {
        current_month: curExpense,
        previous_month: prevExpense,
        change_pct: expenseChangePct,
        largest_category: largestCatRow ? {
          name: largestCatRow.name,
          amount: largestCatRow.total,
          color: largestCatRow.color,
          icon: largestCatRow.icon,
        } : null,
      },
      category_breakdown: enrichedCategoryBreakdown,
    });
  } catch (error: any) {
    console.error('Dashboard analytics error:', error);
    return res.status(500).json({ error: 'Failed to compute dashboard metrics.' });
  }
};

analyticsRouter.get('/dashboard', handleDashboardAnalytics);

// GET /api/analytics - general analytics with date range support (e.g. from=YYYY-MM-DD&to=YYYY-MM-DD)
analyticsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { from, to } = req.query;

    let startDate = from ? String(from) : `${new Date().getFullYear()}-01-01`;
    let endDate = to ? String(to) : new Date().toISOString().split('T')[0];

    // Summary totals in range
    const totals = await db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as total_expense,
        COUNT(id) as transaction_count
      FROM transactions
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).get(userId, startDate, endDate) as any;

    const totalIncome = totals?.total_income || 0;
    const totalExpense = totals?.total_expense || 0;
    const netCashFlow = totalIncome - totalExpense;

    // Spending by category
    const categoryBreakdown = await db.prepare(`
      SELECT c.id, c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(t.id) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.date >= ? AND t.date <= ?
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total DESC
    `).all(userId, startDate, endDate) as any[];

    // Top 5 largest expenses
    const largestExpenses = await db.prepare(`
      SELECT t.id, t.amount, t.description, t.date, t.payment_method, c.name as category_name, c.color as category_color
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.date >= ? AND t.date <= ?
      ORDER BY t.amount DESC
      LIMIT 5
    `).all(userId, startDate, endDate);

    return res.json({
      period: { from: startDate, to: endDate },
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_cash_flow: netCashFlow,
        transaction_count: totals?.transaction_count || 0,
        savings_rate: totalIncome > 0 ? Math.max(0, Math.round((netCashFlow / totalIncome) * 100)) : 0,
      },
      spending_by_category: categoryBreakdown.map(c => ({
        ...c,
        percentage: totalExpense > 0 ? Math.round((c.total / totalExpense) * 100) : 0,
      })),
      largest_expenses: largestExpenses,
    });
  } catch (error: any) {
    console.error('Analytics query error:', error);
    return res.status(500).json({ error: 'Failed to retrieve analytics data.' });
  }
});

// GET /api/analytics/spending-overview?range=daily|weekly|monthly|yearly
analyticsRouter.get('/spending-overview', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const range = (req.query.range as string) || 'monthly';
    const today = new Date();

    let chartData: Array<{ label: string; income: number; expense: number; net: number }> = [];

    if (range === 'daily') {
      // Last 14 days
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const row = await db.prepare(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as inc,
            COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as exp
          FROM transactions
          WHERE user_id = ? AND date = ?
        `).get(userId, dateStr) as any;

        const inc = row?.inc || 0;
        const exp = row?.exp || 0;
        chartData.push({ label, income: inc, expense: exp, net: inc - exp });
      }
    } else if (range === 'weekly') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const endD = new Date(today);
        endD.setDate(today.getDate() - (i * 7));
        const startD = new Date(endD);
        startD.setDate(endD.getDate() - 6);

        const sStr = startD.toISOString().split('T')[0];
        const eStr = endD.toISOString().split('T')[0];
        const label = `${startD.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })} - ${endD.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}`;

        const row = await db.prepare(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as inc,
            COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as exp
          FROM transactions
          WHERE user_id = ? AND date >= ? AND date <= ?
        `).get(userId, sStr, eStr) as any;

        const inc = row?.inc || 0;
        const exp = row?.exp || 0;
        chartData.push({ label, income: inc, expense: exp, net: inc - exp });
      }
    } else if (range === 'yearly') {
      // Last 5 years
      const thisYear = today.getFullYear();
      for (let y = thisYear - 4; y <= thisYear; y++) {
        const sStr = `${y}-01-01`;
        const eStr = `${y}-12-31`;

        const row = await db.prepare(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as inc,
            COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as exp
          FROM transactions
          WHERE user_id = ? AND date >= ? AND date <= ?
        `).get(userId, sStr, eStr) as any;

        const inc = row?.inc || 0;
        const exp = row?.exp || 0;
        chartData.push({ label: String(y), income: inc, expense: exp, net: inc - exp });
      }
    } else {
      // Default: Monthly (last 6 months)
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const mStr = `${y}-${String(m).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short' });

        const row = await db.prepare(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as inc,
            COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as exp
          FROM transactions
          WHERE user_id = ? AND date >= ? AND date <= ?
        `).get(userId, `${mStr}-01`, `${mStr}-31`) as any;

        const inc = row?.inc || 0;
        const exp = row?.exp || 0;
        chartData.push({ label, income: inc, expense: exp, net: inc - exp });
      }
    }

    return res.json({ range, data: chartData });
  } catch (error: any) {
    console.error('Spending overview error:', error);
    return res.status(500).json({ error: 'Failed to compute spending overview.' });
  }
});
