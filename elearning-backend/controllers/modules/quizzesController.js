// Utility: Convert numeric grade to equivalent grade per scale
function numericToEquivalentGrade(numeric) {
  if (numeric >= 96) return 1.00;
  if (numeric >= 94) return 1.25;
  if (numeric >= 91) return 1.50;
  if (numeric >= 88) return 1.75;
  if (numeric >= 85) return 2.00;
  if (numeric >= 82) return 2.25;
  if (numeric >= 79) return 2.50;
  if (numeric >= 76) return 2.75;
  if (numeric >= 75) return 3.00;
  return 5.00;
}
import { pool } from '../../config/db.js';

export const listQuizzes = async (req, res) => {
  try {
    // First check if quiz_questions table exists
    const [tables] = await pool.query(`
      SELECT COUNT(*) as exists_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'quiz_questions'
    `);
    
    if (tables[0].exists_count === 0) {
      // If table doesn't exist yet, just return basic quiz info
      const [rows] = await pool.query('SELECT quiz_id, title, course_id FROM quizzes');
      return res.json(rows.map(r => ({ ...r, questions_count: 0 })));
    }

    // If table exists, get all quizzes with their question count
    const [rows] = await pool.query(`
      SELECT q.quiz_id, q.title, q.course_id, 
             COUNT(qq.question_id) as questions_count 
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON q.quiz_id = qq.quiz_id
      GROUP BY q.quiz_id, q.title, q.course_id
    `);
    res.json(rows);
  } catch (error) {
    console.error('listQuizzes error:', error);
    res.status(500).json({ message: 'Error listing quizzes' });
  }
};

export const getQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if quiz_questions table exists
    const [tables] = await pool.query(`
      SELECT COUNT(*) as exists_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'quiz_questions'
    `);
    
    // Get basic quiz info
    const [quizRows] = await pool.query(`
      SELECT q.quiz_id, q.title, q.course_id
      FROM quizzes q
      WHERE q.quiz_id = ?
    `, [id]);

    if (quizRows.length === 0) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (tables[0].exists_count === 0) {
      // If table doesn't exist yet, return quiz with empty questions
      console.log('quiz_questions table does not exist yet');
      return res.json({
        ...quizRows[0],
        questions: []
      });
    }

    // Get quiz questions if table exists
    const [questionRows] = await pool.query(`
      SELECT question_id, question_text, options, correct_answer
      FROM quiz_questions
      WHERE quiz_id = ?
      ORDER BY question_order
    `, [id]);

    // Format the response
    const quiz = {
      ...quizRows[0],
      questions: questionRows.map(q => ({
        question: q.question_text,
        options: JSON.parse(q.options || '[]'),
        question_id: q.question_id
      }))
    };

    res.json(quiz);
  } catch (error) {
    console.error('getQuiz error:', error);
    res.status(500).json({ 
      message: 'Error fetching quiz',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const createQuiz = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { title, course_id, questions } = req.body;
    
    // Check if user is instructor of this course
    const [courseCheck] = await conn.query(
      'SELECT course_id FROM courses WHERE course_id = ? AND instructor_id = ?',
      [course_id, req.user.id]
    );

    if (courseCheck.length === 0) {
      return res.status(403).json({ 
        message: 'Access denied. You must be the instructor of this course to create a quiz.' 
      });
    }
    
    // Validate questions format
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        message: 'Quiz must contain at least one question' 
      });
    }

    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || 
          typeof q.correctAnswer !== 'number' || q.correctAnswer >= q.options.length) {
        return res.status(400).json({ 
          message: 'Invalid question format. Each question must have text, at least 2 options, and a valid correct answer.' 
        });
      }
    }

    // Ensure quiz_questions table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        question_id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT NOT NULL,
        question_text TEXT NOT NULL,
        options JSON NOT NULL,
        correct_answer INT NOT NULL,
        question_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
      )
    `);
    
    // Insert quiz
    const [result] = await conn.query(
      'INSERT INTO quizzes (title, course_id) VALUES (?, ?)',
      [title, course_id]
    );
    const quizId = result.insertId;

    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        await conn.query(
          'INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, question_order) VALUES (?, ?, ?, ?, ?)',
          [quizId, q.question, JSON.stringify(q.options), q.correctAnswer, i]
        );
      } catch (err) {
        console.error('Failed to insert question:', err);
        console.error('Question data:', {
          quiz_id: quizId,
          question_text: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          question_order: i
        });
        throw err;
      }
    }

    await conn.commit();
    res.status(201).json({ quiz_id: quizId });
  } catch (error) {
    await conn.rollback();
    console.error('createQuiz error:', error);
    res.status(500).json({ 
      message: 'Error creating quiz. ' + (error.sqlMessage || error.message),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    conn.release();
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    await pool.query('UPDATE quizzes SET title = ? WHERE quiz_id = ?', [title, id]);
    res.json({ message: 'Quiz updated' });
  } catch (error) {
    console.error('updateQuiz error:', error);
    res.status(500).json({ message: 'Error updating quiz' });
  }
};

export const deleteQuiz = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { id } = req.params;
    // Delete related records first
    await conn.query('DELETE FROM quiz_submissions WHERE quiz_id = ?', [id]);
    await conn.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [id]);
    await conn.query('DELETE FROM quizzes WHERE quiz_id = ?', [id]);
    
    await conn.commit();
    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    await conn.rollback();
    console.error('deleteQuiz error:', error);
    res.status(500).json({ message: 'Error deleting quiz' });
  } finally {
    conn.release();
  }
};

export const getCompletedQuizzes = async (req, res) => {
  try {
    // First check if quiz_submissions table exists
    const [tables] = await pool.query(`
      SELECT COUNT(*) as exists_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'quiz_submissions'
    `);
    
    if (tables[0].exists_count === 0) {
      // If table doesn't exist yet, return empty array
      console.log('quiz_submissions table does not exist yet');
      return res.json([]);
    }

    const [rows] = await pool.query(
      'SELECT DISTINCT quiz_id FROM quiz_submissions WHERE user_id = ?',
      [req.user.id]
    );
    res.json(rows.map(row => row.quiz_id));
  } catch (error) {
    console.error('getCompletedQuizzes error:', error);
    res.status(500).json({ message: 'Error fetching completed quizzes' });
  }
};

export const submitQuiz = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id: quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    // Ensure required tables exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quiz_submissions (
        submission_id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT NOT NULL,
        user_id INT NOT NULL,
        score DECIMAL(5,2) NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY unique_submission (quiz_id, user_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS submitted_answers (
        answer_id INT AUTO_INCREMENT PRIMARY KEY,
        submission_id INT NOT NULL,
        question_id INT NOT NULL,
        selected_answer INT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        FOREIGN KEY (submission_id) REFERENCES quiz_submissions(submission_id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
      )
    `);

    // Check if already submitted
    const [existingSubmission] = await conn.query(
      'SELECT submission_id FROM quiz_submissions WHERE quiz_id = ? AND user_id = ?',
      [quizId, userId]
    );
    if (existingSubmission.length > 0) {
      return res.status(400).json({ message: 'Quiz already submitted' });
    }

    // Get questions with correct answers
    const [questions] = await conn.query(
      'SELECT question_id, correct_answer FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order',
      [quizId]
    );

    if (!Array.isArray(answers) || questions.length !== answers.length) {
      return res.status(400).json({ 
        message: 'Invalid answers format. Please provide an answer for each question.' 
      });
    }

    // Calculate score
    let score = 0;
    const answersWithResults = questions.map((q, index) => {
      const isCorrect = q.correct_answer === answers[index];
      if (isCorrect) score++;
      return {
        question_id: q.question_id,
        selected_answer: answers[index],
        is_correct: isCorrect
      };
    });

    const total = questions.length;
    const scorePercent = (score / total) * 100;

    // Save submission
    const [submission] = await conn.query(
      'INSERT INTO quiz_submissions (quiz_id, user_id, score, submitted_at) VALUES (?, ?, ?, NOW())',
      [quizId, userId, scorePercent]
    );

    // Save individual answers
    const submissionId = submission.insertId;
    for (const answer of answersWithResults) {
      await conn.query(
        'INSERT INTO submitted_answers (submission_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)',
        [submissionId, answer.question_id, answer.selected_answer, answer.is_correct]
      );
    }

    // After quiz submission, auto-calculate and record/update grade for this student/course/quarter
    // 1. Find course_id for this quiz
    const [[quizRow]] = await conn.query('SELECT course_id FROM quizzes WHERE quiz_id = ?', [quizId]);
    const courseId = quizRow ? quizRow.course_id : null;
    if (courseId) {
      // 2. Get all quiz_submissions for this student/course
      const [quizRows] = await conn.query(
        'SELECT s.score FROM quiz_submissions s JOIN quizzes q ON s.quiz_id = q.quiz_id WHERE s.user_id = ? AND q.course_id = ?',
        [userId, courseId]
      );
      // 3. Compute average numeric score
      const scores = quizRows.map(r => Number(r.score) || 0);
      const avgNumeric = scores.length > 0 ? scores.reduce((a,b) => a+b,0)/scores.length : 0;
      // 4. Convert to equivalent grade
      const eqGrade = numericToEquivalentGrade(avgNumeric);
      // 5. Upsert into grades table for this student/course/quarter (default to 'midterm')
      await conn.query(`CREATE TABLE IF NOT EXISTS grades (
        grade_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        course_id INT,
        total_score DECIMAL(5,2),
        quarter ENUM('midterm','finals') NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
      )`);
      // For now, always use 'midterm' as quarter (can be extended)
      const [existing] = await conn.query('SELECT grade_id FROM grades WHERE student_id = ? AND course_id = ? AND quarter = ?', [userId, courseId, 'midterm']);
      if (existing.length > 0) {
        await conn.query('UPDATE grades SET total_score = ?, recorded_at = CURRENT_TIMESTAMP WHERE grade_id = ?', [eqGrade, existing[0].grade_id]);
      } else {
        await conn.query('INSERT INTO grades (student_id, course_id, total_score, quarter) VALUES (?, ?, ?, ?)', [userId, courseId, eqGrade, 'midterm']);
      }
    }

    await conn.commit();
    res.json({ 
      message: 'Quiz submitted successfully',
      score,
      total,
      percentage: scorePercent
    });
  } catch (error) {
    await conn.rollback();
    console.error('submitQuiz error:', error);
    res.status(500).json({ 
      message: 'Error submitting quiz',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    conn.release();
  }
};
