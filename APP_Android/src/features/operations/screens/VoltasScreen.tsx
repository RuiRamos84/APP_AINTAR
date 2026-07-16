import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet, View, TouchableOpacity,
  TextInput as RNTextInput, ScrollView,
  Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Text, ActivityIndicator, Portal, Dialog, Button,
  FAB, Snackbar, TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import { useDraft } from '@/shared/hooks/useDraft';
import { exportVoltasToExcel } from '../utils/exportVoltas';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Volta {
  pk: number;
  tb_instalacao?: string;
  pk_instalacao?: number;
  tt_operacaoaccao?: string;
  pk_operacaoaccao?: number;
  tt_operacaomodo?: string;
  pk_operacaomodo?: number;
  tt_operacaodia?: string;
  pk_operacaodia?: number;
  ts_operador1?: string;
  pk_operador1?: number;
  ts_operador2?: string;
  pk_operador2?: number;
}

interface VoltasResponse { data: Volta[]; total: number; }

interface MetaItem { pk: number; value?: string; name?: string; nome?: string; }
interface MetaInstall { pk: number; nome?: string; name?: string; ts_entity?: string; tipo?: string; }
interface MetaWho { pk: number; name: string; }

interface FullMeta {
  etar: MetaInstall[];
  ee: MetaInstall[];
  instalacao: MetaInstall[];
  operacaoaccao: MetaItem[];
  operacamodo: MetaItem[];
  operacaodia: MetaItem[];
  who: MetaWho[];
}

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const PAGE_SIZE = 25;

// Coluna usada quando o utilizador ainda não escolheu uma ordenação manualmente.
// Fica fora do useState de propósito: um useState só aplica um novo valor inicial
// em componentes já montados (Fast Refresh preserva estado), enquanto uma constante
// lida a cada render aplica-se de imediato ao gravar, sem precisar de reload da app.
const DEFAULT_SORT_KEY: keyof Volta = 'tb_instalacao';

const COL_FLEX = {
  instalacao: 2.5, accao: 2.0, modo: 1.0, dia: 1.0,
  op1: 1.7, op2: 1.7, editar: 0.6,
} as const;

const TABLE_HEADERS: { label: string; flex: number; sortKey?: keyof Volta }[] = [
  { label: 'INSTALAÇÃO', flex: COL_FLEX.instalacao, sortKey: 'tb_instalacao' },
  { label: 'AÇÃO',       flex: COL_FLEX.accao,      sortKey: 'tt_operacaoaccao' },
  { label: 'MODO',       flex: COL_FLEX.modo,        sortKey: 'tt_operacaomodo' },
  { label: 'DIA',        flex: COL_FLEX.dia,          sortKey: 'tt_operacaodia' },
  { label: 'OPERADOR 1', flex: COL_FLEX.op1,         sortKey: 'ts_operador1' },
  { label: 'OPERADOR 2', flex: COL_FLEX.op2,         sortKey: 'ts_operador2' },
  { label: 'EDITAR',     flex: COL_FLEX.editar },
];

// ─── Queries / mutations ──────────────────────────────────────────────────────

const useVoltas = () =>
  useQuery<VoltasResponse>({
    queryKey: ['operacaoMeta'],
    queryFn: async () => {
      const { data } = await apiClient.get('/operacao_meta');
      const list: Volta[] = Array.isArray(data?.data) ? data.data
        : Array.isArray(data) ? data : [];
      return { data: list, total: data?.total ?? list.length };
    },
    staleTime: 5 * 60 * 1000,
  });

const useFullMeta = () =>
  useQuery<FullMeta>({
    queryKey: ['metadata'],
    queryFn: async () => {
      const { data } = await apiClient.get('/metaData');
      return data?.data ?? data ?? {};
    },
    staleTime: 60 * 60 * 1000,
  });

const useCreateVolta = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/operacao_meta', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operacaoMeta'] }),
  });
};

const useUpdateVolta = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiClient.put(`/operacao_meta/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operacaoMeta'] }),
  });
};

const useGenerateTasks = () =>
  useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/operacao_init', payload),
  });

const useGenerateRemaining = () =>
  useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/operacao_init_remaining', payload),
  });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInstType = (name?: string) => {
  const s = (name ?? '').toLowerCase();
  if (s.includes('etar')) return 'ETAR';
  if (s.includes(' ee') || s.endsWith('(ee)') || s.startsWith('ee ')) return 'EE';
  return null;
};

const getInstTypeFrom = (inst?: MetaInstall): string | null => {
  if (!inst) return null;
  if (inst.tipo) {
    const t = inst.tipo.trim().toUpperCase();
    if (t.includes('ETAR')) return 'ETAR';
    if (t.includes('EE')) return 'EE';
  }
  return getInstType(installLabel(inst));
};

const INST_COLORS: Record<string, { color: string; bg: string }> = {
  ETAR: { color: COLORS.success, bg: COLORS.successSurface },
  EE:   { color: COLORS.primary, bg: COLORS.primarySurface },
};

const label = (item?: MetaItem) => item?.value ?? item?.name ?? '';
const installLabel = (item?: MetaInstall) => item?.nome ?? item?.name ?? '';


// ─── Form Dialog (criar / editar volta) ──────────────────────────────────────

interface DraftState { form: FormState; step: number; showAdvanced: boolean; }

interface FormState {
  tb_instalacao: number | '';
  tt_operacaoaccao: number | '';
  tt_operacaomodo: number | '';
  tt_operacaodia: number | '';
  ts_operador1: number | '';
  ts_operador2: number | '';
  data: string;
  descr: string;
}

const todayISO = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM: FormState = {
  tb_instalacao: '', tt_operacaoaccao: '',
  tt_operacaomodo: '', tt_operacaodia: '',
  ts_operador1: '', ts_operador2: '',
  data: todayISO(), descr: '',
};

const STEPS = [
  { label: 'Instalação', hint: 'Onde será realizada a operação?' },
  { label: 'Operação',   hint: 'O que será feito?' },
  { label: 'Operadores', hint: 'Quem irá executar?' },
  { label: 'Revisão',    hint: 'Confirmar informações antes de criar' },
];

interface VoltaFormProps {
  visible: boolean;
  editing: Volta | null;
  meta: FullMeta | undefined;
  isPending: boolean;
  onDismiss: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}

const VoltaFormDialog = ({ visible, editing, meta, isPending, onDismiss, onSubmit }: VoltaFormProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const { loadDraft, saveDraft, clearDraft } = useDraft<DraftState>('volta_nova');
  const [instPickerOpen, setInstPickerOpen] = useState(false);
  const [instSearch, setInstSearch] = useState('');
  const [accaoPickerOpen, setAccaoPickerOpen] = useState(false);
  const [accaoSearch, setAccaoSearch] = useState('');
  const [modoPickerOpen, setModoPickerOpen] = useState(false);
  const [diaPickerOpen, setDiaPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [op1PickerOpen, setOp1PickerOpen] = useState(false);
  const [op2PickerOpen, setOp2PickerOpen] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setDraftLoaded(false);
      return;
    }
    setShowAdvanced(false);
    if (editing) {
      setStep(0);
      setForm({
        tb_instalacao:    editing.pk_instalacao    ?? '',
        tt_operacaoaccao: editing.pk_operacaoaccao ?? '',
        tt_operacaomodo:  editing.pk_operacaomodo  ?? '',
        tt_operacaodia:   editing.pk_operacaodia   ?? '',
        ts_operador1:     editing.pk_operador1     ?? '',
        ts_operador2:     editing.pk_operador2     ?? '',
        data:  (editing as any).data  ?? todayISO(),
        descr: (editing as any).descr ?? '',
      });
    } else {
      loadDraft().then((draft) => {
        if (draft) {
          setForm(draft.form);
          setStep(draft.step);
          setShowAdvanced(draft.showAdvanced ?? false);
        } else {
          setForm({ ...EMPTY_FORM, data: todayISO() });
          setStep(0);
        }
        setDraftLoaded(true);
      });
    }
  }, [visible, editing]);

  React.useEffect(() => {
    if (draftLoaded) {
      saveDraft({ form, step, showAdvanced });
    }
  }, [form, step, showAdvanced, draftLoaded]);

  const installations = meta?.instalacao ?? [];

  const set = (k: keyof FormState) => (v: number | '') => setForm((f) => ({ ...f, [k]: v }));
  const setText = (k: 'data' | 'descr') => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Mirror web validation exactly (step 1 requires data + action)
  const isStepValid = (s: number) => {
    switch (s) {
      case 0: return form.tb_instalacao !== '';
      case 1: return !!form.data.trim() && form.tt_operacaoaccao !== '';
      case 2: return form.ts_operador1 !== '' &&
                     (form.ts_operador2 === '' || form.ts_operador2 !== form.ts_operador1);
      case 3: return form.tb_instalacao !== '' && form.tt_operacaoaccao !== '' && form.ts_operador1 !== '';
      default: return true;
    }
  };

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {};
    if (form.data.trim())             payload.data             = form.data.trim();
    if (form.descr.trim())            payload.descr            = form.descr.trim();
    if (form.tb_instalacao !== '')    payload.tb_instalacao    = form.tb_instalacao;
    if (form.tt_operacaoaccao !== '') payload.tt_operacaoaccao = form.tt_operacaoaccao;
    if (form.tt_operacaomodo !== '')  payload.tt_operacaomodo  = form.tt_operacaomodo;
    if (form.tt_operacaodia !== '')   payload.tt_operacaodia   = form.tt_operacaodia;
    if (form.ts_operador1 !== '')     payload.ts_operador1     = form.ts_operador1;
    if (form.ts_operador2 !== '')     payload.ts_operador2     = form.ts_operador2;
    clearDraft();
    onSubmit(payload);
  };

  const selInst = installations.find((i) => i.pk === form.tb_instalacao);
  const selAccao = (meta?.operacaoaccao ?? []).find((i) => i.pk === form.tt_operacaoaccao);
  const selModo  = (meta?.operacamodo   ?? []).find((i) => i.pk === form.tt_operacaomodo);
  const selDia   = (meta?.operacaodia   ?? []).find((i) => i.pk === form.tt_operacaodia);
  const selOp1   = (meta?.who           ?? []).find((i) => i.pk === form.ts_operador1);
  const selOp2   = (meta?.who           ?? []).find((i) => i.pk === form.ts_operador2);

  const renderStep = () => {
    switch (step) {

      /* ── Passo 1: Instalação ── */
      case 0: {
        const selInstType = getInstTypeFrom(selInst);
        const selTc = selInstType ? INST_COLORS[selInstType] : null;
        const filteredInst = instSearch.trim()
          ? installations.filter((i) =>
              installLabel(i).toLowerCase().includes(instSearch.toLowerCase())
            )
          : installations;

        return (
          <>
            <Text style={styles.stepHint}>{STEPS[0].hint}</Text>

            {/* Campo select */}
            <TouchableOpacity
              style={[styles.selectField, form.tb_instalacao !== '' && styles.selectFieldFilled]}
              onPress={() => { setInstSearch(''); setInstPickerOpen(true); }}
              activeOpacity={0.75}
            >
              {form.tb_instalacao !== '' && selInst ? (
                <View style={styles.selectValue}>
                  {selTc && selInstType && (
                    <View style={[styles.instBadge, { backgroundColor: selTc.bg }]}>
                      <Text style={[styles.instBadgeText, { color: selTc.color }]}>{selInstType}</Text>
                    </View>
                  )}
                  <Text style={styles.selectValueText} numberOfLines={1}>{installLabel(selInst)}</Text>
                </View>
              ) : (
                <Text style={styles.selectPlaceholder}>Selecionar instalação...</Text>
              )}
              <MaterialIcons name="arrow-drop-down" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Dialog picker de instalações */}
            <Portal>
              <Dialog
                visible={instPickerOpen}
                onDismiss={() => setInstPickerOpen(false)}
                style={styles.dialog}
              >
                <View style={styles.pickerDialogHeader}>
                  <TouchableOpacity onPress={() => setInstPickerOpen(false)} style={styles.pickerBackBtn}>
                    <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.pickerDialogTitle}>Instalação</Text>
                </View>
                <View style={styles.instSearchWrap}>
                  <MaterialIcons name="search" size={16} color={COLORS.textDisabled} />
                  <TextInput
                    value={instSearch}
                    onChangeText={setInstSearch}
                    placeholder="Pesquisar..."
                    mode="flat"
                    dense
                    style={styles.instSearchInput}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                  />
                  {instSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setInstSearch('')}>
                      <MaterialIcons name="close" size={16} color={COLORS.textDisabled} />
                    </TouchableOpacity>
                  )}
                </View>
                <Dialog.ScrollArea style={{ maxHeight: 360 }}>
                  <ScrollView>
                    {filteredInst.map((inst) => {
                      const instType = getInstTypeFrom(inst);
                      const tc = instType ? INST_COLORS[instType] : null;
                      const active = form.tb_instalacao === inst.pk;
                      return (
                        <TouchableOpacity
                          key={inst.pk}
                          style={[styles.instItem, active && styles.instItemActive]}
                          onPress={() => {
                            set('tb_instalacao')(inst.pk);
                            setInstPickerOpen(false);
                          }}
                        >
                          {tc && instType && (
                            <View style={[styles.instBadge, { backgroundColor: tc.bg }]}>
                              <Text style={[styles.instBadgeText, { color: tc.color }]}>{instType}</Text>
                            </View>
                          )}
                          <Text style={[styles.instName, active && styles.instNameActive]} numberOfLines={1}>
                            {installLabel(inst)}
                          </Text>
                          {active && <MaterialIcons name="check" size={16} color={COLORS.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                    {filteredInst.length === 0 && (
                      <Text style={styles.instEmpty}>Nenhuma instalação encontrada.</Text>
                    )}
                  </ScrollView>
                </Dialog.ScrollArea>
              </Dialog>
            </Portal>
          </>
        );
      }

      /* ── Passo 2: Operação ── */
      case 1:
        return (
          <>
            <Text style={styles.stepHint}>{STEPS[1].hint}</Text>

            {/* Data (obrigatória) */}
            <TouchableOpacity onPress={() => setDatePickerOpen(true)} activeOpacity={0.85}>
              <View pointerEvents="none">
                <TextInput
                  label="Data da Operação *"
                  value={form.data
                    ? form.data.split('-').reverse().join('/')
                    : ''}
                  placeholder="DD/MM/AAAA"
                  mode="outlined"
                  editable={false}
                  style={styles.textInput}
                  outlineStyle={{ borderRadius: RADIUS.md }}
                  right={
                    <TextInput.Icon icon="calendar" color={COLORS.textSecondary} />
                  }
                />
              </View>
            </TouchableOpacity>

            {datePickerOpen && (
              <DateTimePicker
                value={form.data ? new Date(form.data + 'T00:00:00') : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setDatePickerOpen(false);
                  if (event.type === 'set' && selectedDate) {
                    const iso = selectedDate.toISOString().split('T')[0];
                    setText('data')(iso);
                  }
                }}
              />
            )}

            {/* Ação (obrigatória) */}
            <Text style={[styles.stepLabel, { marginTop: SPACING.sm }]}>Ação *</Text>
            <TouchableOpacity
              style={[styles.selectField, form.tt_operacaoaccao !== '' && styles.selectFieldFilled]}
              onPress={() => { setAccaoSearch(''); setAccaoPickerOpen(true); }}
              activeOpacity={0.75}
            >
              {form.tt_operacaoaccao !== '' && selAccao ? (
                <Text style={styles.selectValueText} numberOfLines={1}>{label(selAccao)}</Text>
              ) : (
                <Text style={styles.selectPlaceholder}>Selecionar ação...</Text>
              )}
              <MaterialIcons name="arrow-drop-down" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Dialog picker de ações */}
            <Portal>
              <Dialog
                visible={accaoPickerOpen}
                onDismiss={() => setAccaoPickerOpen(false)}
                style={styles.dialog}
              >
                <View style={styles.pickerDialogHeader}>
                  <TouchableOpacity onPress={() => setAccaoPickerOpen(false)} style={styles.pickerBackBtn}>
                    <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.pickerDialogTitle}>Ação</Text>
                </View>
                <View style={styles.instSearchWrap}>
                  <MaterialIcons name="search" size={16} color={COLORS.textDisabled} />
                  <TextInput
                    value={accaoSearch}
                    onChangeText={setAccaoSearch}
                    placeholder="Pesquisar..."
                    mode="flat"
                    dense
                    style={styles.instSearchInput}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                  />
                  {accaoSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setAccaoSearch('')}>
                      <MaterialIcons name="close" size={16} color={COLORS.textDisabled} />
                    </TouchableOpacity>
                  )}
                </View>
                <Dialog.ScrollArea style={{ maxHeight: 360 }}>
                  <ScrollView>
                    {(accaoSearch.trim()
                      ? (meta?.operacaoaccao ?? []).filter((a) =>
                          label(a).toLowerCase().includes(accaoSearch.toLowerCase())
                        )
                      : (meta?.operacaoaccao ?? [])
                    ).map((a) => {
                      const active = form.tt_operacaoaccao === a.pk;
                      return (
                        <TouchableOpacity
                          key={a.pk}
                          style={[styles.pickerItem, active && styles.pickerItemActive]}
                          onPress={() => { set('tt_operacaoaccao')(a.pk); setAccaoPickerOpen(false); }}
                        >
                          <Text style={[styles.pickerText, active && styles.pickerTextActive]}>{label(a)}</Text>
                          {active && <MaterialIcons name="check" size={14} color={COLORS.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                    {accaoSearch.trim() && (meta?.operacaoaccao ?? []).filter((a) =>
                      label(a).toLowerCase().includes(accaoSearch.toLowerCase())
                    ).length === 0 && (
                      <Text style={styles.instEmpty}>Nenhuma ação encontrada.</Text>
                    )}
                  </ScrollView>
                </Dialog.ScrollArea>
              </Dialog>
            </Portal>

            {/* Descrição (opcional) */}
            <TextInput
              label="Descrição (opcional)"
              value={form.descr}
              onChangeText={setText('descr')}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={[styles.textInput, { marginTop: SPACING.sm }]}
              outlineStyle={{ borderRadius: RADIUS.md }}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
            />

            {/* Opções avançadas */}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced((v) => !v)}
            >
              <MaterialIcons
                name={showAdvanced ? 'expand-less' : 'expand-more'}
                size={18} color={COLORS.primary}
              />
              <Text style={styles.advancedToggleText}>Opções Avançadas</Text>
            </TouchableOpacity>

            {showAdvanced && (
              <>
                <Text style={styles.stepLabel}>Modo</Text>
                <TouchableOpacity
                  style={[styles.selectField, form.tt_operacaomodo !== '' && styles.selectFieldFilled]}
                  onPress={() => setModoPickerOpen(true)}
                  activeOpacity={0.75}
                >
                  {form.tt_operacaomodo !== '' && selModo ? (
                    <Text style={styles.selectValueText} numberOfLines={1}>{label(selModo)}</Text>
                  ) : (
                    <Text style={styles.selectPlaceholder}>Selecionar modo...</Text>
                  )}
                  <MaterialIcons name="arrow-drop-down" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <Portal>
                  <Dialog
                    visible={modoPickerOpen}
                    onDismiss={() => setModoPickerOpen(false)}
                    style={styles.dialog}
                  >
                    <View style={styles.pickerDialogHeader}>
                      <TouchableOpacity onPress={() => setModoPickerOpen(false)} style={styles.pickerBackBtn}>
                        <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.pickerDialogTitle}>Modo</Text>
                    </View>
                    <Dialog.ScrollArea style={{ maxHeight: 360 }}>
                      <ScrollView>
                        <TouchableOpacity
                          style={[styles.pickerItem, form.tt_operacaomodo === '' && styles.pickerItemActive]}
                          onPress={() => { set('tt_operacaomodo')(''); setModoPickerOpen(false); }}
                        >
                          <Text style={[styles.pickerText, form.tt_operacaomodo === '' && styles.pickerTextActive]}>Nenhum</Text>
                          {form.tt_operacaomodo === '' && <MaterialIcons name="check" size={14} color={COLORS.primary} />}
                        </TouchableOpacity>
                        {(meta?.operacamodo ?? []).map((m) => {
                          const active = form.tt_operacaomodo === m.pk;
                          return (
                            <TouchableOpacity
                              key={m.pk}
                              style={[styles.pickerItem, active && styles.pickerItemActive]}
                              onPress={() => { set('tt_operacaomodo')(m.pk); setModoPickerOpen(false); }}
                            >
                              <Text style={[styles.pickerText, active && styles.pickerTextActive]}>{label(m)}</Text>
                              {active && <MaterialIcons name="check" size={14} color={COLORS.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </Dialog.ScrollArea>
                  </Dialog>
                </Portal>

                <Text style={[styles.stepLabel, { marginTop: SPACING.sm }]}>Dia</Text>
                <TouchableOpacity
                  style={[styles.selectField, form.tt_operacaodia !== '' && styles.selectFieldFilled]}
                  onPress={() => setDiaPickerOpen(true)}
                  activeOpacity={0.75}
                >
                  {form.tt_operacaodia !== '' && selDia ? (
                    <Text style={styles.selectValueText} numberOfLines={1}>{label(selDia)}</Text>
                  ) : (
                    <Text style={styles.selectPlaceholder}>Selecionar dia...</Text>
                  )}
                  <MaterialIcons name="arrow-drop-down" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <Portal>
                  <Dialog
                    visible={diaPickerOpen}
                    onDismiss={() => setDiaPickerOpen(false)}
                    style={styles.dialog}
                  >
                    <View style={styles.pickerDialogHeader}>
                      <TouchableOpacity onPress={() => setDiaPickerOpen(false)} style={styles.pickerBackBtn}>
                        <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.pickerDialogTitle}>Dia</Text>
                    </View>
                    <Dialog.ScrollArea style={{ maxHeight: 360 }}>
                      <ScrollView>
                        <TouchableOpacity
                          style={[styles.pickerItem, form.tt_operacaodia === '' && styles.pickerItemActive]}
                          onPress={() => { set('tt_operacaodia')(''); setDiaPickerOpen(false); }}
                        >
                          <Text style={[styles.pickerText, form.tt_operacaodia === '' && styles.pickerTextActive]}>Nenhum</Text>
                          {form.tt_operacaodia === '' && <MaterialIcons name="check" size={14} color={COLORS.primary} />}
                        </TouchableOpacity>
                        {(meta?.operacaodia ?? []).map((d) => {
                          const active = form.tt_operacaodia === d.pk;
                          return (
                            <TouchableOpacity
                              key={d.pk}
                              style={[styles.pickerItem, active && styles.pickerItemActive]}
                              onPress={() => { set('tt_operacaodia')(d.pk); setDiaPickerOpen(false); }}
                            >
                              <Text style={[styles.pickerText, active && styles.pickerTextActive]}>{label(d)}</Text>
                              {active && <MaterialIcons name="check" size={14} color={COLORS.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </Dialog.ScrollArea>
                  </Dialog>
                </Portal>
              </>
            )}
          </>
        );

      /* ── Passo 3: Operadores ── */
      case 2:
        return (
          <>
            <Text style={styles.stepHint}>{STEPS[2].hint}</Text>

            <Text style={styles.stepLabel}>Operador Principal *</Text>
            <TouchableOpacity
              style={[styles.selectField, form.ts_operador1 !== '' && styles.selectFieldFilled]}
              onPress={() => setOp1PickerOpen(true)}
              activeOpacity={0.75}
            >
              {form.ts_operador1 !== '' && selOp1 ? (
                <Text style={styles.selectValueText} numberOfLines={1}>{selOp1.name}</Text>
              ) : (
                <Text style={styles.selectPlaceholder}>Selecionar operador...</Text>
              )}
              <MaterialIcons name="arrow-drop-down" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <Portal>
              <Dialog
                visible={op1PickerOpen}
                onDismiss={() => setOp1PickerOpen(false)}
                style={styles.dialog}
              >
                <View style={styles.pickerDialogHeader}>
                  <TouchableOpacity onPress={() => setOp1PickerOpen(false)} style={styles.pickerBackBtn}>
                    <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.pickerDialogTitle}>Operador Principal</Text>
                </View>
                <Dialog.ScrollArea style={{ maxHeight: 360 }}>
                  <ScrollView>
                    {(meta?.who ?? []).map((o) => {
                      const active = form.ts_operador1 === o.pk;
                      return (
                        <TouchableOpacity
                          key={o.pk}
                          style={[styles.pickerItem, active && styles.pickerItemActive]}
                          onPress={() => { set('ts_operador1')(o.pk); setOp1PickerOpen(false); }}
                        >
                          <View style={[styles.avatar, active && styles.avatarActive]}>
                            <Text style={[styles.avatarText, active && styles.avatarTextActive]}>
                              {o.name[0].toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.pickerText, active && styles.pickerTextActive, { flex: 1 }]}>{o.name}</Text>
                          {active && <MaterialIcons name="check" size={14} color={COLORS.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </Dialog.ScrollArea>
              </Dialog>
            </Portal>

            <Text style={[styles.stepLabel, { marginTop: SPACING.sm }]}>Operador Secundário (opcional)</Text>
            <TouchableOpacity
              style={[styles.selectField, form.ts_operador2 !== '' && styles.selectFieldFilled]}
              onPress={() => setOp2PickerOpen(true)}
              activeOpacity={0.75}
            >
              {form.ts_operador2 !== '' && selOp2 ? (
                <Text style={styles.selectValueText} numberOfLines={1}>{selOp2.name}</Text>
              ) : (
                <Text style={styles.selectPlaceholder}>Selecionar operador...</Text>
              )}
              <MaterialIcons name="arrow-drop-down" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <Portal>
              <Dialog
                visible={op2PickerOpen}
                onDismiss={() => setOp2PickerOpen(false)}
                style={styles.dialog}
              >
                <View style={styles.pickerDialogHeader}>
                  <TouchableOpacity onPress={() => setOp2PickerOpen(false)} style={styles.pickerBackBtn}>
                    <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.pickerDialogTitle}>Operador Secundário</Text>
                </View>
                <Dialog.ScrollArea style={{ maxHeight: 360 }}>
                  <ScrollView>
                    <TouchableOpacity
                      style={[styles.pickerItem, form.ts_operador2 === '' && styles.pickerItemActive]}
                      onPress={() => { set('ts_operador2')(''); setOp2PickerOpen(false); }}
                    >
                      <Text style={[styles.pickerText, form.ts_operador2 === '' && styles.pickerTextActive]}>Nenhum</Text>
                      {form.ts_operador2 === '' && <MaterialIcons name="check" size={14} color={COLORS.primary} />}
                    </TouchableOpacity>
                    {(meta?.who ?? [])
                      .filter((o) => o.pk !== form.ts_operador1)
                      .map((o) => {
                        const active = form.ts_operador2 === o.pk;
                        return (
                          <TouchableOpacity
                            key={o.pk}
                            style={[styles.pickerItem, active && styles.pickerItemActive]}
                            onPress={() => { set('ts_operador2')(o.pk); setOp2PickerOpen(false); }}
                          >
                            <View style={[styles.avatar, active && styles.avatarActive]}>
                              <Text style={[styles.avatarText, active && styles.avatarTextActive]}>
                                {o.name[0].toUpperCase()}
                              </Text>
                            </View>
                            <Text style={[styles.pickerText, active && styles.pickerTextActive, { flex: 1 }]}>{o.name}</Text>
                            {active && <MaterialIcons name="check" size={14} color={COLORS.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                </Dialog.ScrollArea>
              </Dialog>
            </Portal>
          </>
        );

      /* ── Passo 4: Revisão ── */
      case 3: {
        const fmtDate = form.data
          ? form.data.split('-').reverse().join('/')
          : '—';
        return (
          <>
            <Text style={styles.stepHint}>{STEPS[3].hint}</Text>
            <View style={[styles.alertBox, { backgroundColor: COLORS.primarySurface }]}>
              <MaterialIcons name="info" size={14} color={COLORS.primary} />
              <Text style={[styles.alertText, { color: COLORS.primary }]}>
                Reveja as informações antes de {editing ? 'atualizar' : 'criar'} a volta
              </Text>
            </View>
            <View style={styles.reviewBox}>
              {([
                ['Data',        fmtDate],
                ['Instalação',  selInst ? (() => { const t = getInstTypeFrom(selInst); return t ? `[${t}] ${installLabel(selInst)}` : installLabel(selInst); })() : '—'],
                ['Ação',        selAccao ? label(selAccao) : '—'],
                ['Modo',        selModo  ? label(selModo)  : '—'],
                ['Operador 1',  selOp1?.name ?? '—'],
                ['Operador 2',  selOp2?.name ?? '—'],
                ['Descrição',   form.descr.trim() || '—'],
              ] as [string, string][]).filter(([, v]) => v !== '—').map(([lbl, val]) => (
                <View key={lbl} style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>{lbl}</Text>
                  <Text style={styles.reviewVal}>{val}</Text>
                </View>
              ))}
            </View>
          </>
        );
      }
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <Dialog.Title style={styles.dialogTitle}>
              {editing ? 'Editar Volta' : 'Nova Volta'}
            </Dialog.Title>

            {/* Step indicator */}
            <View style={styles.stepRow}>
              {STEPS.map(({ label: s }, i) => (
                <View key={s} style={styles.stepItem}>
                  <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                    <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepName, i === step && styles.stepNameActive]}>{s}</Text>
                </View>
              ))}
            </View>

            <Dialog.ScrollArea style={styles.dialogScroll}>
              <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SPACING.md }} keyboardShouldPersistTaps="handled">
                {renderStep()}
              </ScrollView>
            </Dialog.ScrollArea>
          </View>
        </TouchableWithoutFeedback>

        <Dialog.Actions style={styles.dialogActions}>
          <Button
            onPress={() => setStep((s) => s - 1)}
            disabled={step === 0}
            textColor={COLORS.textSecondary}
          >
            ‹ Voltar
          </Button>

          <View style={styles.dialogActionsRight}>
            <Button onPress={onDismiss} textColor={COLORS.textSecondary}>
              Cancelar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                mode="contained"
                onPress={() => setStep((s) => s + 1)}
                disabled={!isStepValid(step)}
                style={{ borderRadius: RADIUS.pill }}
              >
                Próximo ›
              </Button>
            ) : (
              <Button
                mode="contained"
                icon="check"
                buttonColor={COLORS.success}
                onPress={handleSubmit}
                loading={isPending}
                disabled={isPending || !isStepValid(3)}
                style={{ borderRadius: RADIUS.pill }}
              >
                {editing ? 'Atualizar Volta' : 'Criar Volta'}
              </Button>
            )}
          </View>
        </Dialog.Actions>
      </KeyboardAvoidingView>
      </Dialog>
    </Portal>
  );
};

// ─── Generate Tasks Dialog ────────────────────────────────────────────────────

const getFutureMonths = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });
};

const getRemainingDays = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
};

interface GenerateDialogProps {
  visible: boolean;
  meta: FullMeta | undefined;
  isGenerating: boolean;
  isGeneratingRemaining: boolean;
  onDismiss: () => void;
  onGenerate: (p: Record<string, unknown>) => void;
  onGenerateRemaining: (p: Record<string, unknown>) => void;
}

const GenerateDialog = ({
  visible, meta, isGenerating, isGeneratingRemaining,
  onDismiss, onGenerate, onGenerateRemaining,
}: GenerateDialogProps) => {
  const [mode, setMode] = useState<'future' | 'remaining'>('future');
  const [selectedMode, setSelectedMode] = useState<number | ''>('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [confirm, setConfirm] = useState(false);

  const futureMonths = getFutureMonths();
  const remainingDays = getRemainingDays();
  const isBusy = isGenerating || isGeneratingRemaining;

  const canSubmit = selectedMode !== '' && (mode === 'remaining' || selectedPeriod !== '');

  const reset = () => { setSelectedMode(''); setSelectedPeriod(''); setMode('future'); setConfirm(false); };
  const handleClose = () => { reset(); onDismiss(); };

  const handleConfirm = () => {
    if (mode === 'future') {
      const [year, month] = selectedPeriod.split('-').map(Number);
      onGenerate({ tt_operacaomodo: Number(selectedMode), month, year });
    } else {
      onGenerateRemaining({ tt_operacaomodo: Number(selectedMode) });
    }
    handleClose();
  };

  const modeName = (meta?.operacamodo ?? []).find((m) => m.pk === selectedMode);
  const periodLabel = mode === 'remaining'
    ? `dias restantes de ${MONTHS_PT[new Date().getMonth()]} ${new Date().getFullYear()}`
    : selectedPeriod
      ? (() => { const [y, m] = selectedPeriod.split('-').map(Number); return `${MONTHS_PT[m - 1]} ${y}`; })()
      : '';

  return (
    <Portal>
      {/* Main dialog */}
      <Dialog visible={visible && !confirm} onDismiss={handleClose} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>
          <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />{' '}Gerar Tarefas
        </Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 420 }}>
          <ScrollView contentContainerStyle={{ padding: SPACING.sm }}>

            {/* Mode toggle */}
            <View style={styles.toggleWrap}>
              {(['future', 'remaining'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                  onPress={() => { setMode(m); setSelectedPeriod(''); }}
                  disabled={m === 'remaining' && remainingDays <= 0}
                >
                  <MaterialIcons
                    name={m === 'future' ? 'event' : 'today'}
                    size={14}
                    color={mode === m ? COLORS.primary : COLORS.textDisabled}
                  />
                  <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                    {m === 'future' ? 'Mês Futuro' : `Dias Restantes (${remainingDays})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Warning */}
            <View style={[styles.alertBox, { backgroundColor: mode === 'future' ? COLORS.warningSurface : COLORS.primarySurface }]}>
              <MaterialIcons
                name={mode === 'future' ? 'warning' : 'info'}
                size={14}
                color={mode === 'future' ? COLORS.warning : COLORS.primary}
              />
              <Text style={[styles.alertText, { color: mode === 'future' ? COLORS.warning : COLORS.primary }]}>
                {mode === 'future'
                  ? 'Regenera o mês completo. As tarefas existentes serão eliminadas e recriadas.'
                  : `Cria apenas as tarefas em falta nos ${remainingDays} dias restantes. Não apaga registos existentes.`}
              </Text>
            </View>

            {/* Modo de operação */}
            <Text style={styles.stepLabel}>Modo de Operação *</Text>
            {(meta?.operacamodo ?? []).map((m) => (
              <TouchableOpacity
                key={m.pk}
                style={[styles.pickerItem, selectedMode === m.pk && styles.pickerItemActive]}
                onPress={() => setSelectedMode(m.pk)}
              >
                <Text style={[styles.pickerText, selectedMode === m.pk && styles.pickerTextActive]}>
                  {label(m)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Mês/Ano — só modo futuro */}
            {mode === 'future' && (
              <>
                <Text style={[styles.stepLabel, { marginTop: SPACING.md }]}>Mês / Ano *</Text>
                {futureMonths.map(({ month, year }) => {
                  const val = `${year}-${month}`;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.pickerItem, selectedPeriod === val && styles.pickerItemActive]}
                      onPress={() => setSelectedPeriod(val)}
                    >
                      <Text style={[styles.pickerText, selectedPeriod === val && styles.pickerTextActive]}>
                        {MONTHS_PT[month - 1]} {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={handleClose} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button
            mode="contained"
            disabled={!canSubmit || isBusy}
            onPress={() => setConfirm(true)}
            style={{ borderRadius: RADIUS.pill }}
          >
            Gerar Tarefas
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog visible={confirm} onDismiss={() => setConfirm(false)} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>Confirmar geração</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.confirmText}>
            Vai gerar tarefas de <Text style={{ fontWeight: '700' }}>{label(modeName)}</Text>
            {' '}para{' '}
            <Text style={{ fontWeight: '700' }}>{periodLabel}</Text>.
            {mode === 'future'
              ? '\n\nAs tarefas já existentes para esse mês serão eliminadas e regeneradas.'
              : '\n\nAs tarefas já existentes não serão afetadas.'}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setConfirm(false)} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button
            mode="contained"
            onPress={handleConfirm}
            loading={isBusy}
            disabled={isBusy}
            style={{ borderRadius: RADIUS.pill }}
          >
            Confirmar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

// ─── Table Row ───────────────────────────────────────────────────────────────

const VoltaRow = ({ item, onEdit, isEven }: { item: Volta; onEdit: () => void; isEven: boolean }) => {
  const instType = getInstType(item.tb_instalacao);
  const typeStyle = instType ? INST_COLORS[instType] : null;

  return (
    <View style={[tStyles.row, isEven && tStyles.rowEven]}>
      <View style={[tStyles.cell, { flex: COL_FLEX.instalacao }]}>
        <View style={tStyles.instCell}>
          {instType && typeStyle && (
            <View style={[tStyles.tbadge, { backgroundColor: typeStyle.bg }]}>
              <Text style={[tStyles.tbadgeText, { color: typeStyle.color }]}>{instType}</Text>
            </View>
          )}
          <Text style={tStyles.cellText} numberOfLines={2}>
            {item.tb_instalacao || '—'}
          </Text>
        </View>
      </View>
      <View style={[tStyles.cell, { flex: COL_FLEX.accao }]}>
        <Text style={tStyles.cellText} numberOfLines={2}>{item.tt_operacaoaccao || '—'}</Text>
      </View>
      <View style={[tStyles.cell, { flex: COL_FLEX.modo }]}>
        <Text style={tStyles.cellText} numberOfLines={1}>{item.tt_operacaomodo || '—'}</Text>
      </View>
      <View style={[tStyles.cell, { flex: COL_FLEX.dia }]}>
        <Text style={tStyles.cellText} numberOfLines={1}>{item.tt_operacaodia || '—'}</Text>
      </View>
      <View style={[tStyles.cell, { flex: COL_FLEX.op1 }]}>
        <Text style={tStyles.cellText} numberOfLines={1}>{item.ts_operador1 || '—'}</Text>
      </View>
      <View style={[tStyles.cell, { flex: COL_FLEX.op2 }]}>
        <Text style={[tStyles.cellText, { color: COLORS.textDisabled }]} numberOfLines={1}>
          {item.ts_operador2 || '—'}
        </Text>
      </View>
      <View style={[tStyles.cell, { flex: COL_FLEX.editar, alignItems: 'center' }]}>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="edit" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const VoltasScreen = () => {
  const { data: response, isLoading, error, refetch, isFetching } = useVoltas();
  const { data: meta } = useFullMeta();
  const { mutate: createVolta, isPending: isCreating } = useCreateVolta();
  const { mutate: updateVolta, isPending: isUpdating } = useUpdateVolta();
  const { mutate: generateTasks, isPending: isGenerating } = useGenerateTasks();
  const { mutate: generateRemaining, isPending: isGeneratingRemaining } = useGenerateRemaining();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof Volta | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [tablePage, setTablePage] = useState(0);

  // Enquanto o utilizador não escolher uma coluna, usa a ordenação predefinida
  const effectiveSortKey = sortKey || DEFAULT_SORT_KEY;

  const requestSort = (key: keyof Volta) => {
    if (effectiveSortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setTablePage(0);
  };
  const [formOpen, setFormOpen] = useState(false);
  const [editingVolta, setEditingVolta] = useState<Volta | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [snack, setSnack] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const toast = (msg: string) => setSnack(msg);

  const voltas = response?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return voltas;
    const q = search.toLowerCase();
    return voltas.filter(
      (v) =>
        v.tb_instalacao?.toLowerCase().includes(q) ||
        v.tt_operacaoaccao?.toLowerCase().includes(q) ||
        v.ts_operador1?.toLowerCase().includes(q) ||
        v.tt_operacaodia?.toLowerCase().includes(q)
    );
  }, [voltas, search]);

  const sorted = useMemo(() => {
    if (!filtered.length) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[effectiveSortKey];
      const bv = b[effectiveSortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string'
        ? av.localeCompare(String(bv), 'pt', { sensitivity: 'base' })
        : Number(av) - Number(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, effectiveSortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = tablePage * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, tablePage]);

  // Reset page when search changes
  React.useEffect(() => setTablePage(0), [search]);

  const handleFormSubmit = (payload: Record<string, unknown>) => {
    if (editingVolta) {
      updateVolta(
        { id: editingVolta.pk, payload },
        {
          onSuccess: () => { setFormOpen(false); setEditingVolta(null); toast('Volta atualizada.'); },
          onError: () => toast('Erro ao atualizar volta.'),
        }
      );
    } else {
      createVolta(payload, {
        onSuccess: () => { setFormOpen(false); toast('Volta criada com sucesso.'); },
        onError: () => toast('Erro ao criar volta.'),
      });
    }
  };

  const openEdit = (volta: Volta) => {
    setEditingVolta(volta);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingVolta(null);
    setFormOpen(true);
  };

  const handleExport = async () => {
    if (filtered.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      await exportVoltasToExcel(filtered);
    } catch {
      toast('Erro ao exportar voltas.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Erro ao carregar voltas.</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
        <Text style={styles.retryText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* Barra superior */}
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={18} color={COLORS.textDisabled} />
          <RNTextInput
            style={styles.searchInput}
            placeholder="Pesquisar..."
            placeholderTextColor={COLORS.textDisabled}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={16} color={COLORS.textDisabled} />
            </TouchableOpacity>
          )}
        </View>

        {/* Chip contagem */}
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>
            {filtered.length}{response?.total && filtered.length !== response.total ? `/${response.total}` : ''} voltas
          </Text>
        </View>

        {/* Exportar Excel */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleExport}
          disabled={isExporting || filtered.length === 0}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <MaterialIcons
              name="file-download"
              size={18}
              color={filtered.length === 0 ? COLORS.textDisabled : COLORS.primary}
            />
          )}
        </TouchableOpacity>

        {/* Calendário */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => setGenerateOpen(true)}>
          <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Refresh */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => refetch()}>
          {isFetching && !isLoading
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <MaterialIcons name="refresh" size={18} color={COLORS.primary} />}
        </TouchableOpacity>
      </View>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="route" size={48} color={COLORS.textDisabled} />
          <Text style={styles.empty}>
            {search ? 'Nenhuma volta encontrada.' : 'Sem voltas disponíveis.'}
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={tStyles.table}>
            {/* Cabeçalho */}
            <View style={tStyles.header}>
              {TABLE_HEADERS.map(({ label: lbl, flex, sortKey: sk }) => {
                const isActive = sk && effectiveSortKey === sk;
                return (
                  <TouchableOpacity
                    key={lbl}
                    style={[tStyles.headerCell, { flex }]}
                    onPress={sk ? () => requestSort(sk) : undefined}
                    disabled={!sk}
                    activeOpacity={sk ? 0.6 : 1}
                  >
                    <View style={tStyles.headerContent}>
                      <Text style={[tStyles.headerText, isActive && tStyles.headerTextActive]}>
                        {lbl}
                      </Text>
                      {sk && (
                        <MaterialIcons
                          name={
                            isActive
                              ? sortDir === 'asc' ? 'arrow-upward' : 'arrow-downward'
                              : 'unfold-more'
                          }
                          size={12}
                          color={isActive ? COLORS.primary : COLORS.textDisabled}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Linhas */}
            {paginated.map((item, idx) => (
              <VoltaRow
                key={item.pk}
                item={item}
                onEdit={() => openEdit(item)}
                isEven={idx % 2 === 0}
              />
            ))}
          </View>

          {/* Paginação */}
          <View style={tStyles.paginationRow}>
            <Text style={tStyles.paginationInfo}>
              {filtered.length} volta{filtered.length !== 1 ? 's' : ''} no total
            </Text>
            <View style={tStyles.paginationControls}>
              <Text style={tStyles.pageLabel}>Página {tablePage + 1}</Text>
              <TouchableOpacity
                onPress={() => setTablePage((p) => Math.max(0, p - 1))}
                disabled={tablePage === 0}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={22}
                  color={tablePage === 0 ? COLORS.textDisabled : COLORS.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={tablePage + 1 >= totalPages}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={tablePage + 1 >= totalPages ? COLORS.textDisabled : COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Nota sobre eliminação — igual ao frontend-v2 */}
          <View style={styles.deleteNote}>
            <MaterialIcons name="info" size={14} color={COLORS.primary} />
            <Text style={styles.deleteNoteText}>
              Para <Text style={styles.deleteNoteBold}>eliminar</Text> uma volta, contacte o administrador do sistema. A eliminação de registos operacionais requer autorização especial.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <FAB icon="plus" style={styles.fab} color="#FFFFFF" onPress={openCreate} />

      {/* Form dialog */}
      <VoltaFormDialog
        visible={formOpen}
        editing={editingVolta}
        meta={meta}
        isPending={isCreating || isUpdating}
        onDismiss={() => { setFormOpen(false); setEditingVolta(null); }}
        onSubmit={handleFormSubmit}
      />

      {/* Generate dialog */}
      <GenerateDialog
        visible={generateOpen}
        meta={meta}
        isGenerating={isGenerating}
        isGeneratingRemaining={isGeneratingRemaining}
        onDismiss={() => setGenerateOpen(false)}
        onGenerate={(p) => {
          generateTasks(p, {
            onSuccess: () => toast('Tarefas geradas com sucesso!'),
            onError: () => toast('Erro ao gerar tarefas.'),
          });
        }}
        onGenerateRemaining={(p) => {
          generateRemaining(p, {
            onSuccess: () => toast('Tarefas dos dias restantes geradas!'),
            onError: () => toast('Erro ao gerar tarefas.'),
          });
        }}
      />

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack('')}
        duration={3000}
        style={styles.snackbar}
      >
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background, padding: SPACING.md,
  },
  errorText: { color: COLORS.error, textAlign: 'center' },
  retryBtn: {
    marginTop: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primarySurface, borderRadius: RADIUS.pill,
  },
  retryText: { color: COLORS.primary, fontWeight: '600' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: SPACING.xs,
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 5 },
  actionBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  countChip: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm,
    paddingVertical: 4, backgroundColor: COLORS.surface,
  },
  countChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  deleteNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs,
    marginHorizontal: SPACING.md, marginBottom: 90,
    marginTop: SPACING.sm, padding: SPACING.sm,
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  deleteNoteText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 17 },
  deleteNoteBold: { fontWeight: '700' },

  content: { padding: SPACING.md, paddingTop: SPACING.xs, paddingBottom: 100, gap: SPACING.sm },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: SPACING.sm },
  empty: { color: COLORS.textDisabled, fontSize: 15 },

  card: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardAccent: { width: 4, backgroundColor: COLORS.primary },
  cardBody: { flex: 1, padding: SPACING.md, gap: SPACING.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  badgeText: { fontSize: 10, fontWeight: '700' },
  instalacao: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  editBtn: { padding: 4 },
  accao: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: 2 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.xs,
  },
  metaText: { fontSize: 11, fontWeight: '500' },
  operadoresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: 2 },
  operadorItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  operadorText: { fontSize: 12, color: COLORS.primary, fontWeight: '500', flex: 1 },

  fab: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, backgroundColor: COLORS.success },

  // Dialog
  dialog: { borderRadius: RADIUS.xl, marginHorizontal: SPACING.md },
  dialogTitle: { fontWeight: '700', color: COLORS.textPrimary, fontSize: 16 },
  dialogScroll: { maxHeight: 400 },
  dialogActions: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, justifyContent: 'space-between' },
  dialogActionsRight: { flexDirection: 'row', alignItems: 'center' },

  // Step indicator
  stepRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: 11, fontWeight: '700', color: COLORS.textDisabled },
  stepNumActive: { color: '#FFF' },
  stepName: { fontSize: 9, color: COLORS.textDisabled, textAlign: 'center' },
  stepNameActive: { color: COLORS.primary, fontWeight: '600' },

  // Pickers
  stepHint: {
    fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 18,
  },
  stepLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: SPACING.xs,
  },
  pickerScroll: { maxHeight: 180, borderRadius: RADIUS.md, backgroundColor: COLORS.background },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm, marginBottom: 2,
  },
  pickerItemActive: { backgroundColor: COLORS.primarySurface },
  pickerText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  pickerTextActive: { color: COLORS.primary, fontWeight: '600' },

  // Picker dialog header
  pickerDialogHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingTop: SPACING.sm, paddingBottom: SPACING.xs,
  },
  pickerBackBtn: {
    padding: SPACING.sm, marginRight: SPACING.xs,
  },
  pickerDialogTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.textPrimary,
  },

  // Select field (instalação)
  selectField: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.surface, minHeight: 48,
  },
  selectFieldFilled: { borderColor: COLORS.primary },
  selectFieldOpen: {
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  inlineDropdown: {
    borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
  },
  selectValue: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  selectValueText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  selectPlaceholder: { flex: 1, fontSize: 14, color: COLORS.textDisabled },

  // Installation search inside picker dialog
  instSearchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.md, marginBottom: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  instSearchInput: {
    flex: 1, fontSize: 14, backgroundColor: 'transparent', height: 38,
  },
  instEmpty: {
    textAlign: 'center', color: COLORS.textDisabled,
    fontSize: 13, paddingVertical: SPACING.lg,
  },

  // Installation picker
  instItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm, marginBottom: 2,
  },
  instItemActive: { backgroundColor: COLORS.primarySurface },
  instBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  instBadgeText: { fontSize: 10, fontWeight: '700' },
  instName: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  instNameActive: { color: COLORS.primary, fontWeight: '600' },

  // Operator picker
  operItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm, marginBottom: 2,
  },
  operItemActive: { backgroundColor: COLORS.primarySurface },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  avatarActive: { backgroundColor: COLORS.primary },
  avatarText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  avatarTextActive: { color: '#FFF' },

  // Text inputs
  textInput: { backgroundColor: COLORS.surface, marginBottom: SPACING.xs },

  // Advanced toggle
  advancedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: SPACING.xs,
    paddingVertical: SPACING.sm, marginTop: SPACING.xs,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  advancedToggleText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // Review
  reviewBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm,
  },
  reviewRow: { flexDirection: 'row', gap: SPACING.md },
  reviewKey: { fontSize: 12, color: COLORS.textSecondary, width: 90 },
  reviewVal: { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },

  // Generate
  toggleWrap: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
  },
  toggleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySurface },
  toggleText: { fontSize: 12, color: COLORS.textDisabled, fontWeight: '500' },
  toggleTextActive: { color: COLORS.primary },
  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs,
    borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md,
  },
  alertText: { flex: 1, fontSize: 12, lineHeight: 17 },

  confirmText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21 },

  snackbar: { backgroundColor: COLORS.navy },
});

// ─── Table Styles ─────────────────────────────────────────────────────────────

const tStyles = StyleSheet.create({
  table: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: COLORS.primarySurface,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
  },
  headerCell: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  headerTextActive: {
    color: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    minHeight: 44,
  },
  rowEven: {
    backgroundColor: COLORS.background,
  },
  cell: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
  },
  instCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  tbadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  tbadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  cellText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: 80,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paginationInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pageLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
});

export default VoltasScreen;
