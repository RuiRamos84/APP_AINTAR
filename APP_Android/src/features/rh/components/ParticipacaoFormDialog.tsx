import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text, SegmentedButtons } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { useDraft } from '@/shared/hooks/useDraft';
import useAuthStore from '@/features/auth/store/authStore';
import { useColaboradores } from '@/features/rh/hooks/useRhLookups';
import { preAvisoStatus } from '@/features/rh/hooks/useParticipacoes';
import type { Participacao, Motivo, CreateParticipacaoPayload, EditParticipacaoPayload, ParticipacaoTipo } from '@/features/rh/hooks/useParticipacoes';

interface ParticipacaoDraft {
  userFk: string;
  tipo: ParticipacaoTipo;
  motivoFk: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  dataParticipacao: string;
  observacoes: string;
}

interface ParticipacaoFormDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: CreateParticipacaoPayload | { pk: number; data: EditParticipacaoPayload }) => Promise<unknown>;
  isSaving: boolean;
  initial: Participacao | null;
  motivos: Motivo[];
}

const toISODate = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
const fmtDatePt = (v: string) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '');

const timeToDate = (hhmm: string) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const dateToHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const ParticipacaoFormDialog = ({ visible, onDismiss, onSave, isSaving, initial, motivos }: ParticipacaoFormDialogProps) => {
  const isAdmin = useAuthStore((s) => s.hasPermission('rh.admin'));
  const { colaboradores } = useColaboradores();
  const { loadDraft, saveDraft, clearDraft } = useDraft<ParticipacaoDraft>('participacao_form');

  const [userFk, setUserFk] = useState('');
  const [tipo, setTipo] = useState<ParticipacaoTipo>('dia');
  const [motivoFk, setMotivoFk] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [dataParticipacao, setDataParticipacao] = useState(today());
  const [observacoes, setObservacoes] = useState('');
  const [showPicker, setShowPicker] = useState<null | 'inicio' | 'fim' | 'participacao' | 'horaInicio' | 'horaFim'>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!visible) { setDraftLoaded(false); return; }
    if (initial) {
      setUserFk(String(initial.tb_user_fk));
      setTipo(initial.tipo);
      setMotivoFk(initial.motivo_fk ? String(initial.motivo_fk) : '');
      setDataInicio(toISODate(initial.data_inicio));
      setDataFim(toISODate(initial.data_fim));
      setHoraInicio(initial.hora_inicio ? initial.hora_inicio.slice(0, 5) : '');
      setHoraFim(initial.hora_fim ? initial.hora_fim.slice(0, 5) : '');
      setDataParticipacao(toISODate(initial.data_participacao) || today());
      setObservacoes(initial.observacoes || '');
      setDraftLoaded(true);
      return;
    }
    loadDraft().then((d) => {
      if (d) {
        setUserFk(d.userFk);
        setTipo(d.tipo);
        setMotivoFk(d.motivoFk);
        setDataInicio(d.dataInicio);
        setDataFim(d.dataFim);
        setHoraInicio(d.horaInicio);
        setHoraFim(d.horaFim);
        setDataParticipacao(d.dataParticipacao || today());
        setObservacoes(d.observacoes);
      } else {
        setUserFk('');
        setTipo('dia');
        setMotivoFk('');
        setDataInicio(today());
        setDataFim(today());
        setHoraInicio('');
        setHoraFim('');
        setDataParticipacao(today());
        setObservacoes('');
      }
      setDraftLoaded(true);
    });
  }, [visible, initial]);

  useEffect(() => {
    if (draftLoaded && !initial) {
      saveDraft({ userFk, tipo, motivoFk, dataInicio, dataFim, horaInicio, horaFim, dataParticipacao, observacoes });
    }
  }, [userFk, tipo, motivoFk, dataInicio, dataFim, horaInicio, horaFim, dataParticipacao, observacoes, draftLoaded, initial]);

  // Ao mudar para "dia" a data fim acompanha a data início; ao mudar para "parcial" as horas ficam obrigatórias.
  useEffect(() => {
    if (tipo === 'dia') setDataFim(dataInicio);
  }, [tipo, dataInicio]);

  const motivosFiltrados = useMemo(
    () => (tipo === 'parcial' ? motivos.filter((m) => m.parcial_ok) : motivos),
    [motivos, tipo]
  );
  const motivoOptions: PickerOption[] = [
    { value: '', label: '— Sem motivo especificado —' },
    ...motivosFiltrados.map((m) => ({ value: String(m.pk), label: `${m.artigo} — ${m.descricao}` })),
  ];
  const colaboradorOptions: PickerOption[] = colaboradores.map((c) => ({ value: String(c.pk), label: c.name }));

  const preAviso = preAvisoStatus(dataInicio, dataParticipacao);
  const dataParticipacaoDisabled = !isAdmin && !!initial;

  const canSave = !!dataInicio && !!dataFim && (tipo === 'dia' || (!!horaInicio && !!horaFim)) && (!!initial || !isAdmin || !!userFk);

  const handleSave = async () => {
    if (!canSave) return;
    const payload: CreateParticipacaoPayload = {
      user_fk: userFk ? Number(userFk) : undefined,
      tipo,
      motivo_fk: motivoFk ? Number(motivoFk) : null,
      data_inicio: dataInicio,
      data_fim: tipo === 'parcial' ? dataInicio : dataFim,
      hora_inicio: tipo === 'parcial' ? horaInicio || null : null,
      hora_fim: tipo === 'parcial' ? horaFim || null : null,
      data_participacao: dataParticipacao || null,
      observacoes: observacoes || null,
    };
    if (initial) await onSave({ pk: initial.pk, data: payload });
    else {
      clearDraft();
      await onSave(payload);
    }
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{initial ? 'Editar Participação' : 'Nova Participação'}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 560 }}>
          <ScrollView contentContainerStyle={styles.content}>
            {!initial && isAdmin && (
              <>
                <Text style={styles.label}>Colaborador *</Text>
                <ExpandablePicker placeholder="Seleccionar colaborador" value={userFk} options={colaboradorOptions} onSelect={setUserFk} />
              </>
            )}

            <Text style={styles.label}>Tipo</Text>
            <SegmentedButtons
              value={tipo}
              onValueChange={(v) => setTipo(v as ParticipacaoTipo)}
              buttons={[
                { value: 'dia', label: 'Dia(s)' },
                { value: 'parcial', label: 'Parcial' },
              ]}
              style={{ marginBottom: SPACING.sm }}
            />

            <Text style={styles.label}>Motivo</Text>
            <ExpandablePicker placeholder="Seleccionar motivo" value={motivoFk} options={motivoOptions} onSelect={setMotivoFk} />

            <Text style={styles.label}>Data Início *</Text>
            <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('inicio')}>
              <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{dataInicio ? fmtDatePt(dataInicio) : 'Seleccionar data'}</Text>
            </TouchableOpacity>

            {tipo === 'dia' && (
              <>
                <Text style={styles.label}>Data Fim *</Text>
                <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('fim')}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
                  <Text style={styles.dateText}>{dataFim ? fmtDatePt(dataFim) : 'Seleccionar data'}</Text>
                </TouchableOpacity>
              </>
            )}

            {tipo === 'parcial' && (
              <>
                <Text style={styles.label}>Hora Saída *</Text>
                <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('horaInicio')}>
                  <MaterialIcons name="access-time" size={18} color={COLORS.primary} />
                  <Text style={styles.dateText}>{horaInicio || 'Seleccionar hora'}</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Hora Regresso *</Text>
                <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('horaFim')}>
                  <MaterialIcons name="access-time" size={18} color={COLORS.primary} />
                  <Text style={styles.dateText}>{horaFim || 'Seleccionar hora'}</Text>
                </TouchableOpacity>
              </>
            )}

            {(showPicker === 'inicio' || showPicker === 'fim') && (
              <DateTimePicker
                value={(showPicker === 'inicio' ? dataInicio : dataFim) ? new Date((showPicker === 'inicio' ? dataInicio : dataFim) + 'T00:00:00') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  const target = showPicker;
                  setShowPicker(null);
                  if (!d) return;
                  const iso = d.toISOString().slice(0, 10);
                  if (target === 'inicio') setDataInicio(iso);
                  else setDataFim(iso);
                }}
              />
            )}

            {(showPicker === 'horaInicio' || showPicker === 'horaFim') && (
              <DateTimePicker
                value={timeToDate(showPicker === 'horaInicio' ? horaInicio : horaFim)}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  const target = showPicker;
                  setShowPicker(null);
                  if (!d) return;
                  const hhmm = dateToHHMM(d);
                  if (target === 'horaInicio') setHoraInicio(hhmm);
                  else setHoraFim(hhmm);
                }}
              />
            )}

            <Text style={styles.label}>Data de Comunicação</Text>
            <TouchableOpacity
              style={[styles.dateTrigger, dataParticipacaoDisabled && styles.dateTriggerDisabled]}
              onPress={() => !dataParticipacaoDisabled && setShowPicker('participacao')}
              disabled={dataParticipacaoDisabled}
            >
              <MaterialIcons name="calendar-today" size={18} color={dataParticipacaoDisabled ? COLORS.textDisabled : COLORS.primary} />
              <Text style={styles.dateText}>{fmtDatePt(dataParticipacao)}</Text>
            </TouchableOpacity>
            {showPicker === 'participacao' && (
              <DateTimePicker
                value={new Date(dataParticipacao + 'T00:00:00')}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  setShowPicker(null);
                  if (d) setDataParticipacao(d.toISOString().slice(0, 10));
                }}
              />
            )}

            {preAviso && preAviso.nivel !== 'success' && (
              <View style={[styles.warnBox, preAviso.nivel === 'error' && styles.errorBox]}>
                <MaterialIcons name="warning" size={16} color={preAviso.nivel === 'error' ? COLORS.error : COLORS.warning} />
                <Text style={[styles.warnText, preAviso.nivel === 'error' && { color: COLORS.error }]}>
                  {preAviso.label} — o mínimo legal de antecedência é de 5 dias.
                </Text>
              </View>
            )}

            <TextInput
              label="Observações"
              value={observacoes}
              onChangeText={setObservacoes}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md }}
            />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button
            onPress={handleSave}
            mode="contained"
            loading={isSaving}
            disabled={!canSave || isSaving}
            style={{ borderRadius: RADIUS.pill }}
          >
            Guardar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  title: { fontWeight: '700', color: COLORS.textPrimary },
  content: { paddingVertical: SPACING.sm },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface, marginBottom: SPACING.sm,
  },
  dateTriggerDisabled: { backgroundColor: COLORS.background, opacity: 0.6 },
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  input: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs,
    backgroundColor: COLORS.warningSurface, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  errorBox: { backgroundColor: COLORS.errorSurface },
  warnText: { flex: 1, fontSize: 12, color: COLORS.warning },
});

export default ParticipacaoFormDialog;
