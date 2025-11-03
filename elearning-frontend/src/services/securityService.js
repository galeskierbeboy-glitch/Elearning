import api from './api';

export const securityService = {
  // Get all audit logs
  getAuditLogs: async () => {
    return api.get('/security/audit-logs');
  },

  // Get all incidents
  getIncidents: async () => {
    return api.get('/security/incidents');
  },

  // Report a new incident
  reportIncident: async (description) => {
    return api.post('/security/incidents', { description });
  },

  // Update incident status
  updateIncidentStatus: async (incidentId, status) => {
    return api.put(`/security/incidents/${incidentId}`, { status });
  }
};

export default securityService;