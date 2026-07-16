import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Chip, Checkbox, Button, TextInput, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtDate, fmtTime } from '@/features/rh/utils/rhUtils';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import PontoMensalDetalheModal from '@/features/rh/components/PontoMensalDetalheModal';
import { usePendentes, useEquipa, type Pendente, type PendenteTipo } from '@/features/rh/hooks/useGestaoCentral';

const APROVAR_FK = 2;
const REJEITAR_FK = 4;

const TIPO_CONFIG: Record<PendenteTipo, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  ferias: { label: 'Férias', icon: 'beach-access', color: '#0284c7' },
  faltas: { label: 'Falta', icon: 'event-busy', color: '#d97706' },
  ponto: { label: 'Mapa de Ponto', icon: 'access-time', color: '#7c3aed' },
  participacao: { label: 'Participação', icon: 'badge', color: '#E11D48' },
};

const TIPO_OPTIONS: PickerOption[] = [
  { value: '', label: 'Todos os tipos' },
  ...(Object.keys(TIPO_CONFIG) as PendenteTipo[]).map((t) => ({ value: t, label: TIPO_CONFIG[t].label })),
];

// ─── Tabela: cabeçalho de coluna ──────────────────────────────────────────────

const PENDENTES_COLS = {
  tipo: 1.6, colaborador: 1.8, inicio: 1.1, fim: 1.3, estado: 1.1, submetido: 1.1, notas: 2.2,
} as const;

const TableHeader = () => (
  <View style={t.headerRow}>
    <View style={t.checkboxCol} />
    <Text style={[t.headerText, { flex: PENDENTES_COLS.tipo }]}>Tipo</Text>
    <Text style={[t.headerText, { flex: PENDENTES_COLS.colaborador }]}>Colaborador</Text>
    <Text style={[t.headerText, { flex: PENDENTES_COLS.inicio }]}>Início</Text>
    <Text style={[t.headerText, { flex: PENDENTES_COLS.fim }]}>Fim / Período</Text>
    <Text style={[t.headerText, { flex: PENDENTES_COLS.estado }]}>Estado</Text>
    <Text style={[t.headerText, { flex: PENDENTES_COLS.submetido }]}>Submetido</Text>
    <Text style={[t.headerText, { flex: PENDENTES_COLS.notas }]}>Notas</Text>
  </View>
);

const EQUIPA_COLS = {
  colaborador: 2.2, equipa: 1.8, entrada: 1.1, saida: 1.1, ferias: 1.1, faltas: 1.1, piquete: 1.1, horario: 1.8,
} as const;

const EquipaTableHeader = () => (
  <View style={t.headerRow}>
    <Text style={[t.headerText, { flex: EQUIPA_COLS.colaborador }]}>Colaborador</Text>
    <Text style={[t.headerText, { flex: EQUIPA_COLS.equipa }]}>Equipa</Text>
    <Text style={[t.headerText, { flex: EQUIPA_COLS.entrada }]}>Entrada Hoje</Text>
    <Text style={[t.headerText, { flex: EQUIPA_COLS.saida }]}>Saída Hoje</Text>
    <Text style={[t.headerText, { flex: EQUIPA_COLS.ferias }]}>Férias Disp.</Text>
    <Text style={[t.headerText, { flex: EQUIPA_COLS.faltas }]}>Faltas Ano</Text>
    <Text style={[t.headerText, { flex: EQUIPA_COLS.piquete }]}>Piquete</Text>
    <Text style={[t.headerText, { flex: EQUIPA_COLS.horario }]}>Horário</Text>
  </View>
);

const getInicio = (item: Pendente) =>
  item.tipo === 'ponto' ? `${String(item.mes).padStart(2, '0')}/${item.ano}` : fmtDate(item.data_inicio);

const getFim = (item: Pendente) =>
  item.tipo === 'ponto'
    ? '—'
    : item.data_fim && item.data_fim !== item.data_inicio
      ? fmtDate(item.data_fim)
      : '—';

const PendentesTab = () => {
  const [tipoFiltro, setTipoFiltro] = useState<PendenteTipo | ''>('');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedTipo, setSelectedTipo] = useState<PendenteTipo | null>(null);
  const [detalhe, setDetalhe] = useState<Pendente | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const { pendentes, isLoading, isError, workflowBulk, isBulking } = usePendentes(tipoFiltro ? { tipo: tipoFiltro } : {});

  const results = useMemo(() => {
    if (!search.trim()) return pendentes;
    const q = search.trim().toLowerCase();
    return pendentes.filter((p) => [p.colaborador_nome, p.notas].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [pendentes, search]);

  const toggle = (p: Pendente) => {
    if (p.tipo !== selectedTipo && selected.size > 0) return; // só permite selecionar o mesmo tipo (workflow é por tipo)
    const key = p.pk;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
    setSelectedTipo(next.size > 0 ? p.tipo : null);
  };

  const clearSelection = () => { setSelected(new Set()); setSelectedTipo(null); };

  const handleBulk = async (ts_estado_fk: number) => {
    if (!selectedTipo || selected.size === 0) return;
    try {
      const res = await workflowBulk({ tipo: selectedTipo, pks: Array.from(selected), step: 1, ts_estado_fk });
      setSnackMsg(`${res.ok.length} item(s) processados com sucesso.${res.erro.length ? ` ${res.erro.length} com erro.` : ''}`);
    } catch (err: any) {
      setSnackMsg(err?.response?.data?.error ?? 'Erro ao processar acção em massa.');
    } finally {
      setSnackVisible(true);
      clearSelection();
    }
  };

  if (isError) return <Text style={styles.errorText}>Erro ao carregar pendentes.</Text>;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.searchToggle}
          onPress={() => setShowSearch((v) => !v)}
        >
          <MaterialIcons name="search" size={20} color={showSearch ? COLORS.primary : COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.tipoPickerWrap}>
          <ExpandablePicker
            placeholder="Todos os tipos"
            value={tipoFiltro}
            options={TIPO_OPTIONS}
            onSelect={(v) => setTipoFiltro(v as PendenteTipo | '')}
          />
        </View>
        <View style={{ flex: 1 }} />
        {selected.size > 0 && (
          <View style={styles.bulkInline}>
            <Text style={styles.bulkText}>{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</Text>
            <Button mode="contained" compact buttonColor={COLORS.success} loading={isBulking} onPress={() => handleBulk(APROVAR_FK)}>
              Aprovar
            </Button>
            <Button mode="outlined" compact textColor={COLORS.error} disabled={isBulking} onPress={() => handleBulk(REJEITAR_FK)}>
              Rejeitar
            </Button>
          </View>
        )}
      </View>

      {showSearch && (
        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar por colaborador ou nota…"
            mode="outlined"
            dense
            autoFocus
            left={<TextInput.Icon icon="magnify" />}
            style={styles.searchInput}
            outlineStyle={{ borderRadius: RADIUS.pill }}
          />
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.tipo}-${item.pk}`}
          contentContainerStyle={styles.tableContent}
          ListHeaderComponent={results.length > 0 ? <TableHeader /> : null}
          ListEmptyComponent={<Text style={styles.empty}>Sem pedidos pendentes.</Text>}
          renderItem={({ item, index }) => {
            const cfg = TIPO_CONFIG[item.tipo];
            const checked = selected.has(item.pk);
            return (
              <TouchableOpacity
                style={[t.row, index % 2 === 1 && t.rowAlt]}
                activeOpacity={0.7}
                onPress={() => (item.tipo === 'ponto' ? setDetalhe(item) : toggle(item))}
              >
                <View style={t.checkboxCol}>
                  <Checkbox
                    status={checked ? 'checked' : 'unchecked'}
                    onPress={() => toggle(item)}
                    disabled={selectedTipo != null && selectedTipo !== item.tipo && !checked}
                  />
                </View>
                <View style={[t.cell, { flex: PENDENTES_COLS.tipo }]}>
                  <Chip
                    compact
                    icon={({ size }) => <MaterialIcons name={cfg.icon} size={size} color={cfg.color} />}
                    style={[t.tipoChip, { backgroundColor: `${cfg.color}18` }]}
                    textStyle={t.tipoChipText}
                  >
                    {cfg.label}
                  </Chip>
                </View>
                <Text style={[t.cellText, t.cellTextBold, { flex: PENDENTES_COLS.colaborador }]} numberOfLines={1}>
                  {item.colaborador_nome}
                </Text>
                <Text style={[t.cellText, { flex: PENDENTES_COLS.inicio }]}>{getInicio(item)}</Text>
                <Text style={[t.cellText, { flex: PENDENTES_COLS.fim }]}>{getFim(item)}</Text>
                <View style={[t.cell, { flex: PENDENTES_COLS.estado }]}>
                  <EstadoBadge descr={item.estado_descr} cor={item.estado_cor} />
                </View>
                <Text style={[t.cellText, { flex: PENDENTES_COLS.submetido }]}>{fmtDate(item.created_at)}</Text>
                <Text style={[t.cellText, { flex: PENDENTES_COLS.notas }]} numberOfLines={1}>{item.notas || '—'}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <PontoMensalDetalheModal visible={!!detalhe} onDismiss={() => setDetalhe(null)} pendente={detalhe} />

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3500} style={styles.snackbar}>
        {snackMsg}
      </Snackbar>
    </View>
  );
};

const EquipaTab = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const { equipa, isLoading, isError } = useEquipa();

  const results = useMemo(() => {
    if (!search.trim()) return equipa;
    const q = search.trim().toLowerCase();
    return equipa.filter((c) => c.name.toLowerCase().includes(q));
  }, [equipa, search]);

  const semEntradaCount = useMemo(() => equipa.filter((c) => !c.entrada_hoje).length, [equipa]);

  if (isError) return <Text style={styles.errorText}>Erro ao carregar dados da equipa.</Text>;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.searchToggle} onPress={() => setShowSearch((v) => !v)}>
          <MaterialIcons name="search" size={20} color={showSearch ? COLORS.primary : COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {semEntradaCount > 0 && (
          <View style={styles.semEntradaChip}>
            <MaterialIcons name="warning" size={13} color={COLORS.warning} />
            <Text style={styles.semEntradaChipText}>{semEntradaCount} sem entrada</Text>
          </View>
        )}
      </View>

      {showSearch && (
        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar…"
            mode="outlined"
            dense
            autoFocus
            left={<TextInput.Icon icon="magnify" />}
            style={styles.searchInput}
            outlineStyle={{ borderRadius: RADIUS.pill }}
          />
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.pk)}
          contentContainerStyle={styles.tableContent}
          ListHeaderComponent={results.length > 0 ? <EquipaTableHeader /> : null}
          ListEmptyComponent={<Text style={styles.empty}>Sem colaboradores.</Text>}
          renderItem={({ item, index }) => (
            <View style={[t.row, index % 2 === 1 && t.rowAlt]}>
              <Text style={[t.cellText, t.cellTextBold, { flex: EQUIPA_COLS.colaborador }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[t.cellText, { flex: EQUIPA_COLS.equipa }]} numberOfLines={1}>
                {item.equipa_nome || '—'}
              </Text>
              <View style={[t.cell, { flex: EQUIPA_COLS.entrada }]}>
                {item.entrada_hoje ? (
                  <View style={t.entradaRow}>
                    <MaterialIcons name="check-circle" size={14} color={COLORS.success} />
                    <Text style={t.cellText}>{fmtTime(item.entrada_hoje)}</Text>
                  </View>
                ) : (
                  <MaterialIcons name="cancel" size={16} color={COLORS.error} />
                )}
              </View>
              <Text style={[t.cellText, { flex: EQUIPA_COLS.saida }]}>
                {item.saida_hoje ? fmtTime(item.saida_hoje) : '—'}
              </Text>
              <View style={[t.cell, { flex: EQUIPA_COLS.ferias }]}>
                <View style={[t.statBox, t.statBoxFerias]}>
                  <Text style={[t.statBoxText, { color: COLORS.success }]}>{item.dias_ferias_disponiveis ?? 0}d</Text>
                </View>
              </View>
              <View style={[t.cell, { flex: EQUIPA_COLS.faltas }]}>
                <View style={t.statBox}>
                  <Text style={t.statBoxText}>{item.faltas_ano ?? 0}</Text>
                </View>
              </View>
              <Text style={[t.cellText, { flex: EQUIPA_COLS.piquete }]}>
                {item.piquete_semana_inicio ? fmtDate(item.piquete_semana_inicio) : '—'}
              </Text>
              <Text style={[t.cellText, t.cellTextMuted, { flex: EQUIPA_COLS.horario }]} numberOfLines={1}>
                {item.horario_descr || 'Sem horário'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

// ─── Cabeçalho da página + separadores com contagem ──────────────────────────

const GestaoCentralScreen = () => {
  const [tab, setTab] = useState<'pendentes' | 'equipa'>('pendentes');
  const { pendentes: allPendentes } = usePendentes();
  const { equipa } = useEquipa();

  const tabs = [
    { key: 'pendentes' as const, label: 'Pendentes', count: allPendentes.length, badgeColor: COLORS.error },
    { key: 'equipa' as const, label: 'Equipa Hoje', count: equipa.length, badgeColor: COLORS.warning },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderIcon}>
          <MaterialIcons name="apps" size={20} color={COLORS.error} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Gestão Centralizada RH</Text>
          <Text style={styles.pageSubtitle}>Painel de validação e supervisão de toda a equipa</Text>
        </View>
      </View>
      <View style={styles.pageHeaderAccent} />

      <View style={styles.tabBar}>
        {tabs.map((tb) => {
          const active = tab === tb.key;
          return (
            <TouchableOpacity key={tb.key} style={styles.tabBtn} onPress={() => setTab(tb.key)}>
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{tb.label}</Text>
              <View style={[styles.tabBadge, { backgroundColor: tb.badgeColor }]}>
                <Text style={styles.tabBadgeText}>{tb.count}</Text>
              </View>
              {active && <View style={styles.tabBtnIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'pendentes' ? <PendentesTab /> : <EquipaTab />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Page header
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  pageHeaderIcon: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorSurface, alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  pageSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  pageHeaderAccent: { height: 3, backgroundColor: COLORS.error },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabBtnTextActive: { color: COLORS.primary },
  tabBtnIndicator: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, backgroundColor: COLORS.primary },
  tabBadge: { borderRadius: RADIUS.pill, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Filter bar (Pendentes tab)
  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs,
  },
  searchToggle: { padding: 6 },
  tipoPickerWrap: { width: 220 },
  bulkInline: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },

  searchRow: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xs },
  searchInput: { backgroundColor: COLORS.surface },

  bulkText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  tableContent: { paddingHorizontal: SPACING.md, paddingBottom: 48 },
  errorText: { color: COLORS.error, textAlign: 'center', marginTop: SPACING.xl },
  empty: { color: COLORS.textDisabled, textAlign: 'center', marginTop: SPACING.xl },

  semEntradaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.warningSurface, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  semEntradaChipText: { fontSize: 11, fontWeight: '700', color: COLORS.warning },

  snackbar: { backgroundColor: COLORS.navy },
});

// ─── Estilos da tabela de Pendentes ───────────────────────────────────────────

const t = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f7fa', borderTopWidth: 1, borderTopColor: COLORS.border,
    borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.xs,
  },
  headerText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 4 },
  checkboxCol: { width: 40, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  rowAlt: { backgroundColor: COLORS.background },
  cell: { paddingHorizontal: 4, justifyContent: 'center' },
  cellText: { fontSize: 12, color: COLORS.textPrimary, paddingHorizontal: 4 },
  cellTextBold: { fontWeight: '600' },
  cellTextMuted: { color: COLORS.textDisabled, fontStyle: 'italic' },
  tipoChip: { alignSelf: 'flex-start' },
  tipoChipText: { fontSize: 11 },

  entradaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statBox: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 2,
  },
  statBoxFerias: { borderColor: COLORS.success + '55', backgroundColor: COLORS.successSurface },
  statBoxText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});

export default GestaoCentralScreen;
