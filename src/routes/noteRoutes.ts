// Path: coursehub-backend/src/routes/noteRoutes.ts
import express from 'express';
import { 
  createNote, 
  getNotes, 
  updateNote, 
  deleteNote, 
  getChapterNotes,
  searchNotes 
} from '../controllers/noteController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All note routes require authentication
router.use(protect);

router.post('/', createNote as express.RequestHandler);
router.get('/', getNotes as express.RequestHandler);
router.get('/chapter/:chapterId', getChapterNotes as express.RequestHandler);
router.get('/search', searchNotes as express.RequestHandler);
router.patch('/:noteId', updateNote as express.RequestHandler);
router.delete('/:noteId', deleteNote as express.RequestHandler);

export default router; 