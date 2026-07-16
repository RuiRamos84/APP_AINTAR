import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal, Button, Text, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { fmtTime, calcHorasDia, statusDia, STATUS_COR } from '@/features/rh/utils/rhUtils';
import type { PontoEvento } from '@/features/rh/hooks/usePonto';

const EVENTOS_MAP: Record<number, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  1: { label: 'Entrada', icon: 'login', color: '#16a34a' },
  2: { label: 'Início Almoço', icon: 'lunch-dining', color: '#d97706' },
  3: { label: 'Fim Almoço', icon: 'free-breakfast', color: '#0891b2' },
  4: { label: 'Saída', icon: 'logout', color: '#dc2626' },
  5: { label: 'Saída Temporária', icon: 'directions-walk', color: '#7c3aed' },
  6: { label: 'Regresso', icon: 'keyboard-return', color: '#0369a1' },
};

interface DiaDePontoModalProps {
  visible: boolean;
  onDismiss: () => void;
  dateStr: string | null;
  eventos: PontoEvento[];
}

const DiaDePontoModal = ({ visible, onDismiss, dateStr, eventos }: DiaDePontoModalProps) => {
  if (!dateStr) return null;

  const status = statusDia(eventos);
  const horas = calcHorasDia(eventos);
  const cor = STATUS_COR[status];
  const dateLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const sorted = [...eventos].sort((a, b) => new Date(a.ts_registo).getTime() - new Date(b.ts_registo).getTime());

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{dateLabel}</Dialog.Title>
        <Dialog.Content>
          <View style={styles.summaryRow}>
            {horas && <Chip compact style={styles.chip}>{horas.str}</Chip>}
            <Chip
              compact
              style={[styles.chip, cor ? { backgroundColor: `${cor}22` } : undefined]}
              textStyle={cor ? { color: cor } : undefined}
            >
              {status === 'completo' ? 'Completo' : status === 'incompleto' ? 'Incompleto' : 'Sem registos'}
            </Chip>
          </View>

          {sorted.map((ev) => {
            const def = EVENTOS_MAP[ev.tt_evento_fk] ?? { label: ev.evento_descr, icon: 'schedule', color: '#666' };
            return (
              <View key={ev.pk} style={styles.eventRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${def.color}22` }]}>
                  <MaterialIcons name={def.icon} size={16} color={def.color} />
                </View>
                <Text style={styles.eventLabel}>{ev.evento_descr || def.label}</Text>
                <Text style={styles.eventTime}>{fmtTime(ev.ts_registo)}</Text>
                {ev.fonte === 'app+face' && (
                  <MaterialIcons name="verified-user" size={14} color={COLORS.success} style={{ marginLeft: SPACING.xs }} />
                )}
                {ev.tem_gps && (
                  <MaterialIcons name="location-on" size={14} color={COLORS.textDisabled} style={{ marginLeft: SPACING.xs }} />
                )}
              </View>
            );
          })}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Fechar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  title: { fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  summaryRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  chip: { backgroundColor: COLORS.overlay },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, gap: SPACING.sm },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  eventTime: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
});

export default DiaDePontoModal;
