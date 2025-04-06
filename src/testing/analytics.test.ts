import request from 'supertest';
import { app } from '../server';
import User from '../models/User';
import Course from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Analytics API Tests', () => {
  let creatorToken: string;
  let creatorId: string;
  let courseIds: string[];

  const testCreator = {
    name: 'Test Creator',
    email: 'creator@test.com',
    password: 'Password123!',
    role: 'creator'
  };

  const testCourses = [
    {
      title: 'Course 1',
      description: 'Test Course 1',
      price: 100,
      category: 'Programming'
    },
    {
      title: 'Course 2',
      description: 'Test Course 2',
      price: 150,
      category: 'Design'
    }
  ];

  const testStudents = [
    {
      name: 'Student 1',
      email: 'student1@test.com',
      password: 'Password123!',
      role: 'member'
    },
    {
      name: 'Student 2',
      email: 'student2@test.com',
      password: 'Password123!',
      role: 'member'
    }
  ];

  beforeAll(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});

    // Create test creator
    const creator = await User.create(testCreator);
    creatorId = creator._id.toString();
    creatorToken = jwt.sign(
      { id: creator._id, role: creator.role },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );

    // Create test courses
    const courses = await Promise.all(
      testCourses.map(course => Course.create({
        ...course,
        creator: creator._id
      }))
    );
    courseIds = courses.map(course => course._id.toString());

    // Create test students
    const students = await Promise.all(
      testStudents.map(student => User.create(student))
    );

    // Create enrollments with different statuses and dates
    const enrollmentData = [
      {
        user: students[0]._id,
        course: courses[0]._id,
        status: 'completed',
        createdAt: new Date(Date.now() - 5 * 30 * 24 * 60 * 60 * 1000) // 5 months ago
      },
      {
        user: students[1]._id,
        course: courses[0]._id,
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000) // 2 months ago
      },
      {
        user: students[0]._id,
        course: courses[1]._id,
        status: 'active',
        createdAt: new Date() // current
      }
    ];

    await Promise.all(
      enrollmentData.map(enrollment => Enrollment.create(enrollment))
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return dashboard analytics for creator', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalStudents', 2);
      expect(response.body.data).toHaveProperty('totalCourses', 2);
      expect(response.body.data).toHaveProperty('totalRevenue', 350); // 2 * 100 + 1 * 150
      expect(response.body.data).toHaveProperty('completionRate', '33%'); // 1 out of 3 enrollments
      expect(response.body.data.recentActivity).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('GET /api/v1/analytics/detailed', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/detailed');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication required');
    });

    it('should return empty data for creator with no courses', async () => {
      // Create a new creator with no courses
      const newCreator = await User.create({
        name: 'New Creator',
        email: 'newcreator@test.com',
        password: 'Password123!',
        role: 'creator'
      });

      const newCreatorToken = jwt.sign(
        { id: newCreator._id, role: newCreator.role },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v1/analytics/detailed')
        .set('Authorization', `Bearer ${newCreatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.coursePerformance).toHaveLength(0);
      expect(response.body.data.monthlyRevenue).toHaveLength(6);
      expect(response.body.data.studentEngagement).toMatchObject({
        totalStudents: 0,
        activeStudents: 0,
        completionRate: 0
      });
    });
  });
}); 