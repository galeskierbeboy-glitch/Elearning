import React from 'react';
import { Navigate } from 'react-router-dom';

// Instructor dashboard: redirect instructors to the instructor courses listing
// Route: /instructor

export default function InstructorDashboard() {
  // For now, instructors' main page is the courses management page.
  return <Navigate to="/instructor/courses" replace />;
}