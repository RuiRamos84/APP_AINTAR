import apiClient from '@/services/api/client';

// ─── Endpoints ────────────────────────────────────────────────────────────────

const ENDPOINTS = {
  pending:   '/document_ramais',
  executed:  '/document_ramais_executed',
  completed: '/document_ramais_concluded',
};

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Mapeia campos do backend para nomes frontend amigáveis.
 * Calcula comprimentoTotal e areaTotal como soma bet + gra + pav.
 */
const mapPavimento = (r) => {
  const comprimentoBet = parseFloat(r.comprimento_bet ?? 0) || 0;
  const areaBet        = parseFloat(r.area_bet        ?? 0) || 0;
  const comprimentoGra = parseFloat(r.comprimento_gra ?? 0) || 0;
  const areaGra        = parseFloat(r.area_gra        ?? 0) || 0;
  const comprimentoPav = parseFloat(r.comprimento_pav ?? 0) || 0;
  const areaPav        = parseFloat(r.area_pav        ?? 0) || 0;

  return {
    pk:             r.pk,
    regnumber:      r.regnumber      ?? null,
    entity:         r.ts_entity      ?? null,
    address:        r.address        ?? null,
    door:           r.door           ?? null,
    floor:          r.floor          ?? null,
    postal:         r.postal         ?? null,
    phone:          r.phone          ?? null,
    nut4:           r.nut4           ?? null,  // Localidade
    nut3:           r.nut3           ?? null,  // Freguesia
    nut2:           r.nut2           ?? null,  // Concelho
    memo:           r.memo           ?? null,
    // Pavimento por tipo
    comprimentoBet,
    areaBet,
    comprimentoGra,
    areaGra,
    comprimentoPav,
    areaPav,
    // Totais calculados
    comprimentoTotal: comprimentoBet + comprimentoGra + comprimentoPav,
    areaTotal:        areaBet        + areaGra        + areaPav,
    // Datas
    submission:     r.submission      ?? null,
    executionDate:  r.execution_date  ?? null,
    completionDate: r.completion_date ?? null,
  };
};

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Obtém lista de pavimentações pelo status.
 * @param {'pending'|'executed'|'completed'} status
 * @returns {{ pavimentos: Array }}
 */
export const getPavimentos = async (status) => {
  const endpoint = ENDPOINTS[status];
  if (!endpoint) throw new Error(`Status inválido: ${status}`);
  const res = await apiClient.get(endpoint);
  return { pavimentos: (res?.ramais ?? []).map(mapPavimento) };
};

/**
 * Executa uma pavimentação (pendente → executada).
 * @param {number} pk
 */
export const executarPavimento = async (pk) => {
  return apiClient.put(`/document_pavenext/${pk}`);
};

/**
 * Marca uma pavimentação como paga (executada → concluída).
 * @param {number} pk
 */
export const pagarPavimento = async (pk) => {
  return apiClient.put(`/document_pavpaid/${pk}`);
};

/**
 * Adiciona um anexo (ex.: comprovativo de pagamento) a uma pavimentação.
 * @param {string} regnumber - Número de registo do pavimento
 * @param {File}   file      - Ficheiro a anexar
 * @param {string} [comment] - Comentário opcional
 */
export const addAnexo = async (regnumber, file, comment = '') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('regnumber', regnumber);
  formData.append('comment', comment);
  formData.append('steptype', 'payment_proof');
  return apiClient.post('/add_document_annex', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default {
  getPavimentos,
  executarPavimento,
  pagarPavimento,
  addAnexo,
};
