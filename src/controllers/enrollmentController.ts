import { Request, Response } from 'express';
import { Enrollment } from '../models/Enrollment';
import Course from '../models/Course';
import User from '../models/User';
import { Types } from 'mongoose';
import { IEnrollment } from '../models/Enrollment';

export const enrollInCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the creator
    const user = await User.findById(userId);
    if (user?.role === 'creator') {
      return res.status(403).json({ message: 'Creators cannot enroll in courses' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ user: userId, course: courseId });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Create new enrollment
    const enrollment = await Enrollment.create({
      user: userId,
      course: courseId,
      progress: 0,
      status: 'active',
      enrolledAt: new Date(),
      lastAccessed: new Date()
    }) as IEnrollment;

    // Update course's enrolledStudents array
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { enrolledStudents: userId }
    });

    interface EnrollmentResponse {
      _id: string;
      user: string;
      course: string;
      progress: number;
      status: string;
      enrolledAt: Date;
      lastAccessed: Date;
    }

    const enrollmentDoc = enrollment.toObject();
    const enrollmentObj: EnrollmentResponse = {
      _id: enrollment.id,
      user: userId.toString(),
      course: courseId.toString(),
      progress: enrollmentDoc.progress,
      status: enrollmentDoc.status,
      enrolledAt: enrollmentDoc.enrolledAt,
      lastAccessed: enrollmentDoc.lastAccessed
    };

    res.status(201).json(enrollmentObj);
  } catch (error) {
    res.status(500).json({ message: 'Error enrolling in course', error });
  }
};

export const getEnrolledCourses = async (req: Request, res: Response) => {
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

    const skip = (Number(page) - 1) * Number(limit);

    const enrollments = await Enrollment.find(query)
      .populate('course')
      .sort({ lastAccessed: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Enrollment.countDocuments(query);

    res.json({
      enrollments,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching enrolled courses', error });
  }
};

export const updateProgress = async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;
    const { progress } = req.body;
    const userId = req.user?._id;

    console.log('Received enrollmentId:', enrollmentId);
    console.log('Received progress:', progress);
    console.log('User ID:', userId);

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate progress value first
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      console.log('Invalid progress value:', progress);
      return res.status(400).json({ message: 'Progress must be between 0 and 100' });
    }

    // Validate enrollmentId
    if (!Types.ObjectId.isValid(enrollmentId)) {
      console.log('Invalid enrollment ID format:', enrollmentId);
      return res.status(404).json({ message: 'Invalid enrollment ID' });
    }

    const enrollment = await Enrollment.findById(enrollmentId);
    console.log('Found enrollment:', enrollment);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check if user owns the enrollment
    if (enrollment.user.toString() !== userId.toString()) {
      console.log('User ID mismatch:', {
        enrollmentUserId: enrollment.user.toString(),
        requestUserId: userId.toString()
      });
      return res.status(403).json({ message: 'Not authorized to update this enrollment' });
    }

    enrollment.progress = progress;
    enrollment.status = progress === 100 ? 'completed' : 'active';
    enrollment.lastAccessed = new Date();
    await enrollment.save();

    res.json(enrollment);
  } catch (error) {
    console.error('Error in updateProgress:', error);
    res.status(500).json({ message: 'Error updating progress', error });
  }
};

export const discoverCourses = async (req: Request, res: Response) => {
  try {
    const { category, search, tags, sort = 'createdAt', page = 1, limit = 10 } = req.query;
    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $all: tagArray };
    }

    const courses = await Course.find(query)
      .sort({ [sort as string]: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('creator', 'name email');

    const total = await Course.countDocuments(query);

    res.json({
      courses,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error discovering courses', error });
  }
};