import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import { COLORS, SPACING } from '@/shared/theme/colors';
import type { AvalRawRecord, AvalPeriodOption } from '../../hooks/useAvalAnalytics';
import { Card, DIM_COLORS, DeltaChip, CHART_WIDTH, EmptyState } from './shared';

interface Props {
  rawData: AvalRawRecord[];
  periods: AvalPeriodOption[];
  loading: boolean;
}

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

const KpiCard = ({ label, value, delta, color }: { label: string; value?: number; delta?: number | null; color?: string }) => (
  <Card style={{ flex: 1, minWidth: 140 }} borderColor={color}>
    <Text style={st.kpiLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text style={st.kpiValue}>{value != null ? value.toFixed(1) : '—'}</Text>
      {delta !== undefined && <DeltaChip delta={delta} />}
    </View>
  </Card>
);

const TeamEvolutionTab = ({ rawData, periods, loading }: Props) => {
  const teamData = useMemo(() => {
    return periods
      .map((p) => {
        const rows = rawData.filter((r) => r.period_pk === p.pk);
        if (!rows.length) return null;
        return {
          periodo: p.label,
          colab: Math.round(avg(rows.map((r) => r.media_personal_colab)) * 10) / 10,
          rel: Math.round(avg(rows.map((r) => r.media_personal_rel)) * 10) / 10,
          prof: Math.round(avg(rows.map((r) => r.media_profissional)) * 10) / 10,
          avaliacoes: rows.reduce((s, r) => s + r.total_avaliacoes, 0),
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [rawData, periods]);

  if (loading) return <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />;
  if (!teamData.length) return <EmptyState text="Sem dados disponíveis." />;

  const last = teamData.at(-1)!;
  const prev = teamData.length > 1 ? teamData.at(-2) : undefined;
  const delta = (key: 'colab' | 'rel' | 'prof') => (prev ? Math.round((last[key] - prev[key]) * 10) / 10 : null);

  const lineData = teamData.map((d) => ({ value: d.colab, label: d.periodo }));
  const lineData2 = teamData.map((d) => ({ value: d.rel }));
  const lineData3 = teamData.map((d) => ({ value: d.prof }));

  return (
    <View style={{ gap: SPACING.md }}>
      <View style={st.cardsRow}>
        <KpiCard label="Colaboração" value={last.colab} delta={delta('colab')} color={DIM_COLORS.colab} />
        <KpiCard label="Relacionamento" value={last.rel} delta={delta('rel')} color={DIM_COLORS.rel} />
        <KpiCard label="Desempenho" value={last.prof} delta={delta('prof')} color={DIM_COLORS.prof} />
        <Card style={{ flex: 1, minWidth: 140 }}>
          <Text style={st.kpiLabel}>Períodos Analisados</Text>
          <Text style={st.kpiValue}>{periods.length}</Text>
        </Card>
      </View>

      <Card>
        <Text style={st.sectionTitle}>Evolução da Equipa ao Longo do Tempo</Text>
        <LineChart
          data={lineData}
          data2={lineData2}
          data3={lineData3}
          color={DIM_COLORS.colab}
          color2={DIM_COLORS.rel}
          color3={DIM_COLORS.prof}
          areaChart
          areaChart2
          areaChart3
          startFillColor={DIM_COLORS.colab}
          startFillColor2={DIM_COLORS.rel}
          startFillColor3={DIM_COLORS.prof}
          startOpacity={0.18}
          endOpacity={0}
          maxValue={10}
          noOfSections={5}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={COLORS.border}
          yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 9 }}
          hideRules
          curved
          width={CHART_WIDTH}
          height={200}
          isAnimated
        />
        <View style={st.legendRow}>
          <View style={st.legendItem}><View style={[st.dot, { backgroundColor: DIM_COLORS.colab }]} /><Text style={st.legendText}>Colaboração</Text></View>
          <View style={st.legendItem}><View style={[st.dot, { backgroundColor: DIM_COLORS.rel }]} /><Text style={st.legendText}>Relacionamento</Text></View>
          <View style={st.legendItem}><View style={[st.dot, { backgroundColor: DIM_COLORS.prof }]} /><Text style={st.legendText}>Desempenho</Text></View>
        </View>
      </Card>
    </View>
  );
};

const st = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.md, marginTop: SPACING.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },
});

export default TeamEvolutionTab;
