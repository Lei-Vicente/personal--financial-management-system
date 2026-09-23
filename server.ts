import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { authRouter, meRouter, profileRouter, settingsRouter } from './server/routes/authRoutes.ts';
import { transactionRouter } from './server/routes/transactionRoutes.ts';
import { categoryRouter } from './server/routes/categoryRoutes.ts';
import { budgetRouter } from './server/routes/budgetRoutes.ts';
import { savingsRouter } from './server/routes/savingsRoutes.ts';
import { accountRouter } from './server/routes/accountRoutes.ts';
import { analyticsRouter, handleDashboardAnalytics } from './server/routes/analyticsRoutes.ts';
import { reportRouter } from './server/routes/reportsRoutes.ts';
import { requireAuth } from './server/auth.ts';

export function createExpressApp() {
  const app = express();

  // Global Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/settings', settingsRouter);
  app.get('/api/dashboard', requireAuth, handleDashboardAnalytics);
  app.use('/api/transactions', transactionRouter);
  app.use('/api/categories', categoryRouter);
  app.use('/api/budgets', budgetRouter);
  app.use('/api/savings-goals', savingsRouter);
  app.use('/api/accounts', accountRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/reports', reportRouter);

  // Friendly 404 for unmatched /api routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
  });

  // Global server error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      error: 'An internal error occurred. Please try again later.',
    });
  });

  return app;
}

export const app = createExpressApp();

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start listening if not running in a serverless environment (like Vercel)
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// Only launch standalone server if executed directly
if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
