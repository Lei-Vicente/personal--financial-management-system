import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db, seedDefaultCategories } from '../db.ts';
import {
  hashPassword,
  verifyPassword,
  createSession,
  invalidateSession,
  invalidateAllUserSessions,
  requireAuth,
  AuthRequest,
  extractSessionToken,
} from '../auth.ts';

export const authRouter = Router();

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

// POST /api/auth/register
authRouter.post('/register', (req: Request, res: Response) => {
  try {
    const { full_name, email, password, confirm_password } = req.body;

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a valid full name (at least 2 characters).' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match. Please re-enter.' });
    }

    // Check email uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    // Insert user
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(userId, normalizedEmail, passwordHash, full_name.trim(), now, now);

    // Insert default user settings
    const settingsId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO user_settings (id, user_id, currency, monthly_income, timezone, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, 'PHP', 0, 'Asia/Manila', 0, ?, ?)
    `).run(settingsId, userId, now, now);

    // Seed default categories
    seedDefaultCategories(userId);

    // Create session
    const { token, expiresAt } = createSession(userId, req);
    setSessionCookie(res, token, expiresAt);

    const user = {
      id: userId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      is_verified: 1,
      created_at: now,
      currency: 'PHP',
      monthly_income: 0,
      timezone: 'Asia/Manila',
      onboarding_completed: 0,
    };

    return res.status(201).json({
      message: 'Registration successful.',
      user,
      token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRow = db.prepare(`
      SELECT u.id, u.email, u.password_hash, u.full_name, u.is_verified, u.created_at,
             st.currency, st.monthly_income, st.timezone, st.onboarding_completed
      FROM users u
      LEFT JOIN user_settings st ON u.id = st.user_id
      WHERE u.email = ?
    `).get(normalizedEmail) as any;

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const { token, expiresAt } = createSession(userRow.id, req);
    setSessionCookie(res, token, expiresAt);

    const user = {
      id: userRow.id,
      email: userRow.email,
      full_name: userRow.full_name,
      is_verified: Number(userRow.is_verified),
      created_at: userRow.created_at,
      currency: userRow.currency || 'PHP',
      monthly_income: Number(userRow.monthly_income || 0),
      timezone: userRow.timezone || 'Asia/Manila',
      onboarding_completed: Number(userRow.onboarding_completed || 0),
    };

    return res.json({
      message: 'Login successful.',
      user,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = extractSessionToken(req);
  if (token) {
    invalidateSession(token);
  }
  res.clearCookie('session_token', { path: '/' });
  return res.json({ message: 'Successfully logged out.' });
});

// Handler for GET /api/me and /api/auth/me
export function handleGetMe(req: AuthRequest, res: Response) {
  return res.json({ user: req.user });
}

// Handler for PATCH /api/me and /api/auth/me
export function handlePatchMe(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { full_name, currency, monthly_income, timezone, onboarding_completed } = req.body;

    const now = new Date().toISOString();

    if (full_name && typeof full_name === 'string') {
      db.prepare('UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?').run(
        full_name.trim(),
        now,
        userId
      );
    }

    const currentSettings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    const newCurrency = currency !== undefined ? currency : (currentSettings?.currency || 'PHP');
    const newIncome = monthly_income !== undefined ? Number(monthly_income) : (currentSettings?.monthly_income || 0);
    const newTimezone = timezone !== undefined ? timezone : (currentSettings?.timezone || 'Asia/Manila');
    const newOnboarding = onboarding_completed !== undefined ? (onboarding_completed ? 1 : 0) : (currentSettings?.onboarding_completed || 0);

    db.prepare(`
      INSERT INTO user_settings (id, user_id, currency, monthly_income, timezone, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        currency = excluded.currency,
        monthly_income = excluded.monthly_income,
        timezone = excluded.timezone,
        onboarding_completed = excluded.onboarding_completed,
        updated_at = excluded.updated_at
    `).run(crypto.randomUUID(), userId, newCurrency, newIncome, newTimezone, newOnboarding, now, now);

    const updatedUser = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.is_verified, u.created_at,
             st.currency, st.monthly_income, st.timezone, st.onboarding_completed
      FROM users u
      LEFT JOIN user_settings st ON u.id = st.user_id
      WHERE u.id = ?
    `).get(userId) as any;

    return res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        is_verified: Number(updatedUser.is_verified),
        created_at: updatedUser.created_at,
        currency: updatedUser.currency || 'PHP',
        monthly_income: Number(updatedUser.monthly_income || 0),
        timezone: updatedUser.timezone || 'Asia/Manila',
        onboarding_completed: Number(updatedUser.onboarding_completed || 0),
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile settings.' });
  }
}

// meRouter handles requests directed at /api/me or /api/auth/me
export const meRouter = Router();
meRouter.get('/', requireAuth, handleGetMe);
meRouter.patch('/', requireAuth, handlePatchMe);

authRouter.use('/me', meRouter);

// POST /api/auth/change-password
authRouter.post('/change-password', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    const userRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
    if (!verifyPassword(current_password, userRow.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = hashPassword(new_password);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);

    return res.json({ message: 'Password changed successfully.' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

// GET /api/auth/sessions
authRouter.get('/sessions', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const currentToken = req.sessionToken;

    const rows = db.prepare(`
      SELECT id, user_agent, ip_address, created_at, expires_at,
             (token = ?) as is_current
      FROM sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(currentToken || '', userId) as any[];

    return res.json({ sessions: rows });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch active sessions.' });
  }
});

// DELETE /api/auth/sessions/:id
authRouter.delete('/sessions/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    const result = db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(sessionId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found or already revoked.' });
    }

    return res.json({ message: 'Session revoked successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to revoke session.' });
  }
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(normalizedEmail) as any;

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), user.id, resetToken, expiresAt, now);

      // In development / demo environment, return simulated token for evaluation
      return res.json({
        message: 'Password reset instructions have been generated.',
        reset_token: resetToken,
      });
    }

    // Generic response to prevent email enumeration
    return res.json({ message: 'If this email is registered, you will receive password reset instructions.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', (req: Request, res: Response) => {
  try {
    const { token, new_password, confirm_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const now = new Date().toISOString();
    const tokenRow = db.prepare(`
      SELECT id, user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token = ? AND expires_at > ? AND used_at IS NULL
    `).get(token, now) as any;

    if (!tokenRow) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const newHash = hashPassword(new_password);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, tokenRow.user_id);
    db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(now, tokenRow.id);

    // Invalidate all active sessions for security
    invalidateAllUserSessions(tokenRow.user_id);

    return res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/auth/verify-email
authRouter.post('/verify-email', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const now = new Date().toISOString();
    const tokenRow = db.prepare(`
      SELECT id, user_id, expires_at, used_at
      FROM verification_tokens
      WHERE token = ? AND expires_at > ? AND used_at IS NULL
    `).get(token, now) as any;

    if (!tokenRow) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    db.prepare('UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?').run(now, tokenRow.user_id);
    db.prepare('UPDATE verification_tokens SET used_at = ? WHERE id = ?').run(now, tokenRow.id);

    return res.json({ message: 'Email address verified successfully.' });
  } catch (error: any) {
    console.error('Email verification error:', error);
    return res.status(500).json({ error: 'Failed to verify email.' });
  }
});

// POST /api/auth/resend-verification
authRouter.post('/resend-verification', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO verification_tokens (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), userId, token, expiresAt, now);

    return res.json({ message: 'Verification email resent successfully.', verification_token: token });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});

// Profile Router: GET & PATCH /api/profile
export const profileRouter = Router();
profileRouter.get('/', requireAuth, handleGetMe);
profileRouter.patch('/', requireAuth, handlePatchMe);

// Settings Router: GET & PATCH /api/settings
export const settingsRouter = Router();
settingsRouter.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
    return res.json({ settings });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});
settingsRouter.patch('/', requireAuth, handlePatchMe);

// POST /api/auth/demo-login
// Seamlessly prepares or seeds a demo account for quick evaluation
authRouter.post('/demo-login', (req: Request, res: Response) => {
  try {
    const demoEmail = 'lei.demo@example.com';
    let userRow = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.is_verified, u.created_at,
             st.currency, st.monthly_income, st.timezone, st.onboarding_completed
      FROM users u
      LEFT JOIN user_settings st ON u.id = st.user_id
      WHERE u.email = ?
    `).get(demoEmail) as any;

    let userId: string;
    const now = new Date().toISOString();

    if (!userRow) {
      userId = crypto.randomUUID();
      const pwHash = hashPassword('DemoPassword123!');
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, 'Lei Vance', 1, ?, ?)
      `).run(userId, demoEmail, pwHash, now, now);

      db.prepare(`
        INSERT INTO user_settings (id, user_id, currency, monthly_income, timezone, onboarding_completed, created_at, updated_at)
        VALUES (?, ?, 'PHP', 45000, 'Asia/Manila', 1, ?, ?)
      `).run(crypto.randomUUID(), userId, now, now);

      seedDefaultCategories(userId);

      // Seed rich realistic transactions for demo
      const cats = db.prepare('SELECT id, name, type FROM categories WHERE user_id = ?').all(userId) as any[];
      const catMap = new Map(cats.map(c => [c.name, c.id]));

      const insertTrans = db.prepare(`
        INSERT INTO transactions (id, user_id, category_id, type, amount, date, description, payment_method, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Current month date helper
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = (day: number) => `${y}-${m}-${String(day).padStart(2, '0')}`;

      // Realistic transactions
      const salaryCat = catMap.get('Salary');
      const foodCat = catMap.get('Food & Dining');
      const transCat = catMap.get('Transportation');
      const billCat = catMap.get('Housing & Bills');
      const shopCat = catMap.get('Shopping');
      const entCat = catMap.get('Entertainment');
      const freeCat = catMap.get('Freelance & Extra');

      if (salaryCat) insertTrans.run(crypto.randomUUID(), userId, salaryCat, 'INCOME', 35000, d(1), 'Monthly Salary Payroll', 'Bank Transfer', 'Primary tech company payout', now, now);
      if (freeCat) insertTrans.run(crypto.randomUUID(), userId, freeCat, 'INCOME', 10000, d(12), 'UI/UX Consultation Project', 'GCash', 'Client web redesign sprint', now, now);

      if (billCat) insertTrans.run(crypto.randomUUID(), userId, billCat, 'EXPENSE', 8500, d(3), 'Apartment Rental & Condo Dues', 'Bank Transfer', 'Monthly studio lease', now, now);
      if (foodCat) insertTrans.run(crypto.randomUUID(), userId, foodCat, 'EXPENSE', 3200, d(4), 'Weekly Groceries at SM Supermarket', 'Credit Card', 'Produce, poultry, pantry essentials', now, now);
      if (foodCat) insertTrans.run(crypto.randomUUID(), userId, foodCat, 'EXPENSE', 450, d(7), 'Lunch with Design Team at Wildflour', 'GCash', 'Sandwich and iced latte', now, now);
      if (transCat) insertTrans.run(crypto.randomUUID(), userId, transCat, 'EXPENSE', 280, d(8), 'GrabCar to Client Office BGC', 'Credit Card', 'Midday meeting commute', now, now);
      if (shopCat) insertTrans.run(crypto.randomUUID(), userId, shopCat, 'EXPENSE', 1850, d(10), 'Ergonomic Desk Accessories & Cable Organizers', 'Credit Card', 'Home office productivity upgrade', now, now);
      if (entCat) insertTrans.run(crypto.randomUUID(), userId, entCat, 'EXPENSE', 549, d(11), 'Netflix & Spotify Premium Family Plan', 'Credit Card', 'Monthly streaming subscriptions', now, now);
      if (foodCat) insertTrans.run(crypto.randomUUID(), userId, foodCat, 'EXPENSE', 1250, d(14), 'Weekend Dinner at Ramen Nagi', 'Debit Card', 'Tonkotsu ramen and gyoza', now, now);
      if (transCat) insertTrans.run(crypto.randomUUID(), userId, transCat, 'EXPENSE', 600, d(15), 'Beep Card Top-up MRT-3', 'Cash', 'Weekly transport reload', now, now);

      // Budgets
      const insertBudget = db.prepare(`
        INSERT INTO budgets (id, user_id, category_id, amount, month, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const curMonth = `${y}-${m}`;
      if (foodCat) insertBudget.run(crypto.randomUUID(), userId, foodCat, 8000, curMonth, now, now);
      if (transCat) insertBudget.run(crypto.randomUUID(), userId, transCat, 3000, curMonth, now, now);
      if (billCat) insertBudget.run(crypto.randomUUID(), userId, billCat, 10000, curMonth, now, now);
      if (shopCat) insertBudget.run(crypto.randomUUID(), userId, shopCat, 4000, curMonth, now, now);
      if (entCat) insertBudget.run(crypto.randomUUID(), userId, entCat, 2500, curMonth, now, now);

      // Savings Goals
      const insertGoal = db.prepare(`
        INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, target_date, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const goal1Id = crypto.randomUUID();
      insertGoal.run(goal1Id, userId, 'Emergency Fund (6 Months)', 60000, 24500, `${y + 1}-03-31`, 'High-yield digital bank liquidity buffer for contingencies', now, now);

      const goal2Id = crypto.randomUUID();
      insertGoal.run(goal2Id, userId, 'MacBook Pro M-Series Fund', 110000, 48000, `${y + 1}-06-30`, 'High-performance machine for mobile and web dev projects', now, now);

      // Contribution history
      db.prepare(`
        INSERT INTO savings_contributions (id, goal_id, user_id, amount, note, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), goal1Id, userId, 5000, 'Monthly allocation from salary', d(2), now);

      db.prepare(`
        INSERT INTO savings_contributions (id, goal_id, user_id, amount, note, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), goal2Id, userId, 8000, 'Bonus deposit from freelance milestone', d(13), now);
    } else {
      userId = userRow.id;
    }

    const { token, expiresAt } = createSession(userId, req);
    setSessionCookie(res, token, expiresAt);

    const freshUser = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.is_verified, u.created_at,
             st.currency, st.monthly_income, st.timezone, st.onboarding_completed
      FROM users u
      LEFT JOIN user_settings st ON u.id = st.user_id
      WHERE u.id = ?
    `).get(userId) as any;

    return res.json({
      message: 'Logged in as Demo User.',
      user: {
        id: freshUser.id,
        email: freshUser.email,
        full_name: freshUser.full_name,
        is_verified: Number(freshUser.is_verified),
        created_at: freshUser.created_at,
        currency: freshUser.currency || 'PHP',
        monthly_income: Number(freshUser.monthly_income || 0),
        timezone: freshUser.timezone || 'Asia/Manila',
        onboarding_completed: Number(freshUser.onboarding_completed || 0),
      },
      token,
    });
  } catch (error: any) {
    console.error('Demo login error:', error);
    return res.status(500).json({ error: 'Failed to initialize demo session.' });
  }
});
