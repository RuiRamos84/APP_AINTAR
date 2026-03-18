/**
 * Pavimentos Service
 * Gestão de pavimentações: pendentes, executadas, concluídas
 */

import apiClient from '@/services/api/client';

// ─── Constantes de configuração ──────────────────────────────────────────────

export const PAVIMENTATION_STATUS = {
  pending:   { label: 'Pendente',   endpoint: '/document_ramais',          actionEndpoint: '/document_pavenext', nextStatus: 'executed' },
  executed:  { label: 'Executada',  endpoint: '/document_ramais_executed',  actionEndpoint: '/document_pavpaid',  nextStatus: 'completed' },
  completed: { label: 'Concluída',  endpoint: '/document_ramais_concluded', actionEndpoint: null,                 nextStatus: null },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcTotals = (item) => ({
  ...item,
  comprimento_total: (
    parseFloat(item.comprimento_bet || 0) +
    parseFloat(item.comprimento_gra || 0) +
    parseFloat(item.comprimento_pav || 0)
  ),
  area_total: (
    parseFloat(item.area_bet || 0) +
    parseFloat(item.area_gra || 0) +
    parseFloat(item.area_pav || 0)
  ),
});

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Obter lista de pavimentações por estado
 * @param {'pending'|'executed'|'completed'} status
 */
export const getPavimentos = async (status) => {
  const config = PAVIMENTATION_STATUS[status];
  const res = await apiClient.get(config.endpoint);
  const items = (res?.ramais || []).map(calcTotals);
  return items;
};

/**
 * Avançar estado de uma pavimentação (pending→executed ou executed→completed)
 * @param {'pending'|'executed'} fromStatus
 * @param {number} pk
 */
export const advancePavimento = async (fromStatus, pk) => {
  const config = PAVIMENTATION_STATUS[fromStatus];
  if (!config.actionEndpoint) throw new Error('Estado não permite esta ação');
  const res = await apiClient.put(`${config.actionEndpoint}/${pk}`);
  return res;
};
