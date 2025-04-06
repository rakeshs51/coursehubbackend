import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  creator: Types.ObjectId;
  price: number;
  thumbnail: string;
  status: 'draft' | 'published';
  chapters: Types.ObjectId[];
  enrolledStudents: Types.ObjectId[];
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative']
  },
  thumbnail: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  chapters: [{
    type: Schema.Types.ObjectId,
    ref: 'Chapter'
  }],
  enrolledStudents: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: {
    type: String,
    required: [true, 'Please add a category'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Create indexes for efficient querying
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ creator: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });

// Method to check if a user is enrolled in the course
courseSchema.methods.isEnrolled = function(userId: Types.ObjectId): boolean {
  return this.enrolledStudents.includes(userId);
};

// Method to add a student to enrolled students
courseSchema.methods.addStudent = function(userId: Types.ObjectId): void {
  if (!this.enrolledStudents.includes(userId)) {
    this.enrolledStudents.push(userId);
  }
};

// Method to remove a student from enrolled students
courseSchema.methods.removeStudent = function(userId: Types.ObjectId): void {
  this.enrolledStudents = this.enrolledStudents.filter(
    (id: Types.ObjectId) => !id.equals(userId)
  );
};

export default mongoose.model<ICourse>('Course', courseSchema); 