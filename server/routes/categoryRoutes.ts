import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { requireAuth, AuthRequest } from '../auth.ts';

export const categoryRouter = Router();
categoryRouter.use(requireAuth);

// GET /api/categories
categoryRouter.get('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    let sql = 'SELECT * FROM categories WHERE user_id = ?';
    const params: any[] = [userId];

    if (type === 'INCOME' || type === 'EXPENSE') {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY is_default DESC, name ASC';
    const rows = db.prepare(sql).all(...params);

    return res.json({ categories: rows });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// GET /api/categories/:id
categoryRouter.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const catId = req.params.id;

    const category = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(catId, userId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    return res.json({ category });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch category.' });
  }
});

// POST /api/categories
categoryRouter.post('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, type, icon = 'tag', color = '#2563EB' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return res.status(400).json({ error: 'Category type must be INCOME or EXPENSE.' });
    }

    // Check duplicate name for this user
    const existing = db.prepare('SELECT id FROM categories WHERE user_id = ? AND LOWER(name) = LOWER(?) AND type = ?')
      .get(userId, name.trim(), type);
    if (existing) {
      return res.status(409).json({ error: `A category named "${name.trim()}" already exists for ${type.toLowerCase()}.` });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, userId, name.trim(), type, icon || 'tag', color || '#2563EB', now);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return res.status(201).json({
      message: 'Category created successfully.',
      category,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PATCH /api/categories/:id
categoryRouter.patch('/:id', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const catId = req.params.id;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(catId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const { name, icon, color } = req.body;
    const newName = name !== undefined ? String(name).trim() : existing.name;
    const newIcon = icon !== undefined ? String(icon).trim() : existing.icon;
    const newColor = color !== undefined ? String(color).trim() : existing.color;

    if (!newName) {
      return res.status(400).json({ error: 'Category name cannot be empty.' });
    }

    db.prepare(`
      UPDATE categories
      SET name = ?, icon = ?, color = ?
      WHERE id = ? AND user_id = ?
    `).run(newName, newIcon, newColor, catId, userId);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
    return res.json({
      message: 'Category updated successfully.',
      category: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id
categoryRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const catId = req.params.id;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(catId, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    // Check if transactions use this category
    const countCheck = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ? AND user_id = ?').get(catId, userId) as any;
    if (countCheck && countCheck.count > 0) {
      return res.status(400).json({
        error: `Cannot delete category: ${countCheck.count} transaction(s) are linked to it. Please reassign or delete those transactions first.`
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(catId, userId);
    return res.json({ message: 'Category removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete category.' });
  }
});
