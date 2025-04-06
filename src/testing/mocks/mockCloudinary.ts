import { v2 as cloudinary } from 'cloudinary';

// Mock Cloudinary's uploader and API
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockImplementation((file) => Promise.resolve({
        public_id: 'test_public_id',
        secure_url: 'https://test-cloudinary-url.com/image.jpg',
        resource_type: 'image'
      })),
      destroy: jest.fn().mockImplementation((public_id) => Promise.resolve({ result: 'ok' }))
    },
    api: {
      ping: jest.fn().mockImplementation(() => Promise.resolve({ status: 'ok' })),
      resources: jest.fn().mockImplementation(() => Promise.resolve({
        resources: [],
        next_cursor: null
      }))
    }
  }
}));

export const mockCloudinaryResponse = {
  public_id: 'test_public_id',
  secure_url: 'https://test-cloudinary-url.com/image.jpg',
  resource_type: 'image'
};

export const setupCloudinaryMock = () => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Configure cloudinary with test values
  cloudinary.config({
    cloud_name: 'test-cloud',
    api_key: 'test-key',
    api_secret: 'test-secret'
  });
}; 