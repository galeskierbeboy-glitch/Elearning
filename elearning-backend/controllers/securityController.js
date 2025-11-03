import { pool } from '../config/db.js';

export const getAuditLogs = async (req, res) => {
  try {
    const limit = 100; // Limit to last 100 entries
    const [logs] = await pool.query(`
      SELECT a.*, u.full_name, u.email 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.user_id 
      ORDER BY a.timestamp DESC
      LIMIT ?
    `, [limit]);
    res.json(logs);
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
};

export const reportIncident = async (req, res) => {
  try {
    const { description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO incidents (reported_by, description) VALUES (?, ?)',
      [req.user.id, description]
    );
    
    // Log the incident report in audit logs
    await pool.query(
      'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
      [req.user.id, `Reported incident ID: ${result.insertId}`]
    );

    res.status(201).json({
      message: 'Incident reported successfully',
      incident_id: result.insertId
    });
  } catch (error) {
    console.error('Incident reporting error:', error);
    res.status(500).json({ message: 'Error reporting incident' });
  }
};

export const updateIncidentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const [incident] = await pool.query(
      'SELECT * FROM incidents WHERE incident_id = ?',
      [id]
    );

    if (incident.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    await pool.query(
      'UPDATE incidents SET status = ? WHERE incident_id = ?',
      [status, id]
    );

    // Log the status update in audit logs
    await pool.query(
      'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
      [req.user.id, `Updated incident ${id} status to ${status}`]
    );

    res.json({ message: 'Incident status updated successfully' });
  } catch (error) {
    console.error('Incident update error:', error);
    res.status(500).json({ message: 'Error updating incident' });
  }
};

export const getIncidents = async (req, res) => {
  try {
    const limit = 100; // Limit to last 100 entries
    const [incidents] = await pool.query(`
      SELECT i.*, u.full_name as reporter_name
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.user_id
      ORDER BY i.created_at DESC
      LIMIT ?
    `, [limit]);
    res.json(incidents);
  } catch (error) {
    console.error('Incidents fetch error:', error);
    res.status(500).json({ message: 'Error fetching incidents' });
  }
};