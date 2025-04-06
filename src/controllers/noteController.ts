import { Request, Response } from 'express';
import { Note } from '../models/Note';
import Course from '../models/Course';
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';

// Define custom interface for Request with user
interface AuthRequest extends Request {
  user?: {
    _id: mongoose.Types.ObjectId;
    role: string;
    [key: string]: any;
  };
}

export const createNote = async (req: Request, res: Response) => {
  try {
    const { courseId, chapterId, content, timestamp } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Create note
    const note = await Note.create({
      user: userId,
      course: courseId,
      chapter: chapterId,
      content,
      timestamp
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: 'Error creating note', error });
  }
};

export const getNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { courseId, chapterId } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const query: any = { user: userId };
    if (courseId) {
      query.course = courseId;
    }
    if (chapterId) {
      query.chapter = chapterId;
    }

    const notes = await Note.find(query)
      .populate('course', 'title')
      .populate('chapter', 'title')
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notes', error });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const { content, timestamp } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const note = await Note.findOneAndUpdate(
      { _id: noteId, user: userId },
      { content, timestamp },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Error updating note', error });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const note = await Note.findOneAndDelete({
      _id: noteId,
      user: userId
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting note', error });
  }
};

/**
 * @desc    Get notes for a specific chapter
 * @route   GET /api/v1/notes/chapter/:chapterId
 * @access  Private
 */
export const getChapterNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;

    // Check if chapter exists
    const chapter = await mongoose.model('Chapter').findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Get notes for the chapter
    const notes = await Note.find({
      user: req.user!._id,
      chapter: chapterId
    }).sort({ timestamp: 1 });

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chapter notes', error });
  }
};

/**
 * @desc    Search notes by content
 * @route   GET /api/v1/notes/search
 * @access  Private
 */
export const searchNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;
    let searchQuery: { user: mongoose.Types.ObjectId; content?: { $regex: string; $options: string } } = {
      user: req.user!._id
    };

    // If search query is provided, add content filter
    if (query) {
      searchQuery = {
        ...searchQuery,
        content: { $regex: query as string, $options: 'i' }
      };
    }

    const notes = await Note.find(searchQuery)
      .sort({ createdAt: -1 });

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Error searching notes', error });
  }
}; 