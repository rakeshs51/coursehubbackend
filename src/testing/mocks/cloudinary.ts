// Mock response for Cloudinary uploads
export const mockCloudinaryResponse = {
  secure_url: 'https://test-cloudinary-url.com/image.jpg',
  public_id: 'test-image',
  format: 'jpg',
  width: 800,
  height: 600,
  bytes: 1024,
  created_at: new Date().toISOString()
};

// Mock Cloudinary module
export const cloudinaryMock = {
  config: jest.fn(),
  uploader: {
    upload: jest.fn().mockResolvedValue(mockCloudinaryResponse),
    destroy: jest.fn().mockResolvedValue({ result: 'ok' })
  },
  api: {
    ping: jest.fn().mockResolvedValue({ status: 'ok' })
  }
};

// Mock the uploadToCloudinary function
export const uploadToCloudinary = jest.fn().mockResolvedValue(mockCloudinaryResponse); 