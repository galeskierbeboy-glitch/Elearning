import { pool } from '../config/db.js';

export const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    // Make sure we have instructor_id from token (handle both id and user_id)
    const instructor_id = req.user.id || req.user.user_id;
    if (!instructor_id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // MySQL query with ? placeholders
    const query = `
      INSERT INTO courses (instructor_id, title, description)
      VALUES (?, ?, ?)
    `;

    const values = [instructor_id, title, description || null];
    const [result] = await pool.query(query, values);
    
    if (result.insertId) {
      // Fetch the newly created course
      const [newCourse] = await pool.query(`
        SELECT 
          c.course_id,
          c.instructor_id,
          c.title,
          c.description,
          c.created_at,
          u.full_name as instructor_name
        FROM courses c
        JOIN users u ON c.instructor_id = u.user_id
        WHERE c.course_id = ?
      `, [result.insertId]);

      res.status(201).json(newCourse[0]);
    } else {
      throw new Error('Failed to create course');
    }
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ 
      message: 'Failed to create course',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

export const getAllCourses = async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT 
        c.course_id,
        c.instructor_id,
        c.title,
        c.description,
        c.created_at,
        u.full_name as instructor_name 
      FROM courses c 
      JOIN users u ON c.instructor_id = u.user_id
    `);
    
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT 
        c.course_id,
        c.instructor_id,
        c.title,
        c.description,
        c.created_at,
        u.full_name as instructor_name 
      FROM courses c 
      JOIN users u ON c.instructor_id = u.user_id 
      WHERE c.course_id = ?
    `, [req.params.id]);

    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(courses[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const enrollInCourse = async (req, res) => {
  try {
    // Support tokens that contain either user_id or id
    const userId = req.user.user_id ?? req.user.id;
    const courseId = req.params.id;

    if (!userId) {
      console.error('enrollInCourse: missing user id on req.user', req.user);
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!courseId) {
      console.error('enrollInCourse: missing course id in params', req.params);
      return res.status(400).json({ message: 'Course id required' });
    }
    // Check if already enrolled
    const [existing] = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    await pool.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );

    res.status(201).json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEnrollments = async (req, res) => {
  try {
    const studentId = req.user.user_id ?? req.user.id;
    if (!studentId) {
      console.error('getEnrollments: missing user id on req.user', req.user);
      return res.status(401).json({ message: 'Authentication required' });
    }

    const [enrollments] = await pool.query(`
      SELECT 
        e.enrollment_id,
        e.enrolled_at,
        c.course_id,
        c.title,
        c.description,
        u.full_name as instructor_name,
        COALESCE(g.total_score, 0) as grade
      FROM enrollments e
      JOIN courses c ON e.course_id = c.course_id
      JOIN users u ON c.instructor_id = u.user_id
      LEFT JOIN grades g ON g.student_id = e.student_id AND g.course_id = e.course_id
      WHERE e.student_id = ?
    `, [studentId]);

    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Instructor or admin: delete a course
export const deleteCourse = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) return res.status(400).json({ message: 'Invalid course id' });

    // Fetch course
    const [rows] = await pool.query('SELECT course_id, instructor_id FROM courses WHERE course_id = ?', [courseId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Course not found' });
    const course = rows[0];

    // Allow only admin or the instructor owning the course
    const requesterId = req.user.user_id ?? req.user.id;
    const requesterRole = req.user.role;
    if (requesterRole !== 'admin' && requesterId !== course.instructor_id) {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    // Delete course. Related rows with ON DELETE CASCADE will be cleaned.
    const [result] = await pool.query('DELETE FROM courses WHERE course_id = ?', [courseId]);
    if (result.affectedRows === 0) return res.status(500).json({ message: 'Failed to delete course' });

    // Audit
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [requesterId, `Deleted course_id=${courseId}`]);

    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error('deleteCourse error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Authenticated student: unenroll from a course
export const unenrollFromCourse = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) return res.status(400).json({ message: 'Invalid course id' });

    const studentId = req.user.user_id ?? req.user.id;
    if (!studentId) return res.status(401).json({ message: 'Authentication required' });

    const [result] = await pool.query('DELETE FROM enrollments WHERE student_id = ? AND course_id = ?', [studentId, courseId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Enrollment not found' });

    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [studentId, `Unenrolled from course_id=${courseId}`]);

    res.json({ message: 'Unenrolled from course' });
  } catch (err) {
    console.error('unenrollFromCourse error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};