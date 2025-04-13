import express, { Application, ErrorRequestHandler } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courseRoutes';
import chapterRoutes from './routes/chapterRoutes';
import enrollmentRoutes from './routes/enrollmentRoutes';
import bookmarkRoutes from './routes/bookmarkRoutes';
import noteRoutes from './routes/noteRoutes';
import profileRoutes from './routes/profileRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

// Load environment variables
dotenv.config();

// Initialize express
const app: Application = express();

// Middleware
console.log('CORS Configuration: Setting up CORS');

// Parse allowed origins from environment variable
const parseAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : [];
  
  // Add frontend URL from environment variable
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // Add default origins for development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000');
  }
  
  // Filter out empty strings and duplicates
  return [...new Set(origins.filter(Boolean))];
};

const allowedOrigins = parseAllowedOrigins();
console.log('Allowed origins:', allowedOrigins);

// Configure CORS with more specific options
const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('Origin not allowed by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Apply CORS with the configured options
app.use(cors(corsOptions));

app.use(express.json());

// Test endpoint for CORS debugging
app.get('/api/v1/test-cors', (req, res) => {
  console.log('Test CORS endpoint hit');
  console.log('Headers:', req.headers);
  res.json({ 
    message: 'CORS test successful',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/bookmarks', bookmarkRoutes);
app.use('/api/v1/notes', noteRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    name: err.name
  });

  // Handle multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
    return;
  }

  // Handle file filter errors
  if (err.message && err.message.startsWith('Invalid file type')) {
    res.status(400).json({
      success: false,
      message: err.message
    });
    return;
  }

  // Handle MongoDB connection errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
    return;
  }

  // Handle other errors
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
};

app.use(errorHandler);

// Initialize database connection
const initializeApp = async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
    }
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Don't throw in production, just log the error
    if (process.env.NODE_ENV !== 'production') {
      throw error;
    }
  }
};

// Initialize the app
initializeApp();

// Export the Express app for Vercel
export default app;