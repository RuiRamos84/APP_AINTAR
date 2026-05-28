import api from '@/services/api/client';

// ─── Metadata ────────────────────────────────────────────────────────────────

export const getStockTypes = () => api.get('/stock/types');
export const getUnits = () => api.get('/stock/units');

// ─── Artigos ─────────────────────────────────────────────────────────────────

export const getStockItems = () => api.get('/stock/items');
export const createStockItem = (data) => api.post('/stock/items', data);
export const updateStockItem = (pk, data) => api.put(`/stock/items/${pk}`, data);
export const deleteStockItem = (pk) => api.delete(`/stock/items/${pk}`);

// ─── Stock Atual ─────────────────────────────────────────────────────────────

export const getStockCurrent = () => api.get('/stock/current');

// ─── Entradas ────────────────────────────────────────────────────────────────

export const getStockIn = () => api.get('/stock/in');
export const createStockIn = (data) => api.post('/stock/in', data);
export const updateStockIn = (pk, data) => api.put(`/stock/in/${pk}`, data);
export const deleteStockIn = (pk) => api.delete(`/stock/in/${pk}`);

// ─── Saídas ──────────────────────────────────────────────────────────────────

export const getStockOut = () => api.get('/stock/out');
export const createStockOut = (data) => api.post('/stock/out', data);
export const updateStockOut = (pk, data) => api.put(`/stock/out/${pk}`, data);
export const deleteStockOut = (pk) => api.delete(`/stock/out/${pk}`);
