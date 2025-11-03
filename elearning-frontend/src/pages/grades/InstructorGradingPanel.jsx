import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './Grades.css';

const QUARTERS = ['midterm', 'finals'];

function clampScore(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  if (n < 0) return 0;
  if (n > 4) return 4;
  return Math.round(n * 100) / 100;
}

function formatScore(val) {
  if (val == null) return '0.00';
  return Number(val).toFixed(2);
}

export default function InstructorGradingPanel() {
  const { user } = useAuth();
  const [courseId, setCourseId] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dirtyMap, setDirtyMap] = useState({});
  const [selectedQuarter, setSelectedQuarter] = useState('midterm');

  useEffect(() => {
    // no-op
  }, []);

  const loadForCourse = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/grades/instructor/${id}`);
      const data = res.data || {};
      const serverQuizzes = data.quizzes || [];

      // prepare students: include per-quiz entries with default quarter "midterm"
      const serverStudents = (data.students || []).map(s => {
        const perQuiz = serverQuizzes.map(q => ({
          quiz_id: q.quiz_id,
          title: q.title,
          score: s.scores && s.scores[q.quiz_id] != null ? Number(s.scores[q.quiz_id]) : 0,
          quarter: 'midterm'
        }));
        return {
          student_id: s.student_id,
          full_name: s.full_name,
          perQuiz,
        };
      });

      setQuizzes(serverQuizzes);
      setStudents(serverStudents);
      setDirtyMap({});
    } catch (err) {
      console.error('Failed to load instructor grades', err);
      setError('Failed to load students for this course');
    } finally {
      setLoading(false);
    }
  };

  // compute total score for a student for the selectedQuarter
  const computeTotalFor = (student) => {
    if (!student || !student.perQuiz) return 0;
    const scores = student.perQuiz.filter(p => p.quarter === selectedQuarter).map(p => Number(p.score) || 0);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((a,b) => a + b, 0);
    return +(sum / scores.length).toFixed(2);
  };

  const handleQuizScoreChange = (studentIndex, quizIndex, rawValue) => {
    // allow empty input but normalize
    const v = rawValue === '' ? '' : rawValue;
    // validate pattern (0-4 with up to 2 decimals)
    if (v !== '' && !/^\d{1}(?:\.\d{1,2})?$|^\d(?:\.\d{1,2})?$|^\d?$/.test(v)) return;
    const copy = [...students];
    const stud = { ...copy[studentIndex] };
    const perQuiz = stud.perQuiz.map((q, i) => i === quizIndex ? { ...q, score: v === '' ? '' : clampScore(v) } : q);
    stud.perQuiz = perQuiz;
    copy[studentIndex] = stud;
    setStudents(copy);
    setDirtyMap(prev => ({ ...prev, [stud.student_id]: true }));
  };

  const handleQuizQuarterChange = (studentIndex, quizIndex, quarter) => {
    if (!QUARTERS.includes(quarter)) return;
    const copy = [...students];
    const stud = { ...copy[studentIndex] };
    stud.perQuiz = stud.perQuiz.map((q, i) => i === quizIndex ? { ...q, quarter } : q);
    copy[studentIndex] = stud;
    setStudents(copy);
    setDirtyMap(prev => ({ ...prev, [stud.student_id]: true }));
  };

  const anyDirty = useMemo(() => Object.keys(dirtyMap).length > 0, [dirtyMap]);

  const handleSubmitAll = async () => {
    const toSubmit = students.filter(s => dirtyMap[s.student_id]);
    if (toSubmit.length === 0) {
      alert('No changes to submit');
      return;
    }
    if (!confirm(`Submit ${toSubmit.length} grade(s) for ${selectedQuarter}?`)) return;

    try {
      const payload = toSubmit.map(s => ({
        student_id: s.student_id,
        course_id: courseId,
        quarter: selectedQuarter,
        total_score: computeTotalFor(s)
      }));

      await api.post('/grades/batch', payload);
      // optimistic: clear dirty and reload
      setDirtyMap({});
      await loadForCourse(courseId);
      alert('Grades submitted successfully');
    } catch (err) {
      console.error('Failed to submit grades', err);
      alert('Failed to submit grades');
    }
  };

  return (
    <div className="instructor-grading">
      <div className="grading-header">
        <label>Course ID: </label>
        <input type="text" value={courseId} onChange={e => setCourseId(e.target.value)} placeholder="Enter course id" />
        <button onClick={() => loadForCourse(courseId)} disabled={!courseId}>Load</button>
        <label style={{ marginLeft: 12 }}>Quarter: </label>
        <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)}>
          {QUARTERS.map(q => <option key={q} value={q}>{q[0].toUpperCase() + q.slice(1)}</option>)}
        </select>
      </div>

      {loading && <div>Loading students…</div>}
      {error && <div className="grades-error">{error}</div>}

      {!loading && students.length === 0 && <div className="no-grades">No students found for this course.</div>}

      {students.length > 0 && (
        <div className="instructor-table-wrapper">
          <table className="grades-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full name</th>
                {quizzes.map(q => (
                  <th key={`h-${q.quiz_id}`}>{q.title}</th>
                ))}
                <th>Total Score</th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                {quizzes.map(q => (
                  <th key={`h2-${q.quiz_id}`}>Quarter / Score</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, si) => {
                const total = computeTotalFor(s);
                const totalClass = total >= 3.00 ? 'total-good' : (total < 1.75 ? 'total-bad' : '');
                return (
                  <tr key={s.student_id} className={dirtyMap[s.student_id] ? 'dirty' : ''}>
                    <td>{s.student_id}</td>
                    <td>{s.full_name}</td>
                    {s.perQuiz.map((pq, qi) => (
                      <td key={`${s.student_id}-${pq.quiz_id}`}>
                        <div>
                          <select value={pq.quarter} onChange={e => handleQuizQuarterChange(si, qi, e.target.value)}>
                            <option value="midterm">Midterm</option>
                            <option value="finals">Finals</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="4"
                            value={pq.score === '' ? '' : pq.score}
                            onChange={e => handleQuizScoreChange(si, qi, e.target.value)}
                            style={{ width: 80 }}
                          />
                        </div>
                      </td>
                    ))}
                    <td className={totalClass}>{formatScore(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="grading-actions">
            <button onClick={handleSubmitAll} disabled={!anyDirty} className="start-quiz-btn">Submit All Grades</button>
          </div>
        </div>
      )}
    </div>
  );
}
