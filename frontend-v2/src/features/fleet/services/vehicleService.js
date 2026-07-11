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

export const endVehicleAssign = async (tbVehicle) => {
  const response = await api.post(`/vehicle_assign_end/${tbVehicle}`);
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

export const updateMaintenanceStatus = async (id, status, price, memo) => {
  const response = await api.put(`/vehicle_maintenance_status/${id}`, { status, price, memo });
  return response;
};

// ================= Reservations =================

export const getReservations = async (filters = {}) => {
  const response = await api.get('/vehicle_reservation_list', { params: filters });
  return response;
};

export const createReservation = async (data) => {
  const response = await api.post('/vehicle_reservation_create', data);
  return response;
};

export const updateReservation = async (id, data) => {
  const response = await api.put(`/vehicle_reservation_update/${id}`, data);
  return response;
};

export const cancelReservation = async (id) => {
  const response = await api.post(`/vehicle_reservation_cancel/${id}`);
  return response;
};

export const completeReservation = async (id, km) => {
  const response = await api.post(`/vehicle_reservation_complete/${id}`, km != null ? { km } : {});
  return response;
};

// ================= A Minha Viatura =================

export const getMyVehicle = async () => {
  const response = await api.get('/my_vehicle');
  return response;
};

export const reportBreakdown = async (data) => {
  const response = await api.post('/vehicle_breakdown_report', data);
  return response;
};

export default {
  getVehicles,
  createVehicle,
  updateVehicle,

  getVehicleAssignments,
  createAssignment,
  updateAssignment,
  endVehicleAssign,

  getMaintenances,
  createMaintenance,
  updateMaintenance,
  updateMaintenanceStatus,

  getReservations,
  createReservation,
  updateReservation,
  cancelReservation,
  completeReservation,

  getMyVehicle,
  reportBreakdown,
};
