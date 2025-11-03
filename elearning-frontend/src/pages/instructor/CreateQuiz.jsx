import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateQuiz() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{
    id: Date.now(),
    question: '',
    type: 'multiple_choice',
    options: ['', ''],  // Start with 2 empty options
    correctAnswer: 0
  }]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setError('Please log in to continue.');
      return;
    }
    if (!['instructor', 'admin'].includes(user.role)) {
      setError('Access denied. Only instructors can create quizzes.');
      return;
    }
    
    // Verify course ownership
    const verifyCourse = async () => {
      try {
        const res = await api.get(`/courses/${courseId}`);
        if (res.data.instructor_id !== user.id) {
          setError('Access denied. You can only create quizzes for your own courses.');
          return;
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to verify course:', err);
        setError('Failed to verify course ownership. Please try again.');
      }
    };
    verifyCourse();
  }, [courseId, user]);

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      id: Date.now(),
      question: '',
      type: 'multiple_choice',
      options: ['', ''],
      correctAnswer: 0
    }]);
  };

  const handleQuestionChange = (questionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleOptionChange = (questionId, optionIndex, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleAddOption = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
  };

  const handleRemoveOption = (questionId, optionIndex) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = q.options.filter((_, index) => index !== optionIndex);
        const newCorrectAnswer = q.correctAnswer >= optionIndex ? 
          Math.max(0, q.correctAnswer - 1) : q.correctAnswer;
        return { 
          ...q, 
          options: newOptions,
          correctAnswer: newCorrectAnswer
        };
      }
      return q;
    }));
  };

  const handleRemoveQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleSetCorrectAnswer = (questionId, optionIndex) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, correctAnswer: optionIndex };
      }
      return q;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate input
      if (!title.trim()) {
        setError('Please provide a quiz title');
        return;
      }

      // Check questions
      if (questions.length === 0) {
        setError('Please add at least one question');
        return;
      }

      // Validate each question
      for (const q of questions) {
        if (!q.question.trim()) {
          setError('All questions must have text');
          return;
        }
        const validOptions = q.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          setError('Each question must have at least 2 options');
          return;
        }
        if (q.correctAnswer >= validOptions.length) {
          setError('Please select a valid correct answer for each question');
          return;
        }
      }

      // Format questions for API
      const formattedQuestions = questions.map(({ id, ...q }) => ({
        question: q.question,
        type: q.type,
        options: q.options.filter(opt => opt.trim() !== ''),
        correctAnswer: q.correctAnswer
      }));

      const payload = {
        title,
        course_id: Number(courseId),
        questions: formattedQuestions
      };

      const response = await api.post('/quizzes', payload);
      if (response.data.quiz_id) {
        navigate(`/instructor/courses/${courseId}/manage`);
      } else {
        setError('Failed to create quiz. Server response was invalid.');
      }
    } catch (err) {
      console.error('Failed to create quiz:', err);
      setError(err.response?.data?.message || 'Failed to create quiz. Please try again.');
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
        <button
          onClick={() => navigate(`/instructor/courses/${courseId}/manage`)}
          className="mt-4 text-purple-600 hover:text-purple-700"
        >
          ← Back to Course Management
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-purple-200">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quiz title"
            className="text-2xl font-bold w-full mb-4 p-2 border-b border-gray-300 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {questions.map((question, questionIndex) => (
          <div key={question.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-start mb-4">
              <input
                type="text"
                value={question.question}
                onChange={(e) => handleQuestionChange(question.id, 'question', e.target.value)}
                placeholder="Question"
                className="flex-grow text-lg p-2 border-b border-gray-300 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleRemoveQuestion(question.id)}
                className="ml-4 text-gray-500 hover:text-red-500"
              >
                Delete
              </button>
            </div>

            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center">
                  <input
                    type="radio"
                    checked={question.correctAnswer === optionIndex}
                    onChange={() => handleSetCorrectAnswer(question.id, optionIndex)}
                    className="mr-3"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(question.id, optionIndex, e.target.value)}
                    placeholder={`Option ${optionIndex + 1}`}
                    className="flex-grow p-2 border-b border-gray-200 focus:border-purple-500 focus:outline-none"
                  />
                  {question.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(question.id, optionIndex)}
                      className="ml-2 text-gray-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => handleAddOption(question.id)}
                className="mt-2 text-purple-600 hover:text-purple-700"
              >
                Add option
              </button>
            </div>
          </div>
        ))}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200"
          >
            Add question
          </button>
          <button
            type="submit"
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Create Quiz
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}