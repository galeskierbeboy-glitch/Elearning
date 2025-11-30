import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import securityService from '../services/securityService';
import api from '../services/api';
import Navbar from '../components/Navbar';
import SendNotification from '../pages/notifications/SendNotification';
import './SecurityDashboard.css';

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

  // Helper: convert array of objects to CSV and trigger download
  const downloadCSV = (filename, items) => {
    if (!items || items.length === 0) {
      setError('No data available to download');
      return;
    }

    const keys = Object.keys(items[0]);
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const header = keys.join(',');
    const rows = items.map(row => keys.map(k => escape(row[k])).join(','));
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadIncidentsCSV = () => {
    // sanitize and flatten incidents to simple key-values
    const rows = incidents.map(i => ({
      incident_id: i.incident_id,
      description: i.description,
      status: i.status,
      reported_by: i.reported_by || i.reporter_name || '',
      created_at: i.created_at
    }));
    downloadCSV('incidents.csv', rows);
  };

  const handleDownloadAuditLogsCSV = () => {
    const rows = auditLogs.map(l => ({
      log_id: l.log_id,
      timestamp: l.timestamp,
      user_id: l.user_id,
      full_name: l.full_name || '',
      action: l.action
    }));
    downloadCSV('audit_logs.csv', rows);
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
      <div className="security-dashboard-main-contents flex items-center justify-center">
        <div className="text-xl">Loading security dashboard...</div>
      </div>
    </div>
  );

  return (
    <div className="flex">
      <Navbar />
      <div className="security-dashboard-main-contents">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="security-dashboard-error-message">
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
                    className="btn btn-dev-role"
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
            <div className="flex gap-2">
              <button
                onClick={() => setShowNotificationModal(true)}
                className="btn btn-notification"
              >
                Send Notification
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="btn btn-report"
              >
                Report Incident
              </button>
              <button
                onClick={handleDownloadIncidentsCSV}
                className="btn btn-download"
              >
                Download Incidents
              </button>
              <button
                onClick={handleDownloadAuditLogsCSV}
                className="btn btn-download"
              >
                Download Audit Logs
              </button>
            </div>
          </div>

          {/* Incidents Section */}
          <div className="security-dashboard-table-container mb-8">
            <h3 className="security-dashboard-table-title">Security Incidents</h3>
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Reported By</th>
                    <th>Date / Time</th>
                    {user?.role === 'security_analyst' && (
                      <th>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.incident_id}>
                      <td className="px-6 py-4 whitespace-nowrap">{incident.incident_id}</td>
                      <td className="px-6 py-4">{incident.description}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${incident.status === 'Pending' ? 'status-pending' : 
                            incident.status === 'Under Investigation' ? 'status-investigating' : 
                            'status-resolved'}`}
                        >
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{incident.reporter_name}</td>
                      <td className="px-6 py-4">
                        {new Date(incident.created_at).toLocaleDateString()} {' '}
                        <span className="text-sm">{new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      {user?.role === 'security_analyst' && (
                        <td className="px-6 py-4">
                          <select
                            value={incident.status}
                            onChange={(e) => handleUpdateStatus(incident.incident_id, e.target.value)}
                            className="security-dashboard-select"
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

          {/* Audit Logs Section */}
          <div className="security-dashboard-table-container mb-8">
            <h3 className="security-dashboard-table-title">Audit Logs</h3>
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
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
      </div>
      {/* Report Incident Modal */}
{/* REPORT INCIDENT MODAL — CENTERED + BLURRED BG */}
{showReportModal && (
  <div className="security-dashboard-modal-overlay" onClick={() => setShowReportModal(false)}>
    <div className="security-dashboard-modal-content" onClick={e => e.stopPropagation()}>
      
      <h2 className="security-dashboard-modal-title">Report Security Incident</h2>
      
      <form onSubmit={handleReportIncident}>
        <textarea
          value={newIncident}
          onChange={e => setNewIncident(e.target.value)}
          placeholder="Describe the incident..."
          required
          rows={6}
          className="w-full bg-transparent border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-accent-color focus:outline-none resize-none"
        />
        
        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={() => setShowReportModal(false)} className="btn btn-cancel">
            Cancel
          </button>
          <button type="submit" className="btn btn-report">
            Submit Report
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* SEND NOTIFICATION MODAL — CENTERED + BLURRED BG */}
{showNotificationModal && (
  <div className="security-dashboard-modal-overlay" onClick={() => setShowNotificationModal(false)}>
    <div className="security-dashboard-modal-content max-w-5xl" onClick={e => e.stopPropagation()}>
      <SendNotification onClose={() => setShowNotificationModal(false)} />
    </div>
  </div>
)}
    </div>
  );
};

export default SecurityDashboard;