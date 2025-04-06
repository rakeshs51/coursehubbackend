import { Request, Response } from 'express';
import User, { UserRole } from '../models/User';

// @desc    Register user
// @route   POST /api/v1/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`Registration failed: Email ${email} already exists`);
      res.status(400).json({ 
        success: false, 
        message: 'User already exists'
      });
      return;
    }

    // Validate required fields
    if (!email || !password || !role) {
      const errors = [];
      if (!email) errors.push({ field: 'email', message: 'Please add an email' });
      if (!password) errors.push({ field: 'password', message: 'Please add a password' });
      if (!role) errors.push({ field: 'role', message: 'Please specify user role' });
      
      res.status(400).json({
        success: false,
        errors
      });
      return;
    }

    // Validate password
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        errors: [{ field: 'password', message: 'Password must be at least 6 characters' }]
      });
      return;
    }

    // Create user
    console.log(`Creating new user with email: ${email}, role: ${role}`);
    const user = await User.create({ name, email, password, role });
    const token = user.getSignedJwtToken();
    
    console.log(`User created successfully: ${user._id}`);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Registration failed'
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate email and password are provided
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
      return;
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      console.log(`Login failed: No user found with email ${email}`);
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
      return;
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`Login failed: Invalid password for email ${email}`);
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
      return;
    }

    // Generate token
    const token = user.getSignedJwtToken();
    console.log(`User logged in successfully: ${user._id}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Login failed'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get current user'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/v1/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to logout'
    });
  }
};