import '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB, closeDB, clearDB } from './mocks/mockDb';
import { setupCloudinaryMock } from './mocks/mockCloudinary';
import mongoose from 'mongoose';

// Load environment variables from .env.test file if it exists, otherwise use .env
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

// Set default test environment variables if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coursehub-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.PORT = process.env.PORT || '5000';

// Increase timeout for database operations
const TIMEOUT = 60000;
jest.setTimeout(TIMEOUT);

// Setup before all tests
beforeAll(async () => {
  await connectDB();
  setupCloudinaryMock();
}, TIMEOUT);

// Clean up after each test
afterEach(async () => {
  await clearDB();
}, TIMEOUT);

// Clean up after all tests
afterAll(async () => {
  await closeDB();
  // Ensure all connections are closed
  await mongoose.disconnect();
}, TIMEOUT); 