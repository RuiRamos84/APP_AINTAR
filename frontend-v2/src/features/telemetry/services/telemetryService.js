// features/telemetry/services/telemetryService.js
import apiClient from '@/services/api/client';

const BASE = '/telemetry';

export const getSensorData = (params = {}) => {
  const { limit, sensor, jsontag } = params;
  return apiClient.get(`${BASE}/dados`, {
    params: {
      ...(limit !== undefined && { limit }),
      ...(sensor && { sensor }),
      ...(jsontag && { jsontag }),
    },
  });
};

export const getSensors = () => apiClient.get(`${BASE}/sensores`);

export const getSensorTypes = () => apiClient.get(`${BASE}/tiposensor`);

export const querySensors = (sensortypePk, teleparamPk, dateFrom, dateTo) =>
  apiClient.post(`${BASE}/sensores/query`, {
    sensortype_pk: sensortypePk ?? null,
    teleparam_pk: teleparamPk ?? null,
    date_from: dateFrom ?? null,
    date_to: dateTo ?? null,
  });

export const getTeleparams = () => apiClient.get(`${BASE}/params`);

export const getStats = () => apiClient.get(`${BASE}/stats`);

export const markAsProcessed = (pk) =>
  apiClient.put(`${BASE}/dados/${pk}/processed`);

export const queryData = (sensorPks, teleparam, dateFrom, dateTo) =>
  apiClient.post(`${BASE}/query`, {
    sensor_pks: sensorPks,
    teleparam,
    date_from: dateFrom ?? null,
    date_to: dateTo ?? null,
  });
