import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Portal, Dialog, Checkbox } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { DocumentDetails, DocType, useReplicateDocument } from '../hooks/useDocumentDetails';

interface Props {
  visible: boolean;
  document: DocumentDetails | null;
  metaData: any;
  onClose: () => void;
  onSuccess: () => void;
}

const ReplicarPedidoModal = ({ visible, document, metaData, onClose, onSuccess }: Props) => {
  const replicate = useReplicateDocument();
  const [showInternalOnly, setShowInternalOnly] = useState(false);
  const [selectedType, setSelectedType] = useState<string | number | null>(null);

  const types: DocType[] = metaData?.types ?? [];
  const filteredTypes = useMemo(
    () => types.filter((t) => (showInternalOnly ? t.intern === 1 : t.intern !== 1)),
    [types, showInternalOnly]
  );

  const handleClose = () => {
    if (replicate.isPending) return;
    setSelectedType(null);
    setShowInternalOnly(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!document || selectedType == null) return;
    replicate.mutate({ id: document.pk, newType: selectedType }, {
      onSuccess: () => { handleClose(); onSuccess(); },
    });
  };

  if (!document) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose} style={rp.dialog}>
        <View style={rp.header}>
          <MaterialIcons name="file-copy" size={17} color={COLORS.primary} />
          <Text style={rp.title}>Replicar Pedido: {document.regnumber}</Text>
        </View>

        <Dialog.ScrollArea style={{ maxHeight: 460 }}>
          <ScrollView contentContainerStyle={rp.content}>
            <View style={rp.infoBanner}>
              <MaterialIcons name="info-outline" size={14} color={COLORS.info} />
              <Text style={rp.infoBannerText}>
                A replicação criará um novo pedido com os mesmos dados da entidade, mas com um novo tipo de documento.
              </Text>
            </View>

            <View style={rp.card}>
              <Text style={rp.cardTitle}>Documento Original</Text>
              <Text style={rp.cardLine}><Text style={rp.cardLineBold}>Tipo:</Text> {document.tt_type || '—'}</Text>
              <Text style={rp.cardLine}><Text style={rp.cardLineBold}>Entidade:</Text> {document.ts_entity || '—'}</Text>
              <Text style={rp.cardLine}><Text style={rp.cardLineBold}>NIPC:</Text> {document.nipc || 'N/A'}</Text>
            </View>

            <View style={rp.card}>
              <Text style={rp.cardTitle}>Selecione o novo Tipo de Pedido</Text>

              <TouchableOpacity
                style={rp.checkRow}
                onPress={() => { setShowInternalOnly((v) => !v); setSelectedType(null); }}
              >
                <Checkbox status={showInternalOnly ? 'checked' : 'unchecked'} />
                <Text style={rp.checkLabel}>Pedidos internos</Text>
              </TouchableOpacity>

              {filteredTypes.length === 0 ? (
                <Text style={rp.emptyText}>
                  {showInternalOnly ? 'Sem tipos de pedidos internos disponíveis' : 'Sem tipos de pedidos standard disponíveis'}
                </Text>
              ) : (
                <View style={{ gap: SPACING.xs }}>
                  {filteredTypes.map((t) => {
                    const disabled = String(t.tt_doctype_code) === String((document as any).tt_type_code);
                    const active = selectedType === t.tt_doctype_code;
                    return (
                      <TouchableOpacity
                        key={t.pk}
                        style={[rp.typeRow, active && rp.typeRowActive, disabled && { opacity: 0.4 }]}
                        onPress={() => !disabled && setSelectedType(t.tt_doctype_code)}
                        disabled={disabled}
                      >
                        <Text style={[rp.typeRowText, active && rp.typeRowTextActive]} numberOfLines={2}>
                          {t.tt_doctype_value}
                        </Text>
                        {t.intern === 1 && (
                          <View style={rp.internChip}><Text style={rp.internChipText}>Interno</Text></View>
                        )}
                        {active && <MaterialIcons name="check" size={16} color={COLORS.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={rp.warningBanner}>
                <MaterialIcons name="warning" size={14} color={COLORS.warning} />
                <Text style={rp.warningBannerText}>Revise os dados cuidadosamente antes de criar o novo pedido.</Text>
              </View>
            </View>

            {replicate.isError && (
              <Text style={rp.errorText}>Erro ao replicar: {(replicate.error as any)?.message}</Text>
            )}
          </ScrollView>
        </Dialog.ScrollArea>

        <View style={rp.actions}>
          <TouchableOpacity onPress={handleClose} style={rp.cancelBtn} disabled={replicate.isPending}>
            <Text style={rp.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[rp.saveBtn, (replicate.isPending || selectedType == null) && { opacity: 0.5 }]}
            disabled={replicate.isPending || selectedType == null}
          >
            {replicate.isPending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="file-copy" size={15} color="#fff" />}
            <Text style={rp.saveBtnText}>{replicate.isPending ? 'A replicar...' : 'Replicar Documento'}</Text>
          </TouchableOpacity>
        </View>
      </Dialog>
    </Portal>
  );
};

const rp = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  content: { paddingVertical: SPACING.sm, gap: SPACING.sm },
  infoBanner: {
    flexDirection: 'row', gap: SPACING.xs, alignItems: 'flex-start',
    backgroundColor: COLORS.infoSurface, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  infoBannerText: { fontSize: 12, color: COLORS.info, flex: 1 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardLine: { fontSize: 12, color: COLORS.textSecondary },
  cardLineBold: { fontWeight: '700', color: COLORS.textPrimary },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  checkLabel: { fontSize: 13, color: COLORS.textPrimary },
  emptyText: { fontSize: 12, color: COLORS.textDisabled, fontStyle: 'italic' },
  typeRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm,
  },
  typeRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySurface },
  typeRowText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  typeRowTextActive: { color: COLORS.primary, fontWeight: '600' },
  internChip: { backgroundColor: COLORS.primarySurface, borderRadius: RADIUS.pill, paddingHorizontal: 6, paddingVertical: 2 },
  internChipText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  warningBanner: {
    flexDirection: 'row', gap: SPACING.xs, alignItems: 'flex-start',
    backgroundColor: COLORS.warningSurface, borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm,
  },
  warningBannerText: { fontSize: 12, color: COLORS.warning, flex: 1 },
  errorText: { fontSize: 12, color: COLORS.error },
  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  cancelBtn: { paddingHorizontal: SPACING.md, paddingVertical: 9, justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

export default ReplicarPedidoModal;
