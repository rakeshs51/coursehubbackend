import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChapter extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  course: Types.ObjectId;
  videoUrl?: string;
  duration?: number;
  order: number;
  isPreview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chapterSchema = new Schema<IChapter>({
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
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  videoUrl: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 0
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isPreview: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create index for efficient querying
chapterSchema.index({ course: 1, order: 1 });

export default mongoose.model<IChapter>('Chapter', chapterSchema); 