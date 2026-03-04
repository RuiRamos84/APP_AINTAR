/**
 * DashboardCategoryPage - Visualizacoes CSS sem biblioteca de graficos
 */

import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Skeleton,
  Alert, FormControl, InputLabel, Select, MenuItem,
  LinearProgress, Chip, useTheme, alpha, IconButton, Tooltip, Stack,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarChartIcon from '@mui/icons-material/BarChart';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useDashboardCategory, useDashboardView } from '../hooks/useDashboard';

const PALETTE = ['#2196F3','#4CAF50','#FF9800','#9C27B0','#F44336','#00BCD4','#3F51B5','#E91E63','#009688','#FF5722'];

const HorizontalBarChart = ({ data, xKey, yKey, color }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => Number(d[yKey]) || 0));
  return (
    <Stack spacing={1}>
      {data.slice(0, 15).map((row, i) => {
        const val = Number(row[yKey]) || 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        return (
          <Box key={i}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography variant='caption' noWrap sx={{ maxWidth: '70%' }}>{String(row[xKey] ?? '-')}</Typography>
              <Typography variant='caption' fontWeight={700}>{val.toLocaleString('pt-PT')}</Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={pct}
              sx={{ height: 10, borderRadius: 5, bgcolor: alpha(color || '#2196F3', 0.1),
                '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: color || '#2196F3' } }}
            />
          </Box>
        );
      })}
    </Stack>
  );
};

const DonutChart = ({ data, nameKey, valueKey }) => {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  return (
    <Box>
      <Grid container spacing={1}>
        {data.slice(0, 8).map((row, i) => {
          const val = Number(row[valueKey]) || 0;
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
          return (
            <Grid key={i} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, bgcolor: PALETTE[i % PALETTE.length] }} />
                <Typography variant='caption' noWrap sx={{ flexGrow: 1 }}>{String(row[nameKey] ?? '-')}</Typography>
                <Chip label={pct + '%'} size='small' sx={{ fontSize: '0.7rem', height: 20 }} />
              </Box>
            </Grid>
          );
        })}
      </Grid>
      <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>
        Total: <strong>{total.toLocaleString('pt-PT')}</strong>
      </Typography>
    </Box>
  );
};

const KPICard = ({ title, value, subtitle, color = 'primary', icon: Icon }) => {
  const theme = useTheme();
  return (
    <Card sx={{ height: '100%', bgcolor: alpha(theme.palette[color].main, 0.05), border: '1px solid ' + alpha(theme.palette[color].main, 0.2), transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant='body2' color='text.secondary' fontWeight={500}>{title}</Typography>
          {Icon && <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: theme.palette[color].main, color: 'white' }}><Icon sx={{ fontSize: 20 }} /></Box>}
        </Box>
        <Typography variant='h4' fontWeight={700} color={color + '.main'}>{value ?? '-'}</Typography>
        {subtitle && <Typography variant='caption' color='text.secondary'>{subtitle}</Typography>}
      </CardContent>
    </Card>
  );
};

const ViewChart = ({ viewName, chartType = 'bar', color }) => {
  const { data = [], isLoading, isError } = useDashboardView(viewName);
  if (isLoading) return <Skeleton variant='rounded' height={280} />;
  if (isError) return <Alert severity='error'>Erro ao carregar dados.</Alert>;
  if (!data.length) return (
    <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>
      <BarChartIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
      <Typography variant='body2'>Sem dados disponíveis</Typography>
    </Box>
  );
  const keys = Object.keys(data[0]);
  const xKey = keys[0];
  const yKey = keys.find((k) => k !== xKey && typeof data[0][k] === 'number') || keys[1];
  if (chartType === 'pie') return <DonutChart data={data} nameKey={xKey} valueKey={yKey} />;
  return <HorizontalBarChart data={data} xKey={xKey} yKey={yKey} color={color} />;
};

const DashboardCategoryPage = ({ title, subtitle, icon, color = '#2196f3', breadcrumbs, category, kpiConfig = [], views = [] }) => {
  const [selectedView, setSelectedView] = useState(views[0]?.name ?? '');
  const { data: categoryData, isLoading: kpiLoading, refetch } = useDashboardCategory(category);
  const activeView = views.find((v) => v.name === selectedView);

  return (
    <ModulePage title={title} subtitle={subtitle} icon={icon} color={color} breadcrumbs={breadcrumbs}
      actions={<Tooltip title='Atualizar'><IconButton onClick={() => refetch()} size='small'><RefreshIcon /></IconButton></Tooltip>}
    >
      {kpiConfig.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpiConfig.map((kpi, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              {kpiLoading ? <Skeleton variant='rounded' height={100} /> : <KPICard title={kpi.title} value={kpi.getValue ? kpi.getValue(categoryData) : categoryData?.[kpi.field]} subtitle={kpi.subtitle} color={kpi.color || 'primary'} icon={kpi.icon} />}
            </Grid>
          ))}
        </Grid>
      )}
      {views.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant='h6' fontWeight={600}>{activeView?.label ?? 'Dados'}</Typography>
            <FormControl size='small' sx={{ minWidth: 260 }}>
              <InputLabel>Vista</InputLabel>
              <Select value={selectedView} label='Vista' onChange={(e) => setSelectedView(e.target.value)}>
                {views.map((v) => <MenuItem key={v.name} value={v.name}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          {selectedView && <ViewChart viewName={selectedView} chartType={activeView?.chartType || 'bar'} color={color} />}
        </Paper>
      )}
    </ModulePage>
  );
};

export default DashboardCategoryPage;
