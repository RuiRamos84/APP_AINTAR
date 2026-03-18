/**
 * AppLineChart — Recharts line chart (multi-series support)
 */
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { useTheme } from '@mui/material';
import { CHART_PALETTE, formatValue, formatAxisTick, tooltipStyle } from './chartUtils';

const AppLineChart = ({
  data = [],
  xKey,
  yKeys,
  colors,
  height = 320,
  showLegend = false,
  dots = true,
  referenceValue,
}) => {
  const theme = useTheme();
  const ts = tooltipStyle(theme);
  const palette = colors ?? CHART_PALETTE;

  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
          tickFormatter={(v) => formatAxisTick(v, 10)}
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
        {referenceValue != null && (
          <ReferenceLine y={referenceValue} stroke={theme.palette.warning.main} strokeDasharray="4 4" />
        )}
        {(yKeys ?? ['value']).map((key, idx) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={palette[idx % palette.length]}
            strokeWidth={2.5}
            dot={dots ? { r: 4, strokeWidth: 0, fill: palette[idx % palette.length] } : false}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AppLineChart;
