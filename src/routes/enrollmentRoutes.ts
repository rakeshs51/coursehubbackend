// Path: coursehub-backend/src/routes/enrollmentRoutes.ts
import express from 'express';
import { enrollInCourse, getEnrolledCourses, updateProgress, discoverCourses } from '../controllers/enrollmentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Course discovery (public route)
router.get('/discover', discoverCourses);

// Protected routes (require authentication)
router.use(protect);
router.post('/courses/:courseId/enroll', enrollInCourse as express.RequestHandler);
router.get('/enrolled', getEnrolledCourses as express.RequestHandler);
router.patch('/enrollments/:enrollmentId/progress', updateProgress as express.RequestHandler);

export default router; 