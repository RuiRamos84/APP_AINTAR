import api from '@/services/api/client';

/**
 * Service for Vehicle Fleet Management (Sprint 1)
 */

export const getVehicles = async () => {
  const response = await api.get('/vehicle_list');
  return response;
};

export const createVehicle = async (data) => {
  const response = await api.post('/vehicle_create', data);
  return response;
};

export const updateVehicle = async (id, data) => {
  const response = await api.put(`/vehicle_update/${id}`, data);
  return response;
};

// ================= Assignments =================

export const getVehicleAssignments = async () => {
  const response = await api.get('/vehicle_assign_list');
  return response;
};

export const createAssignment = async (data) => {
  const response = await api.post('/vehicle_assign_create', data);
  return response;
};

export const updateAssignment = async (id, data) => {
  const response = await api.put(`/vehicle_assign_update/${id}`, data);
  return response;
};

// ================= Maintenance =================

export const getMaintenances = async () => {
  const response = await api.get('/vehicle_maintenance_list');
  return response;
};

export const createMaintenance = async (data) => {
  const response = await api.post('/vehicle_maintenance_create', data);
  return response;
};

export const updateMaintenance = async (id, data) => {
  const response = await api.put(`/vehicle_maintenance_update/${id}`, data);
  return response;
};

export default {
  getVehicles,
  createVehicle,
  updateVehicle,
  
  getVehicleAssignments,
  createAssignment,
  updateAssignment,

  getMaintenances,
  createMaintenance,
  updateMaintenance
};
