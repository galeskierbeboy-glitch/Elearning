import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import userRoutes from './routes/users.js';
import courseRoutes from './routes/courses.js';
import moduleCourses from './routes/modules/courses.js';
import moduleLessons from './routes/modules/lessons.js';
import moduleQuizzes from './routes/modules/quizzes.js';
import moduleGrades from './routes/modules/grades.js';
import moduleNotifications from './routes/modules/notifications.js';
import securityRoutes from './routes/security.js';
import debugRoutes from './routes/debug.js';
import { getPool } from './config/db.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve uploaded files from /uploads
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check route
app.get('/', (req, res) => {
  res.send('✅ E-Learning Backend is running successfully!');
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/lessons', moduleLessons);
app.use('/api/quizzes', moduleQuizzes);
app.use('/api/grades', moduleGrades);
app.use('/api/notifications', moduleNotifications);
app.use('/api/security', securityRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/courses', moduleCourses); // Keep only the modular courses routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    sqlMessage: err.sqlMessage
  });
  
  // Database-specific errors
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({ message: 'Database table not found. Please ensure the database is properly set up.' });
  }
  
  if (err.code === 'ECONNREFUSED') {
    return res.status(500).json({ message: 'Database connection failed. Please check if MySQL is running.' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Invalid reference. Please check if all required IDs exist.' });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ message: 'Duplicate entry. This record already exists.' });
  }
  
  // Send detailed error in development, generic in production
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? {
      code: err.code,
      sqlMessage: err.sqlMessage,
      stack: err.stack
    } : undefined
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Server start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize database connection and tables
    await getPool();
    
    app.listen(PORT, () => {
      console.log(`
🚀 Server is running on port ${PORT}
📝 API Documentation:
   - POST   /api/users/register  - Register a new user
   - POST   /api/users/login     - Login
   - GET    /api/courses         - Get all courses
   - GET    /api/courses/:id     - Get course by ID
   - POST   /api/courses         - Create a new course
   - POST   /api/courses/:id/enroll - Enroll in a course
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

