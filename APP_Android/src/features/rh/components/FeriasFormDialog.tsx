import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text, Chip } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { useDraft } from '@/shared/hooks/useDraft';
import { useScrollToEndOnKeyboard } from '@/shared/hooks/useScrollToEndOnKeyboard';
import { toLocalISODate } from '@/shared/utils/dateUtils';
import useAuthStore from '@/features/auth/store/authStore';
import { useConflitosFerias } from '@/features/rh/hooks/useFerias';
import type { Ferias, CreateFeriasPayload, EditFeriasPayload } from '@/features/rh/hooks/useFerias';
import type { LookupItem } from '@/features/rh/hooks/useRhLookups';

interface FeriasDraft {
  tipoFk: string;
  dataInicio: string;
  dataFim: string;
  notas: string;
}

interface FeriasFormDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: CreateFeriasPayload | { pk: number; data: EditFeriasPayload }) => Promise<unknown>;
  isSaving: boolean;
  initial: Ferias | null;
  tiposFerias: LookupItem[];
}

const toISODate = (v?: string | null) => {
  if (!v) return '';
  // Já vem em "YYYY-MM-DD..." — usar os caracteres directamente evita
  // qualquer conversão de fuso horário (ver toLocalISODate para o porquê).
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  if (match) return match[1];
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : toLocalISODate(d);
};

const fmtDatePt = (v: string) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '');

const FeriasFormDialog = ({ visible, onDismiss, onSave, isSaving, initial, tiposFerias }: FeriasFormDialogProps) => {
  const user = useAuthStore((s) => s.user);
  const { loadDraft, saveDraft, clearDraft } = useDraft<FeriasDraft>('ferias_form');
  const scrollRef = useRef<ScrollView>(null);

  useScrollToEndOnKeyboard(scrollRef, visible);

  const [tipoFk, setTipoFk] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [notas, setNotas] = useState('');
  const [showPickerInicio, setShowPickerInicio] = useState(false);
  const [showPickerFim, setShowPickerFim] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { conflitos, isLoading: isCheckingConflitos } = useConflitosFerias({
    user_fk: visible ? user?.pk : undefined,
    data_inicio: visible && dataInicio ? dataInicio : undefined,
    data_fim: visible && dataFim ? dataFim : undefined,
    excluir_pk: initial?.pk,
  });

  useEffect(() => {
    if (!visible) { setDraftLoaded(false); return; }
    if (initial) {
      setTipoFk(String(initial.tt_tipo_fk));
      setDataInicio(toISODate(initial.data_inicio));
      setDataFim(toISODate(initial.data_fim));
      setNotas(initial.notas || '');
      setDraftLoaded(true);
      return;
    }
    loadDraft().then((d) => {
      if (d) {
        setTipoFk(d.tipoFk);
        setDataInicio(d.dataInicio);
        setDataFim(d.dataFim);
        setNotas(d.notas);
      } else {
        setTipoFk(tiposFerias[0] ? String(tiposFerias[0].pk) : '');
        setDataInicio('');
        setDataFim('');
        setNotas('');
      }
      setDraftLoaded(true);
    });
  }, [visible, initial]);

  useEffect(() => {
    if (draftLoaded && !initial) saveDraft({ tipoFk, dataInicio, dataFim, notas });
  }, [tipoFk, dataInicio, dataFim, notas, draftLoaded, initial]);

  const tipoOptions: PickerOption[] = tiposFerias.map((t) => ({ value: String(t.pk), label: t.descr as string }));
  const canSave = !!tipoFk && !!dataInicio && !!dataFim;

  const handleSave = async () => {
    if (!canSave) return;
    const payload = { tt_tipo_fk: Number(tipoFk), data_inicio: dataInicio, data_fim: dataFim, notas };
    try {
      if (initial) await onSave({ pk: initial.pk, data: payload });
      else await onSave(payload);
    } catch {
      // erro já mostrado pelo ecrã pai — mantém o diálogo aberto para o
      // utilizador corrigir e tentar guardar de novo, em vez de descartar
      // silenciosamente a edição.
      return;
    }
    if (!initial) clearDraft();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Dialog.Title style={styles.title}>{initial ? 'Editar Pedido de Férias' : 'Novo Pedido de Férias'}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 480 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Tipo</Text>
            <ExpandablePicker placeholder="Seleccionar tipo" value={tipoFk} options={tipoOptions} onSelect={setTipoFk} />

            <Text style={styles.label}>Data Início *</Text>
            <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPickerInicio(true)}>
              <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{dataInicio ? fmtDatePt(dataInicio) : 'Seleccionar data'}</Text>
            </TouchableOpacity>
            {showPickerInicio && (
              <DateTimePicker
                value={dataInicio ? new Date(dataInicio + 'T00:00:00') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { setShowPickerInicio(false); if (d) setDataInicio(toLocalISODate(d)); }}
              />
            )}

            <Text style={styles.label}>Data Fim *</Text>
            <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPickerFim(true)}>
              <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{dataFim ? fmtDatePt(dataFim) : 'Seleccionar data'}</Text>
            </TouchableOpacity>
            {showPickerFim && (
              <DateTimePicker
                value={dataFim ? new Date(dataFim + 'T00:00:00') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { setShowPickerFim(false); if (d) setDataFim(toLocalISODate(d)); }}
              />
            )}

            {!isCheckingConflitos && conflitos.length > 0 && (
              <View style={styles.conflictBox}>
                <Text style={styles.conflictTitle}>Conflito com colega(s) da mesma equipa neste período:</Text>
                <View style={styles.conflictChips}>
                  {conflitos.map((c) => (
                    <Chip key={c.ferias_pk} compact style={styles.conflictChip} textStyle={{ fontSize: 11 }}>
                      {c.colaborador_nome} ({fmtDatePt(c.data_inicio)}–{fmtDatePt(c.data_fim)})
                    </Chip>
                  ))}
                </View>
                <Text style={styles.conflictNote}>O pedido pode ser submetido — a decisão final cabe ao chefe direto.</Text>
              </View>
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
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  input: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
  conflictBox: {
    backgroundColor: COLORS.warningSurface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  conflictTitle: { fontSize: 12, fontWeight: '700', color: COLORS.warning, marginBottom: SPACING.xs },
  conflictChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  conflictChip: { backgroundColor: COLORS.surface },
  conflictNote: { fontSize: 11, color: COLORS.textSecondary, marginTop: SPACING.xs },
});

export default FeriasFormDialog;
