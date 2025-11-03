import express from 'express';
import { auth, auditLogger, isInstructorOrAdmin } from '../../middleware/auth.js';
import { listGrades, postGrade, getGradesForStudent, getInstructorGrades, postBatchGrades, getManageGrades, postSubmitGrade } from '../../controllers/modules/gradesController.js';

const router = express.Router();

router.get('/', auth, auditLogger, isInstructorOrAdmin, listGrades);
router.get('/student/:id', auth, auditLogger, getGradesForStudent); // student view
router.post('/', auth, auditLogger, isInstructorOrAdmin, postGrade);

// Instructor view: students + quizzes + scores
router.get('/instructor/:course_id', auth, auditLogger, isInstructorOrAdmin, getInstructorGrades);

// Batch submit grades (bulk update/insert)
router.post('/batch', auth, auditLogger, isInstructorOrAdmin, postBatchGrades);

// Management endpoint used by GradeManage.jsx
router.get('/manage/:courseId', auth, auditLogger, isInstructorOrAdmin, getManageGrades);

// Single grade submit from management UI
router.post('/submit', auth, auditLogger, isInstructorOrAdmin, postSubmitGrade);

export default router;
