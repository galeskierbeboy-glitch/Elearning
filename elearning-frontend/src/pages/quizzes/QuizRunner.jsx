import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './QuizRunner.css';
import Navbar from '../../components/Navbar';

export default function QuizRunner() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!quizId) {
      console.error('QuizRunner: missing quizId param');
      setError('Invalid quiz ID');
      setLoading(false);
      return;
    }
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      console.debug('QuizRunner: fetching quiz', quizId);
      const response = await api.get(`/quizzes/${quizId}`);
      console.debug('QuizRunner: response', response);
      const quizData = response.data || null;
      if (!quizData) {
        setError('Quiz data is empty');
        setLoading(false);
        return;
      }

      // Ensure questions is an array; some APIs may return JSON string
      let questions = quizData.questions;
      if (!Array.isArray(questions) && typeof questions === 'string') {
        try {
          questions = JSON.parse(questions || '[]');
        } catch (parseErr) {
          console.warn('QuizRunner: failed to parse questions JSON', parseErr);
          questions = [];
        }
      }
      if (!Array.isArray(questions)) questions = [];

      const normalizedQuiz = {
        ...quizData,
        questions
      };

      setQuiz(normalizedQuiz);

      // Initialize answers object
      const initialAnswers = {};
      (questions || []).forEach((_, index) => {
        initialAnswers[index] = null;
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error('QuizRunner: fetch error', err);
      
      // Provide diagnostic info for auth/token failures
      if (err.response?.status === 401 || err.response?.data?.message?.includes('Token') || err.response?.data?.message?.includes('authentication')) {
        const diagMsg = `Authentication failed: ${err.response?.data?.message || 'Invalid or missing token'}.\n\nTo debug:\n1. Check DevTools → Application → Local Storage → "token"\n2. If token is missing, log out and log in again.\n3. If token exists, run in console:\nfetch('/api/debug/echo-token', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()).then(console.log)`;
        setError(diagMsg);
      } else {
        setError(`Failed to load quiz: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Convert answers to array format
      const answersArray = Object.values(answers);
      
      // Ensure all questions are answered
      if (answersArray.length !== quiz.questions.length || answersArray.includes(null)) {
        setError('Please answer all questions before submitting.');
        setSubmitting(false);
        return;
      }

      // Prepare submission data
      const submissionData = {
        answers: answersArray
      };

      console.log('Submitting quiz data:', submissionData);

      const response = await api.post(`/quizzes/${quizId}/submit`, submissionData);
      const { score, total, percentage } = response.data;

      // Show score to user
      alert(`Quiz submitted successfully!\nYou scored ${score} out of ${total} (${percentage.toFixed(1)}%)`);

      // Navigate back to quizzes list
      navigate('/quizzes');
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setError(err.response?.data?.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4">Loading quiz...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!quiz) return <div className="p-4">Quiz not found.</div>;

  // If quiz has no questions, show a helpful message instead of an empty page
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <div className="p-4">
        <div style={{maxWidth: 800, margin: '0 auto', textAlign: 'center'}}>
          <h2 style={{color: '#ccd6f6'}}>This quiz has no questions.</h2>
          <p style={{color: '#8892b0'}}>The instructor hasn't added any questions to this quiz yet.</p>
          <div style={{marginTop: '1rem'}}>
            <button onClick={() => navigate('/quizzes')} className="btn-submit">Back to Quizzes</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-runner-page">
      <Navbar />
      <div className="quiz-runner-container">
        <div className="quiz-header">
          <h1 className="quiz-title">{quiz.title}</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {quiz.questions.map((question, questionIndex) => (
            <div key={questionIndex} className="question-card">
              <p className="question-text">{question.question}</p>
              <div>
                {question.options.map((option, optionIndex) => (
                  <label key={optionIndex} className="option-row">
                    <input
                      type="radio"
                      name={`question-${questionIndex}`}
                      checked={answers[questionIndex] === optionIndex}
                      onChange={() => handleAnswerSelect(questionIndex, optionIndex)}
                      className="radio-input"
                    />
                    <span className="option-label">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {error && <div className="error-box">{error}</div>}

          <div className="submit-row">
            <button type="submit" disabled={submitting} className="btn-submit">{submitting ? 'Submitting...' : 'Submit Quiz'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}