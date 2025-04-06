import request from 'supertest';
import {app} from '../server';
import User from '../models/User';
import Course from '../models/Course';
import { Bookmark, IBookmark } from '../models/Bookmark';
import jwt from 'jsonwebtoken';
import { mockCloudinaryResponse } from './mocks/mockCloudinary';
import mongoose from 'mongoose';

describe('Bookmark API Tests', () => {
  let memberToken: string;
  let creatorToken: string;
  let memberId: string;
  let creatorId: string;
  let courseId: string;
  let bookmarkId: string;

  const testCreator = {
    name: 'Test Creator',
    email: 'creator@example.com',
    password: 'Password123!',
    role: 'creator'
  };

  const testMember = {
    name: 'Test Member',
    email: 'member@example.com',
    password: 'Password123!',
    role: 'member'
  };

  const testCourse = {
    title: 'Test Course',
    description: 'Test Description',
    price: 99.99,
    category: 'programming',
    tags: ['javascript', 'web development'],
    thumbnail: mockCloudinaryResponse.secure_url
  };

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Bookmark.deleteMany({});

    // Create test users
    const creator = await User.create(testCreator);
    const member = await User.create(testMember);
    creatorId = creator._id.toString();
    memberId = member._id.toString();

    // Create tokens
    creatorToken = jwt.sign(
      { id: creatorId },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { id: memberId },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );

    // Create a test course
    const course = await Course.create({
      ...testCourse,
      creator: creatorId
    });
    courseId = course._id.toString();
  });

  describe('POST /api/v1/bookmarks', () => {
    it('should create a new bookmark', async () => {
      const response = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          courseId,
          chapterId: null,
          note: 'Test bookmark note'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user', memberId);
      expect(response.body).toHaveProperty('course', courseId);
      expect(response.body).toHaveProperty('note', 'Test bookmark note');
      bookmarkId = response.body._id;
    });

    it('should not allow duplicate bookmarks', async () => {
      // Create first bookmark
      await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          courseId,
          chapterId: null,
          note: 'Test bookmark note'
        });

      // Try to create duplicate bookmark
      const response = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          courseId,
          chapterId: null,
          note: 'Another note'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Already bookmarked this content');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/v1/bookmarks')
        .send({
          courseId,
          chapterId: null,
          note: 'Test bookmark note'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeCourseId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          courseId: fakeCourseId,
          chapterId: null,
          note: 'Test bookmark note'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Course not found');
    });
  });

  describe('GET /api/v1/bookmarks', () => {
    beforeEach(async () => {
      // Create some bookmarks
      const bookmark1 = (await Bookmark.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        chapter: null,
        note: 'First bookmark'
      })) as mongoose.Document & { _id: mongoose.Types.ObjectId };

      const anotherCourse = await Course.create({
        ...testCourse,
        title: 'Another Course',
        creator: creatorId
      });

      const bookmark2 = (await Bookmark.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(anotherCourse._id),
        chapter: null,
        note: 'Second bookmark'
      })) as mongoose.Document & { _id: mongoose.Types.ObjectId };

      bookmarkId = bookmark1._id.toString();
    });

    it('should get all bookmarks', async () => {
      const response = await request(app)
        .get('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      // Check that both bookmarks exist in the response, regardless of order
      const notes = response.body.map((b: any) => b.note);
      expect(notes).toContain('First bookmark');
      expect(notes).toContain('Second bookmark');
    });

    it('should filter bookmarks by course', async () => {
      const response = await request(app)
        .get('/api/v1/bookmarks')
        .query({ courseId })
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].course._id).toBe(courseId);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/bookmarks');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });

  describe('DELETE /api/v1/bookmarks/:bookmarkId', () => {
    beforeEach(async () => {
      // Create a bookmark
      const bookmark = (await Bookmark.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        chapter: null,
        note: 'Test bookmark'
      })) as mongoose.Document & { _id: mongoose.Types.ObjectId };
      bookmarkId = bookmark._id.toString();
    });

    it('should delete a bookmark', async () => {
      const response = await request(app)
        .delete(`/api/v1/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Bookmark removed successfully');

      // Verify bookmark is deleted
      const deletedBookmark = await Bookmark.findById(bookmarkId);
      expect(deletedBookmark).toBeNull();
    });

    it('should return 404 for non-existent bookmark', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/v1/bookmarks/${fakeId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Bookmark not found');
    });

    it('should not allow unauthorized deletion', async () => {
      // Create another user
      const otherUser = await User.create({
        ...testMember,
        email: 'other@example.com'
      });

      const otherToken = jwt.sign(
        { id: otherUser._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .delete(`/api/v1/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Bookmark not found');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .delete(`/api/v1/bookmarks/${bookmarkId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });
}); 