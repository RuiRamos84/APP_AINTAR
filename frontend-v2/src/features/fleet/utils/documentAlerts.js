/**
 * Alertas de documentos de viatura (seguro/inspeção/IUC) para o dashboard de
 * Frota — mesma leitura de dias-até-expirar do alerta proativo do backend
 * (vehicle_alert_service.py), mas sem limiares fixos: aqui é só para listar
 * e ordenar por urgência, não para decidir se dispara notificação.
 */

const DOCS = [
  { field: 'insurance_date', label: 'Seguro' },
  { field: 'inspection_date', label: 'Inspeção' },
  { field: 'iuc_date', label: 'IUC' },
];

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

/**
 * @returns {Array<{ vehicle, label: string, date: Date, daysUntil: number }>}
 *   daysUntil negativo = já expirado.
 */
export const getDocumentEvents = (vehicles) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = [];
  for (const vehicle of vehicles || []) {
    for (const { field, label } of DOCS) {
      const date = parseDate(vehicle[field]);
      if (!date) continue;
      const daysUntil = Math.round((date - today) / 86400000);
      events.push({ vehicle, label, date, daysUntil });
    }
  }
  return events;
};
