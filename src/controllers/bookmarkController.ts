import { Request, Response } from 'express';
import { Bookmark } from '../models/Bookmark';
import Course from '../models/Course';

export const createBookmark = async (req: Request, res: Response) => {
  try {
    const { courseId, chapterId, note } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Create bookmark
    const bookmark = await Bookmark.create({
      user: userId,
      course: courseId,
      chapter: chapterId,
      note
    });

    res.status(201).json(bookmark);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Already bookmarked this content' });
    }
    res.status(500).json({ message: 'Error creating bookmark', error });
  }
};

export const getBookmarks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { courseId } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const query: any = { user: userId };
    if (courseId) {
      query.course = courseId;
    }

    const bookmarks = await Bookmark.find(query)
      .populate('course', 'title thumbnail')
      .populate('chapter', 'title')
      .sort({ createdAt: -1 });

    res.json(bookmarks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookmarks', error });
  }
};

export const deleteBookmark = async (req: Request, res: Response) => {
  try {
    const { bookmarkId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const bookmark = await Bookmark.findOneAndDelete({
      _id: bookmarkId,
      user: userId
    });

    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting bookmark', error });
  }
}; 