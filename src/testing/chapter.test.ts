import request from 'supertest';
import { app } from '../server';
import User from '../models/User';
import Course from '../models/Course';
import Chapter, { IChapter } from '../models/Chapter';
import jwt from 'jsonwebtoken';
import { mockCloudinaryResponse } from './mocks/mockCloudinary';
import mongoose from 'mongoose';

describe('Chapter API Tests', () => {
  let creatorToken: string;
  let memberToken: string;
  let creatorId: string;
  let memberId: string;
  let courseId: string;
  let chapterId: string;

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

  const testChapter = {
    title: 'Test Chapter',
    description: 'Test Chapter Description',
    order: 1,
    isPreview: true
  };

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Chapter.deleteMany({});

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
      creator: new mongoose.Types.ObjectId(creatorId)
    });
    courseId = course._id.toString();
  });

  describe('POST /api/v1/courses/:courseId/chapters', () => {
    it('should create a new chapter', async () => {
      const response = await request(app)
        .post(`/api/v1/courses/${courseId}/chapters`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .field('title', testChapter.title)
        .field('description', testChapter.description)
        .field('order', testChapter.order)
        .field('isPreview', testChapter.isPreview)
        .attach('video', Buffer.from('fake-video'), { filename: 'test-video.mp4' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', testChapter.title);
      expect(response.body.data).toHaveProperty('description', testChapter.description);
      expect(response.body.data).toHaveProperty('order', testChapter.order);
      expect(response.body.data).toHaveProperty('isPreview', testChapter.isPreview);
      expect(response.body.data).toHaveProperty('videoUrl');
      expect(response.body.data).toHaveProperty('duration');
      chapterId = response.body.data._id;
    });

    it('should create a chapter without video', async () => {
      const response = await request(app)
        .post(`/api/v1/courses/${courseId}/chapters`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(testChapter);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', testChapter.title);
      expect(response.body.data).toHaveProperty('videoUrl', '');
      expect(response.body.data).toHaveProperty('duration', 0);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post(`/api/v1/courses/${courseId}/chapters`)
        .send(testChapter);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });

    it('should return 403 for non-creator users', async () => {
      const response = await request(app)
        .post(`/api/v1/courses/${courseId}/chapters`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(testChapter);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to add chapters to this course');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/api/v1/courses/${fakeId}/chapters`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(testChapter);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Course not found');
    });
  });

  describe('GET /api/v1/courses/:courseId/chapters', () => {
    beforeEach(async () => {
      // Create some chapters
      const chapter1 = await Chapter.create({
        ...testChapter,
        course: new mongoose.Types.ObjectId(courseId),
        order: 1
      });

      const chapter2 = await Chapter.create({
        ...testChapter,
        title: 'Second Chapter',
        course: new mongoose.Types.ObjectId(courseId),
        order: 2
      });

      chapterId = chapter1._id.toString();
    });

    it('should get all chapters for a course', async () => {
      const response = await request(app)
        .get(`/api/v1/courses/${courseId}/chapters`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('order', 1);
      expect(response.body.data[1]).toHaveProperty('order', 2);
    });

    it('should return empty array for non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/courses/${fakeId}/chapters`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get(`/api/v1/courses/${courseId}/chapters`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });

  describe('GET /api/v1/courses/:courseId/chapters/:chapterId', () => {
    beforeEach(async () => {
      const chapter = await Chapter.create({
        ...testChapter,
        course: new mongoose.Types.ObjectId(courseId)
      });
      chapterId = chapter._id.toString();
    });

    it('should get a single chapter', async () => {
      const response = await request(app)
        .get(`/api/v1/courses/${courseId}/chapters/${chapterId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', testChapter.title);
      expect(response.body.data).toHaveProperty('course', courseId);
    });

    it('should return 404 for non-existent chapter', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/courses/${courseId}/chapters/${fakeId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Chapter not found');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get(`/api/v1/courses/${courseId}/chapters/${chapterId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });

  describe('PUT /api/v1/courses/:courseId/chapters/:chapterId', () => {
    beforeEach(async () => {
      const chapter = await Chapter.create({
        ...testChapter,
        course: new mongoose.Types.ObjectId(courseId)
      });
      chapterId = chapter._id.toString();
    });

    it('should update a chapter', async () => {
      const updateData = {
        title: 'Updated Chapter',
        description: 'Updated Description',
        isPreview: false,
        order: 2
      };

      const response = await request(app)
        .put(`/api/v1/courses/${courseId}/chapters/${chapterId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', updateData.title);
      expect(response.body.data).toHaveProperty('description', updateData.description);
      expect(response.body.data).toHaveProperty('isPreview', updateData.isPreview);
      expect(response.body.data).toHaveProperty('order', updateData.order);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .put(`/api/v1/courses/${courseId}/chapters/${chapterId}`)
        .send({ title: 'Updated Chapter' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });

    it('should return 403 for non-creator users', async () => {
      const response = await request(app)
        .put(`/api/v1/courses/${courseId}/chapters/${chapterId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Updated Chapter' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to update chapters in this course');
    });

    it('should return 404 for non-existent chapter', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/v1/courses/${courseId}/chapters/${fakeId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ title: 'Updated Chapter' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Chapter not found');
    });
  });

  describe('DELETE /api/v1/courses/:courseId/chapters/:chapterId', () => {
    beforeEach(async () => {
      const chapter = await Chapter.create({
        ...testChapter,
        course: new mongoose.Types.ObjectId(courseId)
      });
      chapterId = chapter._id.toString();
    });

    it('should delete a chapter', async () => {
      const response = await request(app)
        .delete(`/api/v1/courses/${courseId}/chapters/${chapterId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({});

      // Verify chapter is deleted
      const deletedChapter = await Chapter.findById(chapterId);
      expect(deletedChapter).toBeNull();
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .delete(`/api/v1/courses/${courseId}/chapters/${chapterId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });

    it('should return 403 for non-creator users', async () => {
      const response = await request(app)
        .delete(`/api/v1/courses/${courseId}/chapters/${chapterId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to delete chapters from this course');
    });

    it('should return 404 for non-existent chapter', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/v1/courses/${courseId}/chapters/${fakeId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Chapter not found');
    });
  });
}); 