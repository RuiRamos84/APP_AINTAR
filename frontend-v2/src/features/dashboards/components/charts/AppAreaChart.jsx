/**
 * AppAreaChart — Recharts area chart with gradient fill (for trend/time-series data)
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useTheme } from '@mui/material';
import { CHART_PALETTE, formatValue, formatAxisTick, tooltipStyle } from './chartUtils';

const AppAreaChart = ({
  data = [],
  xKey,
  yKeys,
  colors,
  height = 320,
  showLegend = false,
  curved = true,
}) => {
  const theme = useTheme();
  const ts = tooltipStyle(theme);
  const palette = colors ?? CHART_PALETTE;

  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
        <defs>
          {(yKeys ?? ['value']).map((key, idx) => (
            <linearGradient key={key} id={`grad_${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={palette[idx % palette.length]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={palette[idx % palette.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
          tickFormatter={(v) => formatAxisTick(v, 14)}
          interval={0}
        />
        <YAxis
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
          tickFormatter={formatValue}
          width={55}
        />
        <Tooltip
          contentStyle={ts.contentStyle}
          labelStyle={ts.labelStyle}
          itemStyle={ts.itemStyle}
          formatter={ts.formatter}
        />
        {showLegend && <Legend />}
        {(yKeys ?? ['value']).map((key, idx) => (
          <Area
            key={key}
            type={curved ? 'monotone' : 'linear'}
            dataKey={key}
            stroke={palette[idx % palette.length]}
            strokeWidth={2.5}
            fill={`url(#grad_${key})`}
            dot={{ r: 4, fill: palette[idx % palette.length], strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AppAreaChart;
