import apiClient from '@/services/api/client';

// ─── Obras ────────────────────────────────────────────────────────────────────

// A view vbl_obra retorna PKs (sem joins). Labels resolvidos client-side com meta.
const mapObra = (o) => ({
  id: o.pk,
  nome: o.nome,
  tipoObraLabel: o.tt_tipoobra ?? null,    // label string (JOIN via view)
  instalacaoNome: o.tb_instalacao ?? null, // "Nome (ETAR)" string (JOIN via view)
  associadoNome: o.ts_associate ?? null,   // entity name string (JOIN via view)
  urgenciaLabel: o.tt_urgencia ?? null,    // label string (JOIN via view)
  dataPrevista: o.data_prevista ?? null,
  dataInicio: o.data_obra_inicio ?? null,
  dataFim: o.data_obra_fim ?? null,
  estado: o.estado ?? 0,
  valorEstimado: o.valor_estimado ?? null,
  valorAintar: o.valor_exec_aintar ?? null,
  valorSubsidio: o.valor_exec_subsidio ?? null,
  valorMunicipio: o.valor_exec_municipio ?? null,
  aviso: o.aviso ?? null,
  memo: o.memo ?? null,
});

// vbl_obra_despesa: pk, tb_obra, tt_despesaobra (=label do tipo via JOIN), data, valor, memo
// Não tem obra_nome — lookup client-side via lista de obras
const mapDespesa = (d) => ({
  id: d.pk,
  obraId: d.tb_obra ?? null,
  obraNome: null, // não está na view, resolvido client-side
  tipoDespesa: null, // pk não está na view
  tipoDespesaLabel: d.tt_despesaobra ?? null, // já é o label (t.value AS tt_despesaobra)
  data: d.data ?? null,
  valor: d.valor ?? null,
  memo: d.memo ?? null,
});

// ─── List ──────────────────────────────────────────────────────────────────────

export const getObras = async () => {
  const res = await apiClient.get('/obras_list');
  return { obras: (res?.obras ?? []).map(mapObra) };
};

export const getObrasByInstalacao = async (instalacaoPk) => {
  const res = await apiClient.get(`/obras_list/${instalacaoPk}`);
  return { obras: (res?.obras ?? []).map(mapObra) };
};

// ─── CRUD Obra ─────────────────────────────────────────────────────────────────

export const createObra = async (data) => {
  return apiClient.post('/obra_create', {
    nome: data.nome,
    tt_tipoobra: data.tipoObra ? parseInt(data.tipoObra, 10) : undefined,
    ts_associate: data.associadoId ? parseInt(data.associadoId, 10) : undefined,
    tb_instalacao: data.instalacaoId ? parseInt(data.instalacaoId, 10) : undefined,
    tt_urgencia: data.urgencia ? parseInt(data.urgencia, 10) : undefined,
    data_prevista: data.dataPrevista || null,
    data_obra_inicio: data.dataInicio || null,
    data_obra_fim: data.dataFim || null,
    valor_estimado: data.valorEstimado ? parseFloat(data.valorEstimado) : null,
    valor_exec_aintar: data.valorAintar ? parseFloat(data.valorAintar) : null,
    valor_exec_subsidio: data.valorSubsidio ? parseFloat(data.valorSubsidio) : null,
    valor_exec_municipio: data.valorMunicipio ? parseFloat(data.valorMunicipio) : null,
    estado: data.estado !== undefined ? Number(data.estado) : 0,
    aviso: data.aviso || null,
    memo: data.memo || null,
  });
};

export const updateObra = async (pk, data) => {
  const payload = {};
  if (data.nome !== undefined) payload.nome = data.nome;
  if (data.tipoObra !== undefined) payload.tt_tipoobra = data.tipoObra ? parseInt(data.tipoObra, 10) : null;
  if (data.associadoId !== undefined) payload.ts_associate = data.associadoId ? parseInt(data.associadoId, 10) : null;
  if (data.urgencia !== undefined) payload.tt_urgencia = data.urgencia ? parseInt(data.urgencia, 10) : null;
  if (data.dataPrevista !== undefined) payload.data_prevista = data.dataPrevista || null;
  if (data.dataInicio !== undefined) payload.data_obra_inicio = data.dataInicio || null;
  if (data.dataFim !== undefined) payload.data_obra_fim = data.dataFim || null;
  if (data.valorEstimado !== undefined) payload.valor_estimado = data.valorEstimado !== '' ? parseFloat(data.valorEstimado) : null;
  if (data.valorAintar !== undefined) payload.valor_exec_aintar = data.valorAintar !== '' ? parseFloat(data.valorAintar) : null;
  if (data.valorSubsidio !== undefined) payload.valor_exec_subsidio = data.valorSubsidio !== '' ? parseFloat(data.valorSubsidio) : null;
  if (data.valorMunicipio !== undefined) payload.valor_exec_municipio = data.valorMunicipio !== '' ? parseFloat(data.valorMunicipio) : null;
  if (data.estado !== undefined) payload.estado = Number(data.estado);
  if (data.aviso !== undefined) payload.aviso = data.aviso || null;
  if (data.memo !== undefined) payload.memo = data.memo || null;
  return apiClient.put(`/obra_update/${pk}`, payload);
};

export const deleteObra = async (pk) => {
  return apiClient.delete(`/obra_delete/${pk}`);
};

// ─── Despesas ──────────────────────────────────────────────────────────────────

export const getDespesas = async () => {
  const res = await apiClient.get('/obra_despesa_list');
  return { despesas: (res?.despesas ?? []).map(mapDespesa) };
};

export const getDespesasByInstalacao = async (instalacaoPk) => {
  const res = await apiClient.get(`/obra_despesa_list_by_instalacao/${instalacaoPk}`);
  return { despesas: (res?.despesas ?? []).map(mapDespesa) };
};

export const createDespesa = async (data) => {
  return apiClient.post('/obra_despesa_create', {
    tb_obra: data.obraId ? parseInt(data.obraId, 10) : undefined,
    tt_despesaobra: data.tipoDespesa ? parseInt(data.tipoDespesa, 10) : undefined,
    data: data.data,
    valor: data.valor !== '' ? parseFloat(data.valor) : undefined,
    memo: data.memo || null,
  });
};

export const updateDespesa = async (pk, data) => {
  const payload = {};
  if (data.obraId !== undefined) payload.tb_obra = data.obraId ? parseInt(data.obraId, 10) : null;
  if (data.tipoDespesa !== undefined) payload.tt_despesaobra = data.tipoDespesa ? parseInt(data.tipoDespesa, 10) : null;
  if (data.data !== undefined) payload.data = data.data || null;
  if (data.valor !== undefined) payload.valor = data.valor !== '' ? parseFloat(data.valor) : null;
  if (data.memo !== undefined) payload.memo = data.memo || null;
  return apiClient.put(`/obra_despesa_update/${pk}`, payload);
};

export default {
  getObras, getObrasByInstalacao,
  createObra, updateObra, deleteObra,
  getDespesas, getDespesasByInstalacao,
  createDespesa, updateDespesa,
};
