import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAchievement extends Document {
  user: mongoose.Types.ObjectId;
  type: 'course_completion' | 'certificate' | 'badge' | 'milestone';
  title: string;
  description: string;
  course?: mongoose.Types.ObjectId;
  image?: string;
  dateEarned: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const UserAchievementSchema = new Schema<IUserAchievement>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['course_completion', 'certificate', 'badge', 'milestone'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course'
  },
  image: {
    type: String,
    trim: true
  },
  dateEarned: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Create indexes for efficient querying
UserAchievementSchema.index({ user: 1, type: 1 });
UserAchievementSchema.index({ user: 1, course: 1 });

export const UserAchievement = mongoose.model<IUserAchievement>('UserAchievement', UserAchievementSchema); 