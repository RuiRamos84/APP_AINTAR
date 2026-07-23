import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { useDraft } from '@/shared/hooks/useDraft';
import type { Horario, CreateHorarioPayload, EditHorarioPayload } from '@/features/rh/hooks/useHorarios';
import { useColaboradores } from '@/features/rh/hooks/useRhLookups';
import type { LookupItem } from '@/features/rh/hooks/useRhLookups';

const JORNADA_CONTINUA_FK = 2;

interface HorarioDraft {
  colaboradorFk: string;
  jornadaFk: string;
  descr: string;
  horaEntrada: string;
  horaSaida: string;
  horaInicioAlmoco: string;
  horaFimAlmoco: string;
  dataInicio: string;
  dataFim: string;
}

interface HorarioFormDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: CreateHorarioPayload | { pk: number; data: EditHorarioPayload }) => Promise<unknown>;
  isSaving: boolean;
  initial: Horario | null;
  tiposJornada: LookupItem[];
}

const toISODate = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const toHHMM = (v?: string | null) => (v ? v.slice(0, 5) : '');
const fmtDatePt = (v: string) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '');

const timeToDate = (hhmm: string) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const dateToHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const HorarioFormDialog = ({ visible, onDismiss, onSave, isSaving, initial, tiposJornada }: HorarioFormDialogProps) => {
  const { loadDraft, saveDraft, clearDraft } = useDraft<HorarioDraft>('horario_form');
  const { colaboradores } = useColaboradores();

  const [colaboradorFk, setColaboradorFk] = useState('');
  const [jornadaFk, setJornadaFk] = useState('1');
  const [descr, setDescr] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('08:00');
  const [horaSaida, setHoraSaida] = useState('17:00');
  const [horaInicioAlmoco, setHoraInicioAlmoco] = useState('12:30');
  const [horaFimAlmoco, setHoraFimAlmoco] = useState('13:30');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState('');
  const [showPicker, setShowPicker] = useState<null | 'inicio' | 'fim' | 'entrada' | 'saida' | 'almocoInicio' | 'almocoFim'>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!visible) { setDraftLoaded(false); return; }
    if (initial) {
      setColaboradorFk(String(initial.user_fk));
      setJornadaFk(String(initial.tt_jornada_fk));
      setDescr(initial.descr || '');
      setHoraEntrada(toHHMM(initial.hora_entrada) || '08:00');
      setHoraSaida(toHHMM(initial.hora_saida) || '17:00');
      setHoraInicioAlmoco(toHHMM(initial.hora_inicio_almoco) || '12:30');
      setHoraFimAlmoco(toHHMM(initial.hora_fim_almoco) || '13:30');
      setDataInicio(toISODate(initial.data_inicio));
      setDataFim(toISODate(initial.data_fim));
      setDraftLoaded(true);
      return;
    }
    loadDraft().then((d) => {
      if (d) {
        setColaboradorFk(d.colaboradorFk || '');
        setJornadaFk(d.jornadaFk);
        setDescr(d.descr);
        setHoraEntrada(d.horaEntrada);
        setHoraSaida(d.horaSaida);
        setHoraInicioAlmoco(d.horaInicioAlmoco);
        setHoraFimAlmoco(d.horaFimAlmoco);
        setDataInicio(d.dataInicio);
        setDataFim(d.dataFim);
      } else {
        setColaboradorFk('');
        setJornadaFk('1');
        setDescr('');
        setHoraEntrada('08:00');
        setHoraSaida('17:00');
        setHoraInicioAlmoco('12:30');
        setHoraFimAlmoco('13:30');
        setDataInicio(new Date().toISOString().slice(0, 10));
        setDataFim('');
      }
      setDraftLoaded(true);
    });
  }, [visible, initial]);

  useEffect(() => {
    if (draftLoaded && !initial) {
      saveDraft({ colaboradorFk, jornadaFk, descr, horaEntrada, horaSaida, horaInicioAlmoco, horaFimAlmoco, dataInicio, dataFim });
    }
  }, [colaboradorFk, jornadaFk, descr, horaEntrada, horaSaida, horaInicioAlmoco, horaFimAlmoco, dataInicio, dataFim, draftLoaded, initial]);

  const isContinua = jornadaFk === String(JORNADA_CONTINUA_FK);
  const jornadaOptions: PickerOption[] = tiposJornada.map((t) => ({ value: String(t.pk), label: t.descr as string }));
  const colaboradorOptions: PickerOption[] = colaboradores.map((c) => ({ value: String(c.pk), label: c.name }));
  const canSave = !!jornadaFk && !!descr.trim() && !!dataInicio && (!!initial || !!colaboradorFk);

  const handleSave = async () => {
    if (!canSave) return;
    const payload: CreateHorarioPayload = {
      user_fk: Number(colaboradorFk),
      tt_jornada_fk: Number(jornadaFk),
      descr: descr.trim(),
      hora_entrada: horaEntrada,
      hora_saida: horaSaida,
      hora_inicio_almoco: isContinua ? null : horaInicioAlmoco,
      hora_fim_almoco: isContinua ? null : horaFimAlmoco,
      data_inicio: dataInicio,
      data_fim: dataFim || null,
      dias_semana: [1, 2, 3, 4, 5],
    };
    if (initial) await onSave({ pk: initial.pk, data: payload });
    else {
      clearDraft();
      await onSave(payload);
    }
    onDismiss();
  };

  const TimeRow = ({ label, value, target }: { label: string; value: string; target: 'entrada' | 'saida' | 'almocoInicio' | 'almocoFim' }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker(target)}>
        <MaterialIcons name="access-time" size={18} color={COLORS.primary} />
        <Text style={styles.dateText}>{value}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{initial ? 'Editar Horário' : 'Novo Horário'}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 520 }}>
          <ScrollView contentContainerStyle={styles.content}>
            {!initial && (
              <>
                <Text style={styles.label}>Colaborador *</Text>
                <ExpandablePicker placeholder="Seleccionar colaborador" value={colaboradorFk} options={colaboradorOptions} onSelect={setColaboradorFk} />
              </>
            )}

            <Text style={styles.label}>Tipo de Jornada</Text>
            <ExpandablePicker placeholder="Seleccionar jornada" value={jornadaFk} options={jornadaOptions} onSelect={setJornadaFk} />

            <TextInput
              label="Descrição *"
              value={descr}
              onChangeText={setDescr}
              mode="outlined"
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md }}
            />

            <TimeRow label="Hora Entrada" value={horaEntrada} target="entrada" />
            <TimeRow label="Hora Saída" value={horaSaida} target="saida" />

            {!isContinua && (
              <>
                <TimeRow label="Início Almoço" value={horaInicioAlmoco} target="almocoInicio" />
                <TimeRow label="Fim Almoço" value={horaFimAlmoco} target="almocoFim" />
              </>
            )}

            {showPicker && (
              <DateTimePicker
                value={timeToDate(
                  showPicker === 'entrada' ? horaEntrada
                    : showPicker === 'saida' ? horaSaida
                    : showPicker === 'almocoInicio' ? horaInicioAlmoco
                    : horaFimAlmoco
                )}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowPicker(null);
                  if (!d) return;
                  const hhmm = dateToHHMM(d);
                  if (showPicker === 'entrada') setHoraEntrada(hhmm);
                  else if (showPicker === 'saida') setHoraSaida(hhmm);
                  else if (showPicker === 'almocoInicio') setHoraInicioAlmoco(hhmm);
                  else if (showPicker === 'almocoFim') setHoraFimAlmoco(hhmm);
                }}
              />
            )}

            <Text style={styles.label}>Início Vigência *</Text>
            <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('inicio')}>
              <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{dataInicio ? fmtDatePt(dataInicio) : 'Seleccionar data'}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Fim Vigência (opcional)</Text>
            <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('fim')}>
              <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{dataFim ? fmtDatePt(dataFim) : 'Sem data limite'}</Text>
            </TouchableOpacity>

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
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  input: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
});

export default HorarioFormDialog;
