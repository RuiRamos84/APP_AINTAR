import api from '@/services/api/client';

const BASE = '/telemetry';

const telemetryService = {
  getSensorTypes: () => api.get(`${BASE}/tiposensor`),
  getTeleparams:  () => api.get(`${BASE}/params`),
  getSensors:     () => api.get(`${BASE}/sensores`),
  getStats:       () => api.get(`${BASE}/stats`),

  querySensors: (sensortypePk, teleparamPk, dateFrom, dateTo) =>
    api.post(`${BASE}/sensores/query`, {
      sensortype_pk: sensortypePk || null,
      teleparam_pk:  teleparamPk  || null,
      date_from:     dateFrom     || null,
      date_to:       dateTo       || null,
    }),

  queryData: (sensorPks, teleparam, dateFrom, dateTo) =>
    api.post(`${BASE}/query`, {
      sensor_pks: sensorPks,
      teleparam:  teleparam,
      date_from:  dateFrom || null,
      date_to:    dateTo   || null,
    }),

  markAsProcessed: (pk) => api.put(`${BASE}/dados/${pk}/processed`),
};

export default telemetryService;
