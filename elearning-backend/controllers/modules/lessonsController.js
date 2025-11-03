import { pool } from '../../config/db.js';

export const listLessons = async (req, res) => {
  try {
    // Optionally filter by course_id (frontend passes ?course_id=123)
    const courseId = req.query.course_id ?? req.query.courseId ?? null;

    let sql = `
      SELECT
        lesson_id,
        title,
        description,
        course_id,
        content,
        video_url,
        file_path,
        created_at,
        CASE
          WHEN video_url IS NOT NULL AND video_url <> '' THEN 'video'
          WHEN content LIKE '%.pdf%' THEN 'pdf'
          ELSE 'text'
        END AS content_type
      FROM lessons
    `;
    const params = [];
    if (courseId) {
      sql += ' WHERE course_id = ?';
      params.push(courseId);
    }
    sql += ' ORDER BY created_at ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows || []);
  } catch (error) {
    console.error('listLessons error:', error && error.message ? error.message : error);
    res.status(500).json({ message: 'Error listing lessons' });
  }
};

export const getLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT lesson_id, title, description, course_id, content, video_url, file_path, created_at FROM lessons WHERE lesson_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Lesson not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('getLesson error:', error);
    res.status(500).json({ message: 'Error fetching lesson' });
  }
};

export const createLesson = async (req, res) => {
  try {
    // Expect payload: { title, course_id, content, content_type }
    // This endpoint also accepts an uploaded file in req.file (handled by multer)
  const { title, course_id, content, content_type, description } = req.body;

    // Determine values to store
    let video_url = null;
    let contentToStore = content || null;
    let file_path = null;

    if (req.file) {
      // store the uploaded file path relative to server root so it can be served
      file_path = `/uploads/lessons/${req.file.filename}`;
      // If content_type is not provided, infer pdf by extension
      if (!content_type) {
        if (req.file.mimetype === 'application/pdf') {
          // treat as pdf content
        }
      }
    }

    if (content_type === 'video') {
      // For video lessons, frontend may post the video URL in `content`
      video_url = contentToStore;
      contentToStore = null; // keep video url in video_url column
    }

    const [result] = await pool.query('INSERT INTO lessons (title, description, course_id, content, video_url, file_path) VALUES (?, ?, ?, ?, ?, ?)', [title, description || null, course_id, contentToStore, video_url, file_path]);
    res.status(201).json({ lesson_id: result.insertId, file_path });
  } catch (error) {
    console.error('createLesson error:', error && error.message ? error.message : error);
    res.status(500).json({ message: 'Error creating lesson', details: error.message });
  }
};

export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    await pool.query('UPDATE lessons SET title = ?, content = ? WHERE lesson_id = ?', [title, content, id]);
    res.json({ message: 'Lesson updated' });
  } catch (error) {
    console.error('updateLesson error:', error);
    res.status(500).json({ message: 'Error updating lesson' });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM lessons WHERE lesson_id = ?', [id]);
    res.json({ message: 'Lesson deleted' });
  } catch (error) {
    console.error('deleteLesson error:', error);
    res.status(500).json({ message: 'Error deleting lesson' });
  }
};
