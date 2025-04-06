import express, { RequestHandler } from 'express';
import { getCreatorDashboardAnalytics, getDetailedAnalytics } from '../controllers/analyticsController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Get creator dashboard analytics
router.get('/dashboard', protect, authorize('creator'), getCreatorDashboardAnalytics as RequestHandler);

// Get detailed analytics
router.get('/detailed', protect, authorize('creator'), getDetailedAnalytics as RequestHandler);

export default router; 