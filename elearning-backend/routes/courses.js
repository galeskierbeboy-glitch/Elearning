import express from 'express';
import { 
  createCourse,
  getAllCourses,
  getCourseById,
  enrollInCourse,
  getEnrollments,
  deleteCourse,
  unenrollFromCourse
} from '../controllers/courseController.js';
import { auth, isInstructor, isInstructorOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllCourses);
router.get('/:id', getCourseById);

// Protected routes
router.post('/', auth, isInstructor, createCourse);
router.post('/:id/enroll', auth, enrollInCourse);
// Unenroll from a course
router.delete('/:id/enroll', auth, unenrollFromCourse);
// Delete a course (instructor-owner or admin)
router.delete('/:id', auth, isInstructorOrAdmin, deleteCourse);
router.get('/user/enrollments', auth, getEnrollments);

export default router;