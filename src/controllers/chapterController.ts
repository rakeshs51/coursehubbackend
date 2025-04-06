import { Request, Response, NextFunction } from 'express';
import Chapter from '../models/Chapter';
import Course from '../models/Course';
import { uploadToCloudinary } from '../utils/cloudinary';

// @desc    Create a new chapter
// @route   POST /api/v1/courses/:courseId/chapters
export const createChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, description, isPreview } = req.body;
    const order = parseInt(req.body.order) || 0;

    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to create chapters'
      });
      return;
    }

    // Check if course exists and belongs to the creator
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found'
      });
      return;
    }

    if (course.creator.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to add chapters to this course'
      });
      return;
    }

    let videoUrl = '';
    let duration = 0;

    // Handle video upload if provided
    if (req.file) {
      try {
        console.log('Uploading video file:', req.file.originalname);
        const result = await uploadToCloudinary(req.file);
        videoUrl = result.secure_url;
        duration = result.duration || 0;
        console.log('Video uploaded successfully:', videoUrl);
      } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({
          success: false,
          message: 'Error uploading video file'
        });
        return;
      }
    }

    // Create chapter
    const chapter = await Chapter.create({
      title,
      description,
      course: courseId,
      videoUrl,
      duration,
      order,
      isPreview: isPreview === 'true'
    });

    // Add chapter to course's chapters array
    course.chapters.push(chapter._id);
    await course.save();

    res.status(201).json({
      success: true,
      data: chapter
    });
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error creating chapter'
    });
  }
};

// @desc    Get all chapters for a course
// @route   GET /api/v1/courses/:courseId/chapters
export const getChapters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;

    const chapters = await Chapter.find({ course: courseId })
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: chapters.length,
      data: chapters
    });
  } catch (error) {
    console.error('Get chapters error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error fetching chapters'
    });
  }
};

// @desc    Get a single chapter
// @route   GET /api/v1/courses/:courseId/chapters/:chapterId
export const getChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;

    const chapter = await Chapter.findOne({
      _id: chapterId,
      course: courseId
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: chapter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a chapter
// @route   PUT /api/v1/courses/:courseId/chapters/:chapterId
export const updateChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;
    const { title, description, videoUrl, duration, isPreview, order } = req.body;

    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to update chapters'
      });
      return;
    }

    // Check if course exists and belongs to the creator
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found'
      });
      return;
    }

    if (course.creator.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update chapters in this course'
      });
      return;
    }

    // Update chapter
    const chapter = await Chapter.findOneAndUpdate(
      { _id: chapterId, course: courseId },
      { title, description, videoUrl, duration, isPreview, order },
      { new: true, runValidators: true }
    );

    if (!chapter) {
      res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: chapter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a chapter
// @route   DELETE /api/v1/courses/:courseId/chapters/:chapterId
export const deleteChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;

    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to delete chapters'
      });
      return;
    }

    // Check if course exists and belongs to the creator
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found'
      });
      return;
    }

    if (course.creator.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete chapters from this course'
      });
      return;
    }

    // Delete chapter
    const chapter = await Chapter.findOneAndDelete({
      _id: chapterId,
      course: courseId
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload chapter video
// @route   POST /api/v1/courses/:courseId/chapters/:chapterId/video
export const uploadVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId, chapterId } = req.params;

    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to upload videos'
      });
      return;
    }

    // Check if course exists and belongs to the creator
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found'
      });
      return;
    }

    if (course.creator.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to upload videos to this course'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Please upload a video file'
      });
      return;
    }

    // Upload video to Cloudinary
    const result = await uploadToCloudinary(req.file);

    // Update chapter with video URL
    const chapter = await Chapter.findOneAndUpdate(
      { _id: chapterId, course: courseId },
      { videoUrl: result.secure_url },
      { new: true, runValidators: true }
    );

    if (!chapter) {
      res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: chapter
    });
  } catch (error) {
    next(error);
  }
}; 