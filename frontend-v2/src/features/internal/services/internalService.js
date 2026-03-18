import api from '@/services/api/client';

// ─── Inventário ───────────────────────────────────────────────────────────────

export const getInventoryList = async () => {
  const response = await api.get('/inventory_list');
  return response;
};

export const createInventory = async (data) => {
  const response = await api.post('/inventory_create', data);
  return response;
};

export const updateInventory = async (pk, data) => {
  const response = await api.put(`/inventory_update/${pk}`, data);
  return response;
};

export const deleteInventory = async (pk) => {
  const response = await api.delete(`/inventory_delete/${pk}`);
  return response;
};

// ─── Requisição Interna ───────────────────────────────────────────────────────

export const createRequisicaoInterna = async (pnmemo) => {
  const response = await api.post('/requisicao_interna', { pnmemo });
  return response;
};

// ─── Despesas (Manutenção) ────────────────────────────────────────────────────

export const getManutExpenses = async () => {
  const response = await api.get('/manut_expenses');
  return response;
};

export const createManutExpense = async (data) => {
  const response = await api.post('/manut_expense', data);
  return response;
};

// ─── Despesas (Equipamento) ───────────────────────────────────────────────────

export const getEquipExpenses = async () => {
  const response = await api.get('/equip_expenses');
  return response;
};

export const createEquipExpense = async (data) => {
  const response = await api.post('/equip_expense', data);
  return response;
};

// ─── Despesas (Rede) ──────────────────────────────────────────────────────────

export const getRedeExpenses = async () => {
  const response = await api.get('/rede_expenses');
  return response;
};

export const createRedeExpense = async (data) => {
  const response = await api.post('/rede_expense', data);
  return response;
};

export const createRedeDesobstrucao = async (data) => {
  const response = await api.post('/rede/desobstrucao', data);
  return response;
};

export const createRedeReparacao = async (data) => {
  const response = await api.post('/rede/reparacao_colapso', data);
  return response;
};

export const createCaixaDesobstrucao = async (data) => {
  const response = await api.post('/caixas/desobstrucao', data);
  return response;
};

export const createCaixaReparacao = async (data) => {
  const response = await api.post('/caixas/reparacao', data);
  return response;
};

export const createCaixaReparacaoTampa = async (data) => {
  const response = await api.post('/caixas/reparacao_tampa', data);
  return response;
};

// ─── Despesas (Ramais) ────────────────────────────────────────────────────────

export const getRamalExpenses = async () => {
  const response = await api.get('/ramal_expenses');
  return response;
};

export const createRamalExpense = async (data) => {
  const response = await api.post('/ramal_expense', data);
  return response;
};

export const createRamalDesobstrucao = async (data) => {
  const response = await api.post('/ramais/desobstrucao', data);
  return response;
};

export const createRamalReparacao = async (data) => {
  const response = await api.post('/ramais/reparacao', data);
  return response;
};
