import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import securityService from '../services/securityService';
import api from '../services/api';
import Navbar from '../components/Navbar';
import SendNotification from '../pages/notifications/SendNotification';

const SecurityDashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newIncident, setNewIncident] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { user, refreshProfile, setUserState } = useAuth();

  // First, ensure we have current user data
  useEffect(() => {
    const initDashboard = async () => {
      if (!user?.role) {
        await refreshProfile();
      }
    };
    initDashboard();
  }, []);

  // Then fetch security data once we have user context
  useEffect(() => {
    if (user?.role === 'security_analyst' || user?.role === 'admin') {
      fetchSecurityData();
    }
  }, [user?.role]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError('');
      // Refresh server-side profile to ensure role in DB is current and authoritative
      const refreshed = await refreshProfile();
      const effectiveRole = refreshed?.role ?? user?.role;

      if (!effectiveRole || (effectiveRole !== 'security_analyst' && effectiveRole !== 'admin')) {
        throw new Error('Insufficient permissions to access security data');
      }

      // Try fetching data, if we get a 403 we will attempt one refresh+retry to handle stale tokens/local cache
      let incidentsRes, logsRes;
      try {
        [incidentsRes, logsRes] = await Promise.all([
          securityService.getIncidents(),
          securityService.getAuditLogs()
        ]);
      } catch (firstErr) {
        if (firstErr?.response?.status === 403) {
          // Retry once after refreshing profile from server
          await refreshProfile();
          [incidentsRes, logsRes] = await Promise.all([
            securityService.getIncidents(),
            securityService.getAuditLogs()
          ]);
        } else {
          throw firstErr;
        }
      }
      
      if (!incidentsRes?.data || !logsRes?.data) {
        throw new Error('Invalid response from security service');
      }

      setIncidents(incidentsRes.data);
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error('Security data fetch error:', err);
      if (err.response?.status === 403) {
        setError('Access denied. Please ensure you have the required permissions.');
      } else {
        setError('Failed to fetch security data. Please try refreshing the page.');
      }
      // Clear data if fetch fails
      setIncidents([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Developer helper: request a debug role upgrade from the backend debug route
  // This uses the `/users/debug/set-role` endpoint which is present in the backend
  // and intended for development/testing only. It will return a new token + user.
  const requestDevRole = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post('/users/debug/set-role', { role: 'security_analyst' });
      if (res && res.data && res.data.token && res.data.user) {
        // store new token and update auth context
        localStorage.setItem('token', res.data.token);
        setUserState(res.data.user);
        // refresh profile from server (optional) and fetch data
        await refreshProfile();
        await fetchSecurityData();
      } else {
        setError('Failed to update role via debug endpoint');
      }
    } catch (err) {
      console.error('requestDevRole error', err);
      setError('Failed to request developer role: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    try {
      await securityService.reportIncident(newIncident);
      setNewIncident('');
      setShowReportModal(false);
      fetchSecurityData();
    } catch (err) {
      setError('Failed to report incident');
      console.error(err);
    }
  };

  const handleUpdateStatus = async (incidentId, newStatus) => {
    try {
      await securityService.updateIncidentStatus(incidentId, newStatus);
      fetchSecurityData();
    } catch (err) {
      setError('Failed to update incident status');
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex">
      <Navbar />
      <div className="main-content flex items-center justify-center">
        <div className="text-xl">Loading security dashboard...</div>
      </div>
    </div>
  );

  return (
    <div className="flex">
      <Navbar />
      <div className="main-content">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* If user is authenticated but doesn't have security role, offer a dev helper */}
          {user && user.role && user.role !== 'security_analyst' && user.role !== 'admin' && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-sm">No security access</strong>
                  <div className="text-xs text-gray-600">Your account does not currently have the security analyst role required to view incidents and audit logs.</div>
                  <div className="text-xs text-gray-600 mt-1">(Developer helper: request a temporary debug role)</div>
                </div>
                <div>
                  <button
                    onClick={requestDevRole}
                    className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 text-sm"
                  >
                    Request Dev Security Role
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Security Dashboard</h2>
              
            </div>
          </div>

          {/* Incidents Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Security Incidents</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    {user?.role === 'security_analyst' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr key={incident.incident_id}>
                      <td className="px-6 py-4 whitespace-nowrap">{incident.incident_id}</td>
                      <td className="px-6 py-4">{incident.description}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${incident.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                            incident.status === 'Under Investigation' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'}`}
                        >
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{incident.reporter_name}</td>
                      <td className="px-6 py-4">{new Date(incident.created_at).toLocaleDateString()}</td>
                      {user?.role === 'security_analyst' && (
                        <td className="px-6 py-4">
                          <select
                            value={incident.status}
                            onChange={(e) => handleUpdateStatus(incident.incident_id, e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Under Investigation">Under Investigation</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Audit Logs</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.log_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">{log.full_name}</td>
                      <td className="px-6 py-4">{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-x-4">
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Send Notification
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Report Incident
                </button>
              </div>
        </div>
      </div>

      {/* Report Incident Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Report Security Incident</h2>
            <form onSubmit={handleReportIncident}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newIncident}
                  onChange={(e) => setNewIncident(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows="3"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Send Notification</h2>
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SendNotification onClose={() => setShowNotificationModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;