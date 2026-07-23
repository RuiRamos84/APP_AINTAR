import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { useDraft } from '@/shared/hooks/useDraft';
import { useScrollToEndOnKeyboard } from '@/shared/hooks/useScrollToEndOnKeyboard';
import { toLocalISODate } from '@/shared/utils/dateUtils';
import { useColaboradores } from '@/features/rh/hooks/useRhLookups';
import type { Falta, CreateFaltaPayload, EditFaltaPayload } from '@/features/rh/hooks/useFaltas';
import type { LookupItem } from '@/features/rh/hooks/useRhLookups';

interface FaltaDraft {
  userFk: string;
  tipoFk: string;
  data: string;
  comunicadoPor: string;
  notas: string;
}

interface FaltaFormDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: CreateFaltaPayload | { pk: number; data: EditFaltaPayload }) => Promise<unknown>;
  isSaving: boolean;
  initial: Falta | null;
  tiposFalta: LookupItem[];
}

const toISODate = (v?: string | null) => {
  if (!v) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  if (match) return match[1];
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : toLocalISODate(d);
};
const fmtDatePt = (v: string) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '');

const FaltaFormDialog = ({ visible, onDismiss, onSave, isSaving, initial, tiposFalta }: FaltaFormDialogProps) => {
  const { colaboradores } = useColaboradores();
  const { loadDraft, saveDraft, clearDraft } = useDraft<FaltaDraft>('falta_form');
  const scrollRef = useRef<ScrollView>(null);

  useScrollToEndOnKeyboard(scrollRef, visible);

  const [userFk, setUserFk] = useState('');
  const [tipoFk, setTipoFk] = useState('1');
  const [data, setData] = useState('');
  const [comunicadoPor, setComunicadoPor] = useState('');
  const [notas, setNotas] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!visible) { setDraftLoaded(false); return; }
    if (initial) {
      setUserFk(String(initial.tb_user_fk));
      setTipoFk(String(initial.tt_tipo_falta_fk));
      setData(toISODate(initial.data));
      setComunicadoPor(initial.comunicado_por ? String(initial.comunicado_por) : '');
      setNotas(initial.notas || '');
      setDraftLoaded(true);
      return;
    }
    loadDraft().then((d) => {
      if (d) {
        setUserFk(d.userFk);
        setTipoFk(d.tipoFk);
        setData(d.data);
        setComunicadoPor(d.comunicadoPor);
        setNotas(d.notas);
      } else {
        setUserFk('');
        setTipoFk('1');
        setData('');
        setComunicadoPor('');
        setNotas('');
      }
      setDraftLoaded(true);
    });
  }, [visible, initial]);

  useEffect(() => {
    if (draftLoaded && !initial) {
      saveDraft({ userFk, tipoFk, data, comunicadoPor, notas });
    }
  }, [userFk, tipoFk, data, comunicadoPor, notas, draftLoaded, initial]);

  const tipoOptions: PickerOption[] = tiposFalta.map((t) => ({ value: String(t.pk), label: t.descr as string }));
  const colaboradorOptions: PickerOption[] = colaboradores.map((c) => ({ value: String(c.pk), label: c.name }));

  const canSave = !!tipoFk && !!data && (!!initial || !!userFk);

  const handleSave = async () => {
    if (!canSave) return;
    try {
      if (initial) {
        const payload: EditFaltaPayload = { tt_tipo_falta_fk: Number(tipoFk), notas: notas || null };
        await onSave({ pk: initial.pk, data: payload });
      } else {
        const payload: CreateFaltaPayload = {
          user_fk: Number(userFk),
          tt_tipo_falta_fk: Number(tipoFk),
          data,
          notas: notas || null,
          comunicado_por: comunicadoPor ? Number(comunicadoPor) : null,
        };
        await onSave(payload);
      }
    } catch {
      return;
    }
    if (!initial) clearDraft();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Dialog.Title style={styles.title}>{initial ? 'Editar Falta' : 'Registar Falta'}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 480 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {!initial && (
              <>
                <Text style={styles.label}>Colaborador *</Text>
                <ExpandablePicker placeholder="Seleccionar colaborador" value={userFk} options={colaboradorOptions} onSelect={setUserFk} />
              </>
            )}

            <Text style={styles.label}>Tipo de Falta</Text>
            <ExpandablePicker placeholder="Seleccionar tipo" value={tipoFk} options={tipoOptions} onSelect={setTipoFk} />

            <Text style={styles.label}>Data *</Text>
            <TouchableOpacity
              style={[styles.dateTrigger, !!initial && styles.dateTriggerDisabled]}
              onPress={() => !initial && setShowPicker(true)}
              disabled={!!initial}
            >
              <MaterialIcons name="calendar-today" size={18} color={initial ? COLORS.textDisabled : COLORS.primary} />
              <Text style={styles.dateText}>{data ? fmtDatePt(data) : 'Seleccionar data'}</Text>
            </TouchableOpacity>
            {!!initial && <Text style={styles.helperText}>A data não pode ser alterada após o registo.</Text>}
            {showPicker && (
              <DateTimePicker
                value={data ? new Date(data + 'T00:00:00') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { setShowPicker(false); if (d) setData(toLocalISODate(d)); }}
              />
            )}

            {!initial && (
              <>
                <Text style={styles.label}>Comunicado por (opcional)</Text>
                <ExpandablePicker
                  placeholder="— Ninguém —"
                  value={comunicadoPor}
                  options={colaboradorOptions}
                  onSelect={setComunicadoPor}
                />
              </>
            )}

            <TextInput
              label="Notas"
              value={notas}
              onChangeText={setNotas}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md }}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              right={<TextInput.Icon icon="arrow-right-bold-circle" onPress={() => Keyboard.dismiss()} />}
            />
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
        </KeyboardAvoidingView>
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
  dateTriggerDisabled: { backgroundColor: COLORS.background, opacity: 0.6 },
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  helperText: { fontSize: 11, color: COLORS.textDisabled, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  input: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
});

export default FaltaFormDialog;
