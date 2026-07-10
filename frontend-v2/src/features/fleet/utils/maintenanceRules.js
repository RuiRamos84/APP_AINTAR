/**
 * Regras de alerta de manutenção por quilometragem e/ou tempo — "a cada X km
 * OU Y meses, o que ocorrer primeiro". Cálculo 100% client-side (mesmo padrão
 * já usado para os alertas de inspeção/seguro em VehicleList.jsx).
 */

const monthsBetween = (from, to) => {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(months, 0);
};

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Devolve o estado de manutenção mais urgente para uma viatura, entre todos os
 * tipos de manutenção com interval_km e/ou interval_months definidos.
 *
 * Sem manutenções desse tipo ainda registadas, o "último km/data" cai para
 * delivery_km/delivery da viatura (nunca 0/agora) — evita falso "em atraso"
 * assim que uma viatura usada é registada no sistema.
 *
 * @returns {{ typeName: string, status: 'overdue'|'warning', kmSince: number|null, monthsSince: number|null }|null}
 */
export const getNextMaintenanceStatus = (vehicle, maintenances, maintenanceTypes) => {
  const candidates = (maintenanceTypes || [])
    .filter((type) => type.interval_km || type.interval_months)
    .map((type) => {
      const recordsOfType = (maintenances || []).filter(
        (m) => m.tb_vehicle === vehicle.pk && m.tt_maintenancetype_pk === type.pk
      );

      const lastKm = recordsOfType.length
        ? Math.max(...recordsOfType.map((m) => m.km ?? 0))
        : (vehicle.delivery_km ?? 0);

      const lastDateStr = recordsOfType.length
        ? recordsOfType.reduce((latest, m) => (!latest || m.data > latest ? m.data : latest), null)
        : vehicle.delivery;
      const lastDate = parseDate(lastDateStr);

      const kmSince = vehicle.current_km != null ? vehicle.current_km - lastKm : null;
      const monthsSince = lastDate ? monthsBetween(lastDate, new Date()) : null;

      const ratios = [];
      if (type.interval_km && kmSince != null) ratios.push(kmSince / type.interval_km);
      if (type.interval_months && monthsSince != null) ratios.push(monthsSince / type.interval_months);

      if (!ratios.length) return null;

      const ratio = Math.max(...ratios);
      const status = ratio >= 1 ? 'overdue' : ratio >= 0.9 ? 'warning' : 'ok';

      return { typeName: type.value, status, ratio, kmSince, monthsSince };
    })
    .filter((result) => result && result.status !== 'ok');

  if (!candidates.length) return null;

  return candidates.sort((a, b) => b.ratio - a.ratio)[0];
};
