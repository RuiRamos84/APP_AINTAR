import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import type { AvalEnriched, AvalUserRecord } from '../../hooks/useAvalAnalytics';
import { Card, DIM_COLORS, TIER_COLORS, trendArrow, CHART_WIDTH, EmptyState } from './shared';

interface Props {
  enriched: AvalEnriched;
  loading: boolean;
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── Médias globais (atual vs anterior) ───────────────────────────────────────

const DIMS = [
  { label: 'Colaboração', key: 'media_personal_colab' as const, color: DIM_COLORS.colab },
  { label: 'Relacionamento', key: 'media_personal_rel' as const, color: DIM_COLORS.rel },
  { label: 'Desempenho', key: 'media_profissional' as const, color: DIM_COLORS.prof },
];

const MediasSection = ({ global }: { global: AvalEnriched['global'] }) => {
  const current = global.at(-1);
  const previous = global.length > 1 ? global.at(-2) : undefined;
  if (!current) return <EmptyState text="Sem dados de médias globais." />;

  const barData = DIMS.flatMap((d) => {
    const curVal = current[d.key];
    const prevVal = previous?.[d.key];
    const items = [{
      value: curVal, frontColor: d.color, label: d.label,
      labelWidth: 70, labelTextStyle: { fontSize: 9, color: COLORS.textSecondary },
      spacing: prevVal != null ? 2 : 18,
    }];
    if (prevVal != null) items.push({ value: prevVal, frontColor: `${d.color}55`, spacing: 18 } as any);
    return items;
  });

  return (
    <Card>
      <Text style={st.sectionTitle}>Médias da Equipa — {current.periodo}</Text>
      <View style={{ gap: 6 }}>
        {DIMS.map((d) => {
          const curVal = current[d.key];
          const prevVal = previous?.[d.key];
          const delta = prevVal != null ? Math.round((curVal - prevVal) * 10) / 10 : null;
          const { symbol, color } = trendArrow(delta);
          return (
            <View key={d.key} style={st.statRow}>
              <View style={[st.dot, { backgroundColor: d.color }]} />
              <Text style={st.statLabel}>{d.label}</Text>
              <Text style={st.statValue}>{curVal.toFixed(1)}</Text>
              <Text style={[st.statDelta, { color }]}>{symbol}{delta != null ? ` ${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : ''}</Text>
            </View>
          );
        })}
      </View>

      <BarChart
        data={barData}
        barWidth={20}
        noOfSections={5}
        maxValue={10}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={COLORS.border}
        yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
        hideRules
        width={CHART_WIDTH}
        height={160}
        isAnimated
      />
      {previous && (
        <View style={st.legendRow}>
          <View style={st.legendItem}><View style={[st.dot, { backgroundColor: COLORS.primary }]} /><Text style={st.legendText}>Atual</Text></View>
          <View style={st.legendItem}><View style={[st.dot, { backgroundColor: `${COLORS.primary}55` }]} /><Text style={st.legendText}>Anterior</Text></View>
        </View>
      )}
    </Card>
  );
};

// ─── Dispersão (histograma) ────────────────────────────────────────────────────

const DispersaoSection = ({ users }: { users: AvalUserRecord[] }) => {
  const stats = useMemo(() => {
    const values = users.map((u) => u.media_global);
    if (!values.length) return null;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const bins = Array.from({ length: 10 }, (_, i) => ({ label: `${i}`, min: i, count: 0 }));
    values.forEach((v) => { const idx = Math.min(9, Math.max(0, Math.floor(v))); bins[idx].count++; });
    return { mean, stdDev, bins };
  }, [users]);

  if (!stats) return <EmptyState text="Sem dados de dispersão." />;

  const alignLabel = stats.stdDev < 1.5 ? 'Equipa alinhada' : stats.stdDev < 2.5 ? 'Dispersão moderada' : 'Equipa polarizada';
  const barData = stats.bins.map((b) => ({
    value: b.count,
    label: b.label,
    frontColor: b.min < 4 ? '#ef9a9a' : b.min < 7 ? '#ffcc80' : '#a5d6a7',
    labelTextStyle: { fontSize: 9, color: COLORS.textSecondary },
  }));

  return (
    <Card>
      <Text style={st.sectionTitle}>Dispersão de Desempenho Global</Text>
      <View style={st.chipsRow}>
        <View style={st.statChip}><Text style={st.statChipText}>Média {stats.mean.toFixed(1)}</Text></View>
        <View style={st.statChip}><Text style={st.statChipText}>σ {stats.stdDev.toFixed(2)}</Text></View>
        <View style={st.statChip}><Text style={st.statChipText}>{alignLabel}</Text></View>
      </View>
      <BarChart
        data={barData}
        barWidth={18}
        spacing={10}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={COLORS.border}
        yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
        hideRules
        width={CHART_WIDTH}
        height={150}
        isAnimated
      />
    </Card>
  );
};

// ─── Tiers (donut) ─────────────────────────────────────────────────────────────

const TiersSection = ({ users }: { users: AvalUserRecord[] }) => {
  const { pieData, tierAShuffled, total } = useMemo(() => {
    const tiers: Record<'A' | 'B' | 'C', AvalUserRecord[]> = { A: [], B: [], C: [] };
    users.forEach((u) => {
      const t: 'A' | 'B' | 'C' = u.media_global >= 7 ? 'A' : u.media_global >= 5 ? 'B' : 'C';
      tiers[t].push(u);
    });
    const pd = (['A', 'B', 'C'] as const).map((t) => ({
      value: tiers[t].length, color: TIER_COLORS[t], text: String(tiers[t].length),
    }));
    return { pieData: pd, tierAShuffled: shuffle(tiers.A), total: users.length };
  }, [users]);

  if (!total) return <EmptyState text="Sem dados de classificação por tiers." />;

  return (
    <Card>
      <Text style={st.sectionTitle}>Distribuição por Tiers de Desempenho</Text>
      <View style={{ alignItems: 'center', marginVertical: SPACING.sm }}>
        <PieChart
          data={pieData}
          donut
          radius={70}
          innerRadius={46}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary }}>{total}</Text>
              <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>pessoas</Text>
            </View>
          )}
        />
      </View>
      <View style={st.legendRow}>
        {(['A', 'B', 'C'] as const).map((t) => (
          <View key={t} style={st.legendItem}>
            <View style={[st.dot, { backgroundColor: TIER_COLORS[t] }]} />
            <Text style={st.legendText}>Tier {t}</Text>
          </View>
        ))}
      </View>
      {tierAShuffled.length > 0 && (
        <View style={{ marginTop: SPACING.sm }}>
          <Text style={st.subLabel}>Tier A ({tierAShuffled.length})</Text>
          <View style={st.chipsRow}>
            {tierAShuffled.map((u) => (
              <View key={u.colaborador} style={st.nameChip}>
                <View style={st.avatar}><Text style={st.avatarText}>{u.colaborador.charAt(0).toUpperCase()}</Text></View>
                <Text style={st.nameChipText} numberOfLines={1}>{u.colaborador}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
};

// ─── Evolução coletiva ──────────────────────────────────────────────────────────

const EvolucaoColetiva = ({ current, previous }: { current: AvalUserRecord[]; previous: AvalUserRecord[] }) => {
  const deltas = useMemo(() => {
    if (!previous.length) return null;
    const prevMap = new Map(previous.map((u) => [u.colaborador, u]));
    return current
      .map((u) => {
        const p = prevMap.get(u.colaborador);
        if (!p) return null;
        return { name: u.colaborador, delta: Math.round((u.media_global - p.media_global) * 10) / 10 };
      })
      .filter((x): x is { name: string; delta: number } => !!x)
      .sort((a, b) => b.delta - a.delta);
  }, [current, previous]);

  if (!deltas || !deltas.length) return null;

  return (
    <Card>
      <Text style={st.sectionTitle}>Evolução Coletiva vs. Período Anterior</Text>
      <View style={{ gap: 4 }}>
        {deltas.map((d) => {
          const { symbol, color } = trendArrow(d.delta);
          return (
            <View key={d.name} style={st.statRow}>
              <View style={st.avatar}><Text style={st.avatarText}>{d.name.charAt(0).toUpperCase()}</Text></View>
              <Text style={st.statLabel} numberOfLines={1}>{d.name.split(' ')[0]}</Text>
              <Text style={[st.statDelta, { color }]}>{symbol} {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

// ─── Tab principal ──────────────────────────────────────────────────────────────

const TeamInsightsTab = ({ enriched, loading }: Props) => {
  const { global, users: allUsers } = enriched;

  const sortedPeriodPks = useMemo(() => {
    const seen = new Set<number>();
    const list: { pk: number; year: number; periodo_data: string | null }[] = [];
    allUsers.forEach((u) => {
      if (!seen.has(u.period_pk)) {
        seen.add(u.period_pk);
        list.push({ pk: u.period_pk, year: u.year, periodo_data: u.periodo_data });
      }
    });
    list.sort((a, b) => {
      const yd = (a.year ?? 0) - (b.year ?? 0);
      if (yd !== 0) return yd;
      const tA = a.periodo_data ? new Date(a.periodo_data).getTime() : Infinity;
      const tB = b.periodo_data ? new Date(b.periodo_data).getTime() : Infinity;
      if (tA !== tB) return tA - tB;
      return a.pk - b.pk;
    });
    return list.map((l) => l.pk);
  }, [allUsers]);

  const latestPeriodPk = sortedPeriodPks.at(-1);
  const previousPeriodPk = sortedPeriodPks.at(-2);
  const currentUsers = useMemo(() => allUsers.filter((u) => u.period_pk === latestPeriodPk), [allUsers, latestPeriodPk]);
  const previousUsers = useMemo(() => allUsers.filter((u) => u.period_pk === previousPeriodPk), [allUsers, previousPeriodPk]);

  if (loading) return <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />;
  if (!currentUsers.length) return <EmptyState text="Sem dados disponíveis." />;

  return (
    <View style={{ gap: SPACING.md }}>
      <MediasSection global={global} />
      <DispersaoSection users={currentUsers} />
      <TiersSection users={currentUsers} />
      <EvolucaoColetiva current={currentUsers} previous={previousUsers} />
    </View>
  );
};

const st = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  statLabel: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  statValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginRight: 4 },
  statDelta: { fontSize: 12, fontWeight: '700', minWidth: 48, textAlign: 'right' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.xs },
  statChip: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  statChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md, marginTop: SPACING.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primarySurface, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  nameChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.background, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border,
    maxWidth: 160,
  },
  nameChipText: { fontSize: 11, color: COLORS.textPrimary, flexShrink: 1 },
});

export default TeamInsightsTab;
