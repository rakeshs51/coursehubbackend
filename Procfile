# Install Heroku CLI if you haven't already
brew install heroku/brew/heroku  # For macOS

# Login to Heroku
heroku login

# Create a new Heroku app
heroku create coursehub-backend

# Add MongoDB addon
heroku addons:create mongolab

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=0246db78404cd44688d1bd13da6ca714d617ad6bf1f8b3c1fd61efea976d08d0
heroku config:set JWT_EXPIRE=30d
heroku config:set CLOUDINARY_CLOUD_NAME=dsgimd2xd
heroku config:set CLOUDINARY_API_KEY=695254519434266
heroku config:set CLOUDINARY_API_SECRET=9woQiS-SPPdhXMk9abBL3kLzL7o
heroku config:set ALLOWED_ORIGINS=https://coursehub-frontend-adut5j9kv-rakesh-ss-projects.vercel.app

# Initialize git if not already done
git init

# Add Heroku remote
heroku git:remote -a coursehub-backend

# Add all files
git add .

# Commit changes
git commit -m "Initial backend deployment"

# Push to Heroku
git push heroku main