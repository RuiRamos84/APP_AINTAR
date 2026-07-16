import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text, RadioButton } from 'react-native-paper';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { fmtDate } from '@/features/rh/utils/rhUtils';
import { stepFromEstado } from '@/features/rh/hooks/useParticipacoes';
import type { Participacao, WorkflowParticipacaoPayload } from '@/features/rh/hooks/useParticipacoes';

const STEP_LABEL: Record<number, string> = {
  1: '1 — Chefe direto (Autorização dos Serviços)',
  2: '2 — Admin RH (Validação processual)',
  3: '3 — Presidência (Despacho final)',
};

const WF_TRANSICOES: Record<number, { value: number; label: string }[]> = {
  1: [{ value: 2, label: 'Validar (Autorizado)' }, { value: 4, label: 'Rejeitar' }],
  2: [{ value: 5, label: 'Autorizar (passa à Presidência)' }, { value: 4, label: 'Rejeitar' }],
  3: [{ value: 6, label: 'Despachar (Aprovado)' }, { value: 7, label: 'Rejeitar (Presidência)' }],
};

interface ParticipacaoWorkflowDialogProps {
  visible: boolean;
  onDismiss: () => void;
  target: Participacao | null;
  onConfirm: (payload: WorkflowParticipacaoPayload) => Promise<unknown>;
  isLoading?: boolean;
}

const ParticipacaoWorkflowDialog = ({ visible, onDismiss, target, onConfirm, isLoading }: ParticipacaoWorkflowDialogProps) => {
  const [estado, setEstado] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (visible) { setEstado(''); setNotas(''); }
  }, [visible, target?.pk]);

  if (!target) return null;
  const step = stepFromEstado(target.ts_estado_fk);
  const opcoes = WF_TRANSICOES[step] || [];

  const periodo = target.tipo === 'parcial'
    ? `${target.hora_inicio?.slice(0, 5) ?? ''} – ${target.hora_fim?.slice(0, 5) ?? ''}`
    : target.data_fim !== target.data_inicio
      ? `${fmtDate(target.data_inicio)} – ${fmtDate(target.data_fim)}`
      : fmtDate(target.data_inicio);

  const handleConfirm = async () => {
    if (!estado) return;
    await onConfirm({ ref_pk: target.pk, step, ts_estado_fk: Number(estado), notas: notas || null });
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Workflow de Participação</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.subtitle}>{target.colaborador_nome} · {periodo}</Text>

          <Text style={styles.label}>Nível de Aprovação</Text>
          <Text style={styles.stepText}>{STEP_LABEL[step]}</Text>

          <Text style={styles.label}>Decisão</Text>
          <RadioButton.Group onValueChange={setEstado} value={estado}>
            {opcoes.map((o) => (
              <RadioButton.Item key={o.value} label={o.label} value={String(o.value)} labelStyle={styles.radioLabel} />
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
  stepText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 },
  radioLabel: { color: COLORS.textPrimary },
  input: { marginTop: SPACING.sm, backgroundColor: COLORS.surface },
});

export default ParticipacaoWorkflowDialog;
