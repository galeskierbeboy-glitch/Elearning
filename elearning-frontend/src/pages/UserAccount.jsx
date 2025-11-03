import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { userService, authService } from '../services/api';
import './UserAccount.css';

const UserAccount = () => {
  const { user, logout, refreshProfile, setUserState } = useAuth();
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
        // If server returned user, store token (if any) and immediately update auth context
        try {
          if (res.data.token) {
            localStorage.setItem('token', res.data.token);
          }

          if (setUserState) {
            // server returns fields named user_id/full_name etc. setUserState will normalize
            setUserState(res.data.user);
          }

          // Also call refreshProfile to ensure server and client are fully synced
          if (refreshProfile) await refreshProfile();
        } catch (err) {
          console.error('Failed to update auth after applying token', err);
          // As a last resort reload the page
          window.location.reload();
        }
      } else {
        // fallback: refresh profile
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

  // Ensure we fetch the authoritative profile when this page mounts
  useEffect(() => {
    if (refreshProfile) {
      // fire-and-forget; refreshProfile updates localStorage and context
      refreshProfile().catch((err) => console.error('Auto refreshProfile failed', err));
    }
  }, []);

  return (
    <div className="user-account-container flex">
      <Navbar />
      <div className="main-content max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-4">My Account</h2>
        <div className="bg-white rounded shadow p-4 mb-4">
          <p><strong>Name:</strong> {user?.full_name ?? user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role || '(no role set)'} </p>
        </div>

        <div className="bg-white rounded shadow p-4 mb-4">
          <h3 className="text-lg font-medium mb-2">Change password</h3>
          <p className="text-sm text-gray-600 mb-3">Change your password if you suspect unauthorized access. New password must be at least 8 characters.</p>
          {message && <div className="mb-2 text-sm text-red-600">{message}</div>}
          <form onSubmit={async (e) => {
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
              // If token returned, update auth context and local storage
              if (res.data?.token) {
                localStorage.setItem('token', res.data.token);
                if (setUserState) {
                  // refresh profile to sync user object
                  await refreshProfile();
                } else {
                  window.location.reload();
                }
              }
              // clear fields
              setPwCurrent(''); setPwNew(''); setPwConfirm('');
            } catch (err) {
              console.error('Change password failed', err);
              const errMsg = err.response?.data?.message || err.message || 'Failed to change password';
              setMessage(errMsg);
            } finally {
              setPwLoading(false);
            }
          }} className="space-y-2">
            <input type="password" placeholder="Current password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} className="w-full border rounded px-2 py-1" />
            <input type="password" placeholder="New password" value={pwNew} onChange={e => setPwNew(e.target.value)} className="w-full border rounded px-2 py-1" />
            <input type="password" placeholder="Confirm new password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} className="w-full border rounded px-2 py-1" />
            <div className="flex space-x-2">
              <button type="submit" disabled={pwLoading} className="px-3 py-1 bg-indigo-600 text-white rounded">{pwLoading ? 'Changing...' : 'Change password'}</button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded shadow p-4">
          {user?.role === 'student' || user?.role === 'instructor' ? (
            <>
              <h3 className="text-lg font-medium mb-2">Enter invite token</h3>
              <p className="text-sm text-gray-600 mb-3">Paste the token you received from an admin to upgrade your account role.</p>
              {message && <div className="mb-2 text-sm text-red-600">{message}</div>}
              <form onSubmit={applyToken} className="flex space-x-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste invite token"
                  className="flex-1 border rounded px-2 py-1"
                />
                <button type="submit" disabled={loading} className="px-3 py-1 bg-indigo-600 text-white rounded">{loading ? 'Applying...' : 'Apply Token'}</button>
              </form>
            </>
          ) : (
            <div>
              <h3 className="text-lg font-medium mb-2">Account status</h3>
              <p className="text-sm text-gray-600">You already have role <strong>{user?.role}</strong>. No invite token is required.</p>
            </div>
          )}
        </div>

        <div className="bg-gray-100 rounded shadow p-4 mt-4">
          <h4 className="font-medium mb-2">Debug</h4>
          <p className="text-sm text-gray-600 mb-2">(Debug tools hidden) If your role changed in the database but the UI doesn't show it yet, click the button below to refresh your profile from the server.</p>
          <div className="flex space-x-2">
            <button onClick={async () => { if (refreshProfile) await refreshProfile(); }} className="px-3 py-1 bg-blue-600 text-white rounded">Force refresh profile</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAccount;
