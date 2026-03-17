import api from "./api";

const BASE = "/telemetry";

const telemetryService = {
    getSensorData: (params = {}) => {
        const { limit, sensor, jsontag } = params;
        return api.get(`${BASE}/dados`, {
            params: {
                ...(limit !== undefined && { limit }),
                ...(sensor && { sensor }),
                ...(jsontag && { jsontag }),
            },
        });
    },

    getSensors: () => api.get(`${BASE}/sensores`),

    getSensorTypes: () => api.get(`${BASE}/tiposensor`),

    querySensors: (sensortypePk, teleparamPk, dateFrom, dateTo) =>
        api.post(`${BASE}/sensores/query`, {
            sensortype_pk: sensortypePk || null,
            teleparam_pk: teleparamPk || null,
            date_from: dateFrom || null,
            date_to: dateTo || null,
        }),

    getTeleparams: () => api.get(`${BASE}/params`),

    getStats: () => api.get(`${BASE}/stats`),

    markAsProcessed: (pk) => api.put(`${BASE}/dados/${pk}/processed`),

    queryData: (sensorPks, teleparam, dateFrom, dateTo) =>
        api.post(`${BASE}/query`, {
            sensor_pks: sensorPks,
            teleparam: teleparam,
            date_from: dateFrom || null,
            date_to: dateTo || null,
        }),
};

export default telemetryService;
