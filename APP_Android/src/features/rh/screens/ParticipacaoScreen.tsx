import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, FAB, IconButton, Badge, Snackbar, TextInput, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '@/features/auth/store/authStore';
import { useParticipacoes, useMotivosParticipacao, preAvisoStatus, type Participacao } from '@/features/rh/hooks/useParticipacoes';
import { useParticipacaoAnexos, type PickedFile } from '@/features/rh/hooks/useParticipacaoAnexos';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtDate, RH_COLOR } from '@/features/rh/utils/rhUtils';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import ParticipacaoFormDialog from '@/features/rh/components/ParticipacaoFormDialog';
import ParticipacaoWorkflowDialog from '@/features/rh/components/ParticipacaoWorkflowDialog';

const PRE_AVISO_COLOR: Record<string, { bg: string; fg: string }> = {
  success: { bg: COLORS.successSurface, fg: COLORS.success },
  warning: { bg: COLORS.warningSurface, fg: COLORS.warning },
  error: { bg: COLORS.errorSurface, fg: COLORS.error },
};

const ParticipacaoScreen = () => {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = hasPermission('rh.admin');
  const canValidar = isAdmin || hasPermission('rh.validate');

  const params = isAdmin ? {} : { user_fk: user?.pk };
  const { participacoes, isLoading, error, criar, isCriando, editar, isEditando, workflow, isWorkflow } = useParticipacoes(params);
  const { motivos } = useMotivosParticipacao();
  const { upload: uploadAnexos } = useParticipacaoAnexos();

  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Participacao | null>(null);
  const [wfTarget, setWfTarget] = useState<Participacao | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const showMsg = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const results = useMemo(() => {
    if (!search.trim()) return participacoes;
    const q = search.trim().toLowerCase();
    return participacoes.filter((p) =>
      [p.colaborador_nome, p.motivo_descricao, p.observacoes, p.estado_descricao]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [participacoes, search]);

  const openCreate = () => { setSelected(null); setFormVisible(true); };
  const openEdit = (item: Participacao) => { setSelected(item); setFormVisible(true); };

  const handleSave = async (payload: any, pendingFiles: PickedFile[] = []) => {
    try {
      let pk: number | undefined;
      if (selected) {
        await editar(payload);
        pk = selected.pk;
      } else {
        const res: any = await criar(payload);
        pk = res?.data?.pk;
      }
      if (pendingFiles.length > 0 && pk) {
        await uploadAnexos({ pk, files: pendingFiles });
      }
      showMsg(selected ? 'Participação actualizada.' : 'Participação registada.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao guardar participação.');
      throw err; // impede o diálogo de fechar como se tivesse sido guardado
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
    <View style={styles.center}><Text style={styles.errorText}>Erro ao carregar participações.</Text></View>
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
            <Text style={styles.empty}>Sem participações registadas.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const nDocs = item.documentos?.length || 0;
          const preAviso = preAvisoStatus(item.data_inicio, item.data_participacao);
          const preAvisoScheme = preAviso ? PRE_AVISO_COLOR[preAviso.nivel] : null;
          const periodo = item.tipo === 'parcial'
            ? `${item.hora_inicio?.slice(0, 5) ?? ''} – ${item.hora_fim?.slice(0, 5) ?? ''}`
            : item.data_fim !== item.data_inicio ? `até ${fmtDate(item.data_fim)}` : null;

          return (
            <View style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: RH_COLOR }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: COLORS.warningSurface }]}>
                    <MaterialIcons name={item.tipo === 'parcial' ? 'access-time' : 'event-busy'} size={16} color={COLORS.warning} />
                  </View>
                  <Text style={styles.dateText}>{fmtDate(item.data_inicio)}</Text>
                  <EstadoBadge descr={item.estado_descricao} cor={item.estado_cor} />
                </View>

                <View style={styles.chipsRow}>
                  <Chip compact style={styles.tipoChip} textStyle={{ fontSize: 11 }}>
                    {item.tipo === 'parcial' ? 'Parcial' : 'Dia(s)'}
                  </Chip>
                  {item.motivo_artigo && (
                    <Chip compact style={styles.tipoChip} textStyle={{ fontSize: 11 }}>{item.motivo_artigo}</Chip>
                  )}
                  {preAviso && preAvisoScheme && (
                    <Chip compact style={{ backgroundColor: preAvisoScheme.bg }} textStyle={{ fontSize: 11, color: preAvisoScheme.fg }}>
                      {preAviso.label}
                    </Chip>
                  )}
                </View>

                {periodo ? <Text style={styles.motivoText}>{periodo}</Text> : null}
                {item.observacoes ? <Text style={styles.motivoText}>{item.observacoes}</Text> : null}

                <View style={styles.actionsRow}>
                  {item.ts_estado_fk <= 2 && (
                    <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />
                  )}
                  <View>
                    <IconButton icon="paperclip" size={18} onPress={() => openEdit(item)} />
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

      <ParticipacaoFormDialog
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSave={handleSave}
        isSaving={isCriando || isEditando}
        initial={selected}
        motivos={motivos}
      />

      <ParticipacaoWorkflowDialog
        visible={!!wfTarget}
        onDismiss={() => setWfTarget(null)}
        target={wfTarget}
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
  dateText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  tipoChip: { backgroundColor: COLORS.overlay },
  motivoText: { fontSize: 12, color: COLORS.textDisabled },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginLeft: -SPACING.sm },
  attachBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: COLORS.primary },
  fab: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, backgroundColor: COLORS.primary },
  snackbar: { backgroundColor: COLORS.navy },
});

export default ParticipacaoScreen;
