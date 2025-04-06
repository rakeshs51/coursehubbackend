import request from 'supertest';
import {app} from '../server';
import User from '../models/User';
import Course from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import jwt from 'jsonwebtoken';
import { mockCloudinaryResponse } from './mocks/mockCloudinary';

describe('Enrollment API Tests', () => {
  let memberToken: string;
  let creatorToken: string;
  let memberId: string;
  let creatorId: string;
  let courseId: string;
  let enrollmentId: string;

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
    await Enrollment.deleteMany({});

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

  describe('POST /api/v1/enrollments/courses/:courseId/enroll', () => {
    it('should enroll in a course', async () => {
      const response = await request(app)
        .post(`/api/v1/enrollments/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user', memberId);
      expect(response.body).toHaveProperty('course', courseId);
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('progress', 0);
      enrollmentId = response.body._id;
    });

    it('should not allow duplicate enrollment', async () => {
      // First enrollment
      await request(app)
        .post(`/api/v1/enrollments/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Try to enroll again
      const response = await request(app)
        .post(`/api/v1/enrollments/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Already enrolled in this course');
    });

    it('should not allow creator to enroll in courses', async () => {
      const response = await request(app)
        .post(`/api/v1/enrollments/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Creators cannot enroll in courses');
    });
  });

  describe('GET /api/v1/enrollments/enrolled', () => {
    beforeEach(async () => {
      // Create some enrollments
      await Enrollment.create({
        user: memberId,
        course: courseId,
        status: 'active',
        progress: 50
      });

      const anotherCourse = await Course.create({
        ...testCourse,
        title: 'Another Course',
        creator: creatorId
      });

      await Enrollment.create({
        user: memberId,
        course: anotherCourse._id,
        status: 'completed',
        progress: 100
      });
    });

    it('should get all enrolled courses', async () => {
      const response = await request(app)
        .get('/api/v1/enrollments/enrolled')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enrollments');
      expect(response.body.enrollments).toHaveLength(2);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pages');
    });

    it('should filter enrollments by status', async () => {
      const response = await request(app)
        .get('/api/v1/enrollments/enrolled?status=completed')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.enrollments).toHaveLength(1);
      expect(response.body.enrollments[0].status).toBe('completed');
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/v1/enrollments/enrolled?page=1&limit=1')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.enrollments).toHaveLength(1);
      expect(response.body.pages).toBe(2);
      expect(response.body.currentPage).toBe(1);
    });
  });

  describe('PATCH /api/v1/enrollments/enrollments/:enrollmentId/progress', () => {
    beforeEach(async () => {
      // Clear existing enrollments
      await Enrollment.deleteMany({});

      // Create a new enrollment
      const enrollment = await Enrollment.create({
        user: memberId,
        course: courseId,
        status: 'active',
        progress: 50
      });

      // Ensure we have a valid enrollment ID
      if (!enrollment._id) {
        throw new Error('Failed to create enrollment');
      }

      enrollmentId = enrollment._id.toString();
      console.log('Created enrollment with ID:', enrollmentId);
    });

    it('should update enrollment progress', async () => {
      console.log('Testing update with enrollmentId:', enrollmentId);
      const response = await request(app)
        .patch(`/api/v1/enrollments/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ progress: 75 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('progress', 75);
      expect(response.body).toHaveProperty('status', 'active');
    });

    it('should complete enrollment at 100% progress', async () => {
      const response = await request(app)
        .patch(`/api/v1/enrollments/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ progress: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('progress', 100);
      expect(response.body).toHaveProperty('status', 'completed');
    });

    it('should validate progress value', async () => {
      const response = await request(app)
        .patch(`/api/v1/enrollments/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ progress: 150 }); // Invalid progress value

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Progress must be between 0 and 100');
    });

    it('should not allow unauthorized progress update', async () => {
      // Create another member
      const otherMember = await User.create({
        ...testMember,
        email: 'other@example.com'
      });

      const otherToken = jwt.sign(
        { id: otherMember._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .patch(`/api/v1/enrollments/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ progress: 75 });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to update this enrollment');
    });
  });

  describe('GET /api/v1/enrollments/discover', () => {
    beforeEach(async () => {
      // Create more test courses
      await Course.create([
        {
          ...testCourse,
          title: 'Python Course',
          category: 'programming',
          creator: creatorId
        },
        {
          ...testCourse,
          title: 'Design Basics',
          category: 'design',
          creator: creatorId
        },
        {
          ...testCourse,
          title: 'Advanced JavaScript',
          category: 'programming',
          tags: ['javascript', 'advanced'],
          creator: creatorId
        }
      ]);
    });

    it('should discover available courses', async () => {
      const response = await request(app)
        .get('/api/v1/enrollments/discover');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('courses');
      expect(response.body.courses.length).toBeGreaterThan(0);
    });

    it('should filter courses by category', async () => {
      const response = await request(app)
        .get('/api/v1/enrollments/discover?category=design');

      expect(response.status).toBe(200);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].category).toBe('design');
    });

    it('should search courses by title', async () => {
      const response = await request(app)
        .get('/api/v1/enrollments/discover?search=Python');

      expect(response.status).toBe(200);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].title).toBe('Python Course');
    });

    it('should filter courses by tags', async () => {
      const response = await request(app)
        .get('/api/v1/enrollments/discover?tags=advanced');

      expect(response.status).toBe(200);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].title).toBe('Advanced JavaScript');
    });
  });
}); 