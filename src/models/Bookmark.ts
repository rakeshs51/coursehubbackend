import mongoose, { Document, Schema } from 'mongoose';

export interface IBookmark extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  chapter?: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>({
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
  chapter: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter'
  },
  note: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create a compound index to ensure a user can only bookmark a course/chapter once
BookmarkSchema.index({ user: 1, course: 1, chapter: 1 }, { unique: true });

export const Bookmark = mongoose.model<IBookmark>('Bookmark', BookmarkSchema); 