import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import issueRoutes from './modules/issues/issues.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler — must be before errorHandler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Centralized Error Handler ───────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────
// Only bind to a port when running locally (not on Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 DevPulse server running on port ${PORT}`);
  });
}

export default app;
