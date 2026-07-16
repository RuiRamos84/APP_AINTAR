import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import type { AvalEnriched, AvalRawRecord, AvalPeriodOption } from '../../hooks/useAvalAnalytics';
import { Card, DIM_COLORS, DeltaChip, ProgressBar, CHART_WIDTH, EmptyState } from './shared';

interface Props {
  enriched: AvalEnriched;
  rawData: AvalRawRecord[];
  periods: AvalPeriodOption[];
  loading: boolean;
}

const percentileOf = (rank: number, total: number) => (total > 0 ? (rank / total) * 100 : 0);

const MetricCard = ({ label, color, score, prevScore, teamAvg, rank, totalUsers }: {
  label: string; color: string; score: number; prevScore?: number;
  teamAvg: number; rank: number; totalUsers: number;
}) => {
  const delta = prevScore != null ? Math.round((score - prevScore) * 10) / 10 : null;
  const percentile = percentileOf(rank, totalUsers);
  const barColor = percentile <= 20 ? COLORS.success : percentile <= 80 ? COLORS.primary : COLORS.warning;
  return (
    <Card borderColor={color} style={{ flex: 1, minWidth: 150 }}>
      <Text style={st.metricLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={st.metricScore}>{score.toFixed(1)}</Text>
        <DeltaChip delta={delta} />
      </View>
      <Text style={st.metricSub}>Média equipa: {teamAvg.toFixed(1)}</Text>
      <Text style={st.metricSub}>{rank}.º de {totalUsers}</Text>
      <ProgressBar value={100 - percentile} color={barColor} height={6} />
    </Card>
  );
};

const IndividualInsightsTab = ({ enriched, rawData, periods, loading }: Props) => {
  const { users: allUsers, me } = enriched;

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

  const latestPk = sortedPeriodPks.at(-1);
  const previousPk = sortedPeriodPks.at(-2);

  const myCurrentData = useMemo(
    () => allUsers.find((u) => u.period_pk === latestPk && u.colaborador === me),
    [allUsers, latestPk, me]
  );
  const myPreviousData = useMemo(
    () => allUsers.find((u) => u.period_pk === previousPk && u.colaborador === me),
    [allUsers, previousPk, me]
  );

  const currentPeriodUsers = useMemo(() => allUsers.filter((u) => u.period_pk === latestPk), [allUsers, latestPk]);
  const totalUsers = currentPeriodUsers.length;

  const teamAvgs = useMemo(() => {
    if (!currentPeriodUsers.length) return { colab: 0, rel: 0, prof: 0 };
    const sum = currentPeriodUsers.reduce((acc, u) => ({
      colab: acc.colab + u.media_personal_colab,
      rel: acc.rel + u.media_personal_rel,
      prof: acc.prof + u.media_profissional,
    }), { colab: 0, rel: 0, prof: 0 });
    const n = currentPeriodUsers.length;
    return { colab: sum.colab / n, rel: sum.rel / n, prof: sum.prof / n };
  }, [currentPeriodUsers]);

  const chartData = useMemo(() => {
    if (!me) return [];
    return periods.map((p) => {
      const row = rawData.find((r) => r.period_pk === p.pk && r.colaborador === me);
      return {
        periodo: p.label,
        colab: row ? row.media_personal_colab : null,
        rel: row ? row.media_personal_rel : null,
        prof: row ? row.media_profissional : null,
      };
    });
  }, [periods, rawData, me]);

  if (loading) return <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />;

  if (!me || !myCurrentData) {
    return <EmptyState text="Não existem avaliações registadas para si no período atual." />;
  }

  const globalDelta = myPreviousData ? Math.round((myCurrentData.media_global - myPreviousData.media_global) * 10) / 10 : null;
  const globalPercentile = percentileOf(myCurrentData.rank_global, totalUsers);

  const lineData = chartData.map((d) => ({ value: d.colab ?? 0, label: d.periodo }));
  const lineData2 = chartData.map((d) => ({ value: d.rel ?? 0 }));
  const lineData3 = chartData.map((d) => ({ value: d.prof ?? 0 }));

  return (
    <View style={{ gap: SPACING.md }}>
      <Card borderColor={COLORS.primary}>
        <Text style={st.metricLabel}>Avaliação Global</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={[st.metricScore, { fontSize: 28 }]}>{myCurrentData.media_global.toFixed(1)}</Text>
          <DeltaChip delta={globalDelta} />
        </View>
        <Text style={st.metricSub}>
          {myCurrentData.rank_global}.º lugar de {totalUsers} · {myCurrentData.total_avaliacoes} avaliação(ões)
        </Text>
        <ProgressBar value={100 - globalPercentile} color={COLORS.primary} height={8} />
      </Card>

      <View style={st.cardsRow}>
        <MetricCard label="Colaboração" color={DIM_COLORS.colab} score={myCurrentData.media_personal_colab}
          prevScore={myPreviousData?.media_personal_colab} teamAvg={teamAvgs.colab}
          rank={myCurrentData.rank_colab} totalUsers={totalUsers} />
        <MetricCard label="Relacionamento" color={DIM_COLORS.rel} score={myCurrentData.media_personal_rel}
          prevScore={myPreviousData?.media_personal_rel} teamAvg={teamAvgs.rel}
          rank={myCurrentData.rank_rel} totalUsers={totalUsers} />
        <MetricCard label="Desempenho" color={DIM_COLORS.prof} score={myCurrentData.media_profissional}
          prevScore={myPreviousData?.media_profissional} teamAvg={teamAvgs.prof}
          rank={myCurrentData.rank_prof} totalUsers={totalUsers} />
      </View>

      {periods.length > 1 && (
        <Card>
          <Text style={st.sectionTitle}>Evolução Histórica</Text>
          <LineChart
            data={lineData}
            data2={lineData2}
            data3={lineData3}
            color={DIM_COLORS.colab}
            color2={DIM_COLORS.rel}
            color3={DIM_COLORS.prof}
            dataPointsColor={DIM_COLORS.colab}
            dataPointsColor2={DIM_COLORS.rel}
            dataPointsColor3={DIM_COLORS.prof}
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
            height={180}
            isAnimated
          />
          <View style={st.legendRow}>
            <View style={st.legendItem}><View style={[st.dot, { backgroundColor: DIM_COLORS.colab }]} /><Text style={st.legendText}>Colaboração</Text></View>
            <View style={st.legendItem}><View style={[st.dot, { backgroundColor: DIM_COLORS.rel }]} /><Text style={st.legendText}>Relacionamento</Text></View>
            <View style={st.legendItem}><View style={[st.dot, { backgroundColor: DIM_COLORS.prof }]} /><Text style={st.legendText}>Desempenho</Text></View>
          </View>
        </Card>
      )}
    </View>
  );
};

const st = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  metricLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  metricScore: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  metricSub: { fontSize: 11, color: COLORS.textSecondary },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.md, marginTop: SPACING.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },
});

export default IndividualInsightsTab;
