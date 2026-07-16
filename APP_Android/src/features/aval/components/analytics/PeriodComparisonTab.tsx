import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import type { AvalRawRecord, AvalPeriodOption } from '../../hooks/useAvalAnalytics';
import { Card, DIM_COLORS, DeltaChip, EmptyState } from './shared';

interface Props {
  rawData: AvalRawRecord[];
  periods: AvalPeriodOption[];
  loading: boolean;
  me: string | null;
}

interface ComparisonRow {
  colaborador: string;
  cA: number; rA: number; pA: number;
  cB: number | null; rB: number | null; pB: number | null;
  dc: number | null; dr: number | null; dp: number | null;
}

const DIMS = [
  { key: 'c' as const, label: 'Colaboração', color: DIM_COLORS.colab },
  { key: 'r' as const, label: 'Relacionamento', color: DIM_COLORS.rel },
  { key: 'p' as const, label: 'Desempenho', color: DIM_COLORS.prof },
];

const MyComparisonView = ({ row, labelA, labelB }: { row: ComparisonRow; labelA: string; labelB: string }) => (
  <View style={{ gap: SPACING.sm }}>
    {DIMS.map((d) => {
      const vA = row[`${d.key}A` as 'cA' | 'rA' | 'pA'];
      const vB = row[`${d.key}B` as 'cB' | 'rB' | 'pB'];
      const delta = row[`d${d.key}` as 'dc' | 'dr' | 'dp'];
      return (
        <Card key={d.key} borderColor={d.color}>
          <Text style={st.dimLabel}>{d.label}</Text>
          <View style={st.compareRow}>
            <View style={st.compareCol}>
              <Text style={st.periodLabel} numberOfLines={1}>{labelA}</Text>
              <Text style={st.compareValue}>{vA.toFixed(1)}</Text>
            </View>
            <DeltaChip delta={delta} />
            <View style={st.compareCol}>
              <Text style={st.periodLabel} numberOfLines={1}>{labelB}</Text>
              <Text style={[st.compareValue, delta != null && { color: delta > 0 ? COLORS.success : delta < 0 ? COLORS.error : COLORS.textPrimary }]}>
                {vB != null ? vB.toFixed(1) : '—'}
              </Text>
            </View>
          </View>
        </Card>
      );
    })}
  </View>
);

const AllUsersTable = ({ rows }: { rows: ComparisonRow[] }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator>
    <View>
      <View style={st.tableHeader}>
        <Text style={[st.tableHCell, { width: 130 }]}>Colaborador</Text>
        {DIMS.map((d) => (
          <Text key={d.key} style={[st.tableHCell, { width: 130, color: d.color }]}>{d.label} (A/B/Δ)</Text>
        ))}
      </View>
      {rows.map((r) => (
        <View key={r.colaborador} style={st.tableRow}>
          <Text style={[st.tableCell, { width: 130, fontWeight: '600' }]} numberOfLines={1}>{r.colaborador}</Text>
          {DIMS.map((d) => {
            const vA = r[`${d.key}A` as 'cA' | 'rA' | 'pA'];
            const vB = r[`${d.key}B` as 'cB' | 'rB' | 'pB'];
            const delta = r[`d${d.key}` as 'dc' | 'dr' | 'dp'];
            return (
              <Text key={d.key} style={[st.tableCell, { width: 130 }]}>
                {vA.toFixed(1)} / {vB != null ? vB.toFixed(1) : '—'} / {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  </ScrollView>
);

const PeriodComparisonTab = ({ rawData, periods, loading, me }: Props) => {
  const [periodA, setPeriodA] = useState('');
  const [periodB, setPeriodB] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || periods.length === 0) return;
    initialized.current = true;
    if (periods.length >= 2) {
      setPeriodA(String(periods.at(-2)!.pk));
      setPeriodB(String(periods.at(-1)!.pk));
    } else {
      setPeriodA(String(periods[0].pk));
    }
  }, [periods]);

  const periodOptions: PickerOption[] = useMemo(
    () => periods.map((p) => ({ value: String(p.pk), label: p.label })),
    [periods]
  );

  const rows = useMemo<ComparisonRow[]>(() => {
    const pkA = periodA ? Number(periodA) : null;
    const pkB = periodB ? Number(periodB) : null;
    if (!pkA || !pkB) return [];
    const dataA = rawData.filter((r) => r.period_pk === pkA);
    const mapB = new Map(rawData.filter((r) => r.period_pk === pkB).map((r) => [r.colaborador, r]));
    return dataA
      .map((a) => {
        const b = mapB.get(a.colaborador);
        return {
          colaborador: a.colaborador,
          cA: a.media_personal_colab, rA: a.media_personal_rel, pA: a.media_profissional,
          cB: b ? b.media_personal_colab : null,
          rB: b ? b.media_personal_rel : null,
          pB: b ? b.media_profissional : null,
          dc: b ? Math.round((b.media_personal_colab - a.media_personal_colab) * 10) / 10 : null,
          dr: b ? Math.round((b.media_personal_rel - a.media_personal_rel) * 10) / 10 : null,
          dp: b ? Math.round((b.media_profissional - a.media_profissional) * 10) / 10 : null,
        };
      })
      .sort((x, y) => x.colaborador.localeCompare(y.colaborador, 'pt'));
  }, [rawData, periodA, periodB]);

  if (loading) return <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />;
  if (periods.length < 2) {
    return <EmptyState text="São necessários pelo menos 2 períodos para fazer comparação." />;
  }

  const labelA = periods.find((p) => String(p.pk) === periodA)?.label ?? '—';
  const labelB = periods.find((p) => String(p.pk) === periodB)?.label ?? '—';
  const myRow = me ? rows.find((r) => r.colaborador === me) : undefined;

  return (
    <View style={{ gap: SPACING.md }}>
      <Card>
        <Text style={st.pickerLabel}>De (período anterior)</Text>
        <ExpandablePicker placeholder="Selecionar período..." value={periodA} options={periodOptions} onSelect={setPeriodA} />
        <Text style={st.pickerLabel}>Para (período mais recente)</Text>
        <ExpandablePicker placeholder="Selecionar período..." value={periodB} options={periodOptions} onSelect={setPeriodB} />
      </Card>

      {me ? (
        myRow
          ? <MyComparisonView row={myRow} labelA={labelA} labelB={labelB} />
          : <EmptyState text="Sem dados seus nos períodos selecionados." />
      ) : (
        rows.length > 0
          ? <AllUsersTable rows={rows} />
          : <EmptyState text="Sem dados para os períodos selecionados." />
      )}
    </View>
  );
};

const st = StyleSheet.create({
  pickerLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4, marginTop: SPACING.xs },
  dimLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareCol: { alignItems: 'center', flex: 1 },
  periodLabel: { fontSize: 10, color: COLORS.textSecondary, maxWidth: 100 },
  compareValue: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: COLORS.border, paddingBottom: 6, marginBottom: 4 },
  tableHCell: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableCell: { fontSize: 12, color: COLORS.textPrimary },
});

export default PeriodComparisonTab;
