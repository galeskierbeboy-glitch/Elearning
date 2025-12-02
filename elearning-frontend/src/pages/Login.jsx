import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      <div className="login-form">
        <h2>LOGIN</h2>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <br />
          <input
            type="text"
            name="email"
            placeholder="Email ID"
            value={formData.email}
            onChange={handleChange}
          />
          <br /><br />
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
          <br />
          <a className="forgot-link" href="/forgot-password">Forgot Password?</a>
          <br /><br />
          <div className="submit-buttons">
            <input type="submit" value="Sign In" />
          </div>
          <div className="register">
            <p>Don't have an account yet? <a href="/register">Sign Up!</a></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;