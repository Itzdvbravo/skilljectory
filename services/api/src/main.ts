import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Ensure .env is loaded from services/api and root monorepo
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import cron from 'node-cron';
import { router } from './routes.js';
import { AppError } from './common/errors/app-error.js';
import { runMonthlyRefillJob } from './jobs/monthlyRefill.job.js';
import { runAnnualReverificationJob } from './jobs/annualReverification.job.js';
import { runDemandReportJob } from './jobs/demandReport.job.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Request logger for auditability (Section 9)
app.use((req, res, next) => {
  const reqId = Math.random().toString(36).substring(7);
  (req as any).requestId = reqId;
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] [${reqId}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api', router);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
  });
});

const isServerless = Boolean(process.env.VERCEL);

if (!isServerless) {
  // Initialize Background Cron Jobs (Section 7)
  // 1. Monthly Refill Job: 1st of month, 00:00 campus-local time
  cron.schedule('0 0 1 * *', async () => {
    try {
      await runMonthlyRefillJob();
    } catch (err) {
      console.error('[Cron:MonthlyRefill Error]', err);
    }
  });

  // 2. Annual Reverification Job: Daily at 00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      await runAnnualReverificationJob();
    } catch (err) {
      console.error('[Cron:AnnualReverification Error]', err);
    }
  });

  // 3. Skill Demand & Rarity Report: Weekly on Sunday at 02:00
  cron.schedule('0 2 * * 0', async () => {
    try {
      await runDemandReportJob();
    } catch (err) {
      console.error('[Cron:DemandReport Error]', err);
    }
  });

  if (process.env.NODE_ENV !== 'test') {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Campus Skill Exchange API running on http://0.0.0.0:${PORT} (accessible via LAN/USB reverse)`);
      console.log(`Background jobs initialized (Monthly refill, Annual reverification, Skill demand reports).`);
    });
  }
}

export default app;
