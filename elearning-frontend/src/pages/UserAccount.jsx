import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/api';
import './UserAccount.css';

const UserAccount = () => {
  const { user, refreshProfile, setUserState } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const applyToken = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!token) {
      setMessage('Please paste the invite token');
      return;
    }
    try {
      setLoading(true);
      const res = await userService.applyInviteToken(token);
      setMessage(`Success! Server response: ${res.data.message || 'Role updated'}`);

      if (res.data && res.data.user) {
        try {
          if (res.data.token) {
            localStorage.setItem('token', res.data.token);
          }
          if (setUserState) {
            setUserState(res.data.user);
          }
          if (refreshProfile) await refreshProfile();
        } catch (err) {
          console.error('Failed to update auth after applying token', err);
          window.location.reload();
        }
      } else {
        if (refreshProfile) {
          await refreshProfile();
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Apply token failed', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to apply token';
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refreshProfile) {
      refreshProfile().catch((err) => console.error('Auto refreshProfile failed', err));
    }
  }, [refreshProfile]);

  return (
    <div className="account-container">
      <Navbar />

      <div className="account-main-content">
        <h2 className="account-header-title">My Account</h2>

        {/* PROFILE CARD */}
        <div className="account-profile-card">
          <div className="account-avatar">
            {user?.full_name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="account-info">
            <p><strong>Name:</strong> {user?.full_name ?? user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role || '(no role set)'}</p>
          </div>
        </div>

        {/* CHANGE PASSWORD */}
        <div className="account-card">
          <h3 className="account-section-title">Change Password</h3>
          <p className="account-description">
            Change your password if you suspect unauthorized access. New password must be at least 8 characters.
          </p>
          {message && <div className="account-message">{message}</div>}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setMessage('');
              if (!pwCurrent || !pwNew || !pwConfirm) {
                setMessage('Please fill all password fields');
                return;
              }
              if (pwNew.length < 8) {
                setMessage('New password must be at least 8 characters');
                return;
              }
              if (pwNew !== pwConfirm) {
                setMessage('New password and confirmation do not match');
                return;
              }
              try {
                setPwLoading(true);
                const res = await userService.changePassword({ currentPassword: pwCurrent, newPassword: pwNew });
                const successMsg = res.data?.message || 'Password changed';
                setMessage(successMsg);
                if (res.data?.token) {
                  localStorage.setItem('token', res.data.token);
                  if (setUserState) await refreshProfile();
                  else window.location.reload();
                }
                setPwCurrent(''); setPwNew(''); setPwConfirm('');
              } catch (err) {
                console.error('Change password failed', err);
                const errMsg = err.response?.data?.message || err.message || 'Failed to change password';
                setMessage(errMsg);
              } finally {
                setPwLoading(false);
              }
            }}
            className="account-form"
          >
            <input
              type="password"
              placeholder="Current password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className="account-input"
            />
            <input
              type="password"
              placeholder="New password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="account-input"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className="account-input"
            />
            <div className="account-btn-group">
              <button type="submit" disabled={pwLoading} className="account-btn account-btn-primary">
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* INVITE TOKEN */}
        <div className="account-card">
          {user?.role === 'student' || user?.role === 'instructor' ? (
            <>
              <h3 className="account-section-title">Enter Invite Token</h3>
              <p className="account-description">
                Paste the token you received from an admin to upgrade your account role.
              </p>
              {message && <div className="account-message">{message}</div>}
              <form onSubmit={applyToken} className="account-form account-flex">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste invite token"
                  className="account-input account-flex-1"
                />
                <button type="submit" disabled={loading} className="account-btn account-btn-primary">
                  {loading ? 'Applying...' : 'Apply Token'}
                </button>
              </form>
            </>
          ) : (
            <div>
              <h3 className="account-section-title">Account Status</h3>
              <p className="account-description">
                You already have role <strong>{user?.role}</strong>. No invite token is required.
              </p>
            </div>
          )}
        </div>

        {/* DEBUG CARD */}
        <div className="account-debug-card">
          <h4 className="account-debug-title">Debug</h4>
          <p className="account-description">
            (Debug tools hidden) If your role changed in the database but the UI doesn't show it yet, click the button below to refresh your profile from the server.
          </p>
          <div className="account-btn-group">
            <button
              onClick={async () => {
                if (refreshProfile) await refreshProfile();
              }}
              className="account-btn account-btn-danger"
            >
              Force Refresh Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAccount;