// Path: coursehub-backend/src/routes/profileRoutes.ts
import express from 'express';
import { getProfile, updateProfile, updatePreferences, getAchievements, getEnrollmentHistory } from '../controllers/profileController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All profile routes require authentication
router.use(protect);

router.get('/', getProfile as express.RequestHandler);
router.patch('/', updateProfile as express.RequestHandler);
router.patch('/preferences', updatePreferences as express.RequestHandler);
router.get('/achievements', getAchievements as express.RequestHandler);
router.get('/enrollments', getEnrollmentHistory as express.RequestHandler);

export default router; 