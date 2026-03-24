import apiClient from '@/services/api/client';

const BASE = '/equipamentos';

// ─── Mapeamento backend → frontend ───────────────────────────────────────────

const mapEquipamento = (eq) => ({
  id: eq.pk,
  tipo: eq['tt_equipamento$tipo'] ?? null,
  marca: eq.marca,
  modelo: eq.modelo,
  serial: eq.serial ?? '',
  fileManual: eq.file_manual ?? null,
  fileSpecs: eq.file_specs ?? null,
  fileEsquemas: eq.file_esquemas ?? null,
});

const mapAloc = (a) => ({
  id: a.pk,
  equipamentoId: a.tb_equipamento,
  alocTipo: a['tt_equipamento$aloc'] ?? null,
  instalacaoId: a.pk_instalacao ?? null,
  instalacao: a.tb_instalacao ?? null,
  localizacao: a['tt_equipamento$localizacao'] ?? null,
  client: a.ts_client ?? null,
  startDate: a.start_date ?? null,
  stopDate: a.stop_date ?? null,
  memo: a.memo ?? '',
  ord: a.ord ?? 1,
});

const mapSpec = (s) => ({
  id: s.pk,
  equipamentoId: s.tb_equipamento,
  specTipo: s['tt_equipamento$spec'] ?? null,
  valor: s.valor,
});

const mapRepair = (r) => ({
  id: r.pk,
  equipamentoId: r.tb_equipamento,
  data: r.data,
  valor: r.valor ?? null,
  memo: r.memo ?? '',
});

// ─── Meta ─────────────────────────────────────────────────────────────────────

export const getMeta = async () => {
  const res = await apiClient.get(`${BASE}/meta`);
  return res;
};

// ─── Equipamento ──────────────────────────────────────────────────────────────

export const getEquipamentos = async () => {
  const res = await apiClient.get(BASE);
  return {
    equipamentos: (res?.equipamentos ?? []).map((eq) => ({
      ...mapEquipamento(eq),
      estado: eq.estado ?? null,
      instalacao: eq.instalacao ?? null,
      localizacao: eq.localizacao ?? null,
    })),
  };
};

export const getEquipamentosByInstalacao = async (instalacaoPk) => {
  const res = await apiClient.get(
    `${BASE}/by-instalacao/${instalacaoPk}`
  );
  return (res?.equipamentos ?? []).map((eq) => ({
    id: eq.pk,
    tipo: eq['tt_equipamento$tipo'] ?? null,
    marca: eq.marca,
    modelo: eq.modelo,
    serial: eq.serial ?? '',
    alocPk: eq.aloc_pk,
    estado: eq.estado ?? null,
    localizacao: eq.localizacao ?? null,
    startDate: eq.start_date ?? null,
    memo: eq.memo ?? '',
  }));
};

export const getEquipamento = async (pk) => {
  const res = await apiClient.get(`${BASE}/${pk}`);
  return mapEquipamento(res?.equipamento ?? {});
};

export const createEquipamento = async (data) => {
  return apiClient.post(BASE, {
    tt_equipamento_tipo: data.tipoId,
    marca: data.marca,
    modelo: data.modelo,
    serial: data.serial || null,
    file_manual: data.fileManual || null,
    file_specs: data.fileSpecs || null,
    file_esquemas: data.fileEsquemas || null,
  });
};

export const updateEquipamento = async (pk, data) => {
  return apiClient.put(`${BASE}/${pk}`, {
    tt_equipamento_tipo: data.tipoId,
    marca: data.marca,
    modelo: data.modelo,
    serial: data.serial || null,
    file_manual: data.fileManual || null,
    file_specs: data.fileSpecs || null,
    file_esquemas: data.fileEsquemas || null,
  });
};

export const deleteEquipamento = async (pk) => {
  return apiClient.delete(`${BASE}/${pk}`);
};

// ─── Alocações ────────────────────────────────────────────────────────────────

export const getAloc = async (equipamentoPk) => {
  const res = await apiClient.get(`${BASE}/${equipamentoPk}/aloc`);
  return (res?.alocacoes ?? []).map(mapAloc);
};

export const createAloc = async (equipamentoPk, data) => {
  return apiClient.post(`${BASE}/${equipamentoPk}/aloc`, {
    tt_equipamento_aloc: data.alocTipoId,
    tb_instalacao: data.instalacaoId || null,
    tt_equipamento_localizacao: data.localizacaoId || null,
    ts_client: data.clientId || null,
    start_date: data.startDate,
    stop_date: data.stopDate || null,
    memo: data.memo || null,
    ord: data.ord ?? 1,
  });
};

export const updateAloc = async (equipamentoPk, alocPk, data) => {
  return apiClient.put(`${BASE}/${equipamentoPk}/aloc/${alocPk}`, {
    tt_equipamento_aloc: data.alocTipoId,
    tb_instalacao: data.instalacaoId || null,
    tt_equipamento_localizacao: data.localizacaoId || null,
    ts_client: data.clientId || null,
    start_date: data.startDate,
    stop_date: data.stopDate || null,
    memo: data.memo || null,
    ord: data.ord ?? 1,
  });
};

export const deleteAloc = async (equipamentoPk, alocPk) => {
  return apiClient.delete(`${BASE}/${equipamentoPk}/aloc/${alocPk}`);
};

export const reallocarEquipamento = async (pk, data) => {
  return apiClient.post(`${BASE}/${pk}/reallocar`, {
    tt_equipamento_aloc: data.alocTipoId,
    tb_instalacao: data.instalacaoId || null,
    tt_equipamento_localizacao: data.localizacaoId || null,
    ts_client: data.clientId || null,
    data: data.data,
    memo: data.memo || null,
    ord: data.ord ?? 1,
  });
};

// ─── Especificações ───────────────────────────────────────────────────────────

export const getSpecs = async (equipamentoPk) => {
  const res = await apiClient.get(`${BASE}/${equipamentoPk}/specs`);
  return (res?.specs ?? []).map(mapSpec);
};

export const createSpec = async (equipamentoPk, data) => {
  return apiClient.post(`${BASE}/${equipamentoPk}/specs`, {
    tt_equipamento_spec: data.specTipoId,
    valor: data.valor,
  });
};

export const updateSpec = async (equipamentoPk, specPk, data) => {
  return apiClient.put(`${BASE}/${equipamentoPk}/specs/${specPk}`, {
    tt_equipamento_spec: data.specTipoId,
    valor: data.valor,
  });
};

export const deleteSpec = async (equipamentoPk, specPk) => {
  return apiClient.delete(`${BASE}/${equipamentoPk}/specs/${specPk}`);
};

// ─── Manutenções ──────────────────────────────────────────────────────────────

export const getRepairs = async (equipamentoPk) => {
  const res = await apiClient.get(`${BASE}/${equipamentoPk}/repairs`);
  return (res?.repairs ?? []).map(mapRepair);
};

export const createRepair = async (equipamentoPk, data) => {
  return apiClient.post(`${BASE}/${equipamentoPk}/repairs`, {
    data: data.data,
    valor: data.valor || null,
    memo: data.memo,
  });
};

export const updateRepair = async (equipamentoPk, repPk, data) => {
  return apiClient.put(`${BASE}/${equipamentoPk}/repairs/${repPk}`, {
    data: data.data,
    valor: data.valor || null,
    memo: data.memo,
  });
};

export const deleteRepair = async (equipamentoPk, repPk) => {
  return apiClient.delete(`${BASE}/${equipamentoPk}/repairs/${repPk}`);
};

export default {
  getMeta,
  getEquipamentos, getEquipamento, createEquipamento, updateEquipamento, deleteEquipamento,
  getAloc, createAloc, updateAloc, deleteAloc,
  getSpecs, createSpec, updateSpec, deleteSpec,
  getRepairs, createRepair, updateRepair, deleteRepair,
};
