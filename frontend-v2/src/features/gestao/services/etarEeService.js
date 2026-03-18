import api from '@/services/api/client';

// ─── Volumes ──────────────────────────────────────────────────────────────────

export const getInstalacaoVolumes = async (pk) => {
  const res = await api.get(`/instalacao_volumes/${pk}`);
  return res;
};

export const createInstalacaoVolume = async (data) => {
  const res = await api.post('/instalacao_volume', data);
  return res;
};

// ─── Volumes de Água ──────────────────────────────────────────────────────────

export const getInstalacaoWaterVolumes = async (pk) => {
  const res = await api.get(`/instalacao_water_volumes/${pk}`);
  return res;
};

export const createInstalacaoWaterVolume = async (data) => {
  const res = await api.post('/instalacao_water_volume', data);
  return res;
};

// ─── Energia ──────────────────────────────────────────────────────────────────

export const getInstalacaoEnergy = async (pk) => {
  const res = await api.get(`/instalacao_energy/${pk}`);
  return res;
};

export const createInstalacaoEnergy = async (data) => {
  const res = await api.post('/instalacao_energy', data);
  return res;
};

// ─── Despesas ─────────────────────────────────────────────────────────────────

export const getInstalacaoExpenses = async (pk) => {
  const res = await api.get(`/instalacao_expenses/${pk}`);
  return res;
};

export const createInstalacaoExpense = async (data) => {
  const res = await api.post('/instalacao_expense', data);
  return res;
};

// ─── Incumprimentos (ETAR) ────────────────────────────────────────────────────

export const getETARIncumprimentos = async (pk) => {
  const res = await api.get(`/etar_incumprimentos/${pk}`);
  return res;
};

export const createETARIncumprimento = async (data) => {
  const res = await api.post('/etar_incumprimento', data);
  return res;
};

// ─── Pedidos de Intervenção ───────────────────────────────────────────────────

export const createInstalacaoDesmatacao = async (data) => {
  const res = await api.post('/instalacao/desmatacao', data);
  return res;
};

export const createInstalacaoRetiradaLamas = async (data) => {
  const res = await api.post('/instalacao/retirada_lamas', data);
  return res;
};

export const createInstalacaoReparacao = async (data) => {
  const res = await api.post('/instalacao/reparacao', data);
  return res;
};

export const createInstalacaoVedacao = async (data) => {
  const res = await api.post('/instalacao/vedacao', data);
  return res;
};

export const createInstalacaoQualidadeAmbiental = async (data) => {
  const res = await api.post('/instalacao/qualidade_ambiental', data);
  return res;
};

// ─── Detalhes ─────────────────────────────────────────────────────────────────

export const getETARDetails = async (pk) => {
  const res = await api.get(`/etar_details/${pk}`);
  return res;
};

export const getEEDetails = async (pk) => {
  const res = await api.get(`/ee_details/${pk}`);
  return res;
};

export const updateETARDetails = async (pk, data) => {
  const res = await api.put(`/etar_update/${pk}`, data);
  return res;
};

export const updateEEDetails = async (pk, data) => {
  const res = await api.put(`/ee_update/${pk}`, data);
  return res;
};
