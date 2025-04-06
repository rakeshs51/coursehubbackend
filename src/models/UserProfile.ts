import mongoose, { Document, Schema } from 'mongoose';

export interface IUserProfile extends Document {
  user: mongoose.Types.ObjectId;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    youtube?: string;
  };
  interests?: string[];
  skills?: string[];
  education?: {
    institution: string;
    degree: string;
    field: string;
    startYear: number;
    endYear?: number;
    current?: boolean;
  }[];
  experience?: {
    company: string;
    position: string;
    startDate: Date;
    endDate?: Date;
    current?: boolean;
    description?: string;
  }[];
  achievements?: {
    title: string;
    description: string;
    date: Date;
  }[];
  preferences?: {
    emailNotifications: boolean;
    courseRecommendations: boolean;
    communityUpdates: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  location: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  socialLinks: {
    twitter: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    youtube: { type: String, trim: true }
  },
  interests: [{
    type: String,
    trim: true
  }],
  skills: [{
    type: String,
    trim: true
  }],
  education: [{
    institution: {
      type: String,
      required: true,
      trim: true
    },
    degree: {
      type: String,
      required: true,
      trim: true
    },
    field: {
      type: String,
      required: true,
      trim: true
    },
    startYear: {
      type: Number,
      required: true
    },
    endYear: {
      type: Number
    },
    current: {
      type: Boolean,
      default: false
    }
  }],
  experience: [{
    company: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      required: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    current: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true
    }
  }],
  achievements: [{
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
    date: {
      type: Date,
      required: true
    }
  }],
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    courseRecommendations: {
      type: Boolean,
      default: true
    },
    communityUpdates: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema); 