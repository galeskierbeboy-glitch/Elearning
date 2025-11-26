import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EnrolledCourses from './pages/EnrolledCourses';
import InstructorCourses from './pages/InstructorCourses';
import SecurityDashboard from './pages/SecurityDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserAccount from './pages/UserAccount';
import ForgotPass from './pages/ForgotPass';
import Courses from './pages/courses/Courses';
import CourseDetail from './pages/courses/CourseDetail';
import Lessons from './pages/lessons/Lessons';
import Quizzes from './pages/quizzes/Quizzes';
import QuizRunner from './pages/quizzes/QuizRunner';
import CourseList from './pages/grades/CourseList';
import StudentGradesTable from './pages/grades/StudentGradesTable';
import GradeManage from './pages/grades/GradeManage';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorManageCourse from './pages/instructor/InstructorManageCourse';
import CreateQuiz from './pages/instructor/CreateQuiz';
import CreateCourse from './pages/instructor/CreateCourse';
import Notifications from './pages/notifications/Notifications';
import SendNotification from './pages/notifications/SendNotification';

function App() {
  // Role-based landing component for /dashboard
  const RoleBasedHome = () => {
    const { user } = useAuth();
    // If no user (shouldn't happen due to ProtectedRoute) fallback to Dashboard
    if (!user) return <Dashboard />;
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'security_analyst':
        return <SecurityDashboard />;
      case 'instructor':
        // Redirect instructors to the instructor area as their main page
        return <Navigate to="/instructor" replace />;
      case 'student':
      default:
        return <Dashboard />;
    }
  };
  
  // Component that routes /grades to the correct view based on role
  const GradesRouter = () => {
    const { user } = useAuth();
    if (!user) return <CourseList />;
    if (user.role === 'instructor') return <CourseList />;
    if (user.role === 'student') return <StudentGradesTable />;
    // fallback for other roles: show dashboard
    return <CourseList />;
  };
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleBasedHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrolled-courses"
            element={
              <ProtectedRoute>
                <EnrolledCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses"
            element={
              <ProtectedRoute>
                <InstructorCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/:lessonId"
            element={
              <ProtectedRoute>
                <Lessons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <Quizzes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes/:quizId"
            element={
              <ProtectedRoute>
                <QuizRunner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grades"
            element={
              <ProtectedRoute>
                <GradesRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor"
            element={
              <ProtectedRoute>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:id/manage"
            element={
              <ProtectedRoute>
                <InstructorManageCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/create-quiz"
            element={
              <ProtectedRoute>
                <CreateQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/create"
            element={
              <ProtectedRoute>
                <CreateCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grade-manage/:courseId"
            element={
              <ProtectedRoute>
                <GradeManage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security-dashboard"
            element={
              <ProtectedRoute>
                <SecurityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <UserAccount />
              </ProtectedRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPass />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;