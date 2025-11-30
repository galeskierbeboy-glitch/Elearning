import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Navbar from '../../components/Navbar';
import './GradeManage.css';

export default function GradeManage() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true); // 初始值设为 true
  const [error, setError] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/grades/manage/${courseId}`);
        const data = res.data || {};
        const serverQuizzes = data.quizzes || [];
        const serverStudents = (data.students || []).map(s => {
          const perQuiz = serverQuizzes.map(q => ({
            quiz_id: q.quiz_id,
            title: q.title,
            score: s.scores && s.scores[q.quiz_id] != null ? Number(s.scores[q.quiz_id]) : 0,
          }));
          return {
            student_id: s.student_id,
            full_name: s.full_name || s.name || '',
            perQuiz,
            quarter: 'midterm',
          };
        });
        setQuizzes(serverQuizzes);
        setStudents(serverStudents);
      } catch (err) {
        console.error('Failed to load manage data', err);
        setError('Failed to load data for this course');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [courseId]);

  const computeTotal = (student) => {
    if (!student || !student.perQuiz) return 0.0;
    const vals = student.perQuiz.map(p => (p.score === '' ? 0 : Number(p.score) || 0));
    if (vals.length === 0) return 0.0;
    const sum = vals.reduce((a,b) => a + b, 0);
    return +(sum / vals.length).toFixed(2);
  };

  const handleFinalizeGrades = async () => {
    setFinalizing(true);
    try {
      const batch = students.map(s => ({
        student_id: s.student_id,
        course_id: courseId,
        quarter: s.quarter || 'midterm',
        total_score: computeTotal(s),
      }));
      await api.post('/grades/batch', batch);
      setFinalized(true);
      alert('Grades finalized and posted to student view!');
    } catch (err) {
      alert('Failed to finalize grades.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) return <div className="loading-message">Loading…</div>;
  if (error) return <div className="error-message">{error}</div>;

  if ((!students || students.length === 0) && (!quizzes || quizzes.length === 0)) {
    return <div className="empty-message">No students or quizzes available.</div>;
  }

  return (
    <div className="grade-manage-container">
      <Navbar />
      <h2 className="grade-header">Grade Management</h2>
      <div className="table-wrapper">
        <table className="grade-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Full Name</th>
              {quizzes.map(q => (
                <th key={q.quiz_id}>{q.title}</th>
              ))}
              <th>Average Score</th>
              <th>Quarter</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={3 + quizzes.length} className="empty-cell">
                  No students enrolled yet for this course. Once students enroll, they'll appear here.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.student_id}>
                  <td>{s.student_id}</td>
                  <td>{s.full_name}</td>
                  {s.perQuiz.map((pq) => (
                    <td key={`${s.student_id}-${pq.quiz_id}`}>{pq.score}</td>
                  ))}
                  <td>{computeTotal(s)}</td>
                  <td>
                    <select
                      value={s.quarter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudents(prev => prev.map(st => 
                          st.student_id === s.student_id ? { ...st, quarter: val } : st
                        ));
                      }}
                    >
                      <option value="midterm">Midterm</option>
                      <option value="finals">Finals</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        className="finalize-button"
        onClick={handleFinalizeGrades}
        disabled={finalizing || finalized}
      >
        {finalized ? 'Grades Finalized' : finalizing ? 'Finalizing…' : 'Finalize Grades'}
      </button>
      <p className="info-text">
        All grades are automatically calculated and recorded based on quiz performance.<br/>
        Click "Finalize Grades" to post the grades to the student view.
      </p>
    </div>
  );
}
