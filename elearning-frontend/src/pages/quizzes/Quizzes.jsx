import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Quizzes.css';
import Navbar from '../../components/Navbar';

export default function Quizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [completedQuizzes, setCompletedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const [quizzesRes, completedRes] = await Promise.all([
        api.get('/quizzes'),
        api.get('/quizzes/completed')
      ]);
      
      setQuizzes(quizzesRes.data || []);
      // Completed quizzes endpoint returns an array of quiz_ids that the student has completed
      setCompletedQuizzes(completedRes.data || []);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const isQuizCompleted = (quizId) => {
    return completedQuizzes.some(id => String(id) === String(quizId));
  };

  if (loading) return <div className="p-4">Loading quizzes...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  // Separate quizzes into completed and pending
  const normalizeId = (quiz) => quiz.quiz_id ?? quiz.id ?? quiz._id ?? quiz.quizId;
  const pendingQuizzes = quizzes.filter(quiz => !isQuizCompleted(normalizeId(quiz)));
  const doneQuizzes = quizzes.filter(quiz => isQuizCompleted(normalizeId(quiz)));

  return (
    <div className="quizzes-page">
      <Navbar />
      <div className="quizzes-container">
        <div className="quizzes-header">
          <h1>Quizzes</h1>
        </div>

        {pendingQuizzes.length > 0 && (
          <section className="quizzes-section">
            <h2 className="section-title">Pending Quizzes</h2>
            <div className="quizzes-grid">
              {pendingQuizzes.map(quiz => (
                <div key={normalizeId(quiz)} className="quiz-tile">
                  <div>
                    <h3 className="quiz-title">{quiz.title}</h3>
                  </div>
                  <div className="quiz-action">
                    <button onClick={() => navigate(`/quizzes/${normalizeId(quiz)}`)} className="btn-primary">Start Quiz</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {doneQuizzes.length > 0 && (
          <section className="quizzes-section">
            <h2 className="section-title">Completed Quizzes</h2>
            <div className="quizzes-grid">
              {doneQuizzes.map(quiz => (
                <div key={normalizeId(quiz)} className="quiz-tile">
                  <div>
                    <h3 className="quiz-title">{quiz.title}</h3>
                  </div>
                  <div className="quiz-action">
                    <span className="badge-completed">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {quizzes.length === 0 && (
          <div className="no-quizzes">No quizzes available yet.</div>
        )}
      </div>
    </div>
  );
}
