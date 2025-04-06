import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export const connectDB = async () => {
  try {
    // Close any existing connection
    await mongoose.disconnect();
    
    // Create new server instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Connect with new URI
    await mongoose.connect(uri);
  } catch (error) {
    console.error('Error connecting to test database:', error);
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
    throw error;
  }
};

export const closeDB = async () => {
  try {
    // Wait for any pending operations to complete
    await mongoose.connection.close(true);
    
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
  } catch (error) {
    console.error('Error closing test database:', error);
    throw error;
  }
};

export const clearDB = async () => {
  if (!mongoose.connection.readyState) {
    return;
  }
  
  try {
    const collections = mongoose.connection.collections;
    await Promise.all(
      Object.values(collections).map(collection => collection.deleteMany({}))
    );
  } catch (error) {
    console.error('Error clearing test database:', error);
    throw error;
  }
}; 