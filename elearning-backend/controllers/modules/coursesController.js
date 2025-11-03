import { pool } from '../../config/db.js';

export const listCourses = async (req, res) => {
  try {
    // Allow optional filtering by instructor_id (query param)
    const instructorId = req.query.instructor_id ?? req.query.instructorId ?? null;
    let sql = `
      SELECT 
        c.course_id as id,
        c.title,
        c.description,
        c.created_at,
        u.full_name as instructor_name,
        u.user_id as instructor_id,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.course_id) as lessons_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.user_id
    `;
    const params = [];
    if (instructorId) {
      sql += ' WHERE c.instructor_id = ?';
      params.push(instructorId);
    }
    sql += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.query(sql, params);
    // Return empty array if none found (don't send 404)
    res.json(rows || []);
  } catch (error) {
    console.error('listCourses error:', error);
    res.status(500).json({ message: 'Error listing courses' });
  }
};

export const getEnrolledCourses = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    console.log('🔍 Getting enrolled courses for user:', req.user);
    const userId = req.user.id;
    
    // Verify user exists
    const [userCheck] = await conn.query('SELECT user_id, full_name FROM users WHERE user_id = ?', [userId]);
    if (!userCheck || userCheck.length === 0) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('✅ User verified:', userCheck[0].full_name);

    // First check if course_enrollments table exists
    console.log('Checking if course_enrollments table exists...');
    const [tables] = await conn.query(`
      SELECT COUNT(*) as exists_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'course_enrollments'
    `);
    
    console.log('Table check result:', tables[0]);
    
    if (tables[0].exists_count === 0) {
      // Create course_enrollments table if it doesn't exist
      await conn.query(`
        CREATE TABLE course_enrollments (
          enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          course_id INT NOT NULL,
          enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_accessed TIMESTAMP NULL,
          progress INT DEFAULT 0,
          completed_lessons INT DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
          UNIQUE KEY unique_enrollment (user_id, course_id)
        )
      `);
    }

    // Get enrolled courses with details
    console.log('Fetching enrolled courses...');
    const [rows] = await conn.query(`
      SELECT 
        c.course_id as id,
        c.title,
        c.description,
        c.created_at,
        u.full_name as instructor_name,
        u.user_id as instructor_id,
        e.enrolled_date,
        e.last_accessed,
        e.progress,
        e.completed_lessons,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.course_id) as lessons_count,
        (SELECT COUNT(*) FROM course_enrollments WHERE user_id = ? AND course_id = c.course_id) as is_enrolled
      FROM courses c
      LEFT JOIN course_enrollments e ON e.course_id = c.course_id AND e.user_id = ?
      LEFT JOIN users u ON c.instructor_id = u.user_id
      WHERE e.user_id = ?
      ORDER BY 
        CASE 
          WHEN e.last_accessed IS NULL THEN 0 
          ELSE 1 
        END DESC,
        e.last_accessed DESC,
        e.enrolled_date DESC
    `, [userId, userId, userId]);

    console.log('Found enrolled courses:', rows);

    res.json(rows);
  } catch (error) {
    console.error('getEnrolledCourses error:', error);
    res.status(500).json({ 
      message: 'Error fetching enrolled courses',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    conn.release();
  }
};

// Unenroll from a course (DELETE /courses/:courseId/enroll)
export const unenrollFromCourse = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const courseId = parseInt(req.params.courseId);
    const userId = req.user.id;

    if (isNaN(courseId)) return res.status(400).json({ message: 'Invalid course id' });
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    // Ensure table exists
    const [tables] = await conn.query(`
      SELECT COUNT(*) as exists_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'course_enrollments'
    `);
    if (tables[0].exists_count === 0) {
      return res.status(404).json({ message: 'No enrollments exist' });
    }

    const [result] = await conn.query('DELETE FROM course_enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Enrollment not found' });

    await conn.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [userId, `Unenrolled from course_id=${courseId}`]);

    res.json({ message: 'Unenrolled from course' });
  } catch (error) {
    console.error('unenrollFromCourse error:', error);
    res.status(500).json({ message: 'Error unenrolling from course', details: error.message });
  } finally {
    conn.release();
  }
};

export const getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM courses WHERE course_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Course not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('getCourse error:', error);
    res.status(500).json({ message: 'Error fetching course' });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;
    const instructorId = req.user && req.user.id ? req.user.id : null;
    const [result] = await pool.query('INSERT INTO courses (title, description, instructor_id) VALUES (?, ?, ?)', [title, description, instructorId]);
    res.status(201).json({ course_id: result.insertId, title, description, instructor_id: instructorId });
  } catch (error) {
    console.error('createCourse error:', error);
    res.status(500).json({ message: 'Error creating course' });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    await pool.query('UPDATE courses SET title = ?, description = ? WHERE course_id = ?', [title, description, id]);
    res.json({ message: 'Course updated' });
  } catch (error) {
    console.error('updateCourse error:', error);
    res.status(500).json({ message: 'Error updating course' });
  }
};

export const deleteCourse = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const courseId = Number(id);
    if (Number.isNaN(courseId)) return res.status(400).json({ message: 'Invalid course id' });

    // Fetch course and verify ownership/permission
    const [rows] = await conn.query('SELECT course_id, instructor_id FROM courses WHERE course_id = ?', [courseId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Course not found' });
    const course = rows[0];

    const requesterId = req.user.user_id ?? req.user.id;
    const requesterRole = req.user.role;
    if (requesterRole !== 'admin' && requesterId !== course.instructor_id) {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    await conn.beginTransaction();

    // Delete dependent rows to avoid FK constraint errors
    // Order: child tables first
    try {
      await conn.query('DELETE FROM enrollments WHERE course_id = ?', [courseId]);
    } catch (e) {
      // ignore if table doesn't exist or other minor issue; we'll handle below
      console.warn('Could not clean enrollments table:', e.message || e);
    }

    try {
      await conn.query('DELETE FROM course_enrollments WHERE course_id = ?', [courseId]);
    } catch (e) {
      console.warn('Could not clean course_enrollments table:', e.message || e);
    }

    try {
      await conn.query('DELETE FROM grades WHERE course_id = ?', [courseId]);
    } catch (e) {
      console.warn('Could not clean grades table:', e.message || e);
    }

    try {
      await conn.query('DELETE FROM quiz_submissions WHERE course_id = ?', [courseId]);
    } catch (e) {
      // some schemas may not have quiz_submissions.course_id directly; ignore failures
      console.warn('Could not clean quiz_submissions table:', e.message || e);
    }

    try {
      await conn.query('DELETE FROM lessons WHERE course_id = ?', [courseId]);
    } catch (e) {
      console.warn('Could not clean lessons table:', e.message || e);
    }

    try {
      await conn.query('DELETE FROM quizzes WHERE course_id = ?', [courseId]);
    } catch (e) {
      console.warn('Could not clean quizzes table:', e.message || e);
    }

    // Finally delete the course row
    const [result] = await conn.query('DELETE FROM courses WHERE course_id = ?', [courseId]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(500).json({ message: 'Failed to delete course' });
    }

    // Audit
    await conn.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [requesterId, `Deleted course_id=${courseId}`]);

    await conn.commit();

    res.json({ message: 'Course deleted' });
  } catch (error) {
    try { await conn.rollback(); } catch (er) {}
    console.error('deleteCourse error:', error);
    res.status(500).json({ message: 'Error deleting course', details: error.message });
  } finally {
    conn.release();
  }
};

// Enroll in a course
export const enrollInCourse = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // First check if course_enrollments table exists
    const [tables] = await conn.query(`
      SELECT COUNT(*) as exists_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'course_enrollments'
    `);
    
    if (tables[0].exists_count === 0) {
      // Create course_enrollments table if it doesn't exist
      await conn.query(`
        CREATE TABLE course_enrollments (
          enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          course_id INT NOT NULL,
          enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_accessed TIMESTAMP NULL,
          progress INT DEFAULT 0,
          completed_lessons INT DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
          UNIQUE KEY unique_enrollment (user_id, course_id)
        )
      `);
    }

    // Check if already enrolled
    const [existing] = await conn.query(
      'SELECT enrollment_id FROM course_enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Enroll in course
    await conn.query(
      'INSERT INTO course_enrollments (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );

    res.status(201).json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('enrollInCourse error:', error);
    res.status(500).json({ 
      message: 'Error enrolling in course',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    conn.release();
  }
};
