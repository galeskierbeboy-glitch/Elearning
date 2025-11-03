import { pool } from '../../config/db.js';

export const listGrades = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM grades');
    res.json(rows);
  } catch (error) {
    console.error('listGrades error:', error);
    res.status(500).json({ message: 'Error listing grades' });
  }
};

export const getGradesForStudent = async (req, res) => {
  try {
    const { id } = req.params;
    // Join courses to get the course title
    const [rows] = await pool.query(`
      SELECT g.*, c.title AS course_name
      FROM grades g
      JOIN courses c ON g.course_id = c.course_id
      WHERE g.student_id = ?
    `, [id]);
    res.json(rows);
  } catch (error) {
    console.error('getGradesForStudent error:', error);
    res.status(500).json({ message: 'Error fetching grades' });
  }
};

export const postGrade = async (req, res) => {
  try {
    const { student_id, course_id, quiz_id, grade } = req.body;
    const [result] = await pool.query('INSERT INTO grades (student_id, course_id, quiz_id, grade) VALUES (?, ?, ?, ?)', [student_id, course_id, quiz_id, grade]);
    res.status(201).json({ grade_id: result.insertId });
  } catch (error) {
    console.error('postGrade error:', error);
    res.status(500).json({ message: 'Error posting grade' });
  }
};

// Returns data for instructor grading panel
export const getInstructorGrades = async (req, res) => {
  try {
    const { course_id } = req.params;

    // 1) students enrolled in course
    const [studentsRows] = await pool.query(
      `SELECT u.user_id AS student_id, u.full_name
       FROM enrollments e
       JOIN users u ON e.student_id = u.user_id
       WHERE e.course_id = ?`,
      [course_id]
    );

    // 2) quizzes for course
    const [quizzesRows] = await pool.query('SELECT quiz_id, title FROM quizzes WHERE course_id = ?', [course_id]);

    // 3) existing quiz_submissions scores per student per quiz (if any)
    const quizIds = quizzesRows.map(q => q.quiz_id);
    let submissions = [];
    if (quizIds.length > 0) {
      const [subRows] = await pool.query(
        `SELECT submission_id, quiz_id, user_id AS student_id, score FROM quiz_submissions WHERE quiz_id IN (${quizIds.map(()=>'?').join(',')})`,
        quizIds
      );
      submissions = subRows;
    }

    // Build students list with scores map
    const students = studentsRows.map(s => {
      const scores = {};
      for (const sub of submissions) {
        if (sub.student_id === s.student_id) scores[sub.quiz_id] = sub.score;
      }
      return { ...s, scores };
    });

    // Also provide existing grade rows for the course (grouped by student and quarter)
    const [gradesRows] = await pool.query('SELECT grade_id, student_id, course_id, total_score, quarter FROM grades WHERE course_id = ?', [course_id]);

    res.json({ quizzes: quizzesRows, students, grades: gradesRows });
  } catch (error) {
    console.error('getInstructorGrades error:', error);
    res.status(500).json({ message: 'Error fetching instructor grades' });
  }
};

// Batch insert/update grades. Body: [{ student_id, course_id, quarter, total_score }]
export const postBatchGrades = async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ message: 'Expected array body' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const results = [];
    for (const it of items) {
      const { student_id, course_id, quarter, total_score } = it;
      if (student_id == null || course_id == null || quarter == null || total_score == null) {
        throw new Error('Missing fields in batch item');
      }

      // check existing row for same student/course/quarter
      const [existing] = await conn.query('SELECT grade_id FROM grades WHERE student_id = ? AND course_id = ? AND (quarter <=> ?)', [student_id, course_id, quarter]);
      if (existing.length > 0) {
        const gradeId = existing[0].grade_id;
        await conn.query('UPDATE grades SET total_score = ?, recorded_at = CURRENT_TIMESTAMP, quarter = ? WHERE grade_id = ?', [total_score, quarter, gradeId]);
        results.push({ student_id, course_id, grade_id: gradeId, updated: true });
      } else {
        const [ins] = await conn.query('INSERT INTO grades (student_id, course_id, total_score, quarter) VALUES (?, ?, ?, ?)', [student_id, course_id, total_score, quarter]);
        results.push({ student_id, course_id, grade_id: ins.insertId, updated: false });
      }
    }
    await conn.commit();
    res.json({ ok: true, results });
  } catch (error) {
    await conn.rollback();
    console.error('postBatchGrades error:', error);
    res.status(500).json({ message: 'Error posting batch grades', error: error.message });
  } finally {
    conn.release();
  }
};

// Management endpoint: returns quizzes and enrolled students for a course (scores map)
export const getManageGrades = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get enrolled students with quiz scores in a single query
      // Detect which enrollment table to use: prefer `course_enrollments` if it exists (newer schema), otherwise fall back to `enrollments`.
      const [tableCheck] = await pool.query(`
        SELECT COUNT(*) as exists_count
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'course_enrollments'
      `);
      const useCourseEnrollments = tableCheck && tableCheck[0] && tableCheck[0].exists_count > 0;

      let studentsAndScores;
      if (useCourseEnrollments) {
        studentsAndScores = (await pool.query(`
          SELECT
            u.user_id AS student_id,
            u.full_name,
            q.quiz_id,
            qs.score,
            COALESCE(g.quarter, 'midterm') as quarter
          FROM course_enrollments e
          JOIN users u ON e.user_id = u.user_id
          CROSS JOIN quizzes q
          LEFT JOIN quiz_submissions qs ON qs.user_id = u.user_id AND qs.quiz_id = q.quiz_id
          LEFT JOIN grades g ON g.student_id = u.user_id AND g.course_id = e.course_id
          WHERE e.course_id = ? AND q.course_id = e.course_id
          ORDER BY u.user_id, q.quiz_id
        `, [courseId]))[0];
        console.log('getManageGrades: using course_enrollments table');
      } else {
        studentsAndScores = (await pool.query(`
          SELECT
            u.user_id AS student_id,
            u.full_name,
            q.quiz_id,
            qs.score,
            COALESCE(g.quarter, 'midterm') as quarter
          FROM enrollments e
          JOIN users u ON e.student_id = u.user_id
          CROSS JOIN quizzes q
          LEFT JOIN quiz_submissions qs ON qs.user_id = u.user_id AND qs.quiz_id = q.quiz_id
          LEFT JOIN grades g ON g.student_id = u.user_id AND g.course_id = e.course_id
          WHERE e.course_id = ? AND q.course_id = e.course_id
          ORDER BY u.user_id, q.quiz_id
        `, [courseId]))[0];
        console.log('getManageGrades: using enrollments table');
      }

      console.log('getManageGrades: studentsAndScores rows:', Array.isArray(studentsAndScores) ? studentsAndScores.length : typeof studentsAndScores);
      if (Array.isArray(studentsAndScores) && studentsAndScores.length > 0) {
        console.log('getManageGrades sample row:', studentsAndScores[0]);
      }

    // Get quizzes for the course
    const [quizzesRows] = await pool.query(`
      SELECT quiz_id, title
      FROM quizzes 
      WHERE course_id = ?
      ORDER BY quiz_id
    `, [courseId]);

    // Process students and their scores
    const studentMap = new Map();
    studentsAndScores.forEach(row => {
      if (!studentMap.has(row.student_id)) {
        studentMap.set(row.student_id, {
          student_id: row.student_id,
          full_name: row.full_name,
          quarter: row.quarter,
          scores: {}
        });
      }
      if (row.quiz_id) {
        studentMap.get(row.student_id).scores[row.quiz_id] = row.score;
      }
    });

    const students = Array.from(studentMap.values());

    res.json({ quizzes: quizzesRows, students });
  } catch (error) {
    console.error('getManageGrades error:', error);
    res.status(500).json({ message: 'Error fetching manage grades' });
  }
};

// Submit single grade (from management UI)
export const postSubmitGrade = async (req, res) => {
  try {
    const { student_id, course_id, quarter, total_score } = req.body;
    if (student_id == null || course_id == null || quarter == null || total_score == null) return res.status(400).json({ message: 'Missing fields' });

    // upsert: check existing
    const [existing] = await pool.query('SELECT grade_id FROM grades WHERE student_id = ? AND course_id = ? AND (quarter <=> ?)', [student_id, course_id, quarter]);
    if (existing.length > 0) {
      const { grade_id } = existing[0];
      await pool.query('UPDATE grades SET total_score = ?, recorded_at = CURRENT_TIMESTAMP WHERE grade_id = ?', [total_score, grade_id]);
      return res.json({ ok: true, updated: true, grade_id });
    }

    const [ins] = await pool.query('INSERT INTO grades (student_id, course_id, total_score, quarter) VALUES (?, ?, ?, ?)', [student_id, course_id, total_score, quarter]);
    res.status(201).json({ ok: true, grade_id: ins.insertId });
  } catch (error) {
    console.error('postSubmitGrade error:', error);
    res.status(500).json({ message: 'Error submitting grade' });
  }
};
