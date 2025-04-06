import express, { RequestHandler } from 'express';
import { getCreatorDashboardAnalytics, getDetailedAnalytics } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import { isCreator } from '../middleware/roles';

const router = express.Router();

// Get creator dashboard analytics
router.get('/dashboard', authenticate as RequestHandler, isCreator as RequestHandler, getCreatorDashboardAnalytics as RequestHandler);

// Get detailed analytics
router.get('/detailed', authenticate as RequestHandler, isCreator as RequestHandler, getDetailedAnalytics as RequestHandler);

export default router; 