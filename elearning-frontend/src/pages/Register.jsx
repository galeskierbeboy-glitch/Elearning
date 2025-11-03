import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/api';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student', // allow choosing role at register
    inviteCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRequest, setInviteRequest] = useState({ name: '', email: '', role: 'security_analyst', message: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase || !hasLowerCase) {
      return 'Password must contain both uppercase and lowercase letters';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        inviteCode: formData.inviteCode
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteChange = (e) => {
    setInviteRequest({ ...inviteRequest, [e.target.name]: e.target.value });
  };

  const submitInviteRequest = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteLoading(true);
    try {
      await userService.requestInvite(inviteRequest);
      setShowInviteModal(false);
      alert('Invite request submitted — an admin will review it.');
    } catch (err) {
      console.error(err);
      setInviteError(err.message || 'Failed to submit request');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-hero">
          <h2 className="hero-title">Empower Your Learning Journey</h2>
          <p className="hero-subtitle">Transform your future with expert-led courses and a supportive learning community.</p>

          <div className="hero-features">
            <div className="hero-feature">
              <h4>Master at Your Pace</h4>
              <p>Personalized courses and flexible schedules.</p>
            </div>
            <div className="hero-feature">
              <h4>Expert-Led Education</h4>
              <p>Learn from industry professionals with real-world experience.</p>
            </div>
            <div className="hero-feature">
              <h4>Interactive Learning</h4>
              <p>Engage with dynamic content and hands-on projects.</p>
            </div>
            <div className="hero-feature">
              <h4>Track Your Progress</h4>
              <p>Monitor achievements with detailed analytics.</p>
            </div>
          </div>
        </div>

        <div className="register-form-wrap">
          <div className="form-card">
            <h3 className="form-title">Create your account</h3>
            <p className="form-sub">Join learners worldwide — secure, flexible, and career-focused.</p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="error-message">{error}</div>
              )}

              <div className="form-group">
                <label htmlFor="name" className="form-label">Full name</label>
                <input id="name" name="name" type="text" required className="form-input" placeholder="Full name" value={formData.name} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email address</label>
                <input id="email" name="email" type="email" required className="form-input" placeholder="Email address" value={formData.email} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input id="password" name="password" type="password" required className="form-input" placeholder="Password" value={formData.password} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" required className="form-input" placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="role" className="form-label">Select Role</label>
                <select id="role" name="role" required className="form-input select-input" value={formData.role} onChange={handleChange}>
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="security_analyst">Security Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {(formData.role === 'admin' || formData.role === 'security_analyst') && (
                <div className="form-group">
                  <label htmlFor="inviteCode" className="form-label">Invite Code</label>
                  <input id="inviteCode" name="inviteCode" type="text" required className="form-input" placeholder="Enter invite code" value={formData.inviteCode} onChange={handleChange} />
                </div>
              )}

              <button type="submit" disabled={loading} className="submit-btn">{loading ? 'Creating account...' : 'Register'}</button>

              <div className="link-row">Already have an account? <a href="/login">Sign in</a></div>

              <div className="invite-note">
                <button type="button" onClick={() => setShowInviteModal(true)} className="link-button">Request an invite from an admin</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
          <div className="modal-card bg-white rounded-lg p-6">
            <h3 className="text-lg font-medium mb-3">Request an Invite</h3>
            {inviteError && <div className="text-red-600 mb-2">{inviteError}</div>}
            <form onSubmit={submitInviteRequest}>
              <div className="mb-2">
                <label className="block text-sm">Name</label>
                <input name="name" value={inviteRequest.name} onChange={handleInviteChange} required className="mt-1 block w-full border rounded px-2 py-1" />
              </div>
              <div className="mb-2">
                <label className="block text-sm">Email</label>
                <input name="email" type="email" value={inviteRequest.email} onChange={handleInviteChange} required className="mt-1 block w-full border rounded px-2 py-1" />
              </div>
              <div className="mb-2">
                <label className="block text-sm">Requested Role</label>
                <select name="role" value={inviteRequest.role} onChange={handleInviteChange} className="mt-1 block w-full border rounded px-2 py-1">
                  <option value="security_analyst">Security Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-sm">Message (optional)</label>
                <textarea name="message" value={inviteRequest.message} onChange={handleInviteChange} className="mt-1 block w-full border rounded px-2 py-1" />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-3 py-1 border rounded">Cancel</button>
                <button type="submit" disabled={inviteLoading} className="px-3 py-1 bg-indigo-600 text-white rounded">{inviteLoading ? 'Sending...' : 'Send Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;