/**
 * ChartCard — card wrapper with title, chart type toggle, Excel export
 * Renders the correct Recharts component based on chartType prop
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, ToggleButton, ToggleButtonGroup,
  Tooltip, IconButton, Skeleton, Alert, alpha, useTheme,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import AppBarChart from './AppBarChart';
import AppAreaChart from './AppAreaChart';
import AppPieChart from './AppPieChart';
import AppLineChart from './AppLineChart';
import { detectKeys, autoDetectChartType } from './chartUtils';
import DataTableView from '../DataTableView';

const CHART_TYPES = [
  { value: 'bar', icon: <BarChartIcon fontSize="small" />, label: 'Barras' },
  { value: 'bar-h', icon: <BarChartIcon fontSize="small" sx={{ transform: 'rotate(90deg)' }} />, label: 'Barras H.' },
  { value: 'area', icon: <ShowChartIcon fontSize="small" />, label: 'Área' },
  { value: 'line', icon: <ShowChartIcon fontSize="small" />, label: 'Linha' },
  { value: 'pie', icon: <PieChartIcon fontSize="small" />, label: 'Pie' },
  { value: 'table', icon: <TableChartIcon fontSize="small" />, label: 'Tabela' },
];

const ChartCard = ({
  title,
  data = [],
  chartType: initialType = 'auto',
  color,
  height = 340,
  isLoading = false,
  isError = false,
  showTypeToggle = true,
  showExport = true,
  elevation = 1,
}) => {
  const theme = useTheme();
  const resolved = autoDetectChartType(data, initialType);
  const [chartType, setChartType] = useState(resolved);

  const { xKey, yKeys } = detectKeys(data[0]);

  const handleExport = () => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title?.slice(0, 31) ?? 'Dados');
    XLSX.writeFile(wb, `${title ?? 'dashboard'}.xlsx`);
  };

  const renderChart = () => {
    if (!data.length) {
      return (
        <Box sx={{ py: 8, textAlign: 'center', color: 'text.disabled' }}>
          <BarChartIcon sx={{ fontSize: 48, opacity: 0.3 }} />
          <Typography variant="body2" mt={1}>Sem dados disponíveis</Typography>
        </Box>
      );
    }

    const props = { data, xKey, yKeys, colors: color ? [color] : undefined, height };

    switch (chartType) {
      case 'bar': return <AppBarChart {...props} showLabels={data.length <= 8} />;
      case 'bar-h': return <AppBarChart {...props} horizontal showLabels={data.length <= 12} />;
      case 'area': return <AppAreaChart {...props} showLegend={yKeys.length > 1} />;
      case 'line': return <AppLineChart {...props} showLegend={yKeys.length > 1} />;
      case 'pie': return <AppPieChart data={data} nameKey={xKey} valueKey={yKeys[0]} height={height} />;
      case 'table': return <DataTableView data={data} />;
      default: return <AppBarChart {...props} />;
    }
  };

  return (
    <Card elevation={elevation} sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {showTypeToggle && (
              <ToggleButtonGroup
                value={chartType}
                exclusive
                size="small"
                onChange={(_, v) => v && setChartType(v)}
                sx={{ '& .MuiToggleButton-root': { py: 0.3, px: 0.8, border: 'none', borderRadius: 1.5 } }}
              >
                {CHART_TYPES.filter((t) => ['bar', 'bar-h', 'area', 'line', 'pie', 'table'].includes(t.value)).map((t) => (
                  <Tooltip key={t.value} title={t.label}>
                    <ToggleButton
                      value={t.value}
                      sx={{ color: chartType === t.value ? color ?? theme.palette.primary.main : 'text.secondary' }}
                    >
                      {t.icon}
                    </ToggleButton>
                  </Tooltip>
                ))}
              </ToggleButtonGroup>
            )}
            {showExport && (
              <Tooltip title={data.length ? 'Exportar Excel' : 'Sem dados para exportar'}>
                <span>
                  <IconButton size="small" onClick={handleExport} disabled={!data.length}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>

        {isLoading ? (
          <Skeleton variant="rounded" height={height} />
        ) : isError ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>Erro ao carregar dados.</Alert>
        ) : (
          <Box sx={{ bgcolor: alpha(color ?? theme.palette.primary.main, 0.02), borderRadius: 2, p: 1 }}>
            {renderChart()}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ChartCard;
