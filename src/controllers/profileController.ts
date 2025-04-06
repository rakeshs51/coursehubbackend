import { Request, Response } from 'express';
import User from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { UserAchievement } from '../models/UserAchievement';
import { Enrollment } from '../models/Enrollment';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = await UserProfile.findOne({ user: userId });
    const achievements = await UserAchievement.find({ user: userId }).sort({ dateEarned: -1 });
    
    // Get enrollment statistics
    const enrollments = await Enrollment.find({ user: userId });
    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    const inProgressCourses = enrollments.filter(e => e.status === 'active').length;
    
    res.json({
      user,
      profile,
      achievements,
      stats: {
        totalEnrollments: enrollments.length,
        completedCourses,
        inProgressCourses
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Update basic user info if provided
    if (updateData.name || updateData.email) {
      await User.findByIdAndUpdate(userId, {
        name: updateData.name,
        email: updateData.email
      });
    }

    // Update or create profile
    const profile = await UserProfile.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { preferences } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const profile = await UserProfile.findOneAndUpdate(
      { user: userId },
      { $set: { preferences } },
      { new: true, upsert: true }
    );

    res.json(profile.preferences);
  } catch (error) {
    res.status(500).json({ message: 'Error updating preferences', error });
  }
};

export const getAchievements = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { type } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const query: any = { user: userId };
    if (type) {
      query.type = type;
    }

    const achievements = await UserAchievement.find(query)
      .populate('course', 'title thumbnail')
      .sort({ dateEarned: -1 });

    res.json(achievements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching achievements', error });
  }
};

export const getEnrollmentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }

    // Execute both queries in parallel
    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .select('course status progress lastAccessed')
        .populate('course', 'title thumbnail')
        .sort({ lastAccessed: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Enrollment.countDocuments(query)
    ]);

    res.json({
      enrollments,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page)
    });
  } catch (error: any) {
    console.error('Error in getEnrollmentHistory:', error);
    res.status(500).json({ message: 'Error fetching enrollment history', error: error.message });
  }
}; 