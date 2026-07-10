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

// ─── Mapa ─────────────────────────────────────────────────────────────────────

export const getInstalacoesMapa = async () => {
  const res = await api.get('/instalacoes/mapa');
  return res;
};

// ─── Rede de Saneamento ───────────────────────────────────────────────────────

export const getRedeSaneamento = async () => {
  const res = await api.get('/rede_saneamento');
  return res;
};

export const createRedeSaneamento = async ({ instalacao_origem, instalacao_destino }) => {
  const res = await api.post('/rede_saneamento', { instalacao_origem, instalacao_destino });
  return res;
};

export const deleteRedeSaneamento = async (pk) => {
  const res = await api.delete(`/rede_saneamento/${pk}`);
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

// ─── Autocontrolo (ETAR) ──────────────────────────────────────────────────────

export const getInstalacaoAutocontrolo = async (pk, ano) => {
  const res = await api.get(`/instalacao_autocontrolo/${pk}`, { params: { ano } });
  return res;
};

export const updateInstalacaoAutocontrolo = async ({ pk, data }) => {
  const res = await api.put(`/instalacao_autocontrolo/${pk}`, data);
  return res;
};

export const getInstalacaoAutocontroloResumo = async (ano) => {
  const res = await api.get('/instalacao_autocontrolo_resumo', { params: { ano } });
  return res;
};

export const getInstalacaoAutocontroloPeriodos = async (ano) => {
  const res = await api.get('/instalacao_autocontrolo_periodos', { params: { ano } });
  return res;
};

export const extractPdfBoletim = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/instalacao_autocontrolo/extract_pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res;
};

export const confirmarMapeamentoPdf = async ({ local_colheita, tb_instalacao }) => {
  const res = await api.post('/instalacao_autocontrolo/confirmar_mapeamento', { local_colheita, tb_instalacao });
  return res;
};

// Grava boletim + incumprimentos + mapeamento do Local de Colheita numa única
// transação no backend — evita o estado parcial de fazer isto em vários pedidos.
export const importarBoletimAutocontrolo = async (payload) => {
  const res = await api.post('/instalacao_autocontrolo/importar_boletim', payload);
  return res;
};

// ─── Licenças (APA) ───────────────────────────────────────────────────────────

export const getLicencasEtar = async () => {
  const res = await api.get('/licencas/etar');
  return res;
};

// ─── Descarga Interdita ───────────────────────────────────────────────────────

export const createDescargaInterdita = async ({ pk_instalacao, pk_entity, pnmemo }) => {
  const res = await api.post('/descarga_interdita', { pk_instalacao, pk_entity, pnmemo });
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
