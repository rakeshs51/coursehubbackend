import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't exit the process in serverless environment
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error; // Re-throw the error to be handled by the error middleware
  }
};

// Add reconnection logic
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(connectDB, 5000);
  }
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

export default connectDB; 