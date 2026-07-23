import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, Keyboard, KeyboardAvoidingView, Alert } from 'react-native';
import { Dialog, Portal, Button, TextInput, Text, SegmentedButtons, IconButton, ActivityIndicator } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { useDraft } from '@/shared/hooks/useDraft';
import { useScrollToEndOnKeyboard } from '@/shared/hooks/useScrollToEndOnKeyboard';
import { toLocalISODate } from '@/shared/utils/dateUtils';
import useAuthStore from '@/features/auth/store/authStore';
import { useColaboradores } from '@/features/rh/hooks/useRhLookups';
import { preAvisoStatus } from '@/features/rh/hooks/useParticipacoes';
import { useParticipacaoAnexos, type PickedFile } from '@/features/rh/hooks/useParticipacaoAnexos';
import { RH_COLOR } from '@/features/rh/utils/rhUtils';
import type { Participacao, Motivo, CreateParticipacaoPayload, EditParticipacaoPayload, ParticipacaoTipo } from '@/features/rh/hooks/useParticipacoes';

const ALLOWED_ANEXO_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_ANEXOS = 5;

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
  onSave: (
    payload: CreateParticipacaoPayload | { pk: number; data: EditParticipacaoPayload },
    pendingFiles: PickedFile[]
  ) => Promise<unknown>;
  isSaving: boolean;
  initial: Participacao | null;
  motivos: Motivo[];
}

const toISODate = (v?: string | null) => {
  if (!v) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  if (match) return match[1];
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : toLocalISODate(d);
};
const today = () => toLocalISODate(new Date());
const fmtDatePt = (v: string) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '');

const timeToDate = (hhmm: string) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const dateToHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const fmtBytes = (b?: number) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (name: string): React.ComponentProps<typeof MaterialIcons>['name'] =>
  name.toLowerCase().endsWith('.pdf') ? 'picture-as-pdf' : 'image';

const ParticipacaoFormDialog = ({ visible, onDismiss, onSave, isSaving, initial, motivos }: ParticipacaoFormDialogProps) => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.hasPermission('rh.admin'));
  const { colaboradores } = useColaboradores();
  const { loadDraft, saveDraft, clearDraft } = useDraft<ParticipacaoDraft>('participacao_form');
  const { download, remove, isRemoving } = useParticipacaoAnexos(initial?.pk);
  const scrollRef = useRef<ScrollView>(null);

  useScrollToEndOnKeyboard(scrollRef, visible);

  const [userFk, setUserFk] = useState('');
  const [tipo, setTipo] = useState<ParticipacaoTipo>('dia');
  const [motivoFk, setMotivoFk] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [dataParticipacao, setDataParticipacao] = useState(today());
  const [observacoes, setObservacoes] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PickedFile[]>([]);
  const [showPicker, setShowPicker] = useState<null | 'inicio' | 'fim' | 'participacao' | 'horaInicio' | 'horaFim'>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!visible) { setDraftLoaded(false); setPendingFiles([]); return; }
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
        setUserFk(isAdmin ? '' : user?.pk ? String(user.pk) : '');
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

  const existentes = initial?.documentos ?? [];
  const totalAnexos = existentes.length + pendingFiles.length;
  const canDeleteAnexo = !!initial && [1, 2].includes(initial.ts_estado_fk) && (isAdmin || initial.tb_user_fk === user?.pk);

  const canSave = !!dataInicio && !!dataFim && (tipo === 'dia' || (!!horaInicio && !!horaFim)) && (!!initial || !isAdmin || !!userFk);

  const handlePickFiles = async () => {
    if (totalAnexos >= MAX_ANEXOS) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_ANEXO_TYPES,
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const toAdd = result.assets.slice(0, MAX_ANEXOS - totalAnexos);
    setPendingFiles((prev) => [...prev, ...toAdd.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }))]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadExisting = async (filename: string, nomeOriginal: string) => {
    try {
      await download(filename, nomeOriginal);
    } catch {
      // falha silenciosa — o utilizador pode tentar novamente
    }
  };

  const handleRemoveExisting = (filename: string) => {
    Alert.alert('Remover anexo', 'Tem a certeza que quer remover este anexo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => remove(filename) },
    ]);
  };

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
    try {
      if (initial) await onSave({ pk: initial.pk, data: payload }, pendingFiles);
      else await onSave(payload, pendingFiles);
    } catch {
      return;
    }
    if (!initial) clearDraft();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Dialog.Title style={styles.title}>{initial ? 'Editar Participação' : 'Nova Participação de Ausência'}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 560 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Tipo de ausência</Text>
            <SegmentedButtons
              value={tipo}
              onValueChange={(v) => setTipo(v as ParticipacaoTipo)}
              buttons={[
                { value: 'dia', label: 'Dia(s) completo(s)', icon: 'calendar-month' },
                { value: 'parcial', label: 'Parcial (horas)', icon: 'clock-outline' },
              ]}
              style={{ marginBottom: SPACING.sm }}
            />

            {!initial && isAdmin && (
              <>
                <Text style={styles.label}>Colaborador *</Text>
                <ExpandablePicker placeholder="Seleccionar colaborador" value={userFk} options={colaboradorOptions} onSelect={setUserFk} />
              </>
            )}

            <View style={styles.divider} />

            {tipo === 'dia' ? (
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Data Início *</Text>
                  <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('inicio')}>
                    <MaterialIcons name="calendar-today" size={16} color={COLORS.primary} />
                    <Text style={styles.dateText} numberOfLines={1}>{dataInicio ? fmtDatePt(dataInicio) : 'Seleccionar'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Data Fim *</Text>
                  <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('fim')}>
                    <MaterialIcons name="calendar-today" size={16} color={COLORS.primary} />
                    <Text style={styles.dateText} numberOfLines={1}>{dataFim ? fmtDatePt(dataFim) : 'Seleccionar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Data *</Text>
                <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('inicio')}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
                  <Text style={styles.dateText}>{dataInicio ? fmtDatePt(dataInicio) : 'Seleccionar data'}</Text>
                </TouchableOpacity>

                <View style={styles.dateRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hora Saída *</Text>
                    <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('horaInicio')}>
                      <MaterialIcons name="access-time" size={16} color={COLORS.primary} />
                      <Text style={styles.dateText}>{horaInicio || 'Seleccionar'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hora Regresso *</Text>
                    <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPicker('horaFim')}>
                      <MaterialIcons name="access-time" size={16} color={COLORS.primary} />
                      <Text style={styles.dateText}>{horaFim || 'Seleccionar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
                  const iso = toLocalISODate(d);
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

            <Text style={styles.label}>Motivo legal</Text>
            <ExpandablePicker placeholder="Seleccionar motivo" value={motivoFk} options={motivoOptions} onSelect={setMotivoFk} />

            <View style={styles.divider} />

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.label, { marginBottom: 0 }]}>
                Data de comunicação{!isAdmin ? ' (editável pelo RH)' : ''}
              </Text>
              {preAviso && (
                <View style={[styles.preAvisoChip, styles[`preAviso_${preAviso.nivel}` as const]]}>
                  {preAviso.nivel !== 'success' && <MaterialIcons name="warning" size={12} color={preAviso.nivel === 'error' ? COLORS.error : COLORS.warning} />}
                  <Text style={[styles.preAvisoChipText, { color: preAviso.nivel === 'success' ? COLORS.success : preAviso.nivel === 'warning' ? COLORS.warning : COLORS.error }]}>
                    {preAviso.label}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.dateTrigger, dataParticipacaoDisabled && styles.dateTriggerDisabled]}
              onPress={() => !dataParticipacaoDisabled && setShowPicker('participacao')}
              disabled={dataParticipacaoDisabled}
            >
              <MaterialIcons name="calendar-today" size={18} color={dataParticipacaoDisabled ? COLORS.textDisabled : COLORS.primary} />
              <Text style={styles.dateText}>{fmtDatePt(dataParticipacao)}</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              {dataParticipacaoDisabled
                ? 'Apenas o Admin RH pode alterar a data de comunicação'
                : 'Pode ser anterior à data actual, para reflectir uma comunicação verbal prévia'}
            </Text>
            {showPicker === 'participacao' && (
              <DateTimePicker
                value={new Date(dataParticipacao + 'T00:00:00')}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  setShowPicker(null);
                  if (d) setDataParticipacao(toLocalISODate(d));
                }}
              />
            )}

            {preAviso && preAviso.nivel !== 'success' && (
              <View style={[styles.warnBox, preAviso.nivel === 'error' && styles.errorBox]}>
                <MaterialIcons name="warning" size={16} color={preAviso.nivel === 'error' ? COLORS.error : COLORS.warning} />
                <Text style={[styles.warnText, preAviso.nivel === 'error' && { color: COLORS.error }]}>
                  Pré-aviso inferior ao mínimo legal (5 dias).{' '}
                  {preAviso.nivel === 'error'
                    ? 'A ausência já ocorreu — o Admin RH pode corrigir a data de comunicação.'
                    : 'Confirme se a comunicação foi feita atempadamente.'}
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
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              right={<TextInput.Icon icon="arrow-right-bold-circle" onPress={() => Keyboard.dismiss()} />}
            />

            <View style={styles.divider} />

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.label, { marginBottom: 0 }]}>
                Documentos justificativos (PDF, JPEG, PNG · máx. {MAX_ANEXOS})
              </Text>
              <Button
                mode="outlined"
                compact
                icon="paperclip"
                onPress={handlePickFiles}
                disabled={totalAnexos >= MAX_ANEXOS}
                style={styles.addAnexoBtn}
                labelStyle={{ fontSize: 12 }}
              >
                Adicionar
              </Button>
            </View>

            {existentes.map((doc) => (
              <View key={doc.pk ?? doc.filename} style={styles.anexoRow}>
                <MaterialIcons name={fileIcon(doc.filename)} size={20} color={COLORS.textSecondary} />
                <View style={styles.anexoBody}>
                  <Text style={styles.anexoName} numberOfLines={1}>{doc.nome_original || doc.filename}</Text>
                  <Text style={styles.anexoMeta}>{fmtBytes(doc.tamanho)}</Text>
                </View>
                <IconButton icon="download" size={18} onPress={() => handleDownloadExisting(doc.filename, doc.nome_original)} />
                {canDeleteAnexo && (
                  isRemoving
                    ? <ActivityIndicator size={18} style={{ marginHorizontal: SPACING.sm }} />
                    : <IconButton icon="delete-outline" size={18} iconColor={COLORS.error} onPress={() => handleRemoveExisting(doc.filename)} />
                )}
              </View>
            ))}

            {pendingFiles.map((f, i) => (
              <View key={i} style={[styles.anexoRow, styles.anexoRowPending]}>
                <MaterialIcons name={fileIcon(f.name)} size={20} color={COLORS.primary} />
                <View style={styles.anexoBody}>
                  <Text style={styles.anexoName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.anexoMeta}>Por enviar</Text>
                </View>
                <IconButton icon="close" size={18} onPress={() => removePendingFile(i)} />
              </View>
            ))}

            {existentes.length === 0 && pendingFiles.length === 0 && (
              <Text style={styles.helperText}>Sem anexos.</Text>
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
            buttonColor={RH_COLOR}
            style={{ borderRadius: RADIUS.pill }}
          >
            {initial ? 'Actualizar' : 'Registar'}
          </Button>
        </Dialog.Actions>
        </KeyboardAvoidingView>
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
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  dateRow: { flexDirection: 'row', gap: SPACING.sm },
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface, marginBottom: SPACING.sm,
  },
  dateTriggerDisabled: { backgroundColor: COLORS.background, opacity: 0.6 },
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', flex: 1 },
  helperText: { fontSize: 11, color: COLORS.textDisabled, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  input: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs,
    backgroundColor: COLORS.warningSurface, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  errorBox: { backgroundColor: COLORS.errorSurface },
  warnText: { flex: 1, fontSize: 12, color: COLORS.warning },

  preAvisoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1,
  },
  preAviso_success: { borderColor: COLORS.success + '55', backgroundColor: COLORS.successSurface },
  preAviso_warning: { borderColor: COLORS.warning + '55', backgroundColor: COLORS.warningSurface },
  preAviso_error:   { borderColor: COLORS.error + '55',   backgroundColor: COLORS.errorSurface },
  preAvisoChipText: { fontSize: 11, fontWeight: '700' },

  addAnexoBtn: { borderColor: RH_COLOR },
  anexoRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md, marginBottom: 2,
  },
  anexoRowPending: { backgroundColor: COLORS.primarySurface },
  anexoBody: { flex: 1, minWidth: 0 },
  anexoName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  anexoMeta: { fontSize: 11, color: COLORS.textDisabled },
});

export default ParticipacaoFormDialog;
