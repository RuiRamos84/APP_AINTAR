import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text, ActivityIndicator, Checkbox } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import {
  useDocumentParams, useUpdateDocumentParams, DocumentParam,
} from '../hooks/useDocumentDetails';

const PARAM_TYPE = { NUMBER: 1, TEXT: 2, REFERENCE: 3, BOOLEAN: 4 };

const formatValue = (p: DocumentParam): string => {
  const type = Number(p.type);
  if (type === PARAM_TYPE.BOOLEAN) {
    const v = p.value;
    if (v === '1' || v === 1 || v === true) return 'Sim';
    if (v === '0' || v === 0 || v === false) return 'Não';
    return '—';
  }
  return p.value != null && p.value !== '' ? String(p.value) : '—';
};

const ParametrosTab = ({ docId }: { docId: number | null }) => {
  const { data: params = [], isLoading } = useDocumentParams(docId);
  const updateParams = useUpdateDocumentParams();

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<number, string | boolean>>({});

  useEffect(() => {
    if (!editing) {
      const v: Record<number, string | boolean> = {};
      params.forEach((p) => {
        const type = Number(p.type);
        v[p.pk] = type === PARAM_TYPE.BOOLEAN ? (p.value === '1' || p.value === 1 || p.value === true) : String(p.value ?? '');
      });
      setValues(v);
    }
  }, [params, editing]);

  if (isLoading) {
    return <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />;
  }

  if (params.length === 0) {
    return <Text style={pt.emptyText}>Sem parâmetros.</Text>;
  }

  const handleSave = () => {
    const payload = params.map((p) => {
      const type = Number(p.type);
      const v = values[p.pk];
      return { pk: p.pk, value: type === PARAM_TYPE.BOOLEAN ? (v ? '1' : '0') : v, memo: p.memo };
    });
    if (!docId) return;
    updateParams.mutate({ id: docId, params: payload }, { onSuccess: () => setEditing(false) });
  };

  return (
    <View style={{ gap: SPACING.xs }}>
      {params.map((p) => {
        const type = Number(p.type);
        return (
          <View key={p.pk} style={pt.row}>
            <Text style={pt.rowLabel} numberOfLines={2}>{p.name}</Text>
            {!editing ? (
              <Text style={pt.rowValue}>
                {formatValue(p)}{p.units && p.value != null && p.value !== '' ? ` ${p.units}` : ''}
              </Text>
            ) : type === PARAM_TYPE.BOOLEAN ? (
              <Checkbox
                status={values[p.pk] ? 'checked' : 'unchecked'}
                onPress={() => setValues((prev) => ({ ...prev, [p.pk]: !prev[p.pk] }))}
              />
            ) : (
              <RNTextInput
                style={pt.input}
                value={String(values[p.pk] ?? '')}
                onChangeText={(v) => setValues((prev) => ({ ...prev, [p.pk]: v }))}
                keyboardType={type === PARAM_TYPE.NUMBER ? 'numeric' : 'default'}
                placeholder={p.units || ''}
                placeholderTextColor={COLORS.textDisabled}
              />
            )}
          </View>
        );
      })}

      <View style={pt.actions}>
        {editing ? (
          <>
            <TouchableOpacity onPress={() => setEditing(false)} style={pt.cancelBtn}>
              <Text style={pt.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={pt.saveBtn} disabled={updateParams.isPending}>
              {updateParams.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <MaterialIcons name="save" size={14} color="#fff" />}
              <Text style={pt.saveBtnText}>{updateParams.isPending ? 'A guardar...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)} style={pt.editBtn}>
            <MaterialIcons name="edit" size={14} color={COLORS.primary} />
            <Text style={pt.editBtnText}>Editar Parâmetros</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const pt = StyleSheet.create({
  emptyText: { fontSize: 13, color: COLORS.textDisabled, fontStyle: 'italic' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rowLabel: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  rowValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  input: {
    flex: 1, maxWidth: 160, textAlign: 'right',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 6, fontSize: 13, color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.xs },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  cancelBtn: { paddingHorizontal: SPACING.md, paddingVertical: 9, justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

export default ParametrosTab;
