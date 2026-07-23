import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text, Switch, IconButton, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="settings" size={19} color={COLORS.primary} />
            <Text style={styles.title}>Regras de Geração de Piquete</Text>
          </View>
          <IconButton icon="close" size={20} onPress={onDismiss} style={styles.closeBtn} />
        </View>
        <Divider />

        <Dialog.ScrollArea style={{ maxHeight: 520 }}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.subtitle}>
              Estas regras definem os critérios utilizados pelo algoritmo de geração automática de escalas.
            </Text>

            {regras.map((r, idx) => (
              <View key={idx}>
                {idx > 0 && <Divider style={{ marginVertical: SPACING.md }} />}

                <View style={styles.topRow}>
                  <TextInput
                    label="Código"
                    value={r.codigo}
                    onChangeText={(v) => updateRegra(idx, { codigo: v })}
                    mode="outlined"
                    dense
                    disabled={!!r.pk}
                    style={[styles.input, styles.codigoInput]}
                    outlineStyle={{ borderRadius: RADIUS.md }}
                  />
                  <View style={styles.topRowRight}>
                    <View style={styles.switchGroup}>
                      <Text style={styles.switchLabel}>Activa</Text>
                      <Switch value={r.ativo} onValueChange={(v) => updateRegra(idx, { ativo: v })} />
                    </View>
                    <IconButton icon="delete" size={18} iconColor={COLORS.error} onPress={() => removeRegra(idx)} />
                  </View>
                </View>

                <TextInput
                  label="Descrição"
                  value={r.descr}
                  onChangeText={(v) => updateRegra(idx, { descr: v })}
                  mode="outlined"
                  dense
                  multiline
                  style={styles.input}
                  outlineStyle={{ borderRadius: RADIUS.md }}
                />

                <TextInput
                  label="Valor (opcional)"
                  value={r.valor}
                  onChangeText={(v) => updateRegra(idx, { valor: v })}
                  mode="outlined"
                  dense
                  placeholder="Ex: 2, 0.5, etc."
                  style={[styles.input, styles.valorInput]}
                  outlineStyle={{ borderRadius: RADIUS.md }}
                />
              </View>
            ))}

            <Button icon="plus" mode="text" compact onPress={addRegra} style={styles.addBtn}>
              Adicionar Nova Regra
            </Button>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.actions}>
          <Button onPress={onDismiss} disabled={isSaving} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button
            onPress={handleSave}
            mode="contained"
            disabled={!canSave || isSaving}
            style={{ borderRadius: RADIUS.pill }}
          >
            {isSaving ? 'A guardar...' : 'Guardar Alterações'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: SPACING.lg, paddingRight: SPACING.sm, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  closeBtn: { margin: 0 },
  content: { paddingVertical: SPACING.md },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  topRowRight: { flexDirection: 'row', alignItems: 'center' },
  codigoInput: { flex: 1 },
  valorInput: { width: '55%' },
  switchGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  switchLabel: { fontSize: 11, color: COLORS.textSecondary },
  input: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
  addBtn: { marginTop: SPACING.xs, alignSelf: 'flex-start' },
  actions: { backgroundColor: COLORS.background },
});

export default PiqueteRegrasDialog;
