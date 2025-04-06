# CourseHub Backend Documentation

## Features Implemented

### 1. Authentication & User Management

#### Models
- User Model (`/models/User.ts`)
  - Fields: name, email, password, role (creator/member), avatar, bio
  - Methods: matchPassword, getSignedJwtToken

#### Controllers (`/controllers/authController.ts`)
- `register`: POST /api/auth/register
- `login`: POST /api/auth/login
- `logout`: GET /api/auth/logout
- `getMe`: GET /api/auth/me
- `updateDetails`: PUT /api/auth/updatedetails
- `updatePassword`: PUT /api/auth/updatepassword

#### Middleware
- `auth.ts`: Authentication middleware
  - `protect`: Protects routes from unauthorized access
  - `authorize`: Restricts access based on user roles

### Testing Instructions for Authentication

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "123456",
    "role": "creator"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'

# Get current user
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update user details
curl -X PUT http://localhost:5000/api/auth/updatedetails \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com"
  }'

# Update password
curl -X PUT http://localhost:5000/api/auth/updatepassword \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "123456",
    "newPassword": "654321"
  }'

# Logout
curl http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Course Management

#### Models
- Course Model (`/models/Course.ts`)
  - Fields: title, description, creator, price, thumbnail, status, chapters, enrolledStudents, category, tags
  - Methods: isEnrolled, addStudent, removeStudent

#### Controllers (`/controllers/courseController.ts`)
- `createCourse`: POST /api/v1/courses
- `getCourses`: GET /api/v1/courses
- `getCourse`: GET /api/v1/courses/:id
- `updateCourse`: PUT /api/v1/courses/:id
- `deleteCourse`: DELETE /api/v1/courses/:id
- `getCreatorCourses`: GET /api/v1/courses/creator/courses
- `updateCourseStatus`: PUT /api/v1/courses/:id/status
- `getCoursePreview`: GET /api/v1/courses/:id/preview

#### Middleware
- `upload.ts`: Handles thumbnail image uploads using Cloudinary
- `auth.ts`: Handles authentication and authorization

### Testing Instructions for Course Management

```bash
# Create a new course
curl -X POST http://localhost:5000/api/v1/courses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Course",
    "description": "A test course description",
    "price": 99.99,
    "category": "programming",
    "tags": ["javascript", "web"],
    "status": "draft"
  }'

# Get all courses
curl http://localhost:5000/api/v1/courses

# Get a specific course
curl http://localhost:5000/api/v1/courses/:courseId

# Get creator's courses
curl http://localhost:5000/api/v1/courses/creator/courses \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update a course
curl -X PUT http://localhost:5000/api/v1/courses/:courseId \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Course Title",
    "description": "Updated description"
  }'

# Delete a course
curl -X DELETE http://localhost:5000/api/v1/courses/:courseId \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update course status
curl -X PATCH http://localhost:5000/api/v1/courses/:courseId/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published"
  }'
```

### Testing Instructions

#### Prerequisites
- MongoDB running locally or MongoDB Atlas connection string
- Cloudinary account credentials
- Node.js and npm installed

#### Environment Setup
1. Create a `.env` file with required variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Running Tests

1. Course Creation
```bash
# Create a new course
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Course" \
  -F "description=Test Description" \
  -F "price=99.99" \
  -F "thumbnail=@path/to/image.jpg" \
  -F "category=programming" \
  -F "tags=javascript,web"

# Get all courses
curl http://localhost:5000/api/courses

# Get single course
curl http://localhost:5000/api/courses/COURSE_ID

# Update course
curl -X PUT http://localhost:5000/api/courses/COURSE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Updated Course"

# Delete course
curl -X DELETE http://localhost:5000/api/courses/COURSE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get creator's courses
curl http://localhost:5000/api/courses/creator/courses \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update course status
curl -X PATCH http://localhost:5000/api/courses/COURSE_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "published"}'
```

#### Course Preview
- `getCoursePreview`: GET /api/courses/:id/preview
  - Public endpoint (no authentication required)
  - Returns:
    - Basic course information (title, description, thumbnail)
    - Creator information (name, bio)
    - Price
    - Category and tags
    - Total number of chapters
    - Preview of first chapter
    - Only works for published courses

### Testing Instructions

[Previous testing instructions remain the same...]

#### Testing Course Preview
```bash
# Get course preview for a published course
curl http://localhost:5000/api/courses/COURSE_ID/preview

# Expected successful response:
{
  "success": true,
  "data": {
    "title": "Sample Course",
    "description": "Course description",
    "thumbnail": "cloudinary_url",
    "price": 99.99,
    "category": "programming",
    "tags": ["javascript", "web"],
    "creator": {
      "name": "Creator Name",
      "bio": "Creator Bio"
    },
    "totalChapters": 10,
    "previewChapter": {
      "title": "Chapter 1",
      "description": "Chapter description"
    }
  }
}

# Testing unpublished course preview (should return 403):
curl http://localhost:5000/api/courses/UNPUBLISHED_COURSE_ID/preview

# Testing non-existent course (should return 404):
curl http://localhost:5000/api/courses/NON_EXISTENT_ID/preview
```

### 3. Chapter Management

#### Models
- Chapter Model (`/models/Chapter.ts`)
  - Fields: title, description, course, videoUrl, duration, order, isPreview
  - Relationships: Belongs to Course

#### Controllers (`/controllers/chapterController.ts`)
- `createChapter`: POST /api/v1/courses/:courseId/chapters
- `getChapters`: GET /api/v1/courses/:courseId/chapters
- `getChapter`: GET /api/v1/courses/:courseId/chapters/:chapterId
- `updateChapter`: PUT /api/v1/courses/:courseId/chapters/:chapterId
- `deleteChapter`: DELETE /api/v1/courses/:courseId/chapters/:chapterId
- `uploadVideo`: POST /api/v1/courses/:courseId/chapters/:chapterId/video

#### Features
- Video upload to Cloudinary
- Automatic video duration extraction
- Chapter ordering
- Preview chapter functionality
- Secure video storage and delivery

### Testing Instructions for Chapter Management

```bash
# Create a new chapter
curl -X POST http://localhost:5000/api/v1/courses/:courseId/chapters \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Chapter Title" \
  -F "description=Chapter Description" \
  -F "order=1" \
  -F "isPreview=true" \
  -F "video=@path/to/video.mp4"

# Get all chapters for a course
curl http://localhost:5000/api/v1/courses/:courseId/chapters \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get a specific chapter
curl http://localhost:5000/api/v1/courses/:courseId/chapters/:chapterId \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update a chapter
curl -X PUT http://localhost:5000/api/v1/courses/:courseId/chapters/:chapterId \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "description": "Updated Description",
    "order": 2,
    "isPreview": false
  }'

# Delete a chapter
curl -X DELETE http://localhost:5000/api/v1/courses/:courseId/chapters/:chapterId \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## External Services

### Cloudinary Setup
- Used for storing course thumbnails and chapter videos
- Environment variables required:
  - CLOUDINARY_CLOUD_NAME
  - CLOUDINARY_API_KEY
  - CLOUDINARY_API_SECRET
- Features:
  - Automatic video duration extraction
  - Secure URL generation
  - Video optimization and streaming

## Development Process
1. Feature branches for each major functionality
2. TypeScript for type safety
3. MongoDB with Mongoose for data modeling
4. JWT for authentication
5. Express middleware for route protection
6. Error handling middleware
7. File upload handling with Multer
8. Cloud storage with Cloudinary

## Next Steps
1. Implement Community Management features
2. Add Analytics Dashboard
3. Enhance error handling and validation
4. Add more test coverage
5. Implement caching for better performance

### 4. User Profile Management

#### Models
- UserProfile Model (`/models/UserProfile.ts`)
  - Fields: bio, location, website, socialLinks, interests, skills, education, experience, achievements, preferences
  - Linked to User model via user field

- UserAchievement Model (`/models/UserAchievement.ts`)
  - Fields: type, title, description, course, image, dateEarned, metadata
  - Types: course_completion, certificate, badge, milestone

#### Controllers (`/controllers/profileController.ts`)
- `getProfile`: GET /api/v1/profile
  - Returns complete user profile with stats
  - Includes: user info, profile details, achievements, enrollment stats
- `updateProfile`: PATCH /api/v1/profile
  - Updates user profile information
  - Handles both basic user info and extended profile data
- `updatePreferences`: PATCH /api/v1/profile/preferences
  - Updates user preferences for notifications and recommendations
- `getAchievements`: GET /api/v1/profile/achievements
  - Returns user's achievements
  - Filterable by type
- `getEnrollmentHistory`: GET /api/v1/profile/enrollments
  - Returns user's course enrollment history
  - Includes pagination and status filtering

### Testing Instructions for User Profile

```bash
# Get complete user profile
curl http://localhost:5000/api/v1/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update profile information
curl -X PATCH http://localhost:5000/api/v1/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Software developer with 5 years of experience",
    "location": "San Francisco, CA",
    "website": "https://example.com",
    "socialLinks": {
      "twitter": "https://twitter.com/username",
      "linkedin": "https://linkedin.com/in/username",
      "github": "https://github.com/username"
    },
    "interests": ["web development", "machine learning"],
    "skills": ["JavaScript", "Python", "React"]
  }'

# Update user preferences
curl -X PATCH http://localhost:5000/api/v1/profile/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "emailNotifications": true,
      "courseRecommendations": true,
      "communityUpdates": false
    }
  }'

# Get user achievements
curl http://localhost:5000/api/v1/profile/achievements \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get achievements by type
curl http://localhost:5000/api/v1/profile/achievements?type=course_completion \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get enrollment history
curl http://localhost:5000/api/v1/profile/enrollments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get enrollment history with filters
curl http://localhost:5000/api/v1/profile/enrollments?status=completed&page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Expected Responses

1. Get Profile Response:
```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member",
    "avatar": "avatar_url"
  },
  "profile": {
    "bio": "Software developer",
    "location": "San Francisco",
    "skills": ["JavaScript", "Python"],
    "education": [...],
    "experience": [...]
  },
  "achievements": [...],
  "stats": {
    "totalEnrollments": 5,
    "completedCourses": 2,
    "inProgressCourses": 3
  }
}
```

2. Get Achievements Response:
```json
{
  "achievements": [
    {
      "type": "course_completion",
      "title": "JavaScript Mastery",
      "description": "Completed Advanced JavaScript Course",
      "course": {
        "title": "Advanced JavaScript",
        "thumbnail": "course_thumbnail_url"
      },
      "dateEarned": "2024-03-15T00:00:00.000Z"
    }
  ]
}
```

3. Get Enrollment History Response:
```json
{
  "enrollments": [
    {
      "course": {
        "title": "Advanced JavaScript",
        "thumbnail": "course_thumbnail_url"
      },
      "progress": 100,
      "status": "completed",
      "lastAccessed": "2024-03-15T00:00:00.000Z"
    }
  ],
  "total": 5,
  "pages": 1,
  "currentPage": 1
}
```
