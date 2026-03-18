/**
 * AppBarChart — Recharts-based vertical/horizontal bar chart
 * Props: data, xKey, yKeys[], color, horizontal, height, animate
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, Legend,
} from 'recharts';
import { useTheme } from '@mui/material';
import { CHART_PALETTE, formatValue, formatAxisTick, tooltipStyle } from './chartUtils';

const AppBarChart = ({
  data = [],
  xKey,
  yKeys,
  colors,
  height = 320,
  horizontal = false,
  showLabels = false,
  showLegend = false,
}) => {
  const theme = useTheme();
  const ts = tooltipStyle(theme);

  if (!data.length) return null;

  const palette = colors ?? CHART_PALETTE;
  const multiSeries = yKeys && yKeys.length > 1;

  const commonProps = {
    data,
    margin: horizontal
      ? { top: 5, right: 40, left: 10, bottom: 5 }
      : { top: 10, right: 20, left: 10, bottom: 60 },
  };

  const xAxisProps = horizontal
    ? { type: 'number', tick: { fill: theme.palette.text.secondary, fontSize: 12 }, tickFormatter: formatValue }
    : {
        dataKey: xKey,
        tick: { fill: theme.palette.text.secondary, fontSize: 11 },
        angle: data.length > 6 ? -35 : 0,
        textAnchor: data.length > 6 ? 'end' : 'middle',
        tickFormatter: (v) => formatAxisTick(v, 16),
        interval: 0,
      };

  const yAxisProps = horizontal
    ? {
        dataKey: xKey,
        type: 'category',
        width: 140,
        tick: { fill: theme.palette.text.secondary, fontSize: 11 },
        tickFormatter: (v) => formatAxisTick(v, 20),
      }
    : {
        tick: { fill: theme.palette.text.secondary, fontSize: 11 },
        tickFormatter: formatValue,
        width: 55,
      };

  const ChartComponent = horizontal ? BarChart : BarChart;
  const layout = horizontal ? 'vertical' : 'horizontal';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent {...commonProps} layout={layout}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme.palette.divider}
          vertical={!horizontal}
          horizontal={horizontal}
        />
        <XAxis {...(horizontal ? { type: 'number', tickFormatter: formatValue, tick: { fill: theme.palette.text.secondary, fontSize: 11 } } : { dataKey: xKey, tick: { fill: theme.palette.text.secondary, fontSize: 11 }, angle: data.length > 6 ? -35 : 0, textAnchor: data.length > 6 ? 'end' : 'middle', tickFormatter: (v) => formatAxisTick(v, 16), interval: 0 })} />
        <YAxis {...(horizontal ? { dataKey: xKey, type: 'category', width: 150, tick: { fill: theme.palette.text.secondary, fontSize: 11 }, tickFormatter: (v) => formatAxisTick(v, 22) } : { tick: { fill: theme.palette.text.secondary, fontSize: 11 }, tickFormatter: formatValue, width: 55 })} />
        <Tooltip
          contentStyle={ts.contentStyle}
          labelStyle={ts.labelStyle}
          itemStyle={ts.itemStyle}
          formatter={ts.formatter}
        />
        {showLegend && <Legend />}
        {multiSeries
          ? yKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={palette[idx % palette.length]}
                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={40}
              >
                {showLabels && <LabelList dataKey={key} position={horizontal ? 'right' : 'top'} formatter={formatValue} style={{ fontSize: 10, fill: theme.palette.text.secondary }} />}
              </Bar>
            ))
          : (
            <Bar
              dataKey={yKeys?.[0] ?? 'value'}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={50}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={palette[idx % palette.length]} />
              ))}
              {showLabels && (
                <LabelList
                  dataKey={yKeys?.[0] ?? 'value'}
                  position={horizontal ? 'right' : 'top'}
                  formatter={formatValue}
                  style={{ fontSize: 10, fill: theme.palette.text.secondary }}
                />
              )}
            </Bar>
          )}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

export default AppBarChart;
