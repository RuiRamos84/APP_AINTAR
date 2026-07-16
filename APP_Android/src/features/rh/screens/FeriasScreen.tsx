import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, FAB, IconButton, Snackbar, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFerias, type Ferias } from '@/features/rh/hooks/useFerias';
import { useRhLookups } from '@/features/rh/hooks/useRhLookups';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtDate } from '@/features/rh/utils/rhUtils';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import FeriasFormDialog from '@/features/rh/components/FeriasFormDialog';
import WorkflowDialog from '@/features/rh/components/WorkflowDialog';

const FeriasScreen = () => {
  const { ferias, isLoading, error, criar, isCriando, editar, isEditando, workflow, isWorkflow } = useFerias();
  const { lookups } = useRhLookups();

  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Ferias | null>(null);
  const [wfTarget, setWfTarget] = useState<Ferias | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const showError = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const results = useMemo(() => {
    if (!search.trim()) return ferias;
    const q = search.trim().toLowerCase();
    return ferias.filter((f) =>
      [f.colaborador_nome, f.tipo_descr, f.notas, f.estado_descr]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [ferias, search]);

  const openCreate = () => { setSelected(null); setFormVisible(true); };
  const openEdit = (item: Ferias) => { setSelected(item); setFormVisible(true); };

  const handleSave = async (payload: any) => {
    try {
      if (selected) await editar(payload);
      else await criar(payload);
      showError(selected ? 'Pedido actualizado.' : 'Pedido de férias criado.');
    } catch (err: any) {
      showError(err?.response?.data?.error ?? 'Erro ao guardar pedido.');
    }
  };

  const handleWorkflow = async (payload: any) => {
    try {
      await workflow(payload);
      showError('Acção de workflow executada.');
    } catch (err: any) {
      showError(err?.response?.data?.error ?? 'Erro no workflow.');
    }
  };

  if (isLoading) return (
    <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
  );

  if (error) return (
    <View style={styles.center}><Text style={styles.errorText}>Erro ao carregar férias.</Text></View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar…"
          mode="outlined"
          dense
          left={<TextInput.Icon icon="magnify" />}
          style={styles.searchInput}
          outlineStyle={{ borderRadius: RADIUS.pill }}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.pk)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="beach-access" size={48} color={COLORS.textDisabled} />
            <Text style={styles.empty}>Sem pedidos de férias.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: COLORS.secondary }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: COLORS.secondarySurface }]}>
                  <MaterialIcons name="date-range" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.dateRange}>{fmtDate(item.data_inicio)} → {fmtDate(item.data_fim)}</Text>
                <EstadoBadge descr={item.estado_descr} cor={item.estado_cor} />
              </View>
              <Text style={styles.diasText}>
                {item.dias_uteis} {item.dias_uteis === 1 ? 'dia útil' : 'dias úteis'}
                {item.tipo_descr ? `  ·  ${item.tipo_descr}` : ''}
              </Text>
              {item.notas ? <Text style={styles.motivoText}>{item.notas}</Text> : null}

              <View style={styles.actionsRow}>
                {item.ts_estado_fk === 1 && (
                  <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />
                )}
                <IconButton icon="clipboard-check-outline" size={18} onPress={() => setWfTarget(item)} />
              </View>
            </View>
          </View>
        )}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreate} color="#FFFFFF" />

      <FeriasFormDialog
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSave={handleSave}
        isSaving={isCriando || isEditando}
        initial={selected}
        tiposFerias={lookups.tipos_ferias}
      />

      <WorkflowDialog
        visible={!!wfTarget}
        onDismiss={() => setWfTarget(null)}
        refPk={wfTarget?.pk}
        tipoRef="ferias"
        onConfirm={handleWorkflow}
        isLoading={isWorkflow}
      />

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={styles.snackbar}>
        {snackMsg}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  searchInput: { backgroundColor: COLORS.surface },
  content: { padding: SPACING.md, paddingBottom: 96, gap: SPACING.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.error, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: SPACING.sm },
  empty: { color: COLORS.textDisabled, fontSize: 15 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: SPACING.md, gap: SPACING.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconWrap: { width: 28, height: 28, borderRadius: RADIUS.xs, alignItems: 'center', justifyContent: 'center' },
  dateRange: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  diasText: { fontSize: 13, color: COLORS.textSecondary },
  motivoText: { fontSize: 12, color: COLORS.textDisabled, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginLeft: -SPACING.sm },
  fab: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, backgroundColor: COLORS.primary },
  snackbar: { backgroundColor: COLORS.navy },
});

export default FeriasScreen;
