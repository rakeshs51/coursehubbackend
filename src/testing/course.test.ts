import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { createCourse, getCourses, getCourse, getCreatorCourses, updateCourse } from '../controllers/courseController';

// Mock mongoose
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  Types: {
    ObjectId: jest.fn().mockImplementation((value) => ({
      toString: () => value || 'mockObjectId'
    }))
  }
}));

// Mock cloudinary
jest.mock('../utils/cloudinary', () => ({
  uploadToCloudinary: jest.fn()
}));

// Mock Course model
jest.mock('../models/Course', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

// Mock express-async-handler
jest.mock('express-async-handler', () => (fn: any) => fn);

describe('Course Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { _id: new mongoose.Types.ObjectId('mockObjectId'), role: 'creator' },
      body: {},
      query: {},
      params: {},
      file: undefined
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'Test Description',
        price: 99.99,
        category: 'Test Category',
        tags: ['tag1', 'tag2']
      };

      mockReq.body = courseData;
      mockReq.file = {
        path: 'test/path',
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      const mockCloudinary = require('../utils/cloudinary');
      mockCloudinary.uploadToCloudinary.mockResolvedValueOnce({
        secure_url: 'https://test-url.com/image.jpg',
        public_id: 'test_public_id',
        format: 'jpg',
        width: 800,
        height: 600,
        bytes: 1024,
        created_at: new Date().toISOString(),
        duration: 0
      });

      const mockCourse = require('../models/Course');
      const createdCourse = {
        ...courseData,
        _id: 'mockObjectId',
        thumbnail: 'https://test-url.com/image.jpg',
        toObject: () => ({
          ...courseData,
          _id: 'mockObjectId',
          thumbnail: 'https://test-url.com/image.jpg'
        })
      };

      mockCourse.create.mockResolvedValueOnce(createdCourse);

      await createCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCourse.create).toHaveBeenCalledWith({
        ...courseData,
        creator: mockReq.user?._id,
        thumbnail: 'https://test-url.com/image.jpg'
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      mockReq.body = {
        price: 99.99
      };

      await createCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        errors: [
          { field: 'title', message: 'Please add a title' },
          { field: 'description', message: 'Please add a description' },
          { field: 'category', message: 'Please add a category' }
        ]
      });
    });

    it('should handle unauthorized access', async () => {
      mockReq.user = undefined;

      await createCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to create courses'
      });
    });

    it('should handle cloudinary upload error', async () => {
      mockReq.body = {
        title: 'Test Course',
        description: 'Test Description',
        category: 'Test Category'
      };
      mockReq.file = {
        path: 'test/path',
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      const mockCloudinary = require('../utils/cloudinary');
      mockCloudinary.uploadToCloudinary.mockRejectedValueOnce(new Error('Upload failed'));

      await createCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error uploading thumbnail'
      });
    });
  });

  describe('getCourses', () => {
    it('should get all courses with pagination', async () => {
      mockReq.query = { page: '1', limit: '10' };

      const mockCourses = [
        { _id: new mongoose.Types.ObjectId(), title: 'Course 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Course 2' }
      ];

      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce(mockCourses)
      };

      (require('../models/Course').find as jest.Mock).mockImplementation(() => mockFind);
      (require('../models/Course').countDocuments as jest.Mock).mockResolvedValueOnce(2);

      await getCourses(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        courses: mockCourses,
        total: 2,
        pages: 1,
        currentPage: 1
      });
    });

    it('should handle search and filters', async () => {
      mockReq.query = {
        page: '1',
        limit: '10',
        category: 'Test Category',
        status: 'published',
        search: 'test'
      };

      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce([])
      };

      (require('../models/Course').find as jest.Mock).mockImplementation(() => mockFind);
      (require('../models/Course').countDocuments as jest.Mock).mockResolvedValueOnce(0);

      await getCourses(mockReq as Request, mockRes as Response, mockNext);

      expect(require('../models/Course').find).toHaveBeenCalledWith({
        category: 'Test Category',
        status: 'published',
        $or: [
          { title: { $regex: 'test', $options: 'i' } },
          { description: { $regex: 'test', $options: 'i' } }
        ]
      });
    });
  });

  describe('getCourse', () => {
    it('should get a single course', async () => {
      const courseId = new mongoose.Types.ObjectId();
      mockReq.params = { id: courseId.toString() };

      const mockCourse = {
        _id: courseId,
        title: 'Test Course',
        description: 'Test Description'
      };

      const mockPopulate = jest.fn().mockResolvedValueOnce(mockCourse);
      const mockPopulateChain = {
        populate: jest.fn().mockReturnValue({ populate: mockPopulate })
      };
      (require('../models/Course').findById as jest.Mock).mockImplementation(() => mockPopulateChain);

      await getCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCourse);
    });

    it('should handle course not found', async () => {
      mockReq.params = { id: new mongoose.Types.ObjectId().toString() };

      const mockPopulate = jest.fn().mockResolvedValueOnce(null);
      const mockPopulateChain = {
        populate: jest.fn().mockReturnValue({ populate: mockPopulate })
      };
      (require('../models/Course').findById as jest.Mock).mockImplementation(() => mockPopulateChain);

      await getCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Course not found'
      });
    });
  });

  describe('getCreatorCourses', () => {
    it('should get creator courses', async () => {
      const mockCourses = [
        { _id: new mongoose.Types.ObjectId(), title: 'Course 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Course 2' }
      ];

      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce(mockCourses)
      };

      (require('../models/Course').find as jest.Mock).mockImplementation(() => mockFind);

      await getCreatorCourses(mockReq as Request, mockRes as Response, mockNext);

      expect(require('../models/Course').find).toHaveBeenCalledWith({ creator: mockReq.user?._id });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockCourses
      });
    });

    it('should handle unauthorized access', async () => {
      mockReq.user = undefined;

      await getCreatorCourses(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authorized to access creator courses'
      });
    });
  });

  describe('updateCourse', () => {
    const courseId = new mongoose.Types.ObjectId('mockObjectId');
    const mockCourseCreator = new mongoose.Types.ObjectId('mockCreatorId');
    const mockCourse = {
      _id: courseId,
      title: 'Original Title',
      description: 'Original Description',
      creator: mockCourseCreator,
      thumbnail: 'original-thumbnail.jpg',
      tags: ['original-tag'],
      toObject: () => ({
        _id: courseId,
        title: 'Original Title',
        description: 'Original Description',
        creator: mockCourseCreator,
        thumbnail: 'original-thumbnail.jpg',
        tags: ['original-tag']
      })
    };

    beforeEach(() => {
      mockReq.params = { id: courseId.toString() };
      mockReq.user = { _id: mockCourseCreator, role: 'creator' };
    });

    it('should update a course successfully', async () => {
      mockReq.body = {
        title: 'Updated Title',
        description: 'Updated Description',
        tags: ['tag1', 'tag2']
      };

      const mockCourseModel = require('../models/Course');
      mockCourseModel.findById.mockResolvedValueOnce({
        ...mockCourse,
        creator: {
          toString: () => mockCourseCreator.toString()
        }
      });

      const updatedCourse = {
        ...mockCourse,
        ...mockReq.body,
        thumbnail: mockCourse.thumbnail
      };

      mockCourseModel.findByIdAndUpdate.mockResolvedValueOnce(updatedCourse);

      await updateCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCourseModel.findByIdAndUpdate).toHaveBeenCalledWith(
        courseId.toString(),
        {
          $set: {
            title: 'Updated Title',
            description: 'Updated Description',
            tags: ['tag1', 'tag2'],
            thumbnail: 'original-thumbnail.jpg',
            category: undefined,
            price: undefined,
            status: undefined
          }
        },
        { new: true, runValidators: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle unauthorized update', async () => {
      const differentUserId = new mongoose.Types.ObjectId('differentUserId');
      mockReq.user = { _id: differentUserId, role: 'creator' };
      mockReq.body = { title: 'Unauthorized Update' };

      const mockCourseModel = require('../models/Course');
      const mockCourseWithCreator = {
        ...mockCourse,
        creator: mockCourseCreator
      };
      mockCourseModel.findById.mockResolvedValueOnce(mockCourseWithCreator);

      await updateCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to update this course'
      });
    });

    it('should handle course not found', async () => {
      (require('../models/Course').findById as jest.Mock).mockResolvedValueOnce(null);

      await updateCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Course not found'
      });
    });

    it('should handle cloudinary upload error during update', async () => {
      mockReq.body = { title: 'Updated Title' };
      mockReq.file = {
        path: 'test/path',
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      (require('../models/Course').findById as jest.Mock).mockImplementation(() => ({
        ...mockCourse,
        creator: {
          toString: () => mockCourse.creator.toString()
        }
      }));

      const mockCloudinary = require('../utils/cloudinary');
      mockCloudinary.uploadToCloudinary.mockRejectedValueOnce(new Error('Upload failed'));

      await updateCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error uploading thumbnail'
      });
    });
  });
}); 