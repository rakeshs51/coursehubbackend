import { Request, Response, NextFunction } from 'express';
import Course from '../models/Course';
import { uploadToCloudinary } from '../utils/cloudinary';

// Create a new course
export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, price, category, tags } = req.body;
    
    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to create courses'
      });
      return;
    }
    
    // Validate required fields
    if (!title || !description || !category) {
      const errors = [];
      if (!title) errors.push({ field: 'title', message: 'Please add a title' });
      if (!description) errors.push({ field: 'description', message: 'Please add a description' });
      if (!category) errors.push({ field: 'category', message: 'Please add a category' });
      
      res.status(400).json({
        success: false,
        errors
      });
      return;
    }

    const creator = req.user._id;

    let thumbnail = '';
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file);
        thumbnail = result.secure_url;
      } catch (uploadError: any) {
        console.error('Upload error:', uploadError);
        res.status(500).json({
          success: false,
          message: 'Error uploading thumbnail'
        });
        return;
      }
    }

    // Handle tags properly - could be a string or already an array
    let parsedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === 'string') {
        try {
          // Try to parse as JSON first
          parsedTags = JSON.parse(tags);
        } catch (e) {
          // If not valid JSON, split by comma
          parsedTags = tags.split(',').map((tag: string) => tag.trim());
        }
      }
    }

    const course = await Course.create({
      title,
      description,
      creator,
      price: Number(price),
      thumbnail,
      category,
      tags: parsedTags
    });

    const courseObj = course.toObject();
    courseObj.creator = creator;

    res.status(201).json(courseObj);
  } catch (error) {
    next(error);
  }
};

// Get all courses
export const getCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};
    
    // Add filters if provided
    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('creator', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(query);

    res.status(200).json({
      courses,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    next(error);
  }
};

// Get a single course
export const getCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('chapters');

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found'
      });
      return;
    }

    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};

// Get creator's courses
export const getCreatorCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        error: 'Not authorized to access creator courses'
      });
      return;
    }
    
    const courses = await Course.find({ creator: req.user._id })
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// Update a course
export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, price, category, tags, status } = req.body;
    
    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to update courses'
      });
      return;
    }

    // Check if course exists and belongs to the creator
    const course = await Course.findById(req.params.id);
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
        message: 'Not authorized to update this course'
      });
      return;
    }

    // Handle tags properly - could be a string or already an array
    let parsedTags = course.tags;
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === 'string') {
        try {
          // Try to parse as JSON first
          parsedTags = JSON.parse(tags);
        } catch (e) {
          // If not valid JSON, split by comma
          parsedTags = tags.split(',').map((tag: string) => tag.trim());
        }
      }
    }

    // Handle thumbnail upload if provided
    let thumbnail = course.thumbnail;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file);
        thumbnail = result.secure_url;
      } catch (uploadError: any) {
        console.error('Upload error:', uploadError);
        res.status(500).json({
          success: false,
          message: 'Error uploading thumbnail'
        });
        return;
      }
    }

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title: title || course.title,
          description: description || course.description,
          price: price ? Number(price) : course.price,
          category: category || course.category,
          thumbnail,
          tags: parsedTags,
          status: status || course.status
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      res.status(404).json({
        success: false,
        message: 'Course not found'
      });
      return;
    }

    res.status(200).json(updatedCourse);
  } catch (error) {
    next(error);
  }
};

// Delete a course
export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to delete courses'
      });
      return;
    }

    const course = await Course.findById(req.params.id);
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
        message: 'Not authorized to delete this course'
      });
      return;
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update course status
export const updateCourseStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    
    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        error: 'Not authorized to update course status'
      });
      return;
    }

    // Check if course exists and belongs to the creator
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({
        success: false,
        error: 'Course not found'
      });
      return;
    }

    if (course.creator.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to update this course'
      });
      return;
    }

    course.status = status;
    await course.save();

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// Get course preview
export const getCoursePreview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id)
      .select('title description thumbnail price category tags status')
      .populate('creator', 'name bio');

    if (!course) {
      res.status(404).json({
        success: false,
        error: 'Course not found'
      });
      return;
    }

    // Only return preview if course is published
    if (course.status !== 'published') {
      res.status(403).json({
        success: false,
        error: 'Course preview not available'
      });
      return;
    }

    // Get total chapters count and first chapter preview
    const previewData = {
      ...course.toObject(),
      totalChapters: course.chapters?.length || 0,
      previewChapter: course.chapters?.[0] || null,
      // Don't expose full chapters list
      chapters: undefined
    };

    res.status(200).json({
      success: true,
      data: previewData
    });
  } catch (error) {
    next(error);
  }
};