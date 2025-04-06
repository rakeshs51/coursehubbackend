import request from 'supertest';
import mongoose from 'mongoose';
import {app} from '../server';
import User from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { UserAchievement } from '../models/UserAchievement';
import { Enrollment } from '../models/Enrollment';
import Course from '../models/Course';
import jwt from 'jsonwebtoken';

// Add Jest types
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveProperty(property: string, value?: any): R;
    }
  }
}

describe('Profile API Tests', () => {
  let token: string;
  let userId: string;
  let courseId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
      role: 'member'
    });

    userId = user._id.toString();

    // Create JWT token
    token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );

    // Create a test course
    const course = await Course.create({
      title: 'Test Course',
      description: 'Test Description',
      creator: userId,
      price: 99.99,
      category: 'programming',
      tags: ['test']
    });

    courseId = course._id.toString();
  });

  describe('GET /api/v1/profile', () => {
    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('profile');
      expect(response.body).toHaveProperty('achievements');
      expect(response.body).toHaveProperty('stats');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/profile', () => {
    it('should update user profile', async () => {
      const profileData = {
        bio: 'Test bio',
        location: 'Test location',
        skills: ['JavaScript', 'TypeScript'],
        interests: ['Web Development']
      };

      const response = await request(app)
        .patch('/api/v1/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(profileData);

      expect(response.status).toBe(200);
      expect(response.body.bio).toBe(profileData.bio);
      expect(response.body.location).toBe(profileData.location);
      expect(response.body.skills).toEqual(expect.arrayContaining(profileData.skills));
      expect(response.body.interests).toEqual(expect.arrayContaining(profileData.interests));
    });
  });

  describe('PATCH /api/v1/profile/preferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        preferences: {
          emailNotifications: false,
          courseRecommendations: true,
          communityUpdates: false
        }
      };

      const response = await request(app)
        .patch('/api/v1/profile/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send(preferences);

      expect(response.status).toBe(200);
      expect(response.body.emailNotifications).toBe(false);
      expect(response.body.courseRecommendations).toBe(true);
      expect(response.body.communityUpdates).toBe(false);
    });
  });

  describe('GET /api/v1/profile/achievements', () => {
    beforeEach(async () => {
      // Create a test achievement
      await UserAchievement.create({
        user: userId,
        type: 'course_completion',
        title: 'Test Achievement',
        description: 'Test Description',
        course: courseId,
        dateEarned: new Date()
      });
    });

    it('should get user achievements', async () => {
      const response = await request(app)
        .get('/api/v1/profile/achievements')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title', 'Test Achievement');
    });

    it('should filter achievements by type', async () => {
      const response = await request(app)
        .get('/api/v1/profile/achievements?type=course_completion')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].type).toBe('course_completion');
    });
  });

  describe('GET /api/v1/profile/enrollments', () => {
    beforeEach(async () => {
      // Create a test enrollment
      await Enrollment.create({
        user: userId,
        course: courseId,
        status: 'active',
        progress: 50
      });
    });

    it('should get user enrollments', async () => {
      try {
        const response = await request(app)
          .get('/api/v1/profile/enrollments')
          .set('Authorization', `Bearer ${token}`)
          .timeout(5000); // 5 second timeout

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('enrollments');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('pages');
        expect(response.body).toHaveProperty('currentPage');
        expect(Array.isArray(response.body.enrollments)).toBe(true);
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    }, 10000); // 10 second test timeout

    it('should filter enrollments by status', async () => {
      const response = await request(app)
        .get('/api/v1/profile/enrollments?status=active')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.enrollments[0].status).toBe('active');
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/v1/profile/enrollments?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.currentPage).toBe(1);
      expect(response.body.enrollments.length).toBeLessThanOrEqual(10);
    });
  });
}); 