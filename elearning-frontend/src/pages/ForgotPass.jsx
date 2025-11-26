import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPass.css';
import { userService } from '../services/api';

const ForgotPass = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submitEmail = async (e) => {
    e?.preventDefault();
    setMessage('');
    if (!email) return setMessage('Please enter your email');
    try {
      setLoading(true);
      const res = await userService.forgotStart(email);
      const found = res.data?.found;
      if (found) {
        setStep(2);
        setMessage('Account found. Enter the 6-digit backup code.');
      } else {
        // Do not reveal too much, but guide user
        setMessage('If an account exists we sent instructions. Enter code if you have one.');
        setStep(2);
      }
    } catch (err) {
      console.error('forgot start', err);
      setMessage(err.response?.data?.message || err.message || 'Error locating account');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e?.preventDefault();
    setMessage('');
    if (!code || code.length !== 6) return setMessage('Enter the 6-digit code');
    try {
      setLoading(true);
      const res = await userService.forgotVerify(email, code);
      const token = res.data?.resetToken;
      if (token) {
        setResetToken(token);
        setStep(3);
        setMessage('Code verified. Enter a new password.');
      } else {
        setMessage('Verification failed');
      }
    } catch (err) {
      console.error('verify code', err);
      setMessage(err.response?.data?.message || err.message || 'Code verification failed');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e) => {
    e?.preventDefault();
    setMessage('');
    if (!newPassword || newPassword.length < 8) return setMessage('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setMessage('Passwords do not match');
    try {
      setLoading(true);
      const res = await userService.forgotReset(resetToken, newPassword);
      setMessage('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      console.error('reset password', err);
      setMessage(err.response?.data?.message || err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <h2>Account Recovery</h2>
        <p className="muted">Use your 6-digit backup code to reset your password.</p>
        {message && <div className="forgot-message">{message}</div>}

        {step === 1 && (
          <form onSubmit={submitEmail} className="forgot-form">
            <label>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Find Account'}</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitCode} className="forgot-form">
            <label>6-digit Backup Code</label>
            <input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} maxLength={6} />
            <div className="forgot-actions">
              <button type="button" onClick={() => setStep(1)} className="ghost">Back</button>
              <button type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify Code'}</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={submitNewPassword} className="forgot-form">
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <label>Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <div className="forgot-actions">
              <button type="button" onClick={() => setStep(2)} className="ghost">Back</button>
              <button type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            </div>
          </form>
        )}

        <div className="forgot-footer">
          <a href="/login">Return to Login</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPass;
