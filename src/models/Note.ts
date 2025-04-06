import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  chapter?: mongoose.Types.ObjectId | null;
  content: string;
  timestamp?: number; // For video notes, to track timestamp
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>({
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
    ref: 'Chapter',
    required: false,
    default: null
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true
  },
  timestamp: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Create indexes for efficient querying
NoteSchema.index({ user: 1, course: 1 });
NoteSchema.index({ user: 1, chapter: 1 });

export const Note = mongoose.model<INote>('Note', NoteSchema); 