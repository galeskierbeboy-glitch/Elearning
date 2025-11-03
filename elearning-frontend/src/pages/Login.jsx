import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login');
    }
  };

  return (
    <div className="login-page">
      <div className="login-content">
        <h1 className="main-heading">Empower Your Learning Journey</h1>
        <p className="sub-heading">Transform your future with expert-led courses and a supportive learning community.</p>

        <div className="login-form-container">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">{error}</div>
            )}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <button type="submit" className="submit-button">
              Sign in to your account
            </button>
            <div className="register-link">
              <span>Don't have an account? </span>
              <a href="/register">Register here</a>
            </div>
          </form>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <h3 className="feature-title">Master at Your Pace</h3>
            <p className="feature-text">Learn when and where it works best for you with personalized courses.</p>
          </div>
          <div className="feature-card">
            <h3 className="feature-title">Expert-Led Education</h3>
            <p className="feature-text">Learn from industry professionals with real-world experience.</p>
          </div>
          <div className="feature-card">
            <h3 className="feature-title">Interactive Learning</h3>
            <p className="feature-text">Engage with dynamic content and hands-on projects.</p>
          </div>
          <div className="feature-card">
            <h3 className="feature-title">Track Your Progress</h3>
            <p className="feature-text">Monitor your achievements with detailed analytics.</p>
          </div>
        </div>

        <div className="testimonial">
          <p className="testimonial-text">"This platform changed how I approach learning. The interactive courses and supportive community made all the difference."</p>
          <p className="testimonial-author">— Alex, Software Engineering Graduate</p>
        </div>
      </div>

      <div className="hero-section">
        <h2>Our Learning Approach</h2>
        <div className="hero-features">
          <div className="hero-feature">
            <h3>Flexible Learning</h3>
            <p>Study at your own pace with 24/7 access</p>
          </div>
          <div className="hero-feature">
            <h3>Practical Experience</h3>
            <p>Apply knowledge through real-world projects</p>
          </div>
          <div className="hero-feature">
            <h3>Continuous Support</h3>
            <p>Get help when you need it</p>
          </div>
          <div className="hero-feature">
            <h3>Career Growth</h3>
            <p>Build skills that matter</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;