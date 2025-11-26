import express from 'express';
import { auth, auditLogger, isInstructorOrAdmin } from '../../middleware/auth.js';
import { 
  listCourses, 
  getCourse, 
  createCourse, 
  updateCourse, 
  deleteCourse, 
  getEnrolledCourses,
  enrollInCourse,
  unenrollFromCourse 
} from '../../controllers/modules/coursesController.js';
import { getInstructorSummary } from '../../controllers/courseController.js';

const router = express.Router();

// Course listing and details
router.get('/', auth, auditLogger, listCourses);
router.get('/enrolled', auth, auditLogger, getEnrolledCourses);

// Instructor summary (total courses, total students) - protected
router.get('/instructor/:id/summary', auth, auditLogger, getInstructorSummary);

router.get('/:id', auth, auditLogger, getCourse);

// Course enrollment
router.post('/:courseId/enroll', auth, auditLogger, enrollInCourse);
// Unenroll from a course
router.delete('/:courseId/enroll', auth, auditLogger, unenrollFromCourse);

// Instructor actions
router.post('/', auth, auditLogger, isInstructorOrAdmin, createCourse);
router.put('/:id', auth, auditLogger, isInstructorOrAdmin, updateCourse);
router.delete('/:id', auth, auditLogger, isInstructorOrAdmin, deleteCourse);

export default router;
