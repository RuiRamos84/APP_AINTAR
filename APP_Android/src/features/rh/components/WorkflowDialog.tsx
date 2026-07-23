import React, { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text } from 'react-native-paper';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { useScrollToEndOnKeyboard } from '@/shared/hooks/useScrollToEndOnKeyboard';

const ESTADOS = [
  { value: 2, label: 'Validado (Superior)' },
  { value: 3, label: 'Aprovado RH' },
  { value: 4, label: 'Rejeitado' },
];

const NIVEL_OPTIONS: PickerOption[] = [
  { value: '1', label: '1 — Superior' },
  { value: '2', label: '2 — Admin RH' },
];

const ESTADO_OPTIONS: PickerOption[] = ESTADOS.map((e) => ({ value: String(e.value), label: e.label }));

export interface WorkflowPayload {
  ref_pk: number;
  step: number;
  ts_estado_fk: number;
  notas: string | null;
}

interface WorkflowDialogProps {
  visible: boolean;
  onDismiss: () => void;
  refPk?: number;
  tipoRef: string;
  onConfirm: (payload: WorkflowPayload) => Promise<unknown>;
  isLoading?: boolean;
}

const WorkflowDialog = ({ visible, onDismiss, refPk, tipoRef, onConfirm, isLoading }: WorkflowDialogProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState('1');
  const [estado, setEstado] = useState('');
  const [notas, setNotas] = useState('');

  useScrollToEndOnKeyboard(scrollRef, visible);

  const handleConfirm = async () => {
    if (!refPk || !estado) return;
    await onConfirm({ ref_pk: refPk, step: Number(step), ts_estado_fk: Number(estado), notas: notas || null });
    setStep('1');
    setEstado('');
    setNotas('');
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Dialog.Title style={styles.title}>Acção de Workflow</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text style={styles.subtitle}>Registo #{refPk} — {tipoRef}</Text>

              <Text style={styles.label}>Nível</Text>
              <ExpandablePicker
                placeholder="Seleccionar nível"
                value={step}
                options={NIVEL_OPTIONS}
                onSelect={setStep}
              />

              <Text style={styles.label}>Decisão</Text>
              <ExpandablePicker
                placeholder="Seleccionar decisão"
                value={estado}
                options={ESTADO_OPTIONS}
                onSelect={setEstado}
              />

              <TextInput
                label="Notas (opcional)"
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
              onPress={handleConfirm}
              mode="contained"
              disabled={!estado || isLoading}
              loading={isLoading}
              style={{ borderRadius: RADIUS.pill }}
            >
              Confirmar
            </Button>
          </Dialog.Actions>
        </KeyboardAvoidingView>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  title: { fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { color: COLORS.textSecondary, marginBottom: SPACING.sm },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: { marginTop: SPACING.sm, backgroundColor: COLORS.surface },
});

export default WorkflowDialog;
