import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  TextInput as RNTextInput, Platform,
} from 'react-native';
import { Text, ActivityIndicator, Portal, Dialog, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import {
  useSupervisorData, OperatorStat, OperacaoExec, PedidoRow,
} from '../hooks/useSupervisorData';
import DirectTaskDialog from '../components/DirectTaskDialog';
import PedidoDetailsModal from '@/features/documents/components/PedidoDetailsModal';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard',  icon: 'dashboard'  as const },
  { id: 'tasks',     label: 'Controlo',   icon: 'fact-check' as const },
  { id: 'team',      label: 'Equipa',     icon: 'people'     as const },
  { id: 'analytics', label: 'Analytics',  icon: 'bar-chart'  as const },
  { id: 'pedidos',   label: 'Pedidos',    icon: 'folder'     as const },
];

// ─── Table column widths ──────────────────────────────────────────────────────

const FLEX = {
  cb:     0.5,
  estado: 2,
  valid:  2.5,
  inst:   3,
  acao:   3,
  modo:   1.5,
  data:   1.5,
  op1:    2.5,
  op2:    2,
  acts:   0.7,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const effColor = (e: number) => e >= 75 ? COLORS.success : e >= 50 ? COLORS.warning : COLORS.error;
const effBg    = (e: number) => e >= 75 ? COLORS.successSurface : e >= 50 ? COLORS.warningSurface : COLORS.errorSurface;

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};
// Mirrors frontend-v2's formatDate (features/operations/utils/formatters.js) — data completa + hora
const fmtDateFull = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-PT', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};
const fmtDateShort = (iso?: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return iso; }
};
const fmtDatePicker = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const getInstTag = (name?: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('etar')) return 'ETAR';
  if (n.includes(' ee') || n.startsWith('ee')) return 'EE';
  return null;
};

// Mirrors frontend-v2's formatCompletedTaskValue (features/operations/utils/formatters.js)
const formatCompletedTaskValue = (op: OperacaoExec): { label: string; value: string } | null => {
  const tipo = Number(op.tt_operacaoaccao_type);
  const valuetext = op.valuetext;
  const valuenumb = op.valuenumb;

  if (!tipo) {
    if (valuetext) return { label: 'Resultado', value: String(valuetext) };
    if (valuenumb != null) return { label: 'Valor', value: String(valuenumb) };
    return null;
  }

  switch (tipo) {
    case 1: {
      const numValue = valuenumb ?? valuetext;
      return numValue != null ? { label: 'Valor Numérico', value: String(numValue) } : null;
    }
    case 2:
      return valuetext ? { label: 'Observações', value: String(valuetext) } : null;
    case 3:
      return valuetext ? { label: 'Opção Selecionada', value: String(valuetext) } : null;
    case 4:
      return { label: 'Confirmação', value: valuetext === '1' || valuetext === 'true' ? 'Sim' : 'Não' };
    case 5:
      if (valuetext === '1') return { label: 'Análise', value: 'Recolha realizada' };
      return valuetext ? { label: 'Análise', value: String(valuetext) } : null;
    default:
      return valuetext ? { label: 'Resultado', value: String(valuetext) } : null;
  }
};

// ─── Shared: ProgressBar ─────────────────────────────────────────────────────

const ProgressBar = ({ value, color = COLORS.success, height = 8 }: {
  value: number; color?: string; height?: number;
}) => (
  <View style={{ height, borderRadius: height / 2, backgroundColor: color + '1A', overflow: 'hidden' }}>
    <View style={{
      width: `${Math.min(Math.max(value, 0), 100)}%`,
      height: '100%',
      borderRadius: height / 2,
      backgroundColor: color,
    }} />
  </View>
);

// ─── Shared: StatCard ─────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon, iconColor, iconBg, subtitle }: {
  label: string; value: string | number;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string; iconBg: string; subtitle?: string;
}) => (
  <View style={[scard.card, { borderColor: iconColor + '33' }]}>
    <View style={[scard.iconWrap, { backgroundColor: iconBg }]}>
      <MaterialIcons name={icon} size={18} color={iconColor} />
    </View>
    <Text style={[scard.value, { color: iconColor }]}>{value}</Text>
    <Text style={scard.label}>{label}</Text>
    {subtitle ? <Text style={scard.sub}>{subtitle}</Text> : null}
  </View>
);
const scard = StyleSheet.create({
  card: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1.5, gap: 2,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  iconWrap: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  sub:   { fontSize: 11, color: COLORS.textSecondary },
});

// ─── Shared: SectionCard ─────────────────────────────────────────────────────

const SectionCard = ({ icon, title, children }: {
  icon: keyof typeof MaterialIcons.glyphMap; title: string; children: React.ReactNode;
}) => (
  <View style={sc.card}>
    <View style={sc.header}>
      <MaterialIcons name={icon} size={16} color={COLORS.primary} />
      <Text style={sc.title}>{title}</Text>
    </View>
    {children}
  </View>
);
const sc = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  title:  { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
});

// ─── Tab 0: Dashboard ─────────────────────────────────────────────────────────

const DashboardTab = (data: ReturnType<typeof useSupervisorData>) => {
  const { analytics, operatorStats, weekDistribution, dayDistribution } = data;
  const { overview } = analytics;
  const operatorsWithMetas = operatorStats.filter(op => op.totalTasks > 0).length;
  const daysWithMetas  = Object.values(dayDistribution).filter(v => v > 0).length;
  const [showAllOperators, setShowAllOperators] = useState(false);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <StatCard label="Concluídas" value={overview.completedTasks} icon="check-circle"
          iconColor={COLORS.success} iconBg={COLORS.successSurface} subtitle="Com resultado registado" />
        <StatCard label="Pendentes" value={overview.pendingTasks} icon="schedule"
          iconColor={overview.pendingTasks > 0 ? COLORS.warning : COLORS.success}
          iconBg={overview.pendingTasks > 0 ? COLORS.warningSurface : COLORS.successSurface}
          subtitle="Por completar" />
        <StatCard label="Metas" value={overview.totalOperations} icon="assignment"
          iconColor={COLORS.primary} iconBg={COLORS.primarySurface} subtitle="Rotinas agendadas" />
        <StatCard label="Taxa" value={`${overview.completionRate}%`} icon="trending-up"
          iconColor={overview.completionRate >= 75 ? COLORS.success : COLORS.warning}
          iconBg={overview.completionRate >= 75 ? COLORS.successSurface : COLORS.warningSurface}
          subtitle="Conclusão" />
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Taxa de Conclusão ({overview.completedTasks}/{overview.totalExecutions})</Text>
          <Text style={styles.progressPct}>{overview.completionRate}%</Text>
        </View>
        <ProgressBar value={overview.completionRate} height={10} />
      </View>

      <View style={styles.kpiGrid}>
        <StatCard label="Op. Ativos" value={overview.activeOperators} icon="people"
          iconColor="#2196f3" iconBg="#E3F2FD" />
        <StatCard label="Op. c/ Metas" value={operatorsWithMetas} icon="assignment-ind"
          iconColor="#9c27b0" iconBg="#F3E5F5" />
        <StatCard label="Programadas" value={overview.scheduledExecutions} icon="event-note"
          iconColor="#00897b" iconBg="#E0F2F1" />
        <StatCard label="Pontuais" value={overview.punctualExecutions} icon="flash-on"
          iconColor="#e65100" iconBg="#FBE9E7" />
      </View>

      <SectionCard icon="date-range" title="Metas por Semana">
        {Object.entries(weekDistribution).map(([week, count]) => {
          const wc: Record<string, string> = { W1: '#2196f3', W2: '#4caf50', W3: '#ff9800', W4: '#9c27b0' };
          const color = wc[week] ?? COLORS.primary;
          const max = Math.max(...Object.values(weekDistribution), 1);
          return (
            <View key={week} style={styles.distRow}>
              <Text style={styles.distKey}>{week}</Text>
              <View style={styles.distTrack}>
                <View style={[styles.distFill, { width: `${(count / max) * 100}%`, backgroundColor: color }]} />
              </View>
              <Text style={[styles.distCount, { color }]}>{count}</Text>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard icon="today" title="Metas por Dia da Semana">
        {Object.entries(dayDistribution).map(([day, count]) => {
          const max = Math.max(...Object.values(dayDistribution), 1);
          return (
            <View key={day} style={styles.distRow}>
              <Text style={[styles.distKey, { width: 48 }]}>{day.substring(0, 3)}</Text>
              <View style={styles.distTrack}>
                <View style={[styles.distFill, { width: `${(count / max) * 100}%`, backgroundColor: COLORS.primary }]} />
              </View>
              <Text style={[styles.distCount, { color: COLORS.primary }]}>{count}</Text>
            </View>
          );
        })}
      </SectionCard>

      {operatorStats.length > 0 && (
        <SectionCard icon="bar-chart" title="Atividade por Operador">
          <OperatorActivityTable operators={operatorStats} limit={showAllOperators ? undefined : 5} />
          {operatorStats.length > 5 && (
            <TouchableOpacity
              style={styles.moreToggle}
              onPress={() => setShowAllOperators(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.moreText}>
                {showAllOperators ? 'Mostrar menos' : `+ ${operatorStats.length - 5} mais operadores`}
              </Text>
              <MaterialIcons
                name={showAllOperators ? 'expand-less' : 'expand-more'}
                size={16}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
        </SectionCard>
      )}
    </ScrollView>
  );
};

// ─── Tab 1: Controlo de Tarefas (tabela) ─────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'executed';

const TasksTab = (data: ReturnType<typeof useSupervisorData>) => {
  const { operations, metaData, validateExecution, reassignOperacao, createDirect, addOperationAnnexes } = data;

  // ── registo rápido (Registar Execução) ──
  const [directOpen, setDirectOpen] = useState(false);

  const handleCreateDirect: React.ComponentProps<typeof DirectTaskDialog>['onSubmit'] = async (payload, files) => {
    const res = await createDirect.mutateAsync(payload);
    const createdPk = (res as any)?.data?.pk;
    if (files.length > 0 && createdPk) {
      try {
        await addOperationAnnexes(createdPk, files);
      } catch {
        // operação já foi criada — falha a anexar não deve bloquear o fecho do diálogo
      }
    }
    setDirectOpen(false);
    return (res as any)?.data;
  };

  // ── filter state ──
  const [dateFilter, setDateFilter]       = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all');
  const [opFilter, setOpFilter]           = useState('');
  const [showOpModal, setShowOpModal]     = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // ── selection state ──
  const [selectedPks, setSelectedPks]       = useState<Set<number>>(new Set());
  const [showBulkReassign, setShowBulkReassign] = useState(false);
  const [bulkOp1, setBulkOp1]               = useState(0);
  const [bulkOp2, setBulkOp2]               = useState(0);
  const [bulkLoading, setBulkLoading]       = useState(false);

  // ── details/validate/reassign ──
  const [selectedOp, setSelectedOp]     = useState<typeof operations[0] | null>(null);
  const [showDetails, setShowDetails]   = useState(false);
  const [showValidate, setShowValidate] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [classification, setClassification] = useState(0);
  const [controlMemo, setControlMemo]   = useState('');
  const [reassignOp1, setReassignOp1]   = useState(0);
  const [reassignOp2, setReassignOp2]   = useState(0);

  const operatorOptions = useMemo(
    () => (metaData?.who ?? metaData?.operadores ?? []) as { pk: number; name: string }[],
    [metaData],
  );
  const classificationOptions = useMemo(() => metaData?.opcontrolo ?? [], [metaData]);

  // ── filter ──
  const filtered = useMemo(() => {
    let r = operations;
    if (dateFilter) {
      const ds = dateFilter.toISOString().split('T')[0];
      r = r.filter(o => (o.data ?? '').startsWith(ds) || (o.updt_time ?? '').startsWith(ds));
    }
    if (opFilter) {
      const pk = Number(opFilter);
      r = r.filter(o => Number(o.pk_operador1) === pk || Number(o.pk_operador2) === pk);
    }
    if (statusFilter === 'pending')  r = r.filter(o => !o.hasExecutions);
    if (statusFilter === 'executed') r = r.filter(o => o.hasExecutions);
    return r;
  }, [operations, dateFilter, opFilter, statusFilter]);

  const pendingInView = useMemo(() => filtered.filter(o => !o.hasExecutions), [filtered]);
  const allSelected   = pendingInView.length > 0 && pendingInView.every(o => selectedPks.has(o.pk));
  const someSelected  = pendingInView.some(o => selectedPks.has(o.pk)) && !allSelected;

  const toggleSelect = (pk: number) =>
    setSelectedPks(prev => { const n = new Set(prev); n.has(pk) ? n.delete(pk) : n.add(pk); return n; });

  const toggleAll = () =>
    setSelectedPks(allSelected
      ? new Set([...selectedPks].filter(pk => !pendingInView.some(o => o.pk === pk)))
      : new Set([...selectedPks, ...pendingInView.map(o => o.pk)]));

  const selectAllPending = () => setSelectedPks(new Set(pendingInView.map(o => o.pk)));
  const clearSelection   = () => setSelectedPks(new Set());

  // ── validate ──
  const openValidate = (op: typeof operations[0]) => {
    setSelectedOp(op);
    setClassification(classificationOptions[0]?.pk ?? 0);
    setControlMemo('');
    setShowValidate(true);
  };
  const confirmValidate = () => {
    if (!selectedOp || !classification) return;
    validateExecution.mutate(
      { pk: selectedOp.pk, control_tt_operacaocontrolo: classification, control_memo: controlMemo },
      { onSuccess: () => { setShowValidate(false); setShowDetails(false); setSelectedOp(null); } },
    );
  };

  // ── reassign ──
  const openReassign = (op: typeof operations[0]) => {
    setSelectedOp(op);
    setReassignOp1(Number(op.pk_operador1) || 0);
    setReassignOp2(Number(op.pk_operador2) || 0);
    setShowReassign(true);
  };
  const confirmReassign = () => {
    if (!selectedOp || !reassignOp1) return;
    reassignOperacao.mutate(
      { id: selectedOp.pk, ts_operador1: reassignOp1, ts_operador2: reassignOp2 || undefined },
      { onSuccess: () => { setShowReassign(false); setShowDetails(false); setSelectedOp(null); } },
    );
  };

  // ── bulk reassign ──
  const confirmBulkReassign = async () => {
    if (!bulkOp1) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selectedPks].map(pk =>
        reassignOperacao.mutateAsync({ id: pk, ts_operador1: bulkOp1, ts_operador2: bulkOp2 || undefined }),
      ));
    } finally {
      setBulkLoading(false);
      setShowBulkReassign(false);
      clearSelection();
    }
  };

  const statusLabel = statusFilter === 'all' ? 'Todos' : statusFilter === 'pending' ? 'Pendentes' : 'Executadas';
  const opLabel = opFilter ? (operatorOptions.find(o => String(o.pk) === opFilter)?.name ?? 'Operador') : 'Operador';
  const hasFilters = !!dateFilter || !!opFilter || statusFilter !== 'all';

  return (
    <View style={{ flex: 1 }}>

      {/* ── Filter bar ── */}
      <View style={tb.filterBar}>
        <MaterialIcons name="filter-list" size={17} color={COLORS.textSecondary} style={{ marginRight: 4 }} />

        {/* Date */}
        <TouchableOpacity style={tb.filterInput} onPress={() => setShowDatePicker(true)}>
          <MaterialIcons name="calendar-today" size={13} color={COLORS.textSecondary} />
          <Text style={[tb.filterInputText, !!dateFilter && tb.filterActiveText]}>
            {dateFilter ? fmtDatePicker(dateFilter) : 'dd/mm/aaaa'}
          </Text>
          {dateFilter ? (
            <TouchableOpacity onPress={() => setDateFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={13} color={COLORS.textDisabled} />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>

        {/* Operador */}
        <TouchableOpacity style={tb.filterSelect} onPress={() => setShowOpModal(true)}>
          <Text style={[tb.filterSelectText, !!opFilter && tb.filterActiveText]} numberOfLines={1}>{opLabel}</Text>
          <MaterialIcons name="expand-more" size={15} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Estado */}
        <TouchableOpacity style={tb.filterSelect} onPress={() => setShowStatusModal(true)}>
          <Text style={[tb.filterSelectText, statusFilter !== 'all' && tb.filterActiveText]}>{statusLabel}</Text>
          <MaterialIcons name="expand-more" size={15} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {hasFilters && (
          <TouchableOpacity onPress={() => { setDateFilter(null); setOpFilter(''); setStatusFilter('all'); }}>
            <Text style={tb.clearBtn}>Limpar</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {/* + Registar Execução */}
        <TouchableOpacity style={tb.registerBtn} onPress={() => setDirectOpen(true)}>
          <MaterialIcons name="add" size={14} color="#fff" />
          <Text style={tb.registerBtnText}>Registar Execução</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bulk action bar ── */}
      {selectedPks.size > 0 && (
        <View style={tb.bulkBar}>
          <MaterialIcons name="playlist-add-check" size={17} color={COLORS.primary} />
          <Text style={tb.bulkCount}>{selectedPks.size} selecionada(s)</Text>
          {selectedPks.size < pendingInView.length && (
            <TouchableOpacity onPress={selectAllPending}>
              <Text style={tb.bulkLink}>Selecionar todas ({pendingInView.length})</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={tb.bulkBtn} onPress={() => { setBulkOp1(0); setBulkOp2(0); setShowBulkReassign(true); }}>
            <MaterialIcons name="people-alt" size={14} color="#fff" />
            <Text style={tb.bulkBtnText}>Reatribuir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearSelection} style={{ paddingHorizontal: 8 }}>
            <Text style={tb.bulkCancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Table ── */}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>

          {/* Header row */}
          <View style={tb.hRow}>
            {/* CB */}
            <View style={[tb.hCell, { flex: FLEX.cb, alignItems: 'center' }]}>
              <TouchableOpacity onPress={toggleAll}
                style={[tb.cbOuter, allSelected && tb.cbChecked, someSelected && tb.cbIndeter]}>
                {allSelected && <MaterialIcons name="check" size={11} color="#fff" />}
                {someSelected && <View style={tb.cbIndeterLine} />}
              </TouchableOpacity>
            </View>
            <View style={[tb.hCell, { flex: FLEX.estado }]}><Text style={tb.hText}>ESTADO</Text></View>
            <View style={[tb.hCell, { flex: FLEX.valid }]}><Text style={tb.hText}>VALIDAÇÃO</Text></View>
            <View style={[tb.hCell, { flex: FLEX.inst }]}><Text style={tb.hText}>INSTALAÇÃO</Text></View>
            <View style={[tb.hCell, { flex: FLEX.acao }]}><Text style={tb.hText}>AÇÃO</Text></View>
            <View style={[tb.hCell, { flex: FLEX.modo }]}><Text style={tb.hText}>MODO</Text></View>
            <View style={[tb.hCell, { flex: FLEX.data }]}><Text style={tb.hText}>DATA</Text></View>
            <View style={[tb.hCell, { flex: FLEX.op1 }]}><Text style={tb.hText}>OP. 1</Text></View>
            <View style={[tb.hCell, { flex: FLEX.op2 }]}><Text style={tb.hText}>OP. 2</Text></View>
            <View style={[tb.hCell, { flex: FLEX.acts, alignItems: 'center' }]}><Text style={tb.hText}>VER</Text></View>
          </View>

          {/* Body */}
          <ScrollView showsVerticalScrollIndicator>
            {filtered.length === 0 ? (
              <View style={tb.emptyRow}>
                <MaterialIcons name="check-circle" size={36} color={COLORS.success} />
                <Text style={tb.emptyText}>Nenhuma tarefa encontrada</Text>
              </View>
            ) : filtered.map(op => {
              const isSelected = selectedPks.has(op.pk);
              const isPending  = !op.hasExecutions;
              const validado   = !!op.control_tt_operacaocontrolo && op.control_tt_operacaocontrolo !== 0;
              const instTag    = getInstTag(op.instalacao_nome);
              const modo       = op.isPontual ? 'Pontual' : 'Programada';

              return (
                <TouchableOpacity
                  key={op.pk}
                  style={[tb.row, isSelected && tb.rowSelected]}
                  onPress={() => { setSelectedOp(op); setShowDetails(true); }}
                  activeOpacity={0.75}
                >
                  {/* CB */}
                  <View style={[tb.cell, { flex: FLEX.cb, alignItems: 'center' }]}>
                    {isPending && (
                      <TouchableOpacity onPress={() => toggleSelect(op.pk)}>
                        <View style={[tb.cbOuter, isSelected && tb.cbChecked]}>
                          {isSelected && <MaterialIcons name="check" size={11} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Estado */}
                  <View style={[tb.cell, { flex: FLEX.estado }]}>
                    <View style={[tb.chip,
                      op.hasExecutions
                        ? { borderColor: COLORS.success, backgroundColor: COLORS.successSurface }
                        : { borderColor: COLORS.warning, backgroundColor: COLORS.warningSurface }
                    ]}>
                      <Text style={[tb.chipText, { color: op.hasExecutions ? COLORS.success : COLORS.warning }]}>
                        {op.hasExecutions ? 'Executada' : 'Pendente'}
                      </Text>
                    </View>
                  </View>

                  {/* Validação */}
                  <View style={[tb.cell, { flex: FLEX.valid }]}>
                    {!op.hasExecutions ? (
                      <View style={tb.chipOutline}><Text style={tb.chipOutlineText}>-</Text></View>
                    ) : validado ? (
                      <View style={[tb.chip, { borderColor: COLORS.success, backgroundColor: COLORS.success }]}>
                        <MaterialIcons name="verified-user" size={10} color="#fff" />
                        <Text style={[tb.chipText, { color: '#fff' }]}>Validada</Text>
                      </View>
                    ) : (
                      <View style={[tb.chip, { borderColor: '#2196f3', backgroundColor: '#2196f3' }]}>
                        <Text style={[tb.chipText, { color: '#fff' }]}>Aguarda Validação</Text>
                      </View>
                    )}
                  </View>

                  {/* Instalação */}
                  <View style={[tb.cell, { flex: FLEX.inst }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {instTag ? (
                        <View style={[tb.instBadge, {
                          backgroundColor: instTag === 'ETAR' ? '#E8F5E9' : '#E3F2FD',
                        }]}>
                          <Text style={[tb.instBadgeText, { color: instTag === 'ETAR' ? '#2e7d32' : '#1565c0' }]}>
                            {instTag}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[tb.cellText, { flex: 1 }]} numberOfLines={1}>{op.instalacao_nome || '-'}</Text>
                    </View>
                  </View>

                  {/* Ação */}
                  <View style={[tb.cell, { flex: FLEX.acao }]}>
                    <Text style={tb.cellText} numberOfLines={2}>{op.acao_nome || '-'}</Text>
                  </View>

                  {/* Modo */}
                  <View style={[tb.cell, { flex: FLEX.modo }]}>
                    <Text style={[tb.cellText, { color: op.isPontual ? '#e65100' : '#00897b' }]}>{modo}</Text>
                  </View>

                  {/* Data */}
                  <View style={[tb.cell, { flex: FLEX.data }]}>
                    <Text style={tb.cellText}>{fmtDateShort(op.data as string | null)}</Text>
                  </View>

                  {/* Op1 */}
                  <View style={[tb.cell, { flex: FLEX.op1 }]}>
                    <Text style={tb.cellText} numberOfLines={1}>{op.operador1_nome || '-'}</Text>
                  </View>

                  {/* Op2 */}
                  <View style={[tb.cell, { flex: FLEX.op2 }]}>
                    <Text style={tb.cellText} numberOfLines={1}>{op.operador2_nome || '-'}</Text>
                  </View>

                  {/* Ações */}
                  <View style={[tb.cell, { flex: FLEX.acts, alignItems: 'center', justifyContent: 'center' }]}>
                    <MaterialIcons name="visibility" size={18} color={COLORS.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

        </View>
      </View>

      {/* ── Count bar ── */}
      <View style={tb.countBar}>
        <Text style={tb.countText}>{filtered.length} de {operations.length} operações</Text>
      </View>

      {/* ── Native date picker ── */}
      {showDatePicker && (
        <DateTimePicker
          value={dateFilter ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) setDateFilter(date);
          }}
        />
      )}

      {/* ── Portals ── */}
      <Portal>

        {/* Operator picker modal */}
        <Dialog visible={showOpModal} onDismiss={() => setShowOpModal(false)} style={dlg.dialog}>
          <Dialog.Title>Selecionar Operador</Dialog.Title>
          <Dialog.ScrollArea style={dlg.scrollArea}>
            <ScrollView>
              <TouchableOpacity style={[dlg.pickerItem, !opFilter && dlg.pickerItemActive]}
                onPress={() => { setOpFilter(''); setShowOpModal(false); }}>
                <Text style={[dlg.pickerItemText, !opFilter && dlg.pickerItemTextActive]}>Todos</Text>
              </TouchableOpacity>
              {operatorOptions.map(op => (
                <TouchableOpacity key={op.pk}
                  style={[dlg.pickerItem, opFilter === String(op.pk) && dlg.pickerItemActive]}
                  onPress={() => { setOpFilter(String(op.pk)); setShowOpModal(false); }}>
                  <Text style={[dlg.pickerItemText, opFilter === String(op.pk) && dlg.pickerItemTextActive]}>
                    {op.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setShowOpModal(false)}>Fechar</Button></Dialog.Actions>
        </Dialog>

        {/* Status picker modal */}
        <Dialog visible={showStatusModal} onDismiss={() => setShowStatusModal(false)} style={dlg.dialog}>
          <Dialog.Title>Estado</Dialog.Title>
          <Dialog.Content>
            {(['all', 'pending', 'executed'] as StatusFilter[]).map(s => {
              const label = s === 'all' ? 'Todos' : s === 'pending' ? 'Pendentes' : 'Executadas';
              return (
                <TouchableOpacity key={s}
                  style={[dlg.pickerItem, statusFilter === s && dlg.pickerItemActive]}
                  onPress={() => { setStatusFilter(s); setShowStatusModal(false); }}>
                  <Text style={[dlg.pickerItemText, statusFilter === s && dlg.pickerItemTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setShowStatusModal(false)}>Fechar</Button></Dialog.Actions>
        </Dialog>

        {/* Details dialog */}
        <Dialog visible={showDetails} onDismiss={() => setShowDetails(false)} style={dlg.dialog}>
          <View style={dlg.modalHeader}>
            <Text style={dlg.modalHeaderTitle}>Detalhes da Tarefa</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={dlg.modalHeaderDivider} />

          <Dialog.ScrollArea style={dlg.scrollArea}>
            <ScrollView>
              {selectedOp && (() => {
                const value = formatCompletedTaskValue(selectedOp);
                const isValidated = !!selectedOp.control_tt_operacaocontrolo;
                return (
                  <View style={dlg.body}>
                    {/* Título + estado */}
                    <View style={dlg.titleRow}>
                      <Text style={dlg.titleText}>{selectedOp.acao_nome || `Tarefa #${selectedOp.pk}`}</Text>
                      <View style={[dlg.statusChip, selectedOp.hasExecutions ? dlg.statusChipDone : dlg.statusChipPending]}>
                        <Text style={[dlg.statusChipText, { color: selectedOp.hasExecutions ? COLORS.success : COLORS.warning }]}>
                          {selectedOp.hasExecutions ? 'Executada (1x)' : 'Pendente'}
                        </Text>
                      </View>
                    </View>

                    {/* Instalação · Data · Modo */}
                    <View style={dlg.metaRow}>
                      <View style={dlg.metaItem}>
                        <MaterialIcons name="business" size={14} color={COLORS.textDisabled} />
                        <Text style={dlg.metaText}>{selectedOp.instalacao_nome || '—'}</Text>
                      </View>
                      {!!selectedOp.data && (
                        <>
                          <Text style={dlg.metaDot}>·</Text>
                          <View style={dlg.metaItem}>
                            <MaterialIcons name="calendar-today" size={13} color={COLORS.textDisabled} />
                            <Text style={dlg.metaText}>{fmtDateShort(selectedOp.data as string | null)}</Text>
                          </View>
                        </>
                      )}
                      <Text style={dlg.metaDot}>·</Text>
                      <Text style={dlg.metaText}>{selectedOp.isPontual ? 'Pontual' : 'Programada'}</Text>
                    </View>

                    <View style={dlg.divider} />

                    {/* Operadores */}
                    <View>
                      <View style={dlg.sectionHeaderRow}>
                        <Text style={dlg.sectionLabel}>Operadores</Text>
                        {!selectedOp.hasExecutions && (
                          <TouchableOpacity style={dlg.reassignLink} onPress={() => openReassign(selectedOp)}>
                            <MaterialIcons name="swap-horiz" size={13} color={COLORS.primary} />
                            <Text style={dlg.reassignLinkText}>Reatribuir</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={dlg.operatorRow}>
                        <MaterialIcons name="engineering" size={16} color={COLORS.textDisabled} />
                        <Text style={dlg.operatorText}>
                          {selectedOp.operador1_nome || '—'}
                          {selectedOp.operador2_nome ? `  ·  ${selectedOp.operador2_nome}` : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Registos de Execução — sempre visível, tal como no frontend-v2 */}
                    <View style={dlg.divider} />
                    <View>
                      <Text style={dlg.sectionLabel}>
                        Registos de Execução ({selectedOp.hasExecutions ? 1 : 0})
                      </Text>
                      <View style={dlg.execCard}>
                        <View style={dlg.execTopRow}>
                          <View style={dlg.execTopLeft}>
                            <View style={dlg.execIdChip}>
                              <Text style={dlg.execIdChipText}>#{selectedOp.pk}</Text>
                            </View>
                            <View style={[dlg.execValidChip, isValidated ? dlg.execValidChipDone : dlg.execValidChipPending]}>
                              {isValidated && <MaterialIcons name="verified-user" size={11} color="#fff" />}
                              <Text style={[dlg.execValidChipText, { color: '#fff' }]}>
                                {isValidated ? 'Validada' : 'Aguarda Validação'}
                              </Text>
                            </View>
                          </View>
                          {!isValidated && (
                            <TouchableOpacity style={dlg.execValidateBtn} onPress={() => openValidate(selectedOp)}>
                              <MaterialIcons name="verified-user" size={13} color={COLORS.primary} />
                              <Text style={dlg.execValidateBtnText}>Validar</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={dlg.execGrid}>
                          <View style={dlg.execGridCol}>
                            <Text style={dlg.execGridLabel}>Executor</Text>
                            <Text style={dlg.execGridValue}>{selectedOp.operador1_nome || '—'}</Text>
                          </View>
                          <View style={dlg.execGridCol}>
                            <Text style={dlg.execGridLabel}>Data</Text>
                            <Text style={dlg.execGridValue}>
                              {selectedOp.hasExecutions
                                ? fmtDate(selectedOp.updt_time)
                                : fmtDateShort(selectedOp.data as string | null)}
                            </Text>
                          </View>
                        </View>

                        {value && (
                          <View style={dlg.valueBox}>
                            <Text style={dlg.valueBoxLabel}>{value.label}</Text>
                            <Text style={dlg.valueBoxValue}>{value.value}</Text>
                          </View>
                        )}

                        {!!selectedOp.valuememo && (
                          <View style={dlg.valueBox}>
                            <Text style={dlg.valueBoxLabel}>Comentário</Text>
                            <Text style={dlg.valueBoxValue}>{selectedOp.valuememo as string}</Text>
                          </View>
                        )}

                        {isValidated && !!selectedOp.control_memo && (
                          <View style={dlg.feedbackBox}>
                            <Text style={dlg.feedbackBoxLabel}>Feedback do Supervisor</Text>
                            <Text style={dlg.valueBoxValue}>{selectedOp.control_memo as string}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setShowDetails(false)}>Fechar</Button></Dialog.Actions>
        </Dialog>

        {/* Validation dialog */}
        <Dialog visible={showValidate} onDismiss={() => setShowValidate(false)} style={dlg.dialog}>
          <Dialog.Title>Validar Execução</Dialog.Title>
          <Dialog.Content>
            <Text style={dlg.label}>Classificação</Text>
            <View style={{ gap: 6, marginBottom: SPACING.sm }}>
              {classificationOptions.length === 0 ? (
                <Text style={dlg.val}>Sem opções disponíveis</Text>
              ) : classificationOptions.map(opt => (
                <TouchableOpacity key={opt.pk}
                  style={[dlg.pickerItem, classification === opt.pk && dlg.pickerItemActive]}
                  onPress={() => setClassification(opt.pk)}>
                  <Text style={[dlg.pickerItemText, classification === opt.pk && dlg.pickerItemTextActive]}>
                    {opt.value ?? opt.name ?? `Opção ${opt.pk}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={dlg.label}>Nota (opcional)</Text>
            <RNTextInput
              style={dlg.textInput} value={controlMemo} onChangeText={setControlMemo}
              placeholder="Observações..." placeholderTextColor={COLORS.textDisabled}
              multiline numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowValidate(false)}>Cancelar</Button>
            <Button mode="contained" onPress={confirmValidate}
              loading={validateExecution.isPending}
              disabled={!classification || validateExecution.isPending}>
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Reassign dialog */}
        <Dialog visible={showReassign} onDismiss={() => setShowReassign(false)} style={dlg.dialog}>
          <Dialog.Title>Reatribuir Operação</Dialog.Title>
          <Dialog.ScrollArea style={dlg.scrollArea}>
            <ScrollView>
              <Text style={dlg.label}>Operador 1</Text>
              {operatorOptions.map(op => (
                <TouchableOpacity key={op.pk}
                  style={[dlg.pickerItem, reassignOp1 === op.pk && dlg.pickerItemActive]}
                  onPress={() => setReassignOp1(op.pk)}>
                  <Text style={[dlg.pickerItemText, reassignOp1 === op.pk && dlg.pickerItemTextActive]}>{op.name}</Text>
                </TouchableOpacity>
              ))}
              <Text style={[dlg.label, { marginTop: SPACING.sm }]}>Operador 2 (opcional)</Text>
              <TouchableOpacity style={[dlg.pickerItem, reassignOp2 === 0 && dlg.pickerItemActive]}
                onPress={() => setReassignOp2(0)}>
                <Text style={[dlg.pickerItemText, reassignOp2 === 0 && dlg.pickerItemTextActive]}>Nenhum</Text>
              </TouchableOpacity>
              {operatorOptions.map(op => (
                <TouchableOpacity key={op.pk}
                  style={[dlg.pickerItem, reassignOp2 === op.pk && dlg.pickerItemActive]}
                  onPress={() => setReassignOp2(op.pk)}>
                  <Text style={[dlg.pickerItemText, reassignOp2 === op.pk && dlg.pickerItemTextActive]}>{op.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowReassign(false)}>Cancelar</Button>
            <Button mode="contained" onPress={confirmReassign}
              loading={reassignOperacao.isPending}
              disabled={!reassignOp1 || reassignOperacao.isPending}>
              Reatribuir
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Bulk reassign dialog */}
        <Dialog visible={showBulkReassign} onDismiss={() => setShowBulkReassign(false)} style={dlg.dialog}>
          <Dialog.Title>Reatribuir {selectedPks.size} Tarefas</Dialog.Title>
          <Dialog.ScrollArea style={dlg.scrollArea}>
            <ScrollView>
              <Text style={dlg.label}>Operador 1</Text>
              {operatorOptions.map(op => (
                <TouchableOpacity key={op.pk}
                  style={[dlg.pickerItem, bulkOp1 === op.pk && dlg.pickerItemActive]}
                  onPress={() => setBulkOp1(op.pk)}>
                  <Text style={[dlg.pickerItemText, bulkOp1 === op.pk && dlg.pickerItemTextActive]}>{op.name}</Text>
                </TouchableOpacity>
              ))}
              <Text style={[dlg.label, { marginTop: SPACING.sm }]}>Operador 2 (opcional)</Text>
              <TouchableOpacity style={[dlg.pickerItem, bulkOp2 === 0 && dlg.pickerItemActive]}
                onPress={() => setBulkOp2(0)}>
                <Text style={[dlg.pickerItemText, bulkOp2 === 0 && dlg.pickerItemTextActive]}>Nenhum</Text>
              </TouchableOpacity>
              {operatorOptions.map(op => (
                <TouchableOpacity key={op.pk}
                  style={[dlg.pickerItem, bulkOp2 === op.pk && dlg.pickerItemActive]}
                  onPress={() => setBulkOp2(op.pk)}>
                  <Text style={[dlg.pickerItemText, bulkOp2 === op.pk && dlg.pickerItemTextActive]}>{op.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowBulkReassign(false)}>Cancelar</Button>
            <Button mode="contained" onPress={confirmBulkReassign}
              loading={bulkLoading} disabled={!bulkOp1 || bulkLoading}>
              Reatribuir Todas
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Registo rápido de operação (ETAR/EE/Rede/Caixa) */}
        <DirectTaskDialog
          visible={directOpen}
          metaData={metaData}
          isSubmitting={createDirect.isPending}
          onDismiss={() => setDirectOpen(false)}
          onSubmit={handleCreateDirect}
        />

      </Portal>
    </View>
  );
};

// ─── Table styles ─────────────────────────────────────────────────────────────

const tb = StyleSheet.create({
  // Filter bar
  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterInput: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 8, paddingVertical: 6, backgroundColor: COLORS.background,
  },
  filterInputText: { fontSize: 12, color: COLORS.textDisabled },
  filterSelect: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 8, paddingVertical: 6, backgroundColor: COLORS.background,
    maxWidth: 110,
  },
  filterSelectText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  filterActiveText: { color: COLORS.primary, fontWeight: '600' },
  clearBtn: { fontSize: 12, color: COLORS.primary, fontWeight: '600', paddingHorizontal: 4 },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  registerBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Bulk bar
  bulkBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1, borderColor: COLORS.primary + '44',
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
  },
  bulkCount: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  bulkLink:  { fontSize: 12, color: COLORS.primary, textDecorationLine: 'underline' },
  bulkBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  bulkBtnText:  { fontSize: 12, color: '#fff', fontWeight: '700' },
  bulkCancel:   { fontSize: 12, color: COLORS.textSecondary },

  // Table header
  hRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
    height: 38,
  },
  hCell: { justifyContent: 'center', paddingHorizontal: 8 },
  hText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Table rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    minHeight: 44,
  },
  rowSelected: { backgroundColor: COLORS.primarySurface },
  cell: { paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' },
  cellText: { fontSize: 12, color: COLORS.textPrimary },

  // Chips
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: '600' },
  chipOutline: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: COLORS.border },
  chipOutlineText: { fontSize: 10, color: COLORS.textDisabled },

  // Instalação badge (ETAR/EE)
  instBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  instBadgeText: { fontSize: 9, fontWeight: '700' },

  // Checkbox
  cbOuter: {
    width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background,
  },
  cbChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cbIndeter: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cbIndeterLine: { width: 8, height: 2, backgroundColor: '#fff', borderRadius: 1 },

  // Count bar
  countBar: {
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  countText: { fontSize: 11, color: COLORS.textDisabled },

  // Empty row
  emptyRow: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textDisabled },
});

// ─── Dialog styles ────────────────────────────────────────────────────────────

const dlg = StyleSheet.create({
  dialog:     { borderRadius: RADIUS.xl, marginHorizontal: SPACING.md },
  scrollArea: { maxHeight: 340, paddingHorizontal: 0 },
  body:       { padding: SPACING.xs, gap: 8 },
  label:      { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  val:        { fontSize: 14, color: COLORS.textPrimary, marginBottom: 8 },
  actionRow:  { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  actionBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pickerItem: {
    paddingHorizontal: SPACING.sm, paddingVertical: 9, marginBottom: 4,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  pickerItemActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primarySurface },
  pickerItemText:       { fontSize: 13, color: COLORS.textPrimary },
  pickerItemTextActive: { color: COLORS.primary, fontWeight: '600' },
  textInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.sm, fontSize: 14, color: COLORS.textPrimary,
    backgroundColor: COLORS.background, minHeight: 72, textAlignVertical: 'top',
  },

  // Custom modal header (icon-less, title + close) — Detalhes da Tarefa
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  modalHeaderDivider: { height: 1, backgroundColor: COLORS.divider },

  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  titleText: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 22 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1 },
  statusChipDone:    { borderColor: COLORS.success, backgroundColor: COLORS.successSurface },
  statusChipPending: { borderColor: COLORS.warning, backgroundColor: COLORS.warningSurface },
  statusChipText: { fontSize: 11, fontWeight: '700' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: COLORS.textSecondary },
  metaDot:  { fontSize: 13, color: COLORS.textDisabled },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  reassignLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reassignLinkText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  operatorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  operatorText: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },

  execCard: {
    marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm,
  },
  execTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  execTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  execIdChip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xs,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  execIdChipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  execValidChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1,
  },
  execValidChipDone:    { borderColor: COLORS.success, backgroundColor: COLORS.success },
  execValidChipPending: { borderColor: '#2196f3', backgroundColor: '#2196f3' },
  execValidChipText: { fontSize: 11, fontWeight: '700' },
  execValidateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  execValidateBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  execGrid: { flexDirection: 'row', gap: SPACING.lg },
  execGridCol: { flex: 1 },
  execGridLabel: { fontSize: 11, color: COLORS.textSecondary },
  execGridValue: { fontSize: 13, color: COLORS.textPrimary, marginTop: 1 },

  valueBox: {
    backgroundColor: COLORS.successSurface, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  valueBoxLabel: { fontSize: 11, color: COLORS.textSecondary },
  valueBoxValue: { fontSize: 13, color: COLORS.textPrimary, marginTop: 1 },
  feedbackBox: {
    backgroundColor: COLORS.primarySurface, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  feedbackBoxLabel: { fontSize: 11, color: COLORS.textSecondary },
});

// ─── Atividade por Operador table styles ─────────────────────────────────────

const aop = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  navChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  navChipText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  hRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
    paddingBottom: 6, marginBottom: 4,
  },
  hCell: { justifyContent: 'center' },
  hText: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  hTextActive: { color: COLORS.primary },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  cell: { paddingHorizontal: 2, justifyContent: 'center' },
  cellText: { fontSize: 12, color: COLORS.textPrimary },
  name: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, flex: 1 },
  chip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.xs, borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  effText: { fontSize: 12, fontWeight: '700' },
  emptyRow: { paddingVertical: 20, alignItems: 'center' },
  emptyRowText: { fontSize: 13, color: COLORS.textDisabled },
  footerText: { fontSize: 11, color: COLORS.textDisabled, textAlign: 'center' },
});

// ─── Tab 2: Equipa — Atividade por Operador ──────────────────────────────────

type OperatorSortKey = 'name' | 'scheduledTasks' | 'completedTasks' | 'pendingTasks' | 'efficiency';

const getOperatorSortValue = (op: OperatorStat, key: OperatorSortKey): string | number => {
  switch (key) {
    case 'name': return (op.name || '').toLowerCase();
    default: return op[key];
  }
};

type ActivitySortKey = 'operador' | 'tarefa' | 'data';

const getActivitySortValue = (exec: OperacaoExec, key: ActivitySortKey): string | number => {
  switch (key) {
    case 'operador': return (exec.ts_operador1 || '').toLowerCase();
    case 'tarefa':   return (exec.tt_operacaoaccao || exec.tb_instalacao || '').toLowerCase();
    case 'data':     return exec.updt_time ? new Date(exec.updt_time).getTime() : 0;
  }
};

function SortHeader<K extends string>({ label, columnKey, activeKey, dir, onPress, flex, center }: {
  label: string; columnKey: K; activeKey: K; dir: 'asc' | 'desc';
  onPress?: (key: K) => void; flex: number; center?: boolean;
}) {
  const active = columnKey === activeKey;
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={[aop.hText, active && aop.hTextActive]}>{label}</Text>
      {active && (
        <MaterialIcons
          name={dir === 'asc' ? 'arrow-drop-up' : 'arrow-drop-down'}
          size={14}
          color={COLORS.primary}
        />
      )}
    </View>
  );

  if (!onPress) {
    return <View style={[aop.hCell, { flex }, center && { alignItems: 'center' }]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={[aop.hCell, { flex }, center && { alignItems: 'center' }]}
      onPress={() => onPress(columnKey)}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

const AOP_FLEX = { op: 2.4, num: 1.05, progresso: 1.7 } as const;
const ACT_FLEX = { op: 2, tarefa: 1.8, valid: 1.6, data: 1.6 } as const;

// ─── Shared: Operator activity table (used by Dashboard preview + Equipa tab) ─

const OperatorActivityTable = ({ operators, limit, sortKey = 'completedTasks', sortDir = 'desc', onSort }: {
  operators: OperatorStat[]; limit?: number;
  sortKey?: OperatorSortKey; sortDir?: 'asc' | 'desc'; onSort?: (key: OperatorSortKey) => void;
}) => {
  const rows = limit ? operators.slice(0, limit) : operators;

  return (
    <>
      <View style={aop.hRow}>
        <SortHeader label="Operador" columnKey="name" activeKey={sortKey} dir={sortDir} onPress={onSort} flex={AOP_FLEX.op} />
        <SortHeader label="Programadas" columnKey="scheduledTasks" activeKey={sortKey} dir={sortDir} onPress={onSort} flex={AOP_FLEX.num} center />
        <SortHeader label="Realizadas" columnKey="completedTasks" activeKey={sortKey} dir={sortDir} onPress={onSort} flex={AOP_FLEX.num} center />
        <SortHeader label="Pendentes" columnKey="pendingTasks" activeKey={sortKey} dir={sortDir} onPress={onSort} flex={AOP_FLEX.num} center />
        <SortHeader label="Atividade" columnKey="efficiency" activeKey={sortKey} dir={sortDir} onPress={onSort} flex={AOP_FLEX.num} center />
        <View style={[aop.hCell, { flex: AOP_FLEX.progresso }]}>
          <Text style={aop.hText}>Progresso</Text>
        </View>
      </View>

      {rows.map(op => (
        <View key={op.pk} style={aop.row}>
          <View style={[aop.cell, { flex: AOP_FLEX.op, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <View style={styles.opMiniAvatar}>
              <Text style={styles.opMiniAvatarText}>{(op.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={aop.name} numberOfLines={1}>{op.name || '—'}</Text>
          </View>
          <View style={[aop.cell, { flex: AOP_FLEX.num, alignItems: 'center' }]}>
            <Text style={aop.cellText}>{op.scheduledTasks || '—'}</Text>
          </View>
          <View style={[aop.cell, { flex: AOP_FLEX.num, alignItems: 'center' }]}>
            <View style={[aop.chip, op.completedTasks > 0
              ? { borderColor: COLORS.success, backgroundColor: COLORS.successSurface }
              : { borderColor: COLORS.border, backgroundColor: COLORS.background }]}>
              {op.completedTasks > 0 && (
                <MaterialIcons name="check-circle" size={10} color={COLORS.success} style={{ marginRight: 2 }} />
              )}
              <Text style={[aop.chipText, { color: op.completedTasks > 0 ? COLORS.success : COLORS.textDisabled }]}>
                {op.completedTasks}
              </Text>
            </View>
          </View>
          <View style={[aop.cell, { flex: AOP_FLEX.num, alignItems: 'center' }]}>
            <Text style={[aop.cellText, { color: op.pendingTasks > 0 ? COLORS.warning : COLORS.textDisabled }]}>
              {op.pendingTasks > 0 ? op.pendingTasks : '—'}
            </Text>
          </View>
          <View style={[aop.cell, { flex: AOP_FLEX.num, alignItems: 'center' }]}>
            <Text style={[aop.effText, { color: effColor(op.efficiency) }]}>{op.efficiency}%</Text>
          </View>
          <View style={[aop.cell, { flex: AOP_FLEX.progresso }]}>
            <ProgressBar value={op.efficiency} color={effColor(op.efficiency)} height={6} />
          </View>
        </View>
      ))}

      {rows.length === 0 && (
        <View style={aop.emptyRow}>
          <Text style={aop.emptyRowText}>Nenhum operador encontrado</Text>
        </View>
      )}
    </>
  );
};

const TeamTab = (props: ReturnType<typeof useSupervisorData> & { onNavigateToControl?: () => void }) => {
  const { operatorStats, recentActivity, analytics, filterInfo, onNavigateToControl } = props;
  const { overview } = analytics;
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortKey, setSortKey] = useState<OperatorSortKey>('completedTasks');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [actSortKey, setActSortKey] = useState<ActivitySortKey>('data');
  const [actSortDir, setActSortDir] = useState<'asc' | 'desc'>('desc');

  const requestActivitySort = (key: ActivitySortKey) => {
    if (key === actSortKey) {
      setActSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setActSortKey(key);
      setActSortDir('desc');
    }
  };

  const sortedActivity = useMemo(() => {
    const arr = [...recentActivity];
    arr.sort((a, b) => {
      const av = getActivitySortValue(a, actSortKey);
      const bv = getActivitySortValue(b, actSortKey);
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return actSortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [recentActivity, actSortKey, actSortDir]);

  const filtered = useMemo(() => {
    if (!search.trim()) return operatorStats;
    const q = search.toLowerCase();
    return operatorStats.filter(op => (op.name || '').toLowerCase().includes(q));
  }, [operatorStats, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getOperatorSortValue(a, sortKey);
      const bv = getOperatorSortValue(b, sortKey);
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const requestSort = (key: OperatorSortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const totalScheduled = operatorStats.reduce((s, o) => s + o.scheduledCompleted + o.scheduledPending, 0);
  const totalPunctual  = operatorStats.reduce((s, o) => s + o.punctualCompleted + o.punctualPending, 0);

  if (operatorStats.length === 0) {
    return (
      <View style={[styles.tabContent, styles.emptyContainer]}>
        <MaterialIcons name="people" size={48} color={COLORS.textDisabled} />
        <Text style={styles.emptyText}>Sem dados de equipa.</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <StatCard label="Operadores" value={overview.activeOperators}
          icon="people" iconColor={COLORS.primary} iconBg={COLORS.primarySurface} />
        <StatCard label="Concluídas" value={overview.completedTasks}
          icon="check-circle" iconColor={COLORS.success} iconBg={COLORS.successSurface} />
        <StatCard label="Programadas" value={totalScheduled}
          icon="event-note" iconColor="#00897b" iconBg="#E0F2F1" />
        <StatCard label="Pontuais" value={totalPunctual}
          icon="flash-on" iconColor="#e65100" iconBg="#FBE9E7" />
      </View>

      <View style={sc.card}>
        <View style={aop.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="bar-chart" size={16} color={COLORS.primary} />
            <Text style={sc.title}>Atividade por Operador</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSearch(s => !s)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="search" size={20} color={showSearch ? COLORS.primary : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {showSearch && (
          <View style={[styles.searchWrap, { marginBottom: SPACING.sm }]}>
            <MaterialIcons name="search" size={18} color={COLORS.textDisabled} />
            <RNTextInput style={styles.searchInput} value={search} onChangeText={setSearch}
              placeholder="Pesquisar operador..." placeholderTextColor={COLORS.textDisabled} autoFocus />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={18} color={COLORS.textDisabled} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <OperatorActivityTable operators={sorted} sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
      </View>

      {filterInfo && (
        <Text style={aop.footerText}>
          A mostrar {filterInfo.showing} de {filterInfo.totalInDatabase} metas programadas
          {filterInfo.totalExecutions > 0 ? ` · ${filterInfo.totalExecutions} execuções registadas no total` : ''}
        </Text>
      )}

      {recentActivity.length > 0 && (
        <View style={sc.card}>
          <View style={aop.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="history" size={16} color={COLORS.primary} />
              <Text style={sc.title}>Atividade Recente</Text>
            </View>
            {onNavigateToControl && (
              <TouchableOpacity style={aop.navChip} onPress={onNavigateToControl} activeOpacity={0.75}>
                <MaterialIcons name="open-in-new" size={12} color={COLORS.primary} />
                <Text style={aop.navChipText}>Ir para Controlo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={aop.hRow}>
            <SortHeader label="Operador" columnKey="operador" activeKey={actSortKey} dir={actSortDir} onPress={requestActivitySort} flex={ACT_FLEX.op} />
            <SortHeader label="Tarefa" columnKey="tarefa" activeKey={actSortKey} dir={actSortDir} onPress={requestActivitySort} flex={ACT_FLEX.tarefa} />
            <View style={[aop.hCell, { flex: ACT_FLEX.valid }]}>
              <Text style={aop.hText}>Validação</Text>
            </View>
            <SortHeader label="Data" columnKey="data" activeKey={actSortKey} dir={actSortDir} onPress={requestActivitySort} flex={ACT_FLEX.data} />
          </View>

          {sortedActivity.slice(0, 20).map((exec, i) => {
            const isValidated = !!exec.control_tt_operacaocontrolo;
            return (
              <View key={exec.pk ?? i} style={aop.row}>
                <View style={[aop.cell, { flex: ACT_FLEX.op, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <View style={styles.opMiniAvatar}>
                    <Text style={styles.opMiniAvatarText}>{(exec.ts_operador1 || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={aop.name} numberOfLines={1}>{exec.ts_operador1 || '—'}</Text>
                </View>
                <View style={[aop.cell, { flex: ACT_FLEX.tarefa }]}>
                  <Text style={aop.cellText} numberOfLines={1}>{exec.tt_operacaoaccao || exec.tb_instalacao || '—'}</Text>
                </View>
                <View style={[aop.cell, { flex: ACT_FLEX.valid }]}>
                  <View style={[aop.chip, isValidated
                    ? { borderColor: COLORS.success, backgroundColor: COLORS.successSurface }
                    : { borderColor: COLORS.warning, backgroundColor: COLORS.warningSurface }]}>
                    <Text style={[aop.chipText, { color: isValidated ? COLORS.success : COLORS.warning }]}>
                      {isValidated ? 'Validada' : 'Aguarda validação'}
                    </Text>
                  </View>
                </View>
                <View style={[aop.cell, { flex: ACT_FLEX.data }]}>
                  <Text style={aop.cellText} numberOfLines={1}>{fmtDateFull(exec.updt_time)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

// ─── Tab 3: Analytics ─────────────────────────────────────────────────────────

const AnalyticsTab = (data: ReturnType<typeof useSupervisorData>) => {
  const { analytics, operatorStats, metas } = data;
  const { overview } = analytics;
  const totalScheduled = operatorStats.reduce((s, o) => s + o.scheduledCompleted + o.scheduledPending, 0);
  const totalPunctual  = operatorStats.reduce((s, o) => s + o.punctualCompleted + o.punctualPending, 0);
  const totalType = totalScheduled + totalPunctual || 1;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <StatCard label="Taxa Conclusão" value={`${overview.completionRate}%`} icon="trending-up"
          iconColor={overview.completionRate >= 75 ? COLORS.success : COLORS.warning}
          iconBg={overview.completionRate >= 75 ? COLORS.successSurface : COLORS.warningSurface} />
        <StatCard label="Operadores" value={overview.activeOperators}
          icon="people" iconColor={COLORS.primary} iconBg={COLORS.primarySurface} />
        <StatCard label="Metas" value={metas.length}
          icon="assignment" iconColor="#9c27b0" iconBg="#F3E5F5" />
      </View>

      <SectionCard icon="pie-chart" title="Tipo de Tarefas">
        <View style={{ gap: SPACING.sm }}>
          <View>
            <View style={styles.typeHeader}>
              <Text style={styles.typeLabel}>Programadas</Text>
              <Text style={[styles.typeCount, { color: '#00897b' }]}>{totalScheduled}</Text>
            </View>
            <ProgressBar value={(totalScheduled / totalType) * 100} color="#00897b" height={12} />
          </View>
          <View>
            <View style={styles.typeHeader}>
              <Text style={styles.typeLabel}>Pontuais</Text>
              <Text style={[styles.typeCount, { color: '#e65100' }]}>{totalPunctual}</Text>
            </View>
            <ProgressBar value={(totalPunctual / totalType) * 100} color="#e65100" height={12} />
          </View>
          <Text style={styles.typeFooterText}>
            {Math.round((totalScheduled / totalType) * 100)}% programadas · {Math.round((totalPunctual / totalType) * 100)}% pontuais
          </Text>
        </View>
      </SectionCard>

      {operatorStats.length > 0 && (
        <SectionCard icon="person" title="Desempenho Individual">
          {operatorStats.map(op => (
            <View key={op.pk} style={styles.analOpCard}>
              <View style={styles.analOpHeader}>
                <View style={styles.opAvatar}>
                  <Text style={styles.opAvatarText}>{(op.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.opName}>{op.name || '—'}</Text>
                  <ProgressBar value={op.efficiency} color={effColor(op.efficiency)} height={4} />
                </View>
                <Text style={[styles.opEffText, { color: effColor(op.efficiency), fontSize: 16, fontWeight: '800' }]}>
                  {op.efficiency}%
                </Text>
              </View>
              <View style={styles.analBlocks}>
                <View style={[styles.analBlock, { backgroundColor: '#E0F2F1' }]}>
                  <Text style={styles.analBlockTitle}>Programadas</Text>
                  <Text style={[styles.analBlockVal, { color: '#00897b' }]}>
                    {op.scheduledCompleted}/{op.scheduledCompleted + op.scheduledPending}
                  </Text>
                  <Text style={styles.analBlockSub}>{op.scheduledPending > 0 ? `${op.scheduledPending} pend.` : 'todas concl.'}</Text>
                </View>
                <View style={[styles.analBlock, { backgroundColor: '#FBE9E7' }]}>
                  <Text style={styles.analBlockTitle}>Pontuais</Text>
                  <Text style={[styles.analBlockVal, { color: '#e65100' }]}>
                    {op.punctualCompleted}/{op.punctualCompleted + op.punctualPending}
                  </Text>
                  <Text style={styles.analBlockSub}>{op.punctualPending > 0 ? `${op.punctualPending} pend.` : 'todas concl.'}</Text>
                </View>
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      <SectionCard icon="summarize" title="Resumo Executivo">
        <View style={styles.summaryDivider} />
        <View style={{ gap: SPACING.sm }}>
          <Text style={styles.summaryText}>
            {overview.totalExecutions > 0 ? (
              <>
                Existem <Text style={styles.summaryBold}>{overview.totalExecutions}</Text> tarefas registadas:{' '}
                <Text style={styles.summaryBold}>{overview.completedTasks}</Text> concluídas e{' '}
                <Text style={styles.summaryBold}>{overview.pendingTasks}</Text> pendentes{' '}
                ({overview.completionRate}% de conclusão).
                {(overview.scheduledExecutions > 0 || overview.punctualExecutions > 0) && (
                  <>
                    {' '}Destas, <Text style={styles.summaryBold}>{overview.scheduledExecutions}</Text> são programadas (de rotina) e{' '}
                    <Text style={styles.summaryBold}>{overview.punctualExecutions}</Text> são pontuais (ad-hoc).
                  </>
                )}
                {overview.totalOperations > 0 && (
                  <> O plano mensal contempla <Text style={styles.summaryBold}>{overview.totalOperations}</Text> metas de rotina.</>
                )}
                {overview.activeOperators > 0 && (
                  <> Existem <Text style={styles.summaryBold}>{overview.activeOperators}</Text> operadores ativos.</>
                )}
                {overview.unvalidatedCount > 0 && (
                  <> <Text style={styles.summaryBold}>{overview.unvalidatedCount}</Text> execuções aguardam validação de qualidade.</>
                )}
              </>
            ) : (
              'Sem dados disponíveis para os filtros selecionados.'
            )}
          </Text>
          {operatorStats.length > 0 && (
            <Text style={styles.summaryText}>
              O operador com mais execuções é <Text style={styles.summaryBold}>{operatorStats[0].name}</Text> com{' '}
              <Text style={styles.summaryBold}>{operatorStats[0].completedTasks}</Text> execuções registadas.
            </Text>
          )}
        </View>
      </SectionCard>
    </ScrollView>
  );
};

// ─── Tab 4: Pedidos ───────────────────────────────────────────────────────────

const resolveOperatorName = (who: number | null | undefined, metaData: any): string | null => {
  if (who == null) return null;
  const users = metaData?.who ?? metaData?.operadores ?? [];
  const found = users.find((u: any) => u.pk === who);
  return found ? found.name : (who === 0 ? 'Externo' : `Operador ${who}`);
};

const fmtDatePt = (val?: string | null) => {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('pt-PT'); } catch { return val; }
};

const RestdaysChip = ({ restdays }: { restdays?: number | null }) => {
  if (restdays == null) return <Text style={pd.dash}>—</Text>;
  const days = Number(restdays);
  const color = days < 0 ? COLORS.error : days < 7 ? COLORS.warning : COLORS.success;
  const label = days < 0 ? `${Math.abs(days)}d em atraso` : `${days}d restantes`;
  return (
    <View style={[pd.restChip, { borderColor: color }]}>
      <Text style={[pd.restChipText, { color }]}>{label}</Text>
    </View>
  );
};

const PedidosTab = (data: ReturnType<typeof useSupervisorData>) => {
  const { pedidos, pedidosLoading, pedidosError, metaData } = data;
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedPk, setSelectedPk] = useState<number | null>(null);

  const categories = useMemo(() => {
    if (!pedidos || typeof pedidos !== 'object') return [];
    const q = search.trim().toLowerCase();
    return Object.entries(pedidos)
      .map(([key, group]) => {
        const rows = (group?.data ?? []).filter((row) => {
          if (!q) return true;
          return Object.values(row).some((val) => {
            if (val === null || val === undefined || val === '' || typeof val === 'boolean' || typeof val === 'object') return false;
            return String(val).toLowerCase().includes(q);
          });
        });
        return {
          key,
          name: group?.name || key,
          rows: [...rows].sort((a, b) => (a.restdays ?? Infinity) - (b.restdays ?? Infinity)),
          unassigned: rows.filter(r => r.who == null).length,
          overdue: rows.filter(r => r.restdays != null && Number(r.restdays) < 0).length,
        };
      })
      .filter(c => c.rows.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [pedidos, search]);

  const totals = useMemo(() => {
    const allRows = categories.flatMap(c => c.rows);
    return {
      total: allRows.length,
      unassigned: allRows.filter(r => r.who == null).length,
      overdue: allRows.filter(r => r.restdays != null && Number(r.restdays) < 0).length,
      urgent: allRows.filter(r => r.urgency).length,
    };
  }, [categories]);

  if (pedidosLoading) {
    return (
      <View style={[styles.tabContent, styles.emptyContainer]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (pedidosError) {
    return (
      <View style={[styles.tabContent, styles.emptyContainer]}>
        <MaterialIcons name="error-outline" size={40} color={COLORS.error} />
        <Text style={styles.emptyText}>Erro ao carregar pedidos</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={COLORS.textDisabled} />
        <RNTextInput
          style={styles.searchInput}
          placeholder="Pesquisar pedidos..."
          placeholderTextColor={COLORS.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color={COLORS.textDisabled} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary */}
      <View style={styles.kpiGrid}>
        <StatCard label="Total de pedidos" value={totals.total} icon="folder-open"
          iconColor={COLORS.primary} iconBg={COLORS.primarySurface} />
        <StatCard label="Por atribuir" value={totals.unassigned} icon="person-off"
          iconColor={COLORS.textSecondary} iconBg={COLORS.overlay} />
        <StatCard label="Em atraso" value={totals.overdue} icon="warning"
          iconColor={COLORS.error} iconBg={COLORS.errorSurface} />
        <StatCard label="Urgentes" value={totals.urgent} icon="priority-high"
          iconColor={COLORS.warning} iconBg={COLORS.warningSurface} />
      </View>

      {/* Categories */}
      {categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={40} color={COLORS.textDisabled} />
          <Text style={styles.emptyText}>
            {search ? 'Nenhum pedido corresponde à pesquisa.' : 'Sem pedidos disponíveis.'}
          </Text>
        </View>
      ) : (
        categories.map((cat) => {
          const isOpen = expanded === cat.key;
          return (
            <View key={cat.key} style={pd.catGroup}>
              <TouchableOpacity style={pd.catHeader} onPress={() => setExpanded(isOpen ? null : cat.key)} activeOpacity={0.7}>
                <MaterialIcons name="folder" size={16} color={COLORS.primary} />
                <Text style={pd.catName} numberOfLines={1}>{cat.name}</Text>
                <View style={pd.catCountBadge}>
                  <Text style={pd.catCountBadgeText}>{cat.rows.length}</Text>
                </View>
                {cat.unassigned > 0 && (
                  <View style={[pd.catBadgeOutline, { borderColor: COLORS.border }]}>
                    <MaterialIcons name="person-off" size={11} color={COLORS.textSecondary} />
                    <Text style={[pd.catBadgeOutlineText, { color: COLORS.textSecondary }]}>{cat.unassigned}</Text>
                  </View>
                )}
                {cat.overdue > 0 && (
                  <View style={[pd.catBadgeOutline, { borderColor: COLORS.error }]}>
                    <MaterialIcons name="warning" size={11} color={COLORS.error} />
                    <Text style={[pd.catBadgeOutlineText, { color: COLORS.error }]}>{cat.overdue}</Text>
                  </View>
                )}
                <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={20} color={COLORS.textDisabled} />
              </TouchableOpacity>

              {isOpen && (
                <View style={pd.rowsWrap}>
                  {cat.rows.map((row: PedidoRow) => {
                    const operatorName = resolveOperatorName(row.who, metaData);
                    const location = [row.address, row.nut4, row.nut3].filter(Boolean).join(', ');
                    return (
                      <TouchableOpacity
                        key={row.pk}
                        style={[pd.reqCard, row.urgency ? pd.reqCardUrgent : null]}
                        onPress={() => setSelectedPk(row.pk)}
                        activeOpacity={0.7}
                      >
                        <View style={pd.reqTopRow}>
                          <Text style={pd.reqNumber} numberOfLines={1}>{row.regnumber || `#${row.pk}`}</Text>
                          <Text style={pd.reqTipo} numberOfLines={1}>{row.tipo || '—'}</Text>
                        </View>
                        {location ? (
                          <View style={pd.reqMetaRow}>
                            <MaterialIcons name="location-on" size={12} color={COLORS.textDisabled} />
                            <Text style={pd.reqMetaText} numberOfLines={1}>{location}</Text>
                          </View>
                        ) : null}
                        {row.ts_entity ? (
                          <Text style={pd.reqEntity} numberOfLines={1}>{row.ts_entity}</Text>
                        ) : null}
                        <View style={pd.reqBottomRow}>
                          {operatorName != null ? (
                            <View style={pd.reqOperatorRow}>
                              <MaterialIcons name="person" size={13} color={row.who === 0 ? COLORS.textDisabled : COLORS.primary} />
                              <Text
                                style={[pd.reqOperatorText, { color: row.who === 0 ? COLORS.textSecondary : COLORS.textPrimary }]}
                                numberOfLines={1}
                              >
                                {operatorName}
                              </Text>
                            </View>
                          ) : (
                            <View style={pd.reqOperatorRow}>
                              <MaterialIcons name="person-off" size={13} color={COLORS.textDisabled} />
                              <Text style={pd.reqOperatorUnassigned}>Por atribuir</Text>
                            </View>
                          )}
                          <RestdaysChip restdays={row.restdays} />
                        </View>
                        <View style={pd.reqDatesRow}>
                          <Text style={pd.reqDateText}>Submissão: {fmtDatePt(row.submission)}</Text>
                          <Text style={pd.reqDateText}>Prazo: {fmtDatePt(row.limitdate)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>

    <PedidoDetailsModal
      visible={selectedPk != null}
      pk={selectedPk}
      metaData={metaData}
      onClose={() => setSelectedPk(null)}
    />
    </>
  );
};

const pd = StyleSheet.create({
  dash: { fontSize: 12, color: COLORS.textDisabled },
  catGroup: { marginBottom: SPACING.sm },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  catName: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  catCountBadge: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  catCountBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  catBadgeOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: 6, paddingVertical: 1, backgroundColor: COLORS.surface,
  },
  catBadgeOutlineText: { fontSize: 10, fontWeight: '700' },
  rowsWrap: { gap: SPACING.xs, marginTop: SPACING.xs },
  reqCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm, gap: 4,
  },
  reqCardUrgent: { borderLeftWidth: 3, borderLeftColor: COLORS.error },
  reqTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  reqNumber: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  reqTipo: { fontSize: 12, color: COLORS.textSecondary },
  reqMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reqMetaText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  reqEntity: { fontSize: 11, color: COLORS.textDisabled },
  reqBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  reqOperatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  reqOperatorText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  reqOperatorUnassigned: { fontSize: 12, color: COLORS.textDisabled },
  restChip: {
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 2, backgroundColor: COLORS.surface,
  },
  restChipText: { fontSize: 11, fontWeight: '600' },
  reqDatesRow: { flexDirection: 'row', gap: SPACING.md, marginTop: 2 },
  reqDateText: { fontSize: 11, color: COLORS.textDisabled },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SupervisorScreen = () => {
  const [activeTab, setActiveTab] = useState(0);
  const data = useSupervisorData();
  const { analytics, isLoading, hasError, refresh } = data;
  const unvalidatedCount = analytics.overview.unvalidatedCount;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.loadingText}>A carregar supervisão...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={40} color={COLORS.error} />
        <Text style={styles.errorText}>Erro ao carregar dados</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={styles.dateChip}>
          <MaterialIcons name="date-range" size={14} color={COLORS.textSecondary} />
          <Text style={styles.dateText}>{data.dateRange.fromDate} → {data.dateRange.toDate}</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Unvalidated banner */}
      {unvalidatedCount > 0 && (
        <TouchableOpacity style={styles.banner} onPress={() => setActiveTab(1)} activeOpacity={0.8}>
          <MaterialIcons name="warning" size={16} color={COLORS.warning} />
          <Text style={styles.bannerText}>
            <Text style={styles.bannerBold}>{unvalidatedCount}</Text>
            {unvalidatedCount === 1 ? ' execução' : ' execuções'} por validar. Toque para ver.
          </Text>
        </TouchableOpacity>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map((tab, idx) => {
            const isActive  = activeTab === idx;
            const showBadge = idx === 1 && unvalidatedCount > 0;
            return (
              <TouchableOpacity key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => { setActiveTab(idx); if (tab.id === 'pedidos') data.visitPedidos(); }}
                activeOpacity={0.75}>
                <View style={styles.tabBtnInner}>
                  <MaterialIcons name={tab.icon} size={15} color={isActive ? COLORS.primary : COLORS.textDisabled} />
                  {showBadge && (
                    <View style={styles.badgeDot}>
                      <Text style={styles.badgeDotText}>{unvalidatedCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 0 && <DashboardTab {...data} />}
        {activeTab === 1 && <TasksTab    {...data} />}
        {activeTab === 2 && <TeamTab     {...data} onNavigateToControl={() => setActiveTab(1)} />}
        {activeTab === 3 && <AnalyticsTab {...data} />}
        {activeTab === 4 && <PedidosTab  {...data} />}
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.sm },
  errorText:   { color: COLORS.error, fontSize: 15, fontWeight: '600', marginTop: SPACING.sm },
  retryBtn:    { marginTop: SPACING.sm, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.pill },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  headerBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dateChip:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText:    { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  refreshBtn:  { padding: 6, borderRadius: RADIUS.xs, backgroundColor: COLORS.primarySurface },

  banner:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.warningSurface, paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.warning + '40' },
  bannerText:  { flex: 1, fontSize: 13, color: COLORS.warning },
  bannerBold:  { fontWeight: '700' },

  tabBar:        { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBarContent: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, gap: 4 },
  tabBtn:        { alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 8, borderRadius: RADIUS.md, minWidth: 72 },
  tabBtnActive:  { backgroundColor: COLORS.primarySurface },
  tabBtnInner:   { position: 'relative' },
  tabLabel:      { fontSize: 11, color: COLORS.textDisabled, fontWeight: '500', marginTop: 2 },
  tabLabelActive:{ color: COLORS.primary, fontWeight: '700' },
  badgeDot:      { position: 'absolute', top: -5, right: -8, backgroundColor: COLORS.error, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeDotText:  { color: '#fff', fontSize: 9, fontWeight: '700' },

  tabContent: { padding: SPACING.md, paddingBottom: SPACING.xl, gap: SPACING.sm },
  kpiGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },

  progressWrap:   { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel:  { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  progressPct:    { fontSize: 13, fontWeight: '700', color: COLORS.success },

  distRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  distKey:   { fontSize: 12, color: COLORS.textSecondary, width: 32, fontWeight: '600' },
  distTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.overlay, overflow: 'hidden' },
  distFill:  { height: '100%', borderRadius: 3 },
  distCount: { fontSize: 12, fontWeight: '700', minWidth: 20, textAlign: 'right' },

  opMiniRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  opMiniAvatar:    { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primarySurface, alignItems: 'center', justifyContent: 'center' },
  opMiniAvatarText:{ fontSize: 12, fontWeight: '700', color: COLORS.primary },
  opMiniNameRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  opMiniName:      { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, flex: 1 },
  opMiniEff:       { fontSize: 12, fontWeight: '700' },
  moreText:        { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  moreToggle:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: SPACING.xs, paddingVertical: SPACING.xs },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 4 },

  opCard:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  opAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primarySurface, alignItems: 'center', justifyContent: 'center' },
  opAvatarText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  opNameRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  opName:       { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  opEffBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.xs, marginLeft: SPACING.xs },
  opEffText:    { fontSize: 12, fontWeight: '700' },
  opStatRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  opStatPill:   { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },

  actRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  actDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  actName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  actSub:  { fontSize: 11, color: COLORS.textSecondary },
  actDate: { fontSize: 11, color: COLORS.textDisabled },

  typeHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  typeLabel:       { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  typeCount:       { fontSize: 14, fontWeight: '700' },
  typeFooterText:  { fontSize: 12, color: COLORS.textSecondary, paddingTop: SPACING.xs },

  analOpCard:    { borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingVertical: SPACING.sm, gap: SPACING.xs },
  analOpHeader:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  analBlocks:    { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  analBlock:     { flex: 1, borderRadius: RADIUS.md, padding: SPACING.sm, gap: 2 },
  analBlockTitle:{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  analBlockVal:  { fontSize: 18, fontWeight: '800' },
  analBlockSub:  { fontSize: 11, color: COLORS.textSecondary },

  summaryDivider: { height: 1, backgroundColor: COLORS.divider, marginBottom: SPACING.sm },
  summaryText:    { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  summaryBold:    { fontWeight: '700', color: COLORS.textPrimary },

  emptyContainer: { alignItems: 'center', marginTop: 60, gap: SPACING.sm },
  emptyText:      { color: COLORS.textDisabled, fontSize: 15 },
});

export default SupervisorScreen;
