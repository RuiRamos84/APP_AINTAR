import apiClient from '@/services/api/client';

// vbl_expense retorna labels (strings via JOIN), não PKs:
//   tt_expensedest → label do tipo de despesa
//   ts_associate   → nome do associado

const mapExpense = (e) => ({
  id: e.pk,
  data: e.data ?? null,
  tipoLabel: e.tt_expensedest ?? null,   // label string direto da view
  valor: e.valor != null ? parseFloat(e.valor) : null,
  associadoNome: e.ts_associate ?? null, // nome string direto da view
  memo: e.memo ?? null,
});

export const getRedeExpenses      = async () => { const res = await apiClient.get('/rede_expenses');  return { expenses: (res?.expenses ?? []).map(mapExpense) }; };
export const getRamalExpenses     = async () => { const res = await apiClient.get('/ramal_expenses'); return { expenses: (res?.expenses ?? []).map(mapExpense) }; };
export const getManutExpenses     = async () => { const res = await apiClient.get('/manut_expenses'); return { expenses: (res?.expenses ?? []).map(mapExpense) }; };
export const getEquipExpenses     = async () => { const res = await apiClient.get('/equip_expenses'); return { expenses: (res?.expenses ?? []).map(mapExpense) }; };

const buildPayload = (data) => ({
  pntt_expensedest: parseInt(data.tipoDespesaId, 10),
  pndate: data.data,
  pnval: parseFloat(data.valor),
  pnts_associate: data.associadoId ? parseInt(data.associadoId, 10) : null,
  pnmemo: data.memo || null,
});

export const createRedeExpense  = (data) => apiClient.post('/rede_expense',  buildPayload(data));
export const createRamalExpense = (data) => apiClient.post('/ramal_expense', buildPayload(data));
export const createManutExpense = (data) => apiClient.post('/manut_expense', buildPayload(data));
export const createEquipExpense = (data) => apiClient.post('/equip_expense', buildPayload(data));

export const EXPENSE_TYPES = {
  network:     { label: 'Rede',       getFn: getRedeExpenses,  createFn: createRedeExpense  },
  branches:    { label: 'Ramais',     getFn: getRamalExpenses, createFn: createRamalExpense },
  maintenance: { label: 'Manutenção', getFn: getManutExpenses, createFn: createManutExpense },
  equipment:   { label: 'Equipamento',getFn: getEquipExpenses, createFn: createEquipExpense },
};
