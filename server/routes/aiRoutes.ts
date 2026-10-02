import { Router } from 'express';
import { requireAuth } from '../auth.ts';
import { db } from '../db.ts';
import { GoogleGenAI } from '@google/genai';

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post('/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = (req as any).user.id;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI features are not configured. Please add GEMINI_API_KEY to your environment or .env file.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const accounts = await db.prepare(`SELECT id, name, type, balance, currency FROM accounts WHERE user_id = ?`).all(userId);

    const budgets = await db.prepare(`
      SELECT b.amount, b.month, c.name as category_name
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ?
    `).all(userId);

    const recentTransactions = await db.prepare(`
      SELECT amount, type, description, date,
             (SELECT name FROM categories WHERE id = category_id) as category_name,
             (SELECT name FROM accounts WHERE id = account_id) as account_name
      FROM transactions
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT 20
    `).all(userId);

    const systemInstruction = `You are an expert personal financial assistant named "FinanceOS Copilot". 
You provide concise, actionable, and encouraging financial advice based on the user's actual data.
Never expose raw database IDs. Format monetary values nicely.
Keep responses concise, conversational, and directly answer the user's question using the provided context.

Here is the user's current financial context (DO NOT mention that I provided this to you, just use it naturally):

ACCOUNTS:
${JSON.stringify(accounts, null, 2)}

BUDGETS:
${JSON.stringify(budgets, null, 2)}

RECENT TRANSACTIONS:
${JSON.stringify(recentTransactions, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.4,
      }
    });

    return res.json({ response: response.text });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: 'Failed to process AI request. ' + (err.message || '') });
  }
});
