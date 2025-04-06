import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  enrolledAt: Date;
  lastAccessed: Date;
  progress: number;
  completedChapters: mongoose.Types.ObjectId[];
  status: 'active' | 'completed' | 'dropped';
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completedChapters: [{
    type: Schema.Types.ObjectId,
    ref: 'Chapter'
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Create a compound index to ensure a user can only enroll in a course once
EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema); 