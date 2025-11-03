import express from 'express';
import { auth, auditLogger, isInstructorOrAdmin } from '../../middleware/auth.js';
import { 
  listQuizzes, 
  getQuiz, 
  createQuiz, 
  updateQuiz, 
  deleteQuiz,
  getCompletedQuizzes,
  submitQuiz
} from '../../controllers/modules/quizzesController.js';

const router = express.Router();

// Student endpoints
router.get('/', auth, auditLogger, listQuizzes);
router.get('/completed', auth, auditLogger, getCompletedQuizzes);
router.get('/:id', auth, auditLogger, getQuiz);
router.post('/:id/submit', auth, auditLogger, submitQuiz);

// Instructor endpoints
router.post('/', auth, auditLogger, isInstructorOrAdmin, createQuiz);
router.put('/:id', auth, auditLogger, isInstructorOrAdmin, updateQuiz);
router.delete('/:id', auth, auditLogger, isInstructorOrAdmin, deleteQuiz);

export default router;
