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
import path from 'path';
import http from 'http';

// Load environment variables
dotenv.config();

// Initialize express
const app: Application = express();

// Create HTTP server
const server = http.createServer(app);

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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!require('fs').existsSync(uploadsDir)){
    require('fs').mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
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

  // Handle other errors
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
};

app.use(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
    }
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { app, server, startServer };