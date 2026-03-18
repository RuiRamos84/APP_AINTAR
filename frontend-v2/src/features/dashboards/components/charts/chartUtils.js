/**
 * Dashboard Chart Utilities
 * Shared helpers for all Recharts-based chart components
 */

export const CHART_PALETTE = [
  '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#3F51B5', '#E91E63', '#009688', '#FF5722',
  '#607D8B', '#795548', '#CDDC39', '#FFC107', '#8BC34A',
];

/** Format large numbers: 1200 → "1.2k", 1500000 → "1.5M" */
export const formatValue = (val) => {
  if (val == null) return '';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k';
  return n.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
};

/** Format axis tick — truncates long labels */
export const formatAxisTick = (value, maxLen = 14) => {
  const s = String(value ?? '');
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
};

/** Tooltip content style matching MUI theme */
export const tooltipStyle = (theme) => ({
  contentStyle: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    boxShadow: theme.shadows[4],
    fontSize: 13,
  },
  labelStyle: { color: theme.palette.text.primary, fontWeight: 600 },
  itemStyle: { color: theme.palette.text.secondary },
  formatter: (val) => [formatValue(val)],
});

/** Auto-detect best chart type based on data shape */
export const autoDetectChartType = (data, hint) => {
  if (hint && hint !== 'auto') return hint;
  if (!data?.length) return 'bar';
  const keys = Object.keys(data[0]);
  const hasYearKey = keys.some((k) => /ano|year/i.test(k));
  const hasMonthKey = keys.some((k) => /mes|month/i.test(k));
  if (hasMonthKey) return 'area';
  if (hasYearKey) return 'area';
  if (data.length > 8) return 'bar-h';
  if (data.length <= 6) return 'pie';
  return 'bar';
};

/** Detect x (label) and y (value) keys from data row */
export const detectKeys = (row) => {
  if (!row) return { xKey: null, yKeys: [] };
  const entries = Object.entries(row);
  const numericKeys = entries.filter(([, v]) => typeof v === 'number').map(([k]) => k);
  const textKeys = entries.filter(([, v]) => typeof v !== 'number').map(([k]) => k);
  return {
    xKey: textKeys[0] ?? entries[0]?.[0],
    yKeys: numericKeys.length ? numericKeys : [entries[1]?.[0]].filter(Boolean),
  };
};
