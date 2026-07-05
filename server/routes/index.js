import { Router } from 'express';
import pipelineRoutes from './pipeline.js';
import profileRoutes  from './profile.js';
import mealsRoutes    from './meals.js';
import dashboardRoutes from './dashboard.js';
import searchRoutes   from './search.js';
import webhookRoutes  from './webhooks.js';
import accountRoutes  from './account.js';
import authRoutes     from './auth.js';
import swipeRoutes    from './swipe.js';
import imageRoutes    from './images.js';
import recipeRoutes   from './recipes.js';
import caloriesRoutes from './calories.js';

const router = Router();

// Health check (no auth needed)
router.get('/health', (_req, res) => res.json({ ok: true }));

// Video pipeline (no auth — called from mobile pipeline before user is set)
router.use('/', pipelineRoutes);

// Auth helpers (no JWT — pre-signin)
router.use('/auth', authRoutes);

// Authenticated API routes
router.use('/api', profileRoutes);
router.use('/api', mealsRoutes);
router.use('/api', dashboardRoutes);
router.use('/api', searchRoutes);
router.use('/api', accountRoutes);
router.use('/api', swipeRoutes);
router.use('/api', imageRoutes);
router.use('/api', recipeRoutes);
router.use('/api', caloriesRoutes);

// Webhook (signature-verified, not JWT-authenticated)
router.use('/webhooks', webhookRoutes);

export default router;
