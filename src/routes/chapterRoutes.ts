import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { wrapHandler } from '../utils/routeHandler';
import {
  createChapter,
  getChapter,
  getChapters,
  updateChapter,
  deleteChapter,
  uploadVideo
} from '../controllers/chapterController';
import { upload } from '../utils/cloudinary';

const router = express.Router({ mergeParams: true });

// Protect all routes
router.use(protect);

// Get all chapters
router.get('/', wrapHandler(getChapters));

// Create chapter
router.post(
  '/',
  authorize('creator'),
  upload.single('video'),
  wrapHandler(createChapter)
);

// Get chapter
router.get(
  '/:chapterId',
  wrapHandler(getChapter)
);

// Update chapter
router.put(
  '/:chapterId',
  authorize('creator'),
  wrapHandler(updateChapter)
);

// Delete chapter
router.delete(
  '/:chapterId',
  authorize('creator'),
  wrapHandler(deleteChapter)
);

export default router; 