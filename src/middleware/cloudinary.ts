import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Configure multer upload
export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept video files only
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload a video file'));
    }
  },
}); 