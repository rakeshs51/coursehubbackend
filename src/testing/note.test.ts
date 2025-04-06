import request from 'supertest';
import { app } from '../server';
import User from '../models/User';
import Course from '../models/Course';
import { Note } from '../models/Note';
import jwt from 'jsonwebtoken';
import { mockCloudinaryResponse } from './mocks/mockCloudinary';
import mongoose from 'mongoose';

describe('Note API Tests', () => {
  let memberToken: string;
  let creatorToken: string;
  let memberId: string;
  let creatorId: string;
  let courseId: string;
  let chapterId: string;
  let noteId: string;

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

  const testNote = {
    content: 'Test note content',
    timestamp: 120 // 2 minutes into the video
  };

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Note.deleteMany({});

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

  describe('POST /api/v1/notes', () => {
    it('should create a new note', async () => {
      const response = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          courseId,
          chapterId: null,
          ...testNote
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('content', testNote.content);
      expect(response.body).toHaveProperty('timestamp', testNote.timestamp);
      expect(response.body).toHaveProperty('user', memberId);
      expect(response.body).toHaveProperty('course', courseId);
      noteId = response.body._id;
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/v1/notes')
        .send({
          courseId,
          chapterId: null,
          ...testNote
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          courseId: fakeId,
          chapterId: null,
          ...testNote
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Course not found');
    });
  });

  describe('GET /api/v1/notes', () => {
    beforeEach(async () => {
      // Create some notes
      const note1 = (await Note.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        chapter: null,
        content: 'First note',
        timestamp: 60
      })) as mongoose.Document & { _id: mongoose.Types.ObjectId };

      const anotherCourse = await Course.create({
        ...testCourse,
        title: 'Another Course',
        creator: creatorId
      });

      const note2 = (await Note.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(anotherCourse._id),
        chapter: null,
        content: 'Second note',
        timestamp: 120
      })) as mongoose.Document & { _id: mongoose.Types.ObjectId };

      noteId = note1._id.toString();
    });

    it('should get all notes', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      // Check that both notes exist in the response
      const contents = response.body.map((n: any) => n.content);
      expect(contents).toContain('First note');
      expect(contents).toContain('Second note');
    });

    it('should filter notes by course', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .query({ courseId })
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].content).toBe('First note');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/notes');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });

  describe('GET /api/v1/notes/chapter/:chapterId', () => {
    beforeEach(async () => {
      // Create a chapter first
      const chapter = await mongoose.model('Chapter').create({
        title: 'Test Chapter',
        description: 'Test Description',
        course: new mongoose.Types.ObjectId(courseId),
        creator: new mongoose.Types.ObjectId(creatorId)
      });
      chapterId = chapter._id.toString();

      // Create some notes for the chapter
      await Note.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        chapter: new mongoose.Types.ObjectId(chapterId),
        content: 'Chapter note 1',
        timestamp: 30
      });

      await Note.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        chapter: new mongoose.Types.ObjectId(chapterId),
        content: 'Chapter note 2',
        timestamp: 60
      });
    });

    it('should get all notes for a chapter', async () => {
      const response = await request(app)
        .get(`/api/v1/notes/chapter/${chapterId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('content', 'Chapter note 1');
      expect(response.body[1]).toHaveProperty('content', 'Chapter note 2');
    });

    it('should return 404 for non-existent chapter', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/notes/chapter/${fakeId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Chapter not found');
    });

    it('should return empty array when no notes exist', async () => {
      // Create a new chapter without notes
      const newChapter = await mongoose.model('Chapter').create({
        title: 'Empty Chapter',
        description: 'No Notes',
        course: new mongoose.Types.ObjectId(courseId),
        creator: new mongoose.Types.ObjectId(creatorId)
      });

      const response = await request(app)
        .get(`/api/v1/notes/chapter/${newChapter._id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/v1/notes/search', () => {
    beforeEach(async () => {
      // Create some notes with searchable content
      await Note.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        content: 'JavaScript basics and fundamentals',
        timestamp: 30
      });

      await Note.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        content: 'Advanced TypeScript concepts',
        timestamp: 60
      });
    });

    it('should search notes by content', async () => {
      const response = await request(app)
        .get('/api/v1/notes/search')
        .query({ query: 'JavaScript' })
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].content).toContain('JavaScript');
    });

    it('should return all notes for empty search query', async () => {
      const response = await request(app)
        .get('/api/v1/notes/search')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/v1/notes/search')
        .query({ query: 'nonexistentterm' })
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('PATCH /api/v1/notes/:noteId', () => {
    beforeEach(async () => {
      // Create a note
      const note = (await Note.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        chapter: null,
        content: 'Original content',
        timestamp: 60
      })) as mongoose.Document & { _id: mongoose.Types.ObjectId };
      noteId = note._id.toString();
    });

    it('should update a note', async () => {
      const updateData = {
        content: 'Updated content',
        timestamp: 180
      };

      const response = await request(app)
        .patch(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content', updateData.content);
      expect(response.body).toHaveProperty('timestamp', updateData.timestamp);
    });

    it('should return 404 for non-existent note', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .patch(`/api/v1/notes/${fakeId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          content: 'Updated content',
          timestamp: 180
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Note not found');
    });

    it('should not allow unauthorized updates', async () => {
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
        .patch(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          content: 'Updated content',
          timestamp: 180
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Note not found');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .patch(`/api/v1/notes/${noteId}`)
        .send({
          content: 'Updated content',
          timestamp: 180
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });

  describe('DELETE /api/v1/notes/:noteId', () => {
    beforeEach(async () => {
      // Create a note
      const note = (await Note.create({
        user: new mongoose.Types.ObjectId(memberId),
        course: new mongoose.Types.ObjectId(courseId),
        chapter: null,
        content: 'Test note',
        timestamp: 60
      })) as mongoose.Document & { _id: mongoose.Types.ObjectId };
      noteId = note._id.toString();
    });

    it('should delete a note', async () => {
      const response = await request(app)
        .delete(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Note deleted successfully');

      // Verify note is deleted
      const deletedNote = await Note.findById(noteId);
      expect(deletedNote).toBeNull();
    });

    it('should return 404 for non-existent note', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/v1/notes/${fakeId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Note not found');
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
        .delete(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Note not found');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .delete(`/api/v1/notes/${noteId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });
}); 