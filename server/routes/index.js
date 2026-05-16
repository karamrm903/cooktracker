import { Router } from 'express';
import pipelineRoutes from './pipeline.js';
import profileRoutes  from './profile.js';
import mealsRoutes    from './meals.js';
import dashboardRoutes from './dashboard.js';
import searchRoutes   from './search.js';
import webhookRoutes  from './webhooks.js';
import accountRoutes  from './account.js';

const router = Router();

// Health check (no auth needed)
router.get('/health', (_req, res) => res.json({ ok: true }));

// Video pipeline (no auth — called from mobile pipeline before user is set)
router.use('/', pipelineRoutes);

// Authenticated API routes
router.use('/api', profileRoutes);
router.use('/api', mealsRoutes);
router.use('/api', dashboardRoutes);
router.use('/api', searchRoutes);
router.use('/api', accountRoutes);

// Webhook (signature-verified, not JWT-authenticated)
router.use('/webhooks', webhookRoutes);

export default router;
