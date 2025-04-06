import mongoose from 'mongoose';
import connectDB from '../config/database';

// Mock mongoose
jest.mock('mongoose', () => {
  const mockConnection = {
    on: jest.fn((event, handler) => {
      // Store the handlers for testing
      if (event === 'disconnected') {
        mockConnection.disconnectHandler = handler;
      } else if (event === 'error') {
        mockConnection.errorHandler = handler;
      }
    }),
    host: 'test-host',
    disconnectHandler: null as null | Function,
    errorHandler: null as null | Function
  };
  
  return {
    connect: jest.fn(),
    connection: mockConnection
  };
});

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MONGODB_URI = 'mongodb://test-uri';
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should connect to MongoDB successfully', async () => {
    // Mock successful connection
    (mongoose.connect as jest.Mock).mockResolvedValueOnce({
      connection: { host: 'test-host' }
    });

    // Spy on console.log
    const consoleSpy = jest.spyOn(console, 'log');

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://test-uri');
    expect(consoleSpy).toHaveBeenCalledWith('MongoDB Connected: test-host');
  });

  it('should handle connection error and exit process', async () => {
    // Mock connection error
    const error = new Error('Connection failed');
    (mongoose.connect as jest.Mock).mockRejectedValueOnce(error);

    // Spy on console.error and process.exit
    const consoleSpy = jest.spyOn(console, 'error');
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process.exit called with code ${code}`);
    });

    await expect(connectDB()).rejects.toThrow('Process.exit called with code 1');
    expect(consoleSpy).toHaveBeenCalledWith('MongoDB connection error:', error);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should set up disconnection event handler', () => {
    // Import the database module to trigger the event handler setup
    require('../config/database');
    
    // Spy on console.log
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Get the stored disconnection handler
    const disconnectHandler = (mongoose.connection as any).disconnectHandler;
    
    expect(disconnectHandler).toBeTruthy();
    expect(typeof disconnectHandler).toBe('function');
    
    // Call the handler
    disconnectHandler();
    expect(consoleSpy).toHaveBeenCalledWith('MongoDB disconnected. Attempting to reconnect...');
  });

  it('should set up error event handler', () => {
    // Import the database module to trigger the event handler setup
    require('../config/database');
    
    // Spy on console.error
    const consoleSpy = jest.spyOn(console, 'error');
    
    // Get the stored error handler
    const errorHandler = (mongoose.connection as any).errorHandler;
    
    expect(errorHandler).toBeTruthy();
    expect(typeof errorHandler).toBe('function');
    
    // Call the handler with a test error
    const error = new Error('Test error');
    errorHandler(error);
    expect(consoleSpy).toHaveBeenCalledWith('MongoDB connection error:', error);
  });
}); 