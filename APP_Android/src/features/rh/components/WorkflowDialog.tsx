import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text, RadioButton } from 'react-native-paper';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';

const ESTADOS = [
  { value: 2, label: 'Validado (Superior)' },
  { value: 3, label: 'Aprovado RH' },
  { value: 4, label: 'Rejeitado' },
];

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
  const [step, setStep] = useState('1');
  const [estado, setEstado] = useState('');
  const [notas, setNotas] = useState('');

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
        <Dialog.Title style={styles.title}>Acção de Workflow</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.subtitle}>Registo #{refPk} — {tipoRef}</Text>

          <Text style={styles.label}>Nível</Text>
          <RadioButton.Group onValueChange={setStep} value={step}>
            <RadioButton.Item label="1 — Superior" value="1" labelStyle={styles.radioLabel} />
            <RadioButton.Item label="2 — Admin RH" value="2" labelStyle={styles.radioLabel} />
          </RadioButton.Group>

          <Text style={styles.label}>Decisão</Text>
          <RadioButton.Group onValueChange={setEstado} value={estado}>
            {ESTADOS.map((e) => (
              <RadioButton.Item key={e.value} label={e.label} value={String(e.value)} labelStyle={styles.radioLabel} />
            ))}
          </RadioButton.Group>

          <TextInput
            label="Notas (opcional)"
            value={notas}
            onChangeText={setNotas}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
            outlineStyle={{ borderRadius: RADIUS.md }}
          />
        </Dialog.Content>
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
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
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
  radioLabel: { color: COLORS.textPrimary },
  input: { marginTop: SPACING.sm, backgroundColor: COLORS.surface },
});

export default WorkflowDialog;
