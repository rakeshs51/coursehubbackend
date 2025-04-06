import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

export enum UserRole {
  CREATOR = 'creator',
  MEMBER = 'member'
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  verified: boolean;
  createdAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
  getSignedJwtToken(): string;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: [true, 'Please specify user role']
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function(): string {
  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRE as jwt.SignOptions['expiresIn'] || '30d'
  };
  
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'fallback_secret',
    options
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);