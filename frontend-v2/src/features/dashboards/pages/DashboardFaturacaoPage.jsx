/**
 * DashboardFaturacaoPage
 * Dashboard de Faturação AINTAR — todos os anos, por mês
 */

import { useMemo } from 'react';
import { Box, Paper, Typography, Divider, useTheme, alpha } from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useDashboardView } from '../hooks/useDashboard';
import ChartCard from '../components/charts/ChartCard';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const COLOR = '#1976d2';

export const DashboardFaturacaoPage = () => {
  const theme = useTheme();

  const { data = [], isLoading, isError } = useDashboardView('vds_faturacao_01');

  const chartData = useMemo(() => {
    if (!data.length) return [];
    return [...data]
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map((r) => ({
        Período: `${MONTH_NAMES[(r.month ?? 1) - 1]} ${r.year}`,
        Faturado: Number(r.faturado) || 0,
        Cobrado: Number(r.cobrado) || 0,
      }));
  }, [data]);

  return (
    <ModulePage
      title="Faturação AINTAR"
      subtitle="Dados de faturação por mês e ano"
      icon={ReceiptIcon}
      color={COLOR}
      breadcrumbs={[
        { label: 'Dashboards', path: '/dashboards/overview' },
        { label: 'Faturação', path: '/dashboards/faturacao' },
      ]}
    >
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 1.5, md: 3 } }}>
          <ChartCard
            title="Faturação AINTAR"
            data={chartData}
            chartType="line"
            color={COLOR}
            height={420}
            isLoading={isLoading}
            isError={isError}
            elevation={0}
          />
        </Box>

        <Divider />
        <Box sx={{ px: 3, py: 1.5 }}>
          <Typography variant="caption" color="text.disabled">
            Vista: <strong>vds_faturacao_01</strong>
            {!isLoading && data.length > 0 && (
              <> · {data.length} registos</>
            )}
          </Typography>
        </Box>
      </Paper>
    </ModulePage>
  );
};

export default DashboardFaturacaoPage;
