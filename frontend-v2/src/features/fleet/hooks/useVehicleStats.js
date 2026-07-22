import { useMemo } from 'react';
import { useVehicles } from './useVehicles';
import { useMaintenances } from './useMaintenances';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getVehicleFlags } from '../utils/vehicleFlags';

const EMPTY_MAINTENANCE_TYPES = [];

export const STAT_FILTER_KEYS = [
  'inspExpired',
  'insurExpired',
  'inspWarning',
  'insurWarning',
  'maintOverdue',
  'maintWarning',
];

// Hook partilhado entre FleetDashboard (chips/contagens na linha das tabs) e
// VehicleList (colunas da tabela + filtro por chip clicado) — evita duplicar
// o cálculo de flags por veículo nos dois sítios. React Query deduplica os
// pedidos HTTP subjacentes, por isso chamar em ambos não custa rede extra.
export function useVehicleStats() {
  const { vehicles, isLoading } = useVehicles();
  const { maintenances } = useMaintenances();
  const { data: metaData } = useMetaData();
  const maintenanceTypes = metaData?.maintenancetype || EMPTY_MAINTENANCE_TYPES;

  const vehicleFlags = useMemo(
    () => new Map(vehicles.map((v) => [v.pk, getVehicleFlags(v, maintenances, maintenanceTypes)])),
    [vehicles, maintenances, maintenanceTypes]
  );

  const counts = useMemo(() => {
    const c = {};
    STAT_FILTER_KEYS.forEach((k) => {
      c[k] = 0;
    });
    vehicleFlags.forEach((flags) => {
      STAT_FILTER_KEYS.forEach((k) => {
        if (flags[k]) c[k]++;
      });
    });
    return c;
  }, [vehicleFlags]);

  return { vehicles, vehicleFlags, counts, isLoading, maintenances, maintenanceTypes };
}
