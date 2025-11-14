import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api, { courseService } from '../services/api';
import './EnrolledCourses.css';

const EnrolledCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const navigate = useNavigate();

  const fetchEnrolledCourses = async () => {
    try {
      const response = await courseService.getEnrollments();
      setCourses(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load enrolled courses. Please try again later.');
      setLoading(false);
    }
  };

  const handleUnenroll = async (courseId) => {
    try {
      await courseService.unenrollFromCourse(courseId);
      // Remove the course from the state
      setCourses(prev => prev.filter(course => (course.course_id ?? course.id) !== courseId));
    } catch (err) {
      setError('Failed to unenroll from the course. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-lg">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Enrolled Courses</h1>
      <Navbar />
      {courses.length === 0 ? (
        <p className="text-gray-600">You are not enrolled in any courses yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            // normalize id: backend may return `id` or `course_id`
            const cid = course.course_id ?? course.id;
            return (
              <div
                key={cid}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
                <p className="text-gray-600 mb-4">{course.description}</p>
                <p className="text-sm text-gray-500 mb-4">
                  Instructor: {course.instructor_name}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/courses/${cid}`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Enter
                  </button>
                  <button
                    onClick={() => handleUnenroll(cid)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Unenroll
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnrolledCourses;