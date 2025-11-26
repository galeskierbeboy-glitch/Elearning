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
      {/* Top compact login header (sticky) */}
      <header className="login-header">
        <div className="login-header-inner">
          <div className="brand">Elearning</div>
          <div className="login-form-mini">
            {error && (
              <div className="mini-error" role="alert">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="mini-form">
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mini-input"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mini-input"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <button type="submit" className="mini-button">Sign In</button>
            </form>
            <div className="mini-links">
              <a href="/forgot-password">Forgot?</a>
              <a href="/register">Register</a>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable landing content below the header */}
      <main className="landing">
        <section className="landing-hero">
          <h1 className="main-heading">Empower Your Learning Journey</h1>
          <p className="sub-heading">Transform your future with expert-led courses and a supportive learning community.</p>
        </section>

        <section className="features-grid">
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
          <div className="feature-card">
            <h3 className="feature-title">Career Support</h3>
            <p className="feature-text">Get career guidance, resume reviews, and interview prep to help you land your next role.</p>
          </div>
          <div className="feature-card">
            <h3 className="feature-title">Certifications</h3>
            <p className="feature-text">Earn verifiable certificates to showcase your skills and boost employer confidence.</p>
          </div>
        </section>

        <section className="testimonial">
          <p className="testimonial-text">"This platform changed how I approach learning. The interactive courses and supportive community made all the difference."</p>
          <p className="testimonial-author">— Alex, Software Engineering Graduate</p>
        </section>

        <section className="hero-section">
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
        </section>
      </main>
    </div>
  );
};

export default Login;