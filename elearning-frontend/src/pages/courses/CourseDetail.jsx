import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './CourseDetail.css';
import Navbar from '../../components/Navbar';
// Course detail page: shows course info and lessons list
// Route: /courses/:id

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [completedQuizzes, setCompletedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) {
        console.error('CourseDetail: missing id param');
        setError('Invalid course selected');
        setLoading(false);
        return;
      }
      try {
        const [
          courseRes,
          lessonsRes,
          quizzesRes,
          completedRes
        ] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/lessons?course_id=${id}`),
          api.get('/quizzes'),
          api.get('/quizzes/completed')
        ]);

        setCourse(courseRes.data);
        setLessons(lessonsRes.data || []);
        // Filter quizzes for this course
        setQuizzes((quizzesRes.data || []).filter(q => String(q.course_id) === String(id)));
        setCompletedQuizzes(completedRes.data || []);
      } catch (err) {
        console.error('Error fetching course detail', err);
        setError('Failed to load course content');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  if (loading) return <div className="loading-state">Loading course...</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (!course) return <div className="loading-state">Course not found.</div>;

  const isQuizCompleted = (quizId) => completedQuizzes.includes(quizId);

  return (
    <div className="course-detail-container">
      <Navbar />
      <div className="course-header">
        <h1 className="course-title">{course.title}</h1>
        <p className="course-description">{course.description}</p>
      </div>

      <div className="content-grid">
        {/* Lessons Section */}
        <section className="section">
          <h2 className="section-title">Lessons</h2>
          {lessons.length === 0 ? (
            <div className="empty-state">No lessons available yet.</div>
          ) : (
            <div className="lesson-list">
              {lessons.map(lesson => (
                <div key={lesson.lesson_id} className="lesson-card">
                  <Link 
                    to={`/lessons/${lesson.lesson_id}`}
                    className="lesson-title"
                  >
                    {lesson.title}
                  </Link>
                  {lesson.description && (
                    <p className="lesson-description">{lesson.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quizzes Section */}
        <section className="section">
          <h2 className="section-title">Quizzes</h2>
          {quizzes.length === 0 ? (
            <div className="empty-state">No quizzes available yet.</div>
          ) : (
            <div className="quiz-list">
              {quizzes.map(quiz => (
                <div key={quiz.quiz_id} className="quiz-card">
                  <div className="quiz-info">
                    <h3>{quiz.title}</h3>
                    <p>{quiz.questions_count || 0} questions</p>
                  </div>
                  {isQuizCompleted(quiz.quiz_id) ? (
                    <span className="completed-badge">
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => navigate(`/quizzes/${quiz.quiz_id}`)}
                      className="quiz-button take-quiz-button"
                    >
                      Take Quiz
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
