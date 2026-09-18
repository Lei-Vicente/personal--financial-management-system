import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const savingsRouter = Router();
savingsRouter.use(requireAuth);

// GET /api/savings-goals
savingsRouter.get('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const goals = db.prepare(`
      SELECT * FROM savings_goals
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId) as any[];

    const enriched = goals.map(g => {
      const contributions = db.prepare(`
        SELECT id, amount, note, date, created_at
        FROM savings_contributions
        WHERE goal_id = ? AND user_id = ?
        ORDER BY date DESC, created_at DESC
      `).all(g.id, userId);

      const target = Number(g.target_amount);
      const current = Number(g.current_amount);
      const remaining = Math.max(0, target - current);
      const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      return {
        ...g,
        target_amount: target,
        current_amount: current,
        remaining,
        percentage,
        contributions,
      };
    });

    const totalTarget = enriched.reduce((acc, g) => acc + g.target_amount, 0);
    const totalSaved = enriched.reduce((acc, g) => acc + g.current_amount, 0);

    return res.json({
      goals: enriched,
      summary: {
        total_target: totalTarget,
        total_saved: totalSaved,
        total_remaining: Math.max(0, totalTarget - totalSaved),
        overall_percentage: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('Fetch savings error:', error);
    return res.status(500).json({ error: 'Failed to retrieve savings goals.' });
  }
});

// POST /api/savings-goals
savingsRouter.post('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, target_amount, initial_amount = 0, target_date, description = '' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Goal name is required.' });
    }

    const numTarget = Number(target_amount);
    if (isNaN(numTarget) || numTarget <= 0) {
      return res.status(400).json({ error: 'Target amount must be greater than zero.' });
    }

    const numInitial = Math.max(0, Number(initial_amount) || 0);
    const now = new Date().toISOString();
    const goalId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, target_date, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(goalId, userId, name.trim(), numTarget, numInitial, target_date || null, description ? String(description).trim() : '', now, now);

    if (numInitial > 0) {
      db.prepare(`
        INSERT INTO savings_contributions (id, goal_id, user_id, amount, note, date, created_at)
        VALUES (?, ?, ?, ?, 'Initial deposit', ?, ?)
      `).run(crypto.randomUUID(), goalId, userId, numInitial, now.split('T')[0], now);
    }

    return res.status(201).json({ message: 'Savings goal created successfully.', id: goalId });
  } catch (error: any) {
    console.error('Create goal error:', error);
    return res.status(500).json({ error: 'Failed to create savings goal.' });
  }
});

// PATCH /api/savings-goals/:id
savingsRouter.patch('/:id', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(goalId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Savings goal not found.' });
    }

    const { name, target_amount, target_date, description } = req.body;
    const newName = name !== undefined ? String(name).trim() : existing.name;
    const newTarget = target_amount !== undefined ? Number(target_amount) : existing.target_amount;
    const newDate = target_date !== undefined ? target_date : existing.target_date;
    const newDesc = description !== undefined ? String(description).trim() : existing.description;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE savings_goals
      SET name = ?, target_amount = ?, target_date = ?, description = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(newName, newTarget, newDate, newDesc, now, goalId, userId);

    return res.json({ message: 'Savings goal updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update savings goal.' });
  }
});

// GET /api/savings-goals/:id
savingsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const goal = db.prepare(`
      SELECT * FROM savings_goals
      WHERE id = ? AND user_id = ?
    `).get(goalId, userId) as any;

    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found.' });
    }

    const contributions = db.prepare(`
      SELECT id, amount, note, date, created_at
      FROM savings_contributions
      WHERE goal_id = ? AND user_id = ?
      ORDER BY date DESC, created_at DESC
    `).all(goalId, userId);

    const target = Number(goal.target_amount);
    const current = Number(goal.current_amount);
    const remaining = Math.max(0, target - current);
    const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    return res.json({
      goal: {
        ...goal,
        target_amount: target,
        current_amount: current,
        remaining,
        percentage,
        contributions,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve savings goal.' });
  }
});

// GET /api/savings-goals/:id/contributions
savingsRouter.get('/:id/contributions', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    // Check goal ownership
    const goal = db.prepare('SELECT id FROM savings_goals WHERE id = ? AND user_id = ?').get(goalId, userId);
    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found.' });
    }

    const contributions = db.prepare(`
      SELECT id, goal_id, user_id, amount, note, date, created_at
      FROM savings_contributions
      WHERE goal_id = ? AND user_id = ?
      ORDER BY date DESC, created_at DESC
    `).all(goalId, userId);

    return res.json({ contributions });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve goal contributions.' });
  }
});

// POST /api/savings-goals/:id/contributions
savingsRouter.post('/:id/contributions', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    const { amount, note = '', date } = req.body;

    const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(goalId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Savings goal not found.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Contribution amount must be greater than zero.' });
    }

    const contribDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const contribId = crypto.randomUUID();

    // Atomic update
    db.prepare(`
      INSERT INTO savings_contributions (id, goal_id, user_id, amount, note, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(contribId, goalId, userId, numAmount, note ? String(note).trim() : '', contribDate, now);

    db.prepare(`
      UPDATE savings_goals
      SET current_amount = current_amount + ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(numAmount, now, goalId, userId);

    return res.status(201).json({ message: 'Contribution added successfully.' });
  } catch (error: any) {
    console.error('Add contribution error:', error);
    return res.status(500).json({ error: 'Failed to record contribution.' });
  }
});

// DELETE /api/savings-goals/:id/contributions/:contributionId
savingsRouter.delete('/:id/contributions/:contributionId', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    const contribId = req.params.contributionId;

    // Verify ownership of goal and contribution
    const contrib = db.prepare('SELECT id, amount FROM savings_contributions WHERE id = ? AND goal_id = ? AND user_id = ?').get(contribId, goalId, userId) as any;
    if (!contrib) {
      return res.status(404).json({ error: 'Contribution not found.' });
    }

    const now = new Date().toISOString();
    db.prepare('DELETE FROM savings_contributions WHERE id = ? AND user_id = ?').run(contribId, userId);
    db.prepare('UPDATE savings_goals SET current_amount = MAX(0, current_amount - ?), updated_at = ? WHERE id = ? AND user_id = ?').run(contrib.amount, now, goalId, userId);

    return res.json({ message: 'Contribution removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to remove contribution.' });
  }
});

// DELETE /api/savings-goals/:id
savingsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const result = db.prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?').run(goalId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Savings goal not found.' });
    }

    return res.json({ message: 'Savings goal deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete savings goal.' });
  }
});
