import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Chip, Button, Dialog, Portal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RhStackParamList } from '@/core/navigation/types';
import { RH_COLOR, calcHorasDia, statusDia, STATUS_COR } from '@/features/rh/utils/rhUtils';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import DiaDePontoModal from '@/features/rh/components/DiaDePontoModal';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import type { PontoEvento, PontoMensal, SubmeterBloqueio } from '@/features/rh/hooks/usePonto';

type Nav = NativeStackNavigationProp<RhStackParamList>;

interface PontoMonthCalendarProps {
  registosMes: PontoEvento[];
  mapaDoMes?: PontoMensal;
  ano: number;
  mes: number;
  onSubmeter: (params: { ano: number; mes: number }) => Promise<unknown>;
  isSubmetendo: boolean;
  userFk: number;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const DOW_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Só é possível submeter o mapa de um mês já terminado — nunca o corrente
// nem um futuro (o backend valida o mesmo em fbo_rh_ponto_submeter).
const isMesFechado = (ano: number, mes: number) => {
  const now = new Date();
  return ano < now.getFullYear() || (ano === now.getFullYear() && mes < now.getMonth() + 1);
};

const PontoMonthCalendar = ({ registosMes, mapaDoMes, ano, mes, onSubmeter, isSubmetendo, userFk }: PontoMonthCalendarProps) => {
  const navigation = useNavigation<Nav>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [diasBloqueio, setDiasBloqueio] = useState<SubmeterBloqueio | null>(null);

  const dayMap = useMemo(() => {
    const map: Record<string, PontoEvento[]> = {};
    registosMes.forEach((ev) => {
      if (!map[ev.data]) map[ev.data] = [];
      map[ev.data].push(ev);
    });
    return map;
  }, [registosMes]);

  // Selecciona automaticamente o dia mais recente com registos (ou hoje, se
  // tiver registos) — mesmo comportamento do PontoCalendar.jsx na web.
  useEffect(() => {
    const today = todayStr();
    if (dayMap[today]) {
      setSelectedDate(today);
    } else {
      const mostRecent = Object.keys(dayMap).sort().at(-1);
      setSelectedDate(mostRecent ?? null);
    }
  }, [dayMap]);

  const firstDow = (new Date(ano, mes - 1, 1).getDay() + 6) % 7; // 0 = Segunda
  const daysInMonth = new Date(ano, mes, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const diasComRegistos = Object.keys(dayMap).length;
  const diasCompletos = Object.values(dayMap).filter((evs) => statusDia(evs) === 'completo').length;
  const mesFechado = isMesFechado(ano, mes);

  const mesAnoLabel = useMemo(() => {
    const raw = new Date(ano, mes - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [ano, mes]);

  const handleSubmeter = async () => {
    try {
      await onSubmeter({ ano, mes });
    } catch (err: any) {
      const payload = err?.response?.data;
      if (payload?.dias_sem_registo?.length || payload?.dias_incompletos?.length) {
        setDiasBloqueio(payload);
      }
    }
  };

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
        mesFechado ? (
          <Button
            mode="contained"
            icon="send"
            onPress={handleSubmeter}
            loading={isSubmetendo}
            style={styles.submitBtn}
            buttonColor={RH_COLOR}
          >
            Submeter para Aprovação
          </Button>
        ) : (
          <Chip compact style={[styles.chip, styles.lockedChip]} icon="lock-outline">
            Só pode submeter depois do mês terminar
          </Chip>
        )
      )}

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeaderRow}>
          <Text style={styles.mesAnoTitle}>{mesAnoLabel}</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: STATUS_COR.completo ?? undefined }]} />
              <Text style={styles.legendLabel}>Completo</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: STATUS_COR.incompleto ?? undefined }]} />
              <Text style={styles.legendLabel}>Incompleto</Text>
            </View>
          </View>
        </View>

        <View style={styles.dowRow}>
          {DOW_LABELS.map((d, i) => (
            <Text key={d} style={[styles.dowLabel, i >= 5 && styles.dowLabelWeekend]}>{d}</Text>
          ))}
        </View>

        {rows.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((day, ci) => {
              if (day == null) return <View key={`pad-${ci}`} style={styles.cell} />;

              const dateStr = `${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const eventos = dayMap[dateStr] ?? [];
              const status = statusDia(eventos);
              const horas = calcHorasDia(eventos);
              const cor = STATUS_COR[status];
              const isToday = dateStr === todayStr();
              const isSelected = dateStr === selectedDate;
              const isWeekend = ci >= 5;

              return (
                <View key={dateStr} style={styles.cell}>
                  <TouchableOpacity
                    style={[
                      styles.dayCell,
                      isWeekend && styles.dayCellWeekend,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => { setSelectedDate(dateStr); setModalOpen(true); }}
                  >
                    {isToday ? (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>{day}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.dayNumber, isWeekend && styles.dayNumberWeekend]}>{day}</Text>
                    )}
                    {cor ? <View style={[styles.dot, { backgroundColor: cor }]} /> : <View style={styles.dotEmpty} />}
                    {!!horas && <Text style={styles.cellHoras}>{horas.str}</Text>}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <DiaDePontoModal
        visible={modalOpen}
        onDismiss={() => setModalOpen(false)}
        dateStr={selectedDate}
        eventos={selectedDate ? dayMap[selectedDate] ?? [] : []}
        userFk={userFk}
      />

      <Portal>
        <Dialog visible={!!diasBloqueio} onDismiss={() => setDiasBloqueio(null)} style={{ borderRadius: RADIUS.xl }}>
          <Dialog.Title>Não é possível submeter</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.bloqueioWarn}>Corrija os dias assinalados antes de submeter o mapa mensal.</Text>
            {!!diasBloqueio?.dias_sem_registo?.length && (
              <View style={{ marginTop: SPACING.sm }}>
                <Text style={styles.bloqueioTitle}>Sem qualquer registo</Text>
                <Text style={styles.bloqueioBody}>
                  {diasBloqueio.dias_sem_registo.map((d) => Number(d.slice(-2))).join(', ')}
                </Text>
              </View>
            )}
            {!!diasBloqueio?.dias_incompletos?.length && (
              <View style={{ marginTop: SPACING.sm }}>
                <Text style={styles.bloqueioTitle}>Sem Saída registada</Text>
                <Text style={styles.bloqueioBody}>
                  {diasBloqueio.dias_incompletos.map((d) => Number(d.slice(-2))).join(', ')}
                </Text>
              </View>
            )}
            {!!diasBloqueio?.dias_por_justificar?.length && (
              <View style={{ marginTop: SPACING.sm }}>
                <Text style={styles.bloqueioTitle}>Ausência parcial por justificar</Text>
                <Text style={styles.bloqueioBody}>
                  {diasBloqueio.dias_por_justificar.map((d) => Number(d.slice(-2))).join(', ')} — saída temporária + regresso já registados, falta escolher o motivo legal em Participações.
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDiasBloqueio(null)}>Fechar</Button>
            {!!diasBloqueio?.dias_por_justificar?.length && (
              <Button
                mode="contained"
                buttonColor={RH_COLOR}
                onPress={() => { setDiasBloqueio(null); navigation.navigate('Participacao'); }}
              >
                Justificar agora
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  chip: { backgroundColor: COLORS.primarySurface },
  lockedChip: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  submitBtn: { borderRadius: RADIUS.pill, marginBottom: SPACING.md },
  calendarCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  calendarHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm,
  },
  mesAnoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  legendRow: { flexDirection: 'row', gap: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLabel: { fontSize: 11, color: COLORS.textSecondary },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowLabel: {
    flexBasis: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '700',
    color: COLORS.textSecondary, paddingVertical: 4,
  },
  dowLabelWeekend: { color: COLORS.textDisabled },
  gridRow: { flexDirection: 'row' },
  cell: { flexBasis: '14.28%', padding: 2 },
  dayCell: {
    minHeight: 58, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 4,
    backgroundColor: COLORS.surface,
  },
  dayCellWeekend: { backgroundColor: COLORS.background },
  dayCellSelected: { borderColor: RH_COLOR, backgroundColor: `${RH_COLOR}0d` },
  dayNumber: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary },
  dayNumberWeekend: { color: COLORS.textDisabled },
  todayBadge: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: RH_COLOR,
    alignItems: 'center', justifyContent: 'center',
  },
  todayBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  cellHoras: { fontSize: 8, color: COLORS.textSecondary },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotEmpty: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  bloqueioWarn: { fontSize: 13, color: COLORS.warning, fontWeight: '600' },
  bloqueioTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  bloqueioBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});

export default PontoMonthCalendar;
