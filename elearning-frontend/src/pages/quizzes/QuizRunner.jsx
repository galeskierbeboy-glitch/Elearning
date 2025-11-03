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
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      setQuiz(response.data);
      // Initialize answers object
      const initialAnswers = {};
      response.data.questions.forEach((_, index) => {
        initialAnswers[index] = null;
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error('Failed to fetch quiz:', err);
      setError('Failed to load quiz');
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