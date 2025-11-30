import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [inviteRequests, setInviteRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [approving, setApproving] = useState(null);
  const [banning, setBanning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenModal, setTokenModal] = useState({ show: false, token: '', expires: '' });
  const [updatingRoles, setUpdatingRoles] = useState({});
  

  useEffect(() => {
    fetchUsers();
    fetchInviteRequests();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
        const res = await userService.getAllUsers();
        if (res.data?.message?.includes('Access denied')) {
          setError('Access denied: Admin privileges required');
          return;
        }
        setUsers(res.data || []);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to load users';
        setError(`Error loading users: ${errorMsg}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInviteRequests = async () => {
    try {
      setRequestsLoading(true);
        const res = await userService.listInviteRequests();
        if (res.data?.message?.includes('Access denied')) {
          setError('Access denied: Admin privileges required');
          return;
        }
        setInviteRequests(res.data || []);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to load invite requests';
        setError(`Error loading invite requests: ${errorMsg}`);
        console.error('Invite requests error:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      setError('');
      setUpdatingRoles(prev => ({ ...prev, [userId]: true }));
      
      // Optimistically update the UI
      setUsers(users.map(u => 
        u.user_id === userId 
          ? { ...u, role }
          : u
      ));

      const response = await userService.updateUserRole(userId, role);
      
      if (response.data?.user) {
        // Confirm the update with server response
        setUsers(users.map(u => 
          u.user_id === userId 
            ? { ...u, role: response.data.user.role }
            : u
        ));
      } else {
        // Fallback to full refresh if response format is unexpected
        fetchUsers();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update role';
      setError(`Role update failed: ${errorMessage}`);
      console.error('Role update error:', err);
      // Refresh users list to ensure consistent state
      fetchUsers();
    } finally {
      setUpdatingRoles(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleApprove = async (id) => {
    try {
      setApproving(id);
      const res = await userService.approveInviteRequest(id);
      setTokenModal({
        show: true,
        token: res.data.token,
        expires: new Date(res.data.expires).toLocaleString()
    });
      fetchInviteRequests();
    } catch (err) {
      console.error('Approve failed', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to approve';
      setError(`Failed to approve: ${errorMessage}`);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id) => {
    try {
      await userService.rejectInviteRequest(id);
      fetchInviteRequests();
    } catch (err) {
      console.error('Reject failed', err);
      setError('Failed to reject');
    }
  };

  const handleBan = async (userId) => {
    try {
      if (!window.confirm('Are you sure you want to ban/delete this user? This action is irreversible.')) return;
      setBanning(userId);
      setError('');
      await userService.deleteUser(userId);
      // Remove from local list
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      // Refresh invite requests as well just in case
      fetchInviteRequests();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to ban user';
      setError(`Ban failed: ${errorMessage}`);
      console.error('Ban error:', err);
    } finally {
      setBanning(null);
    }
  };

  if (loading) return (
    <div className="flex">
      <Navbar />
      <div className="main-contents flex items-center justify-center">
        <div className="text-xl">Loading admin dashboard...</div>
      </div>
    </div>
  );

  return (
    <div className="flex">
      <Navbar />
      <div className="main-contents">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="table-container">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="px-6 py-4 whitespace-nowrap">{u.user_id}</td>
                    <td className="px-6 py-4">{u.full_name}</td>
                    <td className="px-6 py-4 email-cell">{u.email}</td>
                    <td className="px-6 py-4 role-cell">{u.role}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                          disabled={updatingRoles[u.user_id] || u.role === 'admin'}
                          className={`mt-1 block w-48 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                            updatingRoles[u.user_id] 
                              ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="student">student</option>
                          <option value="instructor">instructor</option>
                          <option value="security_analyst">security_analyst</option>
                          <option value="admin">admin</option>
                        </select>

                        {/* Show Ban button only for non-admin roles */}
                        {u.user_id !== user.user_id && u.role !== 'admin' && (
                          <button
                            onClick={() => handleBan(u.user_id)}
                            disabled={banning === u.user_id}
                            className={`btn btn-ban ${banning === u.user_id ? 'banning' : ''}`}
                          >
                            {banning === u.user_id ? 'Banning...' : 'Ban'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Invite Requests</h3>
            {requestsLoading ? (
              <div>Loading requests...</div>
            ) : (
              <div className="table-container">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inviteRequests.map((r) => (
                      <tr key={r.request_id}>
                        <td className="px-6 py-4">{r.request_id}</td>
                        <td className="px-6 py-4">{r.name}</td>
                        <td className="px-6 py-4">{r.email}</td>
                        <td className="px-6 py-4 role-cell">{r.role}</td>
                        <td className="px-6 py-4 status-cell">{r.status}</td>
                        <td className="px-6 py-4">
                          {r.status === 'pending' ? (
                            <div className="flex space-x-2">
                              <button onClick={() => handleApprove(r.request_id)} disabled={approving===r.request_id} className="btn btn-approve">{approving===r.request_id?'Approving...':'Approve'}</button>
                              <button onClick={() => handleReject(r.request_id)} className="btn btn-reject">Reject</button>
                            </div>
                          ) : (
                            <span className="text-sm text-indigo-600">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Token Modal */}
      {tokenModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="modal-content">
            <h3 className="text-lg font-medium mb-4">Invite Token Generated</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Token</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  readOnly
                  value={tokenModal.token}
                  className="block w-full pr-10 border-gray-300 rounded-md"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(tokenModal.token)}
                  className="btn btn-copy"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Expires</label>
              <div className="mt-1 text-sm text-gray-600">
                {tokenModal.expires}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setTokenModal({ show: false, token: '', expires: '' })}
                className="btn btn-close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
