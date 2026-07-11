import React, { useMemo } from 'react';
import {
  Box, Grid, Typography, Chip, Stack, Skeleton, Alert, Button, Divider,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Description as DocIcon,
  Build as BuildIcon,
  ReportProblem as BreakdownIcon,
  EuroSymbol as EuroIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenances } from '../hooks/useMaintenances';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getDocumentEvents } from '../utils/documentAlerts';
import { getAllMaintenanceAlerts } from '../utils/maintenanceRules';
import { BREAKDOWN_TYPE_PK } from './MaintenanceList.jsx';
import FleetStatCard from '../components/FleetStatCard.jsx';

const EMPTY_ARRAY = [];
const DOC_HORIZON_DAYS = 90; // não listar documentos que só expiram daqui a muito tempo

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);

const vehicleLabel = (v) => (v?.licence ? `${v.brand} ${v.model} (${v.licence})` : `${v?.brand ?? ''} ${v?.model ?? ''}`);

const daysAgo = (str) => {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

const FleetOverview = ({ onNavigateTab }) => {
  const { vehicles, isLoading: loadingVehicles, isError: errorVehicles, refetch: refetchVehicles } = useVehicles();
  const { maintenances, isLoading: loadingMaintenances, isError: errorMaintenances, refetch: refetchMaintenances } = useMaintenances();
  const { data: metaData } = useMetaData();
  const maintenanceTypes = metaData?.maintenancetype || EMPTY_ARRAY;

  const isLoading = loadingVehicles || loadingMaintenances;
  const isError = errorVehicles || errorMaintenances;

  const documentEvents = useMemo(
    () => getDocumentEvents(vehicles).filter((e) => e.daysUntil <= DOC_HORIZON_DAYS),
    [vehicles]
  );

  const maintenanceAlerts = useMemo(
    () => getAllMaintenanceAlerts(vehicles, maintenances, maintenanceTypes),
    [vehicles, maintenances, maintenanceTypes]
  );

  const openBreakdowns = useMemo(
    () => maintenances
      .filter((m) => m.tt_maintenancetype_pk === BREAKDOWN_TYPE_PK && m.ts_maintenancestatus !== 3)
      .sort((a, b) => new Date(a.hist_time) - new Date(b.hist_time)),
    [maintenances]
  );

  const totalMaintenanceCostThisYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return maintenances
      .filter((m) => m.data && new Date(m.data).getFullYear() === currentYear)
      .reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0);
  }, [maintenances]);

  // Tabela combinada "Próximos Eventos" — documentos (por dias até expirar) e
  // manutenções (por rácio, sem uma data de expiração fixa) não partilham a
  // mesma métrica; unificam-se por "tier" de urgência (0=expirado/atraso,
  // 1=atenção/<=30 dias, 2=aviso a médio prazo) e dentro do tier pela métrica
  // própria de cada tipo.
  const events = useMemo(() => {
    const docEvents = documentEvents.map((e) => ({
      kind: 'document',
      vehicle: e.vehicle,
      label: e.label,
      detail: e.daysUntil < 0 ? `Expirado há ${Math.abs(e.daysUntil)} dia(s)` : `Expira em ${e.daysUntil} dia(s)`,
      tier: e.daysUntil < 0 ? 0 : e.daysUntil <= 30 ? 1 : 2,
      sortKey: e.daysUntil,
    }));

    const maintEvents = maintenanceAlerts.map((a) => ({
      kind: 'maintenance',
      vehicle: a.vehicle,
      label: a.typeName,
      detail: a.status === 'overdue' ? 'Em atraso' : 'Em atenção',
      tier: a.status === 'overdue' ? 0 : 1,
      sortKey: -a.ratio * 1000,
    }));

    return [...docEvents, ...maintEvents].sort((a, b) => a.tier - b.tier || a.sortKey - b.sortKey);
  }, [documentEvents, maintenanceAlerts]);

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => { refetchVehicles(); refetchMaintenances(); }}>
            Tentar novamente
          </Button>
        }
      >
        Não foi possível carregar a visão geral da frota.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <FleetStatCard
            title="Viaturas"
            value={vehicles.length}
            icon={<CarIcon />}
            color="primary.main"
            loading={isLoading}
            onClick={() => onNavigateTab?.('vehicles')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <FleetStatCard
            title="Documentos a expirar"
            value={documentEvents.filter((e) => e.daysUntil <= 30).length}
            icon={<DocIcon />}
            color={documentEvents.some((e) => e.daysUntil < 0) ? 'error.main' : 'warning.main'}
            loading={isLoading}
            onClick={() => onNavigateTab?.('vehicles')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <FleetStatCard
            title="Manutenções em atenção/atraso"
            value={maintenanceAlerts.length}
            icon={<BuildIcon />}
            color={maintenanceAlerts.some((a) => a.status === 'overdue') ? 'error.main' : 'warning.main'}
            loading={isLoading}
            onClick={() => onNavigateTab?.('vehicles')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <FleetStatCard
            title="Avarias em aberto"
            value={openBreakdowns.length}
            icon={<BreakdownIcon />}
            color="error.main"
            loading={isLoading}
            onClick={() => onNavigateTab?.('maintenance')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <FleetStatCard
            title={`Custo manutenção (${new Date().getFullYear()})`}
            value={formatCurrency(totalMaintenanceCostThisYear)}
            icon={<EuroIcon />}
            color="info.main"
            loading={isLoading}
            onClick={() => onNavigateTab?.('maintenance')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Próximos Eventos
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            {isLoading ? (
              <Stack spacing={1}>
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />)}
              </Stack>
            ) : events.length === 0 ? (
              <Box textAlign="center" py={4}>
                <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Tudo em dia — sem documentos ou manutenções a precisar de atenção.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {events.slice(0, 10).map((e, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.75, sm: 1.5 },
                      p: 1, borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                      <Chip label={e.vehicle.licence} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, minWidth: 90 }} />
                      <Chip
                        label={e.detail}
                        size="small"
                        color={e.tier === 0 ? 'error' : e.tier === 1 ? 'warning' : 'default'}
                        sx={{ display: { xs: 'inline-flex', sm: 'none' }, ml: 'auto' }}
                      />
                    </Stack>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{e.label}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{vehicleLabel(e.vehicle)}</Typography>
                    </Box>
                    <Chip
                      label={e.detail}
                      size="small"
                      color={e.tier === 0 ? 'error' : e.tier === 1 ? 'warning' : 'default'}
                      sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Avarias em Aberto
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            {isLoading ? (
              <Stack spacing={1}>
                {[1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />)}
              </Stack>
            ) : openBreakdowns.length === 0 ? (
              <Box textAlign="center" py={4}>
                <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Sem avarias por resolver.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {openBreakdowns.map((m) => {
                  const days = daysAgo(m.hist_time);
                  return (
                    <Box
                      key={m.pk}
                      onClick={() => onNavigateTab?.('maintenance')}
                      sx={{
                        display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.75, sm: 1.5 },
                        p: 1, borderRadius: 1,
                        cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <Chip label={m.licence} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, minWidth: 90 }} />
                        <Chip
                          label={m.status}
                          size="small"
                          color={m.ts_maintenancestatus === 2 ? 'info' : 'warning'}
                          sx={{ display: { xs: 'inline-flex', sm: 'none' }, ml: 'auto' }}
                        />
                      </Stack>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{m.brand} {m.model}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {days != null ? `Reportada há ${days} dia(s)` : 'Reportada'}
                        </Typography>
                      </Box>
                      <Chip
                        label={m.status}
                        size="small"
                        color={m.ts_maintenancestatus === 2 ? 'info' : 'warning'}
                        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FleetOverview;
