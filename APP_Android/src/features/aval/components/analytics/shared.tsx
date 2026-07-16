import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';

// Mesmas cores usadas no frontend-v2 (features/aval/components/analytics/*)
export const DIM_COLORS = {
  colab: '#1976d2',
  rel: '#ed6c02',
  prof: '#2e7d32',
} as const;

export const TIER_COLORS = { A: '#4caf50', B: '#ff9800', C: '#ef5350' } as const;

export const CHART_WIDTH = Math.round(Dimensions.get('window').width) - SPACING.md * 2 - SPACING.md * 2;

export const trendArrow = (delta: number | null): { symbol: string; color: string } => {
  if (delta == null) return { symbol: '—', color: COLORS.textSecondary };
  if (delta > 1.0) return { symbol: '↑↑', color: COLORS.success };
  if (delta > 0) return { symbol: '↑', color: COLORS.success };
  if (delta === 0) return { symbol: '→', color: COLORS.textSecondary };
  if (delta > -1.0) return { symbol: '↓', color: COLORS.warning };
  return { symbol: '↓↓', color: COLORS.error };
};

export const ProgressBar = ({ value, color = COLORS.success, height = 8 }: {
  value: number; color?: string; height?: number;
}) => (
  <View style={{ height, borderRadius: height / 2, backgroundColor: `${color}1A`, overflow: 'hidden' }}>
    <View style={{
      width: `${Math.min(Math.max(value, 0), 100)}%`,
      height: '100%',
      borderRadius: height / 2,
      backgroundColor: color,
    }} />
  </View>
);

export const DeltaChip = ({ delta }: { delta: number | null }) => {
  const { symbol, color } = trendArrow(delta);
  return (
    <View style={[st.chip, { borderColor: color, backgroundColor: `${color}14` }]}>
      <Text style={[st.chipText, { color }]}>
        {symbol}{delta != null ? ` ${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : ''}
      </Text>
    </View>
  );
};

export const Card = ({ children, style, borderColor }: { children: React.ReactNode; style?: any; borderColor?: string }) => (
  <View style={[st.card, borderColor && { borderTopWidth: 3, borderTopColor: borderColor }, style]}>
    {children}
  </View>
);

export const EmptyState = ({ text }: { text: string }) => (
  <View style={st.emptyBox}>
    <MaterialIcons name="bar-chart" size={36} color={COLORS.textDisabled} />
    <Text style={st.emptyText}>{text}</Text>
  </View>
);

const st = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs,
  },
  emptyBox: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xxl },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
});
