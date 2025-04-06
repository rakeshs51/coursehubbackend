// Path: coursehub-backend/src/routes/bookmarkRoutes.ts
import express from 'express';
import { createBookmark, getBookmarks, deleteBookmark } from '../controllers/bookmarkController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All bookmark routes require authentication
router.use(protect);

router.post('/', createBookmark as express.RequestHandler);
router.get('/', getBookmarks as express.RequestHandler);
router.delete('/:bookmarkId', deleteBookmark as express.RequestHandler);

export default router; 