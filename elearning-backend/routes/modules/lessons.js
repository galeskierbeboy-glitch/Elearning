import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { auth, auditLogger, isInstructorOrAdmin } from '../../middleware/auth.js';
import { listLessons, getLesson, createLesson, updateLesson, deleteLesson } from '../../controllers/modules/lessonsController.js';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'lessons');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup - store files under uploads/lessons
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const safeName = file.originalname.replace(/[^a-zA-Z0-9.-_]/g, '_');
		cb(null, `${unique}-${safeName}`);
	}
});

const upload = multer({
	storage,
	limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
	fileFilter: (req, file, cb) => {
		// allow pdfs and common video types if you want; for now allow pdf and common video mimetypes
		const allowed = ['application/pdf', 'video/mp4', 'video/webm', 'video/ogg'];
		if (allowed.includes(file.mimetype)) return cb(null, true);
		return cb(new Error('Invalid file type. Only PDF and common video formats are allowed.'));
	}
});

router.get('/', auth, auditLogger, listLessons);
router.get('/:id', auth, auditLogger, getLesson);
// Instructor uploads and management (accepts optional 'file' field)
router.post('/', auth, auditLogger, isInstructorOrAdmin, upload.single('file'), createLesson);
router.put('/:id', auth, auditLogger, isInstructorOrAdmin, updateLesson);
router.delete('/:id', auth, auditLogger, isInstructorOrAdmin, deleteLesson);

export default router;
