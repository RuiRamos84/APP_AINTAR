import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text } from 'react-native-paper';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { fmtDate } from '@/features/rh/utils/rhUtils';
import type { Escala, Ocorrencia, CreateOcorrenciaPayload, EditOcorrenciaPayload } from '@/features/rh/hooks/usePiquete';
import type { LookupItem } from '@/features/rh/hooks/useRhLookups';

interface OcorrenciaFormDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: CreateOcorrenciaPayload | { pk: number; data: EditOcorrenciaPayload }) => Promise<unknown>;
  isSaving: boolean;
  initial: Ocorrencia | null;
  contextEscalaPk?: number | null;
  escalas: Escala[];
  tiposOcorrencia: LookupItem[];
}

const OcorrenciaFormDialog = ({ visible, onDismiss, onSave, isSaving, initial, contextEscalaPk, escalas, tiposOcorrencia }: OcorrenciaFormDialogProps) => {
  const [escalaFk, setEscalaFk] = useState('');
  const [tipoFk, setTipoFk] = useState('1');
  const [descr, setDescr] = useState('');
  const [equipas, setEquipas] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setEscalaFk(String(initial.tb_piquete_escala_fk));
      setTipoFk(String(initial.tt_tipo_fk));
      setDescr(initial.descr || '');
      setEquipas(initial.equipas_accionadas || '');
    } else {
      setEscalaFk(contextEscalaPk ? String(contextEscalaPk) : '');
      setTipoFk(tiposOcorrencia[0] ? String(tiposOcorrencia[0].pk) : '1');
      setDescr('');
      setEquipas('');
    }
  }, [visible, initial, contextEscalaPk]);

  const escalaOptions: PickerOption[] = escalas.map((e) => ({
    value: String(e.pk),
    label: `${e.colaborador_nome} — Semana ${fmtDate(e.data_inicio)}`,
  }));
  const tipoOptions: PickerOption[] = tiposOcorrencia.map((t) => ({ value: String(t.pk), label: t.descr as string }));

  const canSave = !!escalaFk && !!tipoFk && !!descr.trim();

  const handleSave = async () => {
    if (!canSave) return;
    const payload: CreateOcorrenciaPayload = {
      tb_piquete_escala_fk: Number(escalaFk),
      tt_tipo_fk: Number(tipoFk),
      descr: descr.trim(),
      equipas_accionadas: equipas.trim() || null,
    };
    if (initial) await onSave({ pk: initial.pk, data: payload });
    else await onSave(payload);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{initial ? 'Editar Ocorrência' : 'Registar Ocorrência'}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 460 }}>
          <ScrollView contentContainerStyle={styles.content}>
            {!contextEscalaPk && (
              <>
                <Text style={styles.label}>Escala *</Text>
                <ExpandablePicker placeholder="Seleccionar escala" value={escalaFk} options={escalaOptions} onSelect={setEscalaFk} />
              </>
            )}

            <Text style={styles.label}>Tipo</Text>
            <ExpandablePicker placeholder="Seleccionar tipo" value={tipoFk} options={tipoOptions} onSelect={setTipoFk} />

            <TextInput
              label="Descrição *"
              value={descr}
              onChangeText={setDescr}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md }}
            />

            <TextInput
              label="Equipas Accionadas"
              value={equipas}
              onChangeText={setEquipas}
              mode="outlined"
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md }}
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
  input: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
});

export default OcorrenciaFormDialog;
