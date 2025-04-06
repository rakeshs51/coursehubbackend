import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test Cloudinary connection with detailed error logging
cloudinary.api.ping()
  .then(() => {
    console.log('Cloudinary connection successful');
  })
  .catch((error) => {
    console.error('Cloudinary connection failed:', error);
  });

// Configure multer disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Configure multer upload
export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Log the mimetype for debugging
    console.log('Received file with mimetype:', file.mimetype);
    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Define accepted mimetypes
    const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const acceptedVideoTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/webm',
      'application/mp4',
      'application/octet-stream' // More permissive for binary files
    ];

    // Check if the file extension is .mp4 regardless of mimetype
    const isMP4 = file.originalname.toLowerCase().endsWith('.mp4');
    
    if (acceptedImageTypes.includes(file.mimetype) || 
        acceptedVideoTypes.includes(file.mimetype) || 
        isMP4) {
      console.log('File type accepted:', file.mimetype, isMP4 ? '(MP4 extension)' : '');
      cb(null, true);
    } else {
      console.log('File type rejected:', file.mimetype);
      cb(new Error(`Invalid file type. Accepted types are: ${[...acceptedImageTypes, ...acceptedVideoTypes].join(', ')}`));
    }
  }
});

// Mock response for test environment
const mockCloudinaryResponse = {
  secure_url: 'https://test-cloudinary-url.com/image.jpg',
  public_id: 'test-image',
  format: 'jpg',
  width: 800,
  height: 600,
  bytes: 1024,
  created_at: new Date().toISOString(),
  duration: 60 // Duration in seconds for video files
};

// Upload file to Cloudinary
export const uploadToCloudinary = async (file: Express.Multer.File) => {
  try {
    // In test environment, return mock response
    if (process.env.NODE_ENV === 'test') {
      return mockCloudinaryResponse;
    }

    console.log('Starting file upload to Cloudinary...');
    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });

    // Check if file exists and get stats
    const stat = await promisify(fs.stat)(file.path);
    console.log('File stats:', {
      size: stat.size,
      isFile: stat.isFile(),
      created: stat.birthtime,
      modified: stat.mtime
    });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'auto',
      folder: 'coursehub'
    });

    // Clean up local file
    await promisify(fs.unlink)(file.path);

    return result;
  } catch (error) {
    console.error('Cloudinary upload error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    throw error;
  }
}; 