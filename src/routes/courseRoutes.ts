// Path: coursehub-backend/src/routes/courseRoutes.ts
import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  getCreatorCourses,
  updateCourseStatus,
  getCoursePreview
} from '../controllers/courseController';
import chapterRoutes from './chapterRoutes';
import { wrapHandler } from '../utils/routeHandler';

const router = express.Router();

// Public routes
router.route('/')
  .get(wrapHandler(getCourses))
  .post(protect, authorize('creator'), upload.single('thumbnail'), wrapHandler(createCourse));

router.route('/:id')
  .get(wrapHandler(getCourse))
  .patch(protect, authorize('creator'), upload.single('thumbnail'), wrapHandler(updateCourse))
  .delete(protect, authorize('creator'), wrapHandler(deleteCourse));

// Protected routes (require authentication)
router.use(protect);

// Creator routes
router.get('/creator/courses', authorize('creator'), wrapHandler(getCreatorCourses));
router.patch('/:id/status', authorize('creator'), wrapHandler(updateCourseStatus));

// Mount chapter routes
router.use('/:courseId/chapters', chapterRoutes);

// Public preview route
router.get('/:id/preview', wrapHandler(getCoursePreview));

export default router; 