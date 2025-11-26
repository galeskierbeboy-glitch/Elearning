import express from 'express';
import { 
  createCourse,
  getAllCourses,
  getCourseById,
  enrollInCourse,
  getEnrollments,
  deleteCourse,
  unenrollFromCourse
  , getInstructorSummary
} from '../controllers/courseController.js';
import { auth, isInstructor, isInstructorOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllCourses);
// Instructor summary (total courses, total students) - protected
router.get('/instructor/:id/summary', auth, async (req, res) => {
  try {
    const { getInstructorSummary } = await import('../controllers/courseController.js');
    return getInstructorSummary(req, res);
  } catch (err) {
    console.error('Instructor summary route error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/:id', getCourseById);

// Protected routes
router.post('/', auth, isInstructor, createCourse);
router.post('/:id/enroll', auth, enrollInCourse);
// Unenroll from a course
router.delete('/:id/enroll', auth, unenrollFromCourse);
// Delete a course (instructor-owner or admin)
router.delete('/:id', auth, isInstructorOrAdmin, deleteCourse);
router.get('/user/enrollments', auth, getEnrollments);

// Instructor summary (total courses, total students) - protected
router.get('/instructor/:id/summary', auth, async (req, res) => {
  try {
    const { getInstructorSummary } = await import('../controllers/courseController.js');
    return getInstructorSummary(req, res);
  } catch (err) {
    console.error('Instructor summary route error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;