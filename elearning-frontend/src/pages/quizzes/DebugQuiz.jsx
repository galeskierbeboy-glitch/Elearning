import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Navbar from '../../components/Navbar';
import './QuizRunner.css';

export default function DebugQuiz() {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/quizzes/debug/sample');
        const quizData = res.data;
        setQuiz(quizData);
        const init = {};
        (quizData.questions || []).forEach((_, i) => {
          init[i] = null;
        });
        setAnswers(init);
      } catch (err) {
        console.error('DebugQuiz fetch error', err);
        setError('Failed to load debug quiz');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  if (loading) return <div className="p-4">Loading debug quiz...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!quiz) return <div className="p-4">No debug quiz found.</div>;

  return (
    <div className="quiz-runner-page">
      <Navbar />
      <div className="quiz-runner-container">
        <div className="quiz-header">
          <h1 className="quiz-title">{quiz.title}</h1>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); navigate('/quizzes'); }}>
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

          <div className="submit-row">
            <button type="submit" className="btn-submit">Back to Quizzes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
