import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, FAB, IconButton, Badge, Snackbar, TextInput, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '@/features/auth/store/authStore';
import { useFaltas, type Falta } from '@/features/rh/hooks/useFaltas';
import { useRhLookups } from '@/features/rh/hooks/useRhLookups';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtDate, RH_COLOR } from '@/features/rh/utils/rhUtils';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import FaltaFormDialog from '@/features/rh/components/FaltaFormDialog';
import FaltasAnexosModal from '@/features/rh/components/FaltasAnexosModal';
import WorkflowDialog from '@/features/rh/components/WorkflowDialog';

const FaltasScreen = () => {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = hasPermission('rh.admin');
  const canValidar = isAdmin || hasPermission('rh.validate');

  const params = isAdmin ? {} : { user_fk: user?.pk };
  const { faltas, isLoading, error, criar, isCriando, editar, isEditando, workflow, isWorkflow } = useFaltas(params);
  const { lookups } = useRhLookups();

  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Falta | null>(null);
  const [wfTarget, setWfTarget] = useState<Falta | null>(null);
  const [anexosTarget, setAnexosTarget] = useState<Falta | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const showMsg = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const results = useMemo(() => {
    if (!search.trim()) return faltas;
    const q = search.trim().toLowerCase();
    return faltas.filter((f) =>
      [f.colaborador_nome, f.tipo_descr, f.notas, f.estado_descr]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [faltas, search]);

  const openCreate = () => { setSelected(null); setFormVisible(true); };
  const openEdit = (item: Falta) => { setSelected(item); setFormVisible(true); };

  const handleSave = async (payload: any) => {
    try {
      if (selected) await editar(payload);
      else await criar(payload);
      showMsg(selected ? 'Falta actualizada.' : 'Falta registada.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao guardar falta.');
      throw err;
    }
  };

  const handleWorkflow = async (payload: any) => {
    try {
      await workflow(payload);
      showMsg('Acção de workflow executada.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro no workflow.');
    }
  };

  if (isLoading) return (
    <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
  );

  if (error) return (
    <View style={styles.center}><Text style={styles.errorText}>Erro ao carregar faltas.</Text></View>
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
            <MaterialIcons name="event-busy" size={48} color={COLORS.textDisabled} />
            <Text style={styles.empty}>Sem faltas registadas.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const nDocs = item.documentos?.length || 0;
          return (
            <View style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: '#d97706' }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: '#FEF3E2' }]}>
                    <MaterialIcons name="event-busy" size={16} color="#d97706" />
                  </View>
                  <Text style={styles.dateText}>{fmtDate(item.data)}</Text>
                  <EstadoBadge descr={item.estado_descr} cor={item.estado_cor} />
                </View>

                <View style={styles.chipsRow}>
                  <Chip compact style={styles.tipoChip} textStyle={{ fontSize: 11 }}>{item.tipo_descr}</Chip>
                  {item.requer_justificativo && (
                    <Chip compact style={{ backgroundColor: COLORS.warningSurface }} textStyle={{ fontSize: 11, color: COLORS.warning }}>
                      Requer justificativo
                    </Chip>
                  )}
                </View>

                {item.comunicado_por_nome && (
                  <Text style={styles.motivoText}>Comunicado por {item.comunicado_por_nome}</Text>
                )}
                {item.notas ? <Text style={styles.motivoText}>{item.notas}</Text> : null}

                <View style={styles.actionsRow}>
                  {item.ts_estado_fk <= 2 && (
                    <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />
                  )}
                  <View>
                    <IconButton icon="paperclip" size={18} onPress={() => setAnexosTarget(item)} />
                    {nDocs > 0 && <Badge style={styles.attachBadge} size={16}>{nDocs}</Badge>}
                  </View>
                  {canValidar && (
                    <IconButton icon="clipboard-check-outline" size={18} onPress={() => setWfTarget(item)} />
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreate} color="#FFFFFF" />

      <FaltaFormDialog
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSave={handleSave}
        isSaving={isCriando || isEditando}
        initial={selected}
        tiposFalta={lookups.tipos_falta}
      />

      <WorkflowDialog
        visible={!!wfTarget}
        onDismiss={() => setWfTarget(null)}
        refPk={wfTarget?.pk}
        tipoRef="faltas"
        onConfirm={handleWorkflow}
        isLoading={isWorkflow}
      />

      <FaltasAnexosModal
        visible={!!anexosTarget}
        onDismiss={() => setAnexosTarget(null)}
        falta={anexosTarget}
        onError={showMsg}
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
  dateText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  tipoChip: { backgroundColor: COLORS.overlay },
  motivoText: { fontSize: 12, color: COLORS.textDisabled },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginLeft: -SPACING.sm },
  attachBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: COLORS.primary },
  fab: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, backgroundColor: RH_COLOR },
  snackbar: { backgroundColor: COLORS.navy },
});

export default FaltasScreen;
