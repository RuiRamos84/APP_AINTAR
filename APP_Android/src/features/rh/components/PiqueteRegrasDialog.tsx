import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text, Switch, IconButton, Divider } from 'react-native-paper';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import type { Regra } from '@/features/rh/hooks/usePiquete';

interface PiqueteRegrasDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (regras: Regra[]) => Promise<unknown>;
  isSaving: boolean;
  initial: Regra[];
}

const PiqueteRegrasDialog = ({ visible, onDismiss, onSave, isSaving, initial }: PiqueteRegrasDialogProps) => {
  const [regras, setRegras] = useState<Regra[]>([]);

  useEffect(() => {
    if (visible) setRegras(initial.map((r) => ({ ...r })));
  }, [visible, initial]);

  const updateRegra = (idx: number, patch: Partial<Regra>) => {
    setRegras((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRegra = () => setRegras((prev) => [...prev, { codigo: '', descr: '', valor: '', ativo: true }]);
  const removeRegra = (idx: number) => setRegras((prev) => prev.filter((_, i) => i !== idx));

  const canSave = regras.every((r) => r.codigo.trim().length > 0);

  const handleSave = async () => {
    if (!canSave) return;
    await onSave(regras);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Regras de Piquete</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 520 }}>
          <ScrollView contentContainerStyle={styles.content}>
            {regras.map((r, idx) => (
              <View key={idx}>
                {idx > 0 && <Divider style={{ marginVertical: SPACING.sm }} />}
                <View style={styles.rowHeader}>
                  <Text style={styles.regraIndex}>Regra {idx + 1}</Text>
                  <IconButton icon="delete" size={18} iconColor={COLORS.error} onPress={() => removeRegra(idx)} />
                </View>
                <TextInput
                  label="Código *"
                  value={r.codigo}
                  onChangeText={(v) => updateRegra(idx, { codigo: v })}
                  mode="outlined"
                  disabled={!!r.pk}
                  style={styles.input}
                  outlineStyle={{ borderRadius: RADIUS.md }}
                />
                <TextInput
                  label="Descrição"
                  value={r.descr}
                  onChangeText={(v) => updateRegra(idx, { descr: v })}
                  mode="outlined"
                  multiline
                  style={styles.input}
                  outlineStyle={{ borderRadius: RADIUS.md }}
                />
                <TextInput
                  label="Valor"
                  value={r.valor}
                  onChangeText={(v) => updateRegra(idx, { valor: v })}
                  mode="outlined"
                  placeholder="Ex: 2, 0.5, etc."
                  style={styles.input}
                  outlineStyle={{ borderRadius: RADIUS.md }}
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Activa</Text>
                  <Switch value={r.ativo} onValueChange={(v) => updateRegra(idx, { ativo: v })} />
                </View>
              </View>
            ))}

            <Button icon="plus" mode="outlined" onPress={addRegra} style={styles.addBtn}>
              Adicionar Nova Regra
            </Button>
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
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  regraIndex: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  input: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  switchLabel: { fontSize: 13, color: COLORS.textPrimary },
  addBtn: { marginTop: SPACING.xs, borderRadius: RADIUS.md },
});

export default PiqueteRegrasDialog;
