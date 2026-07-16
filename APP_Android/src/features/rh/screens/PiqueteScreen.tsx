import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, FAB, IconButton, Snackbar, TextInput, Chip, SegmentedButtons, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '@/features/auth/store/authStore';
import { usePiquete, usePiqueteRegras, useOcorrencias, type Escala, type Ocorrencia } from '@/features/rh/hooks/usePiquete';
import { useRhLookups } from '@/features/rh/hooks/useRhLookups';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtDate, MESES } from '@/features/rh/utils/rhUtils';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import EscalaFormDialog from '@/features/rh/components/EscalaFormDialog';
import OcorrenciaFormDialog from '@/features/rh/components/OcorrenciaFormDialog';
import PiqueteRegrasDialog from '@/features/rh/components/PiqueteRegrasDialog';

const CURRENT_YEAR = new Date().getFullYear();
const ANO_OPTIONS: PickerOption[] = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => ({ value: String(y), label: String(y) }));
const MES_OPTIONS: PickerOption[] = MESES.map((m) => ({ value: String(m.value), label: m.label }));

interface EscalasTabProps {
  ano: number;
  mes: number;
  setAno: (v: number) => void;
  setMes: (v: number) => void;
  isAdmin: boolean;
  userPk?: number;
  showMsg: (msg: string) => void;
}

const EscalasTab = ({ ano, mes, setAno, setMes, isAdmin, userPk, showMsg }: EscalasTabProps) => {
  const { escalas, isLoading, error, gerar, isGerando, confirmar, criar, isCriando, editar, isEditando } = usePiquete({ ano, mes });
  const { regras, save: saveRegras, isSaving: isSavingRegras } = usePiqueteRegras();

  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Escala | null>(null);
  const [regrasVisible, setRegrasVisible] = useState(false);

  const results = useMemo(() => {
    if (!search.trim()) return escalas;
    const q = search.trim().toLowerCase();
    return escalas.filter((e) => e.colaborador_nome.toLowerCase().includes(q));
  }, [escalas, search]);

  const openCreate = () => { setSelected(null); setFormVisible(true); };
  const openEdit = (item: Escala) => { setSelected(item); setFormVisible(true); };

  const handleSave = async (payload: any) => {
    try {
      if (selected) await editar(payload);
      else await criar(payload);
      showMsg(selected ? 'Escala actualizada.' : 'Escala criada.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao guardar escala.');
    }
  };

  const handleConfirmar = async (pk: number) => {
    try {
      await confirmar(pk);
      showMsg('Escala confirmada.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao confirmar escala.');
    }
  };

  const handleGerar = async () => {
    try {
      await gerar({ ano, mes });
      showMsg('Escala gerada com sucesso.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao gerar escala.');
    }
  };

  const handleSaveRegras = async (r: any) => {
    try {
      await saveRegras(r);
      showMsg('Regras actualizadas.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao guardar regras.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterRow}>
        <View style={styles.pickerHalf}>
          <ExpandablePicker placeholder="Ano" value={String(ano)} options={ANO_OPTIONS} onSelect={(v) => setAno(Number(v))} />
        </View>
        <View style={styles.pickerHalf}>
          <ExpandablePicker placeholder="Mês" value={String(mes)} options={MES_OPTIONS} onSelect={(v) => setMes(Number(v))} />
        </View>
      </View>

      {isAdmin && (
        <View style={styles.adminActionsRow}>
          <Button mode="outlined" compact onPress={() => setRegrasVisible(true)} style={styles.adminBtn}>Regras</Button>
          <Button mode="outlined" compact loading={isGerando} onPress={handleGerar} style={styles.adminBtn}>Gerar Escala</Button>
        </View>
      )}

      <View style={styles.filterRow}>
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

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : error ? (
        <Text style={styles.errorText}>Erro ao carregar escalas.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.pk)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>Sem escalas neste período.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: COLORS.secondary }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.rowName} numberOfLines={1}>{item.colaborador_nome}</Text>
                  <EstadoBadge descr={item.estado_descr} cor={item.estado_cor} />
                </View>
                <Text style={styles.rowMeta}>{fmtDate(item.data_inicio)} → {fmtDate(item.data_fim)}</Text>
                <View style={styles.chipsRow}>
                  <Chip compact style={{ backgroundColor: item.confirmado ? COLORS.successSurface : COLORS.warningSurface }} textStyle={{ fontSize: 11, color: item.confirmado ? COLORS.success : COLORS.warning }}>
                    {item.confirmado ? 'Confirmado' : 'Por confirmar'}
                  </Chip>
                  <Chip compact style={styles.filterChip} textStyle={{ fontSize: 11 }}>{item.gerado_auto ? 'Auto' : 'Manual'}</Chip>
                </View>
                <View style={styles.actionsRow}>
                  {!item.confirmado && item.tb_user_fk === userPk && (
                    <IconButton icon="check-circle-outline" size={18} onPress={() => handleConfirmar(item.pk)} />
                  )}
                  {isAdmin && <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />}
                </View>
              </View>
            </View>
          )}
        />
      )}

      <FAB icon="plus" label="Manual" style={styles.fab} onPress={openCreate} color="#FFFFFF" />

      <EscalaFormDialog
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSave={handleSave}
        isSaving={isCriando || isEditando}
        initial={selected}
      />

      <PiqueteRegrasDialog
        visible={regrasVisible}
        onDismiss={() => setRegrasVisible(false)}
        onSave={handleSaveRegras}
        isSaving={isSavingRegras}
        initial={regras}
      />
    </View>
  );
};

const OcorrenciasTab = ({ ano, escalas, showMsg }: { ano: number; escalas: Escala[]; showMsg: (msg: string) => void }) => {
  const { ocorrencias, isLoading, error, criar, isCriando, editar, isEditando } = useOcorrencias({ ano });
  const { lookups } = useRhLookups();

  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Ocorrencia | null>(null);

  const results = useMemo(() => {
    if (!search.trim()) return ocorrencias;
    const q = search.trim().toLowerCase();
    return ocorrencias.filter((o) => [o.colaborador_nome, o.descr, o.tipo_descr].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [ocorrencias, search]);

  const openCreate = () => { setSelected(null); setFormVisible(true); };
  const openEdit = (item: Ocorrencia) => { setSelected(item); setFormVisible(true); };

  const handleSave = async (payload: any) => {
    try {
      if (selected) await editar(payload);
      else await criar(payload);
      showMsg(selected ? 'Ocorrência actualizada.' : 'Ocorrência registada.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao guardar ocorrência.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterRow}>
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

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : error ? (
        <Text style={styles.errorText}>Erro ao carregar ocorrências.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.pk)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>Sem ocorrências registadas.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: COLORS.warning }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.rowName} numberOfLines={1}>{item.colaborador_nome}</Text>
                  <Chip compact style={styles.filterChip} textStyle={{ fontSize: 11 }}>{item.tipo_descr}</Chip>
                </View>
                <Text style={styles.rowMeta}>Semana {fmtDate(item.semana_inicio)}</Text>
                <Text style={styles.motivoText}>{item.descr}</Text>
                {item.equipas_accionadas ? <Text style={styles.motivoText}>Equipas: {item.equipas_accionadas}</Text> : null}
                <View style={styles.actionsRow}>
                  <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />
                </View>
              </View>
            </View>
          )}
        />
      )}

      <FAB icon="plus" label="Registar" style={styles.fab} onPress={openCreate} color="#FFFFFF" />

      <OcorrenciaFormDialog
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSave={handleSave}
        isSaving={isCriando || isEditando}
        initial={selected}
        contextEscalaPk={null}
        escalas={escalas}
        tiposOcorrencia={lookups.tipos_ocorrencia}
      />
    </View>
  );
};

const PiqueteScreen = () => {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = hasPermission('rh.admin');

  const [tab, setTab] = useState('escalas');
  const [ano, setAno] = useState(CURRENT_YEAR);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const showMsg = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const { escalas } = usePiquete({ ano });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabsWrap}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'escalas', label: 'Escalas' },
            { value: 'ocorrencias', label: 'Ocorrências' },
          ]}
        />
      </View>
      {tab === 'escalas' ? (
        <EscalasTab ano={ano} mes={mes} setAno={setAno} setMes={setMes} isAdmin={isAdmin} userPk={user?.pk} showMsg={showMsg} />
      ) : (
        <OcorrenciasTab ano={ano} escalas={escalas} showMsg={showMsg} />
      )}

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={styles.snackbar}>
        {snackMsg}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },
  pickerHalf: { flex: 1 },
  searchInput: { flex: 1, backgroundColor: COLORS.surface },
  adminActionsRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },
  adminBtn: { borderRadius: RADIUS.md },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  filterChip: { backgroundColor: COLORS.overlay },
  listContent: { padding: SPACING.md, paddingBottom: 96, gap: SPACING.sm },
  errorText: { color: COLORS.error, textAlign: 'center', marginTop: SPACING.xl },
  empty: { color: COLORS.textDisabled, textAlign: 'center', marginTop: SPACING.xl },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  rowName: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  rowMeta: { fontSize: 13, color: COLORS.textSecondary },
  motivoText: { fontSize: 12, color: COLORS.textDisabled },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginLeft: -SPACING.sm },
  fab: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, backgroundColor: COLORS.primary },
  snackbar: { backgroundColor: COLORS.navy },
});

export default PiqueteScreen;
