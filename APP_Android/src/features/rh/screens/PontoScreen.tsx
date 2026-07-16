import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Text, ActivityIndicator, SegmentedButtons, Chip, Button, Snackbar, TextInput, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RhStackParamList } from '@/core/navigation/types';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { fmtTime, MESES } from '@/features/rh/utils/rhUtils';
import { usePontoHoje, usePontoActions, usePontoMes, usePontoMensal, useColaboradorPerfil, type PontoMensal } from '@/features/rh/hooks/usePonto';
import { useFaceStatus, useFaceUsers, useResetFaceAdmin } from '@/features/rh/hooks/useFace';
import PontoMonthCalendar from '@/features/rh/components/PontoMonthCalendar';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import WorkflowDialog from '@/features/rh/components/WorkflowDialog';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import useAuthStore from '@/features/auth/store/authStore';

type Nav = NativeStackNavigationProp<RhStackParamList>;

const EVENTOS = [
  { pk: 1, label: 'Entrada', icon: 'login' as const, color: '#16a34a' },
  { pk: 2, label: 'Início Almoço', icon: 'lunch-dining' as const, color: '#d97706' },
  { pk: 3, label: 'Fim Almoço', icon: 'free-breakfast' as const, color: '#0891b2' },
  { pk: 4, label: 'Saída', icon: 'logout' as const, color: '#dc2626' },
  { pk: 5, label: 'Saída Temporária', icon: 'directions-walk' as const, color: '#7c3aed' },
  { pk: 6, label: 'Regresso', icon: 'keyboard-return' as const, color: '#0369a1' },
];

const HojeTab = ({ userFk }: { userFk: number }) => {
  const navigation = useNavigation<Nav>();
  const { eventosHoje, isLoading } = usePontoHoje(userFk);
  const { isRegistando } = usePontoActions(userFk);
  const { data: faceStatus } = useFaceStatus(userFk);
  const { perfil } = useColaboradorPerfil(userFk);
  const gpsObrigatorio = perfil?.gps_obrigatorio ?? true;
  const faceEnrolled = faceStatus?.enrolled ?? null;

  const eventosMap = useMemo(() => {
    const m: Record<number, (typeof eventosHoje)[number]> = {};
    eventosHoje.forEach((e) => { m[e.tt_evento_fk] = e; });
    return m;
  }, [eventosHoje]);

  const diaEncerrado = Boolean(eventosMap[4]);

  const lastEventFk = useMemo(() => {
    if (!eventosHoje.length) return null;
    return [...eventosHoje].sort((a, b) => a.ts_registo.localeCompare(b.ts_registo)).at(-1)?.tt_evento_fk ?? null;
  }, [eventosHoje]);

  const lastSaidaTemp = useMemo(
    () => [...eventosHoje].filter((e) => e.tt_evento_fk === 5).sort((a, b) => b.ts_registo.localeCompare(a.ts_registo))[0] ?? null,
    [eventosHoje]
  );
  const lastRegresso = useMemo(
    () => [...eventosHoje].filter((e) => e.tt_evento_fk === 6).sort((a, b) => b.ts_registo.localeCompare(a.ts_registo))[0] ?? null,
    [eventosHoje]
  );

  const handlePress = (eventoFk: number) => {
    if (!faceEnrolled) return;
    navigation.navigate('FaceVerify', { eventoFk });
  };

  const hoje = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  if (isLoading) return <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />;

  return (
    <View>
      <View style={styles.hojeHeader}>
        <Text style={styles.hojeTitle}>{hoje}</Text>
        {faceEnrolled === false && (
          <Button
            mode="outlined"
            icon="account-check"
            compact
            textColor={COLORS.warning}
            onPress={() => navigation.navigate('FaceEnroll')}
          >
            Registar Rosto
          </Button>
        )}
        {faceEnrolled === true && (
          <Chip icon="face-recognition" compact style={{ backgroundColor: COLORS.successSurface }} textStyle={{ color: COLORS.success }}>
            Rosto Registado
          </Chip>
        )}
      </View>

      <View style={styles.gpsRow}>
        <MaterialIcons name={gpsObrigatorio ? 'gps-fixed' : 'gps-off'} size={14} color={gpsObrigatorio ? COLORS.primary : COLORS.textDisabled} />
        <Text style={[styles.gpsText, { color: gpsObrigatorio ? COLORS.textSecondary : COLORS.textDisabled }]}>
          {gpsObrigatorio ? 'GPS activo — definido pelo departamento RH' : 'GPS desactivado pelo departamento RH'}
        </Text>
      </View>

      {faceEnrolled === false && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            O reconhecimento facial ainda não está configurado. Toque em <Text style={{ fontWeight: '700' }}>Registar Rosto</Text> para activar os registos de ponto.
          </Text>
        </View>
      )}

      <View style={styles.grid}>
        {EVENTOS.map((ev) => {
          const isRepetivel = ev.pk === 5 || ev.pk === 6;
          const isAtivo = (() => {
            if (eventosMap[ev.pk] && !isRepetivel) return false;
            if (diaEncerrado) return false;
            if (isRepetivel) {
              return ev.pk === 5 ? [1, 3, 6].includes(lastEventFk as number) : lastEventFk === 5;
            }
            if (ev.pk === 1) return true;
            if (!eventosMap[1]) return false;
            if (ev.pk === 3 && !eventosMap[2]) return false;
            return true;
          })();

          const disabled = isRegistando || !faceEnrolled || !isAtivo;
          const registado = isRepetivel ? null : eventosMap[ev.pk];
          const lastOccurrence = ev.pk === 5 ? lastSaidaTemp : ev.pk === 6 ? lastRegresso : null;

          let caption: string;
          if (isRepetivel && lastOccurrence) caption = `Último: ${fmtTime(lastOccurrence.ts_registo)}`;
          else if (!faceEnrolled) caption = 'Rosto não registado';
          else if (isAtivo) caption = 'Toque para registar';
          else if (diaEncerrado) caption = 'Dia encerrado';
          else if (ev.pk === 3 && !eventosMap[2]) caption = 'Requer Início Almoço';
          else if (!eventosMap[1] && ev.pk !== 1) caption = 'Requer Entrada';
          else caption = 'Indisponível';

          return (
            <View key={ev.pk} style={styles.cardWrap}>
              <TouchableOpacity
                disabled={registado ? true : disabled}
                onPress={() => handlePress(ev.pk)}
                activeOpacity={0.7}
                style={[
                  styles.card,
                  { borderColor: registado || isAtivo ? ev.color : `${ev.color}55` },
                  registado ? { backgroundColor: `${ev.color}15` } : null,
                ]}
              >
                <MaterialIcons name={ev.icon} size={30} color={registado || isAtivo ? ev.color : `${ev.color}55`} />
                <Text style={[styles.cardLabel, { color: isAtivo || registado ? COLORS.textPrimary : COLORS.textDisabled }]}>
                  {ev.label}
                </Text>
                {registado ? (
                  <>
                    <Text style={[styles.cardTime, { color: ev.color }]}>{fmtTime(registado.ts_registo)}</Text>
                    {registado.fonte === 'correcao' && <Chip compact style={styles.miniChip}>Corrigido</Chip>}
                    {registado.fonte === 'app+face' && (
                      <Chip compact style={[styles.miniChip, { backgroundColor: COLORS.successSurface }]} textStyle={{ color: COLORS.success }}>
                        Face OK
                      </Chip>
                    )}
                  </>
                ) : (
                  <Text style={styles.cardCaption} numberOfLines={2}>{caption}</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {eventosHoje.length === 0 && (
        <Text style={styles.emptyHoje}>Sem registos para hoje. Toque em Entrada para começar.</Text>
      )}
    </View>
  );
};

const HistoricoTab = ({ userFk }: { userFk: number }) => {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const anos = [now.getFullYear() - 1, now.getFullYear()];

  const { registosMes, isLoading } = usePontoMes(userFk, ano, mes);
  const { mapas } = usePontoMensal({ user_fk: userFk, ano, mes });
  const { submeter, isSubmetendo } = usePontoActions(userFk);
  const mapaDoMes = mapas.find((m) => m.ano === ano && m.mes === mes);

  const mesOptions: PickerOption[] = MESES.map((m) => ({ value: String(m.value), label: m.label }));
  const anoOptions: PickerOption[] = anos.map((y) => ({ value: String(y), label: String(y) }));

  return (
    <View>
      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <ExpandablePicker placeholder="Mês" value={String(mes)} options={mesOptions} onSelect={(v) => setMes(Number(v))} />
        </View>
        <View style={{ width: 110 }}>
          <ExpandablePicker placeholder="Ano" value={String(ano)} options={anoOptions} onSelect={(v) => setAno(Number(v))} />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />
      ) : (
        <PontoMonthCalendar
          registosMes={registosMes}
          mapaDoMes={mapaDoMes}
          ano={ano}
          mes={mes}
          onSubmeter={submeter}
          isSubmetendo={isSubmetendo}
        />
      )}
    </View>
  );
};

const AprovacaoTab = () => {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [wfTarget, setWfTarget] = useState<PontoMensal | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const anos = [now.getFullYear() - 1, now.getFullYear()];

  const { mapas, isLoading } = usePontoMensal({ ano, mes });
  const { workflow, isWorkflow } = usePontoActions(undefined);

  const results = useMemo(() => {
    if (!search.trim()) return mapas;
    const q = search.trim().toLowerCase();
    return mapas.filter((m) => m.colaborador_nome?.toLowerCase().includes(q));
  }, [mapas, search]);

  const mesOptions: PickerOption[] = MESES.map((m) => ({ value: String(m.value), label: m.label }));
  const anoOptions: PickerOption[] = anos.map((y) => ({ value: String(y), label: String(y) }));

  const handleWorkflow = async (payload: any) => {
    try {
      await workflow(payload);
      setSnackMsg('Acção de workflow executada.');
    } catch (err: any) {
      setSnackMsg(err?.response?.data?.error ?? 'Erro no workflow.');
    } finally {
      setSnackVisible(true);
    }
  };

  return (
    <View>
      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <ExpandablePicker placeholder="Mês" value={String(mes)} options={mesOptions} onSelect={(v) => setMes(Number(v))} />
        </View>
        <View style={{ width: 110 }}>
          <ExpandablePicker placeholder="Ano" value={String(ano)} options={anoOptions} onSelect={(v) => setAno(Number(v))} />
        </View>
      </View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Pesquisar colaborador…"
        mode="outlined"
        dense
        left={<TextInput.Icon icon="magnify" />}
        style={[styles.searchInput, { marginBottom: SPACING.sm }]}
        outlineStyle={{ borderRadius: RADIUS.pill }}
      />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />
      ) : results.length === 0 ? (
        <Text style={styles.emptyHoje}>Sem mapas mensais neste período.</Text>
      ) : (
        results.map((m) => (
          <View key={m.pk} style={styles.aprovacaoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{m.colaborador_nome}</Text>
              <Text style={styles.rowMeta}>
                {m.total_dias} dias · {m.total_horas ?? '?'}h{m.submetido_em ? ` · submetido ${new Date(m.submetido_em).toLocaleDateString('pt-PT')}` : ''}
              </Text>
              <EstadoBadge descr={m.estado_descr} cor={m.estado_cor} />
            </View>
            {m.ts_estado_fk <= 2 && (
              <Button mode="outlined" compact onPress={() => setWfTarget(m)}>Aprovar</Button>
            )}
          </View>
        ))
      )}

      <WorkflowDialog
        visible={!!wfTarget}
        onDismiss={() => setWfTarget(null)}
        refPk={wfTarget?.pk}
        tipoRef="ponto"
        onConfirm={handleWorkflow}
        isLoading={isWorkflow}
      />

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={styles.snackbar}>
        {snackMsg}
      </Snackbar>
    </View>
  );
};

const GestaoFacialTab = () => {
  const { data: users, isLoading } = useFaceUsers();
  const { mutateAsync: resetAdmin, isPending } = useResetFaceAdmin();
  const [search, setSearch] = useState('');
  const [confirmUser, setConfirmUser] = useState<{ user_fk: number; name: string } | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const results = useMemo(() => {
    const list = users ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, search]);

  const handleReset = async () => {
    if (!confirmUser) return;
    try {
      await resetAdmin(confirmUser.user_fk);
      setSnackMsg('Rosto do colaborador removido.');
    } catch (err: any) {
      setSnackMsg(err?.response?.data?.error ?? 'Erro ao remover rosto.');
    } finally {
      setSnackVisible(true);
      setConfirmUser(null);
    }
  };

  return (
    <View>
      <View style={styles.warnBox}>
        <Text style={styles.warnText}>
          O reset remove todos os descritores faciais do colaborador. Ele terá de fazer novo registo antes de poder registar ponto.
        </Text>
      </View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Pesquisar…"
        mode="outlined"
        dense
        left={<TextInput.Icon icon="magnify" />}
        style={[styles.searchInput, { marginBottom: SPACING.sm }]}
        outlineStyle={{ borderRadius: RADIUS.pill }}
      />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />
      ) : (
        results.map((u) => (
          <View key={u.user_fk} style={styles.aprovacaoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{u.name}</Text>
              <Text style={styles.rowMeta}>{u.enrolled ? `${u.template_count} descritores registados` : 'Sem rosto registado'}</Text>
            </View>
            <Button
              mode="outlined"
              compact
              textColor={COLORS.error}
              disabled={!u.enrolled || isPending}
              onPress={() => setConfirmUser({ user_fk: u.user_fk, name: u.name })}
            >
              Reset
            </Button>
          </View>
        ))
      )}

      <WorkflowConfirmDialog
        visible={!!confirmUser}
        name={confirmUser?.name}
        loading={isPending}
        onCancel={() => setConfirmUser(null)}
        onConfirm={handleReset}
      />

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={styles.snackbar}>
        {snackMsg}
      </Snackbar>
    </View>
  );
};

const WorkflowConfirmDialog = ({ visible, name, loading, onCancel, onConfirm }: {
  visible: boolean; name?: string; loading: boolean; onCancel: () => void; onConfirm: () => void;
}) => (
  <Portal>
    <Dialog visible={visible} onDismiss={onCancel} style={{ borderRadius: RADIUS.xl }}>
      <Dialog.Title style={styles.confirmTitle}>Confirmar Reset Facial</Dialog.Title>
      <Dialog.Content>
        <Text style={styles.confirmBody}>
          Vai remover o registo facial de <Text style={{ fontWeight: '700' }}>{name}</Text>. O colaborador terá de fazer novo registo antes de poder registar ponto.
        </Text>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onCancel} disabled={loading}>Cancelar</Button>
        <Button mode="contained" buttonColor={COLORS.error} loading={loading} onPress={onConfirm}>Confirmar Reset</Button>
      </Dialog.Actions>
    </Dialog>
  </Portal>
);

const PontoScreen = () => {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const userFk = user?.pk;
  const isAdmin = hasPermission('rh.admin');
  const [tab, setTab] = useState('hoje');

  if (!userFk) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Não foi possível identificar o utilizador.</Text>
      </View>
    );
  }

  const buttons = [
    { value: 'hoje', label: 'Hoje' },
    { value: 'historico', label: 'Histórico' },
    { value: 'aprovacao', label: 'Aprovação' },
    ...(isAdmin ? [{ value: 'facial', label: 'Facial' }] : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabsWrap}>
        <SegmentedButtons value={tab} onValueChange={setTab} buttons={buttons} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'hoje' && <HojeTab userFk={userFk} />}
        {tab === 'historico' && <HistoricoTab userFk={userFk} />}
        {tab === 'aprovacao' && <AprovacaoTab />}
        {tab === 'facial' && isAdmin && <GestaoFacialTab />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  content: { padding: SPACING.md, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.error, textAlign: 'center' },
  hojeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs, flexWrap: 'wrap', gap: SPACING.xs },
  hojeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm },
  gpsText: { fontSize: 11 },
  warnBox: { backgroundColor: COLORS.warningSurface, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md },
  warnText: { fontSize: 12, color: COLORS.warning },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  cardWrap: { width: '48%' },
  card: {
    borderWidth: 2, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs,
    alignItems: 'center', backgroundColor: COLORS.surface, minHeight: 118, justifyContent: 'center', gap: 4,
  },
  cardLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cardTime: { fontSize: 16, fontWeight: '800' },
  cardCaption: { fontSize: 10, color: COLORS.textDisabled, textAlign: 'center' },
  miniChip: { height: 22, marginTop: 2 },
  emptyHoje: { color: COLORS.textDisabled, textAlign: 'center', marginTop: SPACING.lg, fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  searchInput: { backgroundColor: COLORS.surface },
  snackbar: { backgroundColor: COLORS.navy },
  aprovacaoRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  rowName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  rowMeta: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 2 },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  confirmBody: { fontSize: 13, color: COLORS.textSecondary },
});

export default PontoScreen;
