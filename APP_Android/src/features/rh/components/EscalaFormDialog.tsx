import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Dialog, Portal, Button, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { useColaboradores } from '@/features/rh/hooks/useRhLookups';
import type { Escala, CreateEscalaPayload, EditEscalaPayload } from '@/features/rh/hooks/usePiquete';

interface EscalaFormDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: CreateEscalaPayload | { pk: number; data: EditEscalaPayload }) => Promise<unknown>;
  isSaving: boolean;
  initial: Escala | null;
}

const toISODate = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
const fmtDatePt = (v: string) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '');

const EscalaFormDialog = ({ visible, onDismiss, onSave, isSaving, initial }: EscalaFormDialogProps) => {
  const { colaboradores } = useColaboradores();

  const [userFk, setUserFk] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showPicker, setShowPicker] = useState<null | 'inicio' | 'fim'>(null);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setUserFk(String(initial.tb_user_fk));
      setDataInicio(toISODate(initial.data_inicio));
      setDataFim(toISODate(initial.data_fim));
    } else {
      setUserFk('');
      setDataInicio('');
      setDataFim('');
    }
  }, [visible, initial]);

  const colaboradorOptions: PickerOption[] = colaboradores.map((c) => ({ value: String(c.pk), label: c.name }));

  let validationError = '';
  if (dataInicio && dataFim) {
    const d1 = new Date(dataInicio + 'T00:00:00');
    const d2 = new Date(dataFim + 'T00:00:00');
    const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / 86400000);
    if (diffDays <= 0) validationError = 'A data fim deve ser posterior à data início.';
    else if (diffDays > 6) validationError = 'A escala não pode ter mais de 7 dias (ex: 27 a 3).';
  }

  const canSave = !!userFk && !!dataInicio && !!dataFim && !validationError;

  const handleSave = async () => {
    if (!canSave) return;
    const payload: CreateEscalaPayload = { tb_user_fk: Number(userFk), data_inicio: dataInicio, data_fim: dataFim };
    if (initial) await onSave({ pk: initial.pk, data: payload });
    else await onSave(payload);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{initial ? 'Editar Escala' : 'Nova Escala de Piquete'}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 420 }}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Colaborador *</Text>
            <ExpandablePicker placeholder="Seleccionar colaborador" value={userFk} options={colaboradorOptions} onSelect={setUserFk} />

            <Text style={styles.label}>Data Início *</Text>
            <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('inicio')}>
              <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{dataInicio ? fmtDatePt(dataInicio) : 'Seleccionar data'}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Data Fim *</Text>
            <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('fim')}>
              <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{dataFim ? fmtDatePt(dataFim) : 'Seleccionar data'}</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={(showPicker === 'inicio' ? dataInicio : dataFim) ? new Date((showPicker === 'inicio' ? dataInicio : dataFim) + 'T00:00:00') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  const target = showPicker;
                  setShowPicker(null);
                  if (!d) return;
                  const iso = d.toISOString().slice(0, 10);
                  if (target === 'inicio') setDataInicio(iso);
                  else setDataFim(iso);
                }}
              />
            )}

            {!!validationError && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button
            onPress={handleSave}
            mode="contained"
            loading={isSaving}
            disabled={!canSave || isSaving}
            style={{ borderRadius: RADIUS.pill }}
          >
            Guardar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  title: { fontWeight: '700', color: COLORS.textPrimary },
  content: { paddingVertical: SPACING.sm },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface, marginBottom: SPACING.sm,
  },
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.errorSurface, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.xs,
  },
  errorText: { flex: 1, fontSize: 12, color: COLORS.error },
});

export default EscalaFormDialog;
