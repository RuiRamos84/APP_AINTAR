import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Chip, Button } from 'react-native-paper';
import { RH_COLOR, calcHorasDia, statusDia, STATUS_COR } from '@/features/rh/utils/rhUtils';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import DiaDePontoModal from '@/features/rh/components/DiaDePontoModal';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import type { PontoEvento, PontoMensal } from '@/features/rh/hooks/usePonto';

interface PontoMonthCalendarProps {
  registosMes: PontoEvento[];
  mapaDoMes?: PontoMensal;
  ano: number;
  mes: number;
  onSubmeter: (params: { ano: number; mes: number }) => Promise<unknown>;
  isSubmetendo: boolean;
}

const PontoMonthCalendar = ({ registosMes, mapaDoMes, ano, mes, onSubmeter, isSubmetendo }: PontoMonthCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dayMap = useMemo(() => {
    const map: Record<string, PontoEvento[]> = {};
    registosMes.forEach((ev) => {
      if (!map[ev.data]) map[ev.data] = [];
      map[ev.data].push(ev);
    });
    return map;
  }, [registosMes]);

  const dias = Object.keys(dayMap).sort().reverse();
  const diasComRegistos = dias.length;
  const diasCompletos = dias.filter((d) => statusDia(dayMap[d]) === 'completo').length;

  return (
    <View>
      <View style={styles.summaryRow}>
        <Chip compact style={styles.chip}>{diasComRegistos} dias registados</Chip>
        {diasCompletos > 0 && (
          <Chip compact style={[styles.chip, { backgroundColor: COLORS.successSurface }]} textStyle={{ color: COLORS.success }}>
            {diasCompletos} completos
          </Chip>
        )}
        {mapaDoMes && (
          <>
            <Chip compact style={[styles.chip, { backgroundColor: COLORS.infoSurface }]} textStyle={{ color: COLORS.info }}>
              {mapaDoMes.total_horas ?? '?'}h totais
            </Chip>
            <EstadoBadge descr={mapaDoMes.estado_descr} cor={mapaDoMes.estado_cor} />
          </>
        )}
      </View>

      {!mapaDoMes && registosMes.length > 0 && (
        <Button
          mode="contained"
          icon="send"
          onPress={() => onSubmeter({ ano, mes })}
          loading={isSubmetendo}
          style={styles.submitBtn}
          buttonColor={RH_COLOR}
        >
          Submeter para Aprovação
        </Button>
      )}

      {dias.length === 0 ? (
        <Text style={styles.empty}>Sem registos neste mês.</Text>
      ) : (
        dias.map((dateStr) => {
          const eventos = dayMap[dateStr];
          const status = statusDia(eventos);
          const horas = calcHorasDia(eventos);
          const cor = STATUS_COR[status];
          const date = new Date(dateStr + 'T00:00:00');
          const label = date.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });

          return (
            <TouchableOpacity key={dateStr} style={styles.dayRow} onPress={() => setSelectedDate(dateStr)}>
              <Text style={styles.dayLabel}>{label}</Text>
              <View style={styles.dayRight}>
                {horas && <Text style={styles.dayHoras}>{horas.str}</Text>}
                {cor && <View style={[styles.dot, { backgroundColor: cor }]} />}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <DiaDePontoModal
        visible={!!selectedDate}
        onDismiss={() => setSelectedDate(null)}
        dateStr={selectedDate}
        eventos={selectedDate ? dayMap[selectedDate] ?? [] : []}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  chip: { backgroundColor: COLORS.primarySurface },
  submitBtn: { borderRadius: RADIUS.pill, marginBottom: SPACING.md },
  empty: { color: COLORS.textDisabled, textAlign: 'center', marginTop: SPACING.lg },
  dayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.xs,
  },
  dayLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textTransform: 'capitalize' },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dayHoras: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

export default PontoMonthCalendar;
