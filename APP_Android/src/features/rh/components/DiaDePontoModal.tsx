import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Dialog, Portal, Button, Text, Chip, TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RhStackParamList } from '@/core/navigation/types';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { fmtTime, calcHorasDia, statusDia, STATUS_COR, RH_COLOR } from '@/features/rh/utils/rhUtils';
import { usePontoActions } from '@/features/rh/hooks/usePonto';
import type { PontoEvento } from '@/features/rh/hooks/usePonto';
import useAuthStore from '@/features/auth/store/authStore';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import PontoMapDialog from '@/features/rh/components/PontoMapDialog';

const EVENTOS_MAP: Record<number, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  1: { label: 'Entrada', icon: 'login', color: '#16a34a' },
  2: { label: 'Início Almoço', icon: 'lunch-dining', color: '#d97706' },
  3: { label: 'Fim Almoço', icon: 'free-breakfast', color: '#0891b2' },
  4: { label: 'Saída', icon: 'logout', color: '#dc2626' },
  5: { label: 'Saída Temporária', icon: 'directions-walk', color: '#7c3aed' },
  6: { label: 'Regresso', icon: 'keyboard-return', color: '#0369a1' },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const timeToDate = (hhmm: string) => {
  const d = new Date();
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const dateToHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

type Nav = NativeStackNavigationProp<RhStackParamList>;

// ─── Linha de evento com correcção inline (self ou admin/supervisor) ────────

interface EventoRowProps {
  ev: PontoEvento;
  podeEditar: boolean;
  onMapOpen: (ev: PontoEvento) => void;
  dateStr: string;
}

const EventoRow = ({ ev, podeEditar, onMapOpen, dateStr }: EventoRowProps) => {
  const { corrigir, isCorrigindo } = usePontoActions(ev.tb_user_fk);
  const [editing, setEditing] = useState(false);
  const [editTime, setEditTime] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [notasTouched, setNotasTouched] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');

  const def = EVENTOS_MAP[ev.tt_evento_fk] ?? { label: ev.evento_descr, icon: 'schedule' as const, color: '#666' };

  const startEdit = () => {
    setEditTime(fmtTime(ev.ts_registo) || '');
    setEditNotas(ev.notas || '');
    setNotasTouched(false);
    setError('');
    setEditing(true);
  };

  const save = async () => {
    if (!editTime || !editNotas.trim()) { setNotasTouched(true); return; }
    try {
      await corrigir({ pk: ev.pk, data: { ts_registo: `${dateStr}T${editTime}:00`, notas: editNotas.trim() } });
      setEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao corrigir registo.');
    }
  };

  return (
    <View style={styles.eventRow}>
      <View style={styles.eventMain}>
        <View style={[styles.iconWrap, { backgroundColor: `${def.color}22` }]}>
          <MaterialIcons name={def.icon} size={16} color={def.color} />
        </View>
        <Text style={styles.eventLabel}>{ev.evento_descr || def.label}</Text>

        {editing ? (
          <TouchableOpacity style={styles.timeTrigger} onPress={() => setShowPicker(true)}>
            <Text style={styles.timeTriggerText}>{editTime || '--:--'}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.eventTime}>{fmtTime(ev.ts_registo)}</Text>
        )}

        <View style={styles.eventBadges}>
          {ev.fonte === 'app+face' && <MaterialIcons name="verified-user" size={14} color={COLORS.success} />}
          {ev.fonte === 'correcao' && !editing && (
            <View style={styles.correctedBadge}><Text style={styles.correctedBadgeText}>Corrigido</Text></View>
          )}
          {ev.tem_gps && !editing && (
            <TouchableOpacity onPress={() => onMapOpen(ev)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="location-on" size={16} color={COLORS.info} />
            </TouchableOpacity>
          )}
          {podeEditar && !editing && (
            <TouchableOpacity onPress={startEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="edit" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {editing && (
        <View style={styles.editArea}>
          <TextInput
            value={editNotas}
            onChangeText={setEditNotas}
            onBlur={() => setNotasTouched(true)}
            placeholder="Justificação da correcção *"
            mode="outlined"
            dense
            error={notasTouched && !editNotas.trim()}
            style={styles.notasInput}
            outlineStyle={{ borderRadius: RADIUS.md }}
          />
          {notasTouched && !editNotas.trim() && (
            <Text style={styles.errorText}>Obrigatório explicar a correcção.</Text>
          )}
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.editActions}>
            <Button compact onPress={() => setEditing(false)} disabled={isCorrigindo}>Cancelar</Button>
            <Button compact mode="contained" onPress={save} loading={isCorrigindo} disabled={isCorrigindo || !editNotas.trim()}>
              Guardar
            </Button>
          </View>
        </View>
      )}

      {showPicker && (
        <DateTimePicker
          value={timeToDate(editTime)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowPicker(false); if (d) setEditTime(dateToHHMM(d)); }}
        />
      )}
    </View>
  );
};

// ─── Adicionar evento em falta (admin/supervisor) ───────────────────────────

interface AdicionarEventoFormProps {
  dateStr: string;
  userFk: number;
  existingTypes: Set<number>;
}

const AdicionarEventoForm = ({ dateStr, userFk, existingTypes }: AdicionarEventoFormProps) => {
  const { adicionarAdmin, isAdicionandoAdmin } = usePontoActions(userFk);
  const [tipo, setTipo] = useState('');
  const [hora, setHora] = useState('');
  const [notas, setNotas] = useState('');
  const [notasTouched, setNotasTouched] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');

  const opcoes: PickerOption[] = Object.entries(EVENTOS_MAP)
    .filter(([fk]) => !existingTypes.has(Number(fk)))
    .map(([fk, def]) => ({ value: fk, label: def.label }));

  if (!opcoes.length) return null;

  const handleAdicionar = async () => {
    if (!tipo || !hora || !notas.trim()) { setNotasTouched(true); return; }
    try {
      await adicionarAdmin({
        user_fk: userFk,
        tt_evento_fk: Number(tipo),
        ts_registo: `${dateStr}T${hora}:00`,
        notas: notas.trim(),
      });
      setTipo(''); setHora(''); setNotas(''); setNotasTouched(false);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao adicionar evento.');
    }
  };

  return (
    <View style={styles.addForm}>
      <View style={styles.divider} />
      <Text style={styles.addFormTitle}>Adicionar Evento em Falta</Text>
      <View style={styles.addFormRow}>
        <View style={{ flex: 1 }}>
          <ExpandablePicker placeholder="Tipo de evento" value={tipo} options={opcoes} onSelect={setTipo} />
        </View>
        <TouchableOpacity style={styles.timeTrigger} onPress={() => setShowPicker(true)}>
          <MaterialIcons name="schedule" size={16} color={COLORS.primary} />
          <Text style={styles.timeTriggerText}>{hora || '--:--'}</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={notas}
        onChangeText={setNotas}
        onBlur={() => setNotasTouched(true)}
        placeholder="Justificação do novo registo *"
        mode="outlined"
        dense
        error={notasTouched && !notas.trim()}
        style={styles.notasInput}
        outlineStyle={{ borderRadius: RADIUS.md }}
      />
      {notasTouched && !notas.trim() && (
        <Text style={styles.errorText}>Obrigatório explicar o motivo do registo em falta.</Text>
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <Button
        mode="contained"
        icon="plus"
        onPress={handleAdicionar}
        loading={isAdicionandoAdmin}
        disabled={!tipo || !hora || !notas.trim() || isAdicionandoAdmin}
        style={{ alignSelf: 'flex-start', marginTop: SPACING.xs }}
        buttonColor={RH_COLOR}
      >
        Adicionar
      </Button>

      {showPicker && (
        <DateTimePicker
          value={timeToDate(hora)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowPicker(false); if (d) setHora(dateToHHMM(d)); }}
        />
      )}
    </View>
  );
};

// ─── Modal principal ─────────────────────────────────────────────────────────

interface DiaDePontoModalProps {
  visible: boolean;
  onDismiss: () => void;
  dateStr: string | null;
  eventos: PontoEvento[];
  userFk: number;
}

const DiaDePontoModal = ({ visible, onDismiss, dateStr, eventos, userFk }: DiaDePontoModalProps) => {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [mapTarget, setMapTarget] = useState<PontoEvento | null>(null);

  const isSelf = user?.pk === userFk;
  // Auto-correcção: o próprio colaborador corrige/adiciona o seu registo —
  // sempre com justificação obrigatória. Correcção em nome de outrem:
  // rh.admin corrige qualquer colaborador; rh.validate (supervisor) é
  // restringido do lado do backend à sua equipa directa.
  const podeAutoCorrigir = isSelf && hasPermission('rh.edit');
  const podeCorrigirEquipa = hasPermission('rh.admin') || hasPermission('rh.validate');
  const podeCorrigir = podeAutoCorrigir || podeCorrigirEquipa;

  const sorted = useMemo(
    () => [...eventos].sort((a, b) => new Date(a.ts_registo).getTime() - new Date(b.ts_registo).getTime()),
    [eventos]
  );
  const existingTypes = useMemo(() => new Set(eventos.map((e) => e.tt_evento_fk)), [eventos]);

  if (!dateStr) return null;

  const status = statusDia(eventos);
  const horas = calcHorasDia(eventos);
  const cor = STATUS_COR[status];
  const isPast = dateStr < todayStr();
  const showRegistarFalta = isPast && (status === 'vazio' || status === 'incompleto');
  const dateLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <>
      <Portal>
        <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
          <Dialog.Title style={styles.title}>{dateLabel}</Dialog.Title>
          <Dialog.Content style={styles.content}>
            <View style={styles.summaryRow}>
              {horas && <Chip compact style={styles.chip}>{horas.str}</Chip>}
              <Chip
                compact
                style={[styles.chip, cor ? { backgroundColor: `${cor}22` } : undefined]}
                textStyle={cor ? { color: cor } : undefined}
              >
                {status === 'completo' ? 'Completo' : status === 'incompleto' ? 'Incompleto' : 'Sem registos'}
              </Chip>
            </View>

            <ScrollView style={styles.scrollArea}>
              {sorted.length === 0 ? (
                <Text style={styles.empty}>Sem registos de ponto para este dia.</Text>
              ) : (
                sorted.map((ev, i) => (
                  <View key={ev.pk}>
                    <EventoRow ev={ev} podeEditar={podeCorrigir} onMapOpen={setMapTarget} dateStr={dateStr} />
                    {i < sorted.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                ))
              )}

              {podeCorrigir && (
                <AdicionarEventoForm dateStr={dateStr} userFk={userFk} existingTypes={existingTypes} />
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions style={styles.actions}>
            {showRegistarFalta && (
              <Button
                mode="outlined"
                textColor={COLORS.warning}
                onPress={() => { onDismiss(); navigation.navigate('Participacao'); }}
                style={{ marginRight: 'auto' }}
              >
                Justificar em Participações
              </Button>
            )}
            <Button onPress={onDismiss}>Fechar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <PontoMapDialog registo={mapTarget} onClose={() => setMapTarget(null)} />
    </>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl, maxHeight: '85%' },
  title: { fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  content: { paddingBottom: 0 },
  summaryRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  chip: { backgroundColor: COLORS.overlay },
  scrollArea: { maxHeight: 380 },
  empty: { color: COLORS.textDisabled, fontSize: 13, paddingVertical: SPACING.md, textAlign: 'center' },
  eventRow: { paddingVertical: SPACING.xs },
  eventMain: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  eventTime: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  eventBadges: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginLeft: SPACING.xs },
  correctedBadge: { backgroundColor: COLORS.warningSurface, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  correctedBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.warning },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  timeTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 6, backgroundColor: COLORS.surface,
  },
  timeTriggerText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  editArea: { marginTop: SPACING.xs, paddingLeft: 36, gap: 4 },
  notasInput: { backgroundColor: COLORS.surface, fontSize: 13 },
  errorText: { fontSize: 11, color: COLORS.error },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.xs, marginTop: 2 },
  addForm: { marginTop: SPACING.sm, paddingBottom: SPACING.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  addFormTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs },
  addFormRow: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', marginBottom: SPACING.xs },
  actions: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
});

export default DiaDePontoModal;
