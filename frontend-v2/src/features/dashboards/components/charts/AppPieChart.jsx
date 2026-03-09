/**
 * AppPieChart — Recharts pie/donut chart with scrollable custom legend
 */
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTheme, Box, Typography } from '@mui/material';
import { CHART_PALETTE, formatValue, tooltipStyle } from './chartUtils';

const LEGEND_ITEM_HEIGHT = 28; // px per item
const LEGEND_VISIBLE_ITEMS = 6;

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const AppPieChart = ({
  data = [],
  nameKey,
  valueKey,
  colors,
  height = 320,
  donut = true,
  showLegend = true,
}) => {
  const theme = useTheme();
  const ts = tooltipStyle(theme);
  const palette = colors ?? CHART_PALETTE;

  if (!data.length) return null;

  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  const innerRadius = donut ? '38%' : 0;
  const hasMany = data.length > LEGEND_VISIBLE_ITEMS;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height }}>
      {/* Pie chart */}
      <Box sx={{ position: 'relative', flex: showLegend ? '0 0 55%' : '1', height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="72%"
              dataKey={valueKey}
              nameKey={nameKey}
              labelLine={false}
              label={renderCustomLabel}
              animationBegin={0}
              animationDuration={700}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={palette[idx % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={ts.contentStyle}
              labelStyle={ts.labelStyle}
              formatter={(val, name) => [formatValue(val), name]}
            />
          </PieChart>
        </ResponsiveContainer>
        {donut && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="h5" fontWeight={700} lineHeight={1}>
              {formatValue(total)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
          </Box>
        )}
      </Box>

      {/* Custom scrollable legend */}
      {showLegend && (
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              overflowY: hasMany ? 'auto' : 'visible',
              maxHeight: LEGEND_ITEM_HEIGHT * LEGEND_VISIBLE_ITEMS,
              pr: 0.5,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: theme.palette.divider,
                borderRadius: 2,
              },
            }}
          >
            {data.map((row, idx) => {
              const val = Number(row[valueKey]) || 0;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              const label = String(row[nameKey] ?? '-');
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    height: LEGEND_ITEM_HEIGHT,
                    px: 0.5,
                    borderRadius: 1,
                    '&:hover': { bgcolor: theme.palette.action.hover },
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      flexShrink: 0,
                      bgcolor: palette[idx % palette.length],
                    }}
                  />
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ flex: 1, minWidth: 0, color: 'text.secondary', fontSize: 11 }}
                    title={label}
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ flexShrink: 0, fontSize: 11, color: 'text.primary' }}
                  >
                    {pct}%
                  </Typography>
                </Box>
              );
            })}
          </Box>
          {hasMany && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ mt: 0.5, fontSize: 10, textAlign: 'right' }}
            >
              ↕ {data.length} itens
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AppPieChart;
