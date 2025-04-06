import request from 'supertest';
import { app, server } from '../server';
import mongoose from 'mongoose';
import { connectDB, clearDB, closeDB } from './mocks/mockDb';
import jwt from 'jsonwebtoken';
import User from '../models/User';

describe('Server Tests', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    try {
      await connectDB();
      // Create a test user
      testUser = await User.create({
        name: 'Test Creator',
        email: 'test@example.com',
        password: 'password123',
        role: 'creator'
      });
      
      // Create a test token
      const payload = {
        id: testUser._id,
        role: 'creator'
      };
      authToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
    } catch (error) {
      console.error('Failed to connect to test database:', error);
    }
  });

  afterEach(async () => {
    try {
      await clearDB();
    } catch (error) {
      console.error('Failed to clear test database:', error);
    }
  });

  afterAll(async () => {
    try {
      await closeDB();
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    } catch (error) {
      console.error('Failed to close test database:', error);
    }
  });

  describe('Basic Server Functionality', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'OK' });
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Route not found');
    });

    it('should handle server errors', async () => {
      // Simulate a server error by passing invalid ObjectId
      const response = await request(app).get('/api/v1/courses/invalid-id');
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Server Shutdown', () => {
    it('should handle graceful shutdown', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const mockClose = jest.spyOn(server, 'close').mockImplementation((cb?: () => void) => {
        if (cb) cb();
        return server;
      });
      
      // Simulate SIGTERM signal
      process.emit('SIGTERM', 'SIGTERM');
      
      // Wait for shutdown handlers to execute
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockClose).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
      mockClose.mockRestore();
    });
  });

  describe('Database Connection', () => {
    it('should handle database connection errors', async () => {
      // Force disconnect the database
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify server is still running
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      
      // Reconnect for other tests
      await connectDB();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      // Create a test user before each test
      testUser = await User.create({
        name: 'Test Creator',
        email: 'test@example.com',
        password: 'password123',
        role: 'creator'
      });
      
      // Create a test token
      const payload = {
        id: testUser._id,
        role: 'creator'
      };
      authToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
    });

    it('should handle multer errors', async () => {
      // Create a large buffer to exceed multer's file size limit
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB buffer
      
      const response = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', largeBuffer, 'large-file.jpg')
        .field('title', 'Test Course')
        .field('description', 'Test Description')
        .field('category', 'Test Category')
        .field('price', '10')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'File upload error');
    });

    it('should handle file type errors', async () => {
      // First create a course
      const course = await mongoose.model('Course').create({
        title: 'Test Course',
        description: 'Test Description',
        category: 'Test Category',
        price: 10,
        creator: testUser._id
      });

      const response = await request(app)
        .post(`/api/v1/courses/${course._id}/chapters`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('video', Buffer.from('test'), 'test.txt')
        .field('title', 'Test Chapter')
        .field('description', 'Test Description')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid file type. Accepted types are: image/jpeg, image/png, image/gif, video/mp4, video/mpeg, video/quicktime, video/x-msvideo, video/x-ms-wmv, video/webm, application/mp4, application/octet-stream');
    });
  });
}); 