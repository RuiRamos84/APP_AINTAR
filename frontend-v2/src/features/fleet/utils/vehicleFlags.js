import { getNextMaintenanceStatus } from './maintenanceRules';

export const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

export const daysUntil = (dateStr) => {
  const d = parseDate(dateStr);
  return d ? Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)) : null;
};

// Condições usadas tanto para contar (chips) como para filtrar (clique no chip) — fonte única
export const getVehicleFlags = (v, maintenances, maintenanceTypes) => {
  const insp = daysUntil(v.inspection_date);
  const insur = daysUntil(v.insurance_date);
  const nextMaint = getNextMaintenanceStatus(v, maintenances, maintenanceTypes);
  return {
    inspExpired: insp !== null && insp < 0,
    inspWarning: insp !== null && insp >= 0 && insp <= 30,
    insurExpired: insur !== null && insur < 0,
    insurWarning: insur !== null && insur >= 0 && insur <= 30,
    maintOverdue: nextMaint?.status === 'overdue',
    maintWarning: nextMaint?.status === 'warning',
  };
};
