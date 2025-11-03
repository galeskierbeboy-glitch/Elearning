import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './Grades.css';

export default function StudentGradesTable() {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        // fetch grades for the current authenticated student
        if (!user || !user.id) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        const res = await api.get(`/grades/student/${user.id}`);
        setGrades(res.data || []);
      } catch (err) {
        console.error('Failed to fetch student grades', err);
        setError('Failed to load grades');
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [user]);

  if (loading) return <div className="grades-loading">Loading grades…</div>;
  if (error) return <div className="grades-error">{error}</div>;

  return (
    <div className="grades-table-wrapper">
      <table className="grades-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Course ID</th>
            <th>Course</th>
            <th>Quarter</th>
            <th>Total Score</th>
            <th>Recorded At</th>
          </tr>
        </thead>
        <tbody>
          {grades.length === 0 && (
            <tr>
              <td colSpan="6" className="no-grades">No grades available.</td>
            </tr>
          )}
          {grades.map((g, idx) => (
            <tr key={g.grade_id || `${g.course_id}-${idx}`}>
              <td>{idx + 1}.</td>
              <td>{g.course_id}</td>
              <td>{g.course_name || g.descriptive || '—'}</td>
              <td>{g.quarter || '—'}</td>
              <td>{g.total_score == null ? <span className="not-posted">Not Yet Posted</span> : Number(g.total_score).toFixed(2)}</td>
              <td>{g.recorded_at || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
