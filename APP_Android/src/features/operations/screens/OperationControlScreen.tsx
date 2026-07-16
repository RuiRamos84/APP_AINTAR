import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet, View, TouchableOpacity, ScrollView,
  TextInput as RNTextInput, Linking, Image, Platform, KeyboardAvoidingView, Keyboard,
} from 'react-native';
import {
  Text, ActivityIndicator, Portal, Dialog, Button,
  TextInput, Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '@/services/api/apiClient';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { useOperationMetadata, MetaOpControlo } from '@/features/operations/hooks/useOperationTasks';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ControlEntry {
  pk: number;
  tt_operacaoaccao: string;
  tt_operacaoaccao_type?: number;
  tb_instalacao: string;
  ts_client?: string;
  updt_client?: string;
  updt_time?: string;
  data?: string;
  dia_operacao?: string;
  valuetext?: string;
  valuememo?: string;
  control_tt_operacaocontrolo?: number | null;
  control_memo?: string;
}

interface ControlResponse {
  data: ControlEntry[];
  total: number;
}

interface ControlAnnex {
  pk: number;
  filename: string;
  descr?: string;
  data?: string;
}

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// mirrors frontend-v2 (new Date(...).toLocaleDateString('pt-PT'))
const formatDateOnly = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ── Constants ─────────────────────────────────────────────────────────────────

// mirrors frontend-v2 OPERATION_TYPES
const OP_TYPE = { NUMBER: 1, TEXT: 2, REFERENCE: 3, BOOLEAN: 4, ANALYSIS: 5, ENERGY: 6 };

const FALLBACK_OPCONTROLO: MetaOpControlo[] = [
  { pk: 10, value: 'Conforme' },
  { pk: 1,  value: 'Incumprimento ligeiro' },
  { pk: 2,  value: 'Incumprimento grave' },
  { pk: 3,  value: 'Incumprimento muito grave' },
];

const CONTROL_COLOR: Record<number, string> = {
  1: COLORS.info,
  2: COLORS.warning,
  3: COLORS.error,
  10: COLORS.success,
};
const CONTROL_BG: Record<number, string> = {
  1: COLORS.infoSurface,
  2: COLORS.warningSurface,
  3: COLORS.errorSurface,
  10: COLORS.successSurface,
};
const CONTROL_ICON: Record<number, React.ComponentProps<typeof MaterialIcons>['name']> = {
  1: 'warning',
  2: 'warning',
  3: 'cancel',
  10: 'check-circle',
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

const useOperationControl = (payload: { tb_instalacao: number; last_days: number } | null) =>
  useQuery<ControlResponse>({
    queryKey: ['operations', 'control', payload],
    queryFn: async () => {
      const { data } = await apiClient.post('/operation_control/query', payload);
      return data;
    },
    enabled: payload !== null,
    staleTime: 60 * 1000,
  });

const useControlAnnexes = (pk: number | null, enabled: boolean) =>
  useQuery({
    queryKey: ['controlAnnexes', pk],
    queryFn: async () => {
      const { data } = await apiClient.get(`/operation_control/annexes/${pk}`);
      return data;
    },
    enabled: enabled && pk !== null,
    staleTime: 0,
  });

const useUpdateControl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      pk: number;
      control_tt_operacaocontrolo: number;
      control_memo?: string;
      files?: PickedFile[];
    }) => {
      const formData = new FormData();
      formData.append('pk', String(payload.pk));
      formData.append('control_tt_operacaocontrolo', String(payload.control_tt_operacaocontrolo));
      if (payload.control_memo) formData.append('control_memo', payload.control_memo);
      (payload.files ?? []).forEach(f => {
        formData.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as any);
      });
      const { data } = await apiClient.post('/operation_control/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'control'] });
      qc.invalidateQueries({ queryKey: ['controlAnnexes'] });
    },
  });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getAnnexIcon = (filename: string): React.ComponentProps<typeof MaterialIcons>['name'] => {
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) return 'image';
  if (/\.pdf$/i.test(filename)) return 'picture-as-pdf';
  return 'description';
};

const getAnnexIconColor = (filename: string): string => {
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) return COLORS.success;
  if (/\.pdf$/i.test(filename)) return COLORS.error;
  return COLORS.info;
};

// ── Control Status Chip ───────────────────────────────────────────────────────

const ControlChip = ({ pk, label }: { pk?: number | null; label: string }) => {
  if (!pk) {
    return (
      <View style={[chipSt.chip, { borderColor: COLORS.border }]}>
        <Text style={[chipSt.text, { color: COLORS.textSecondary }]}>Pendente</Text>
      </View>
    );
  }
  const color = CONTROL_COLOR[pk] ?? COLORS.textDisabled;
  const icon  = CONTROL_ICON[pk]  ?? 'info';
  return (
    <View style={[chipSt.chip, { borderColor: color }]}>
      <MaterialIcons name={icon} size={12} color={color} />
      <Text style={[chipSt.text, { color }]}>{label}</Text>
    </View>
  );
};

const chipSt = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.pill,
    borderWidth: 1, backgroundColor: COLORS.surface,
  },
  text: { fontSize: 11, fontWeight: '600' },
});

// ── Value display (mirrors frontend-v2 formatValueByType) ─────────────────────

const ValueDisplay = ({ item }: { item: ControlEntry }) => {
  const type  = Number(item.tt_operacaoaccao_type);
  const value = item.valuetext;

  if (!value) return <Text style={valSt.dash}>-</Text>;

  if (type === OP_TYPE.NUMBER) {
    return <Text style={valSt.number}>{value}</Text>;
  }

  if (type === OP_TYPE.BOOLEAN) {
    const ok = value === '1';
    return (
      <View style={[valSt.outlineChip, { borderColor: ok ? COLORS.success : COLORS.border }]}>
        <Text style={[valSt.outlineChipText, { color: ok ? COLORS.success : COLORS.textSecondary }]}>
          {ok ? '✓ Confirmado' : '✗ Não confirmado'}
        </Text>
      </View>
    );
  }

  if (type === OP_TYPE.ANALYSIS) {
    if (value === '1' || value === '0') {
      const ok = value === '1';
      return (
        <View style={[valSt.filledChip, { backgroundColor: ok ? COLORS.successSurface : COLORS.overlay }]}>
          <Text style={[valSt.filledChipText, { color: ok ? COLORS.success : COLORS.textSecondary }]}>
            {ok ? 'Recolha realizada' : 'Não realizada'}
          </Text>
        </View>
      );
    }
    return <Text style={valSt.number}>{value}</Text>;
  }

  return <Text style={valSt.text} numberOfLines={1}>{value}</Text>;
};

const valSt = StyleSheet.create({
  dash:   { fontSize: 12, color: COLORS.textDisabled },
  number: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  text:   { fontSize: 12, color: COLORS.textPrimary, flexShrink: 1 },
  outlineChip: {
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 3, backgroundColor: COLORS.surface,
  },
  outlineChipText: { fontSize: 11, fontWeight: '600' },
  filledChip: { borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  filledChipText: { fontSize: 11, fontWeight: '600' },
});

// ── Pending file item ─────────────────────────────────────────────────────────

const PendingFileItem = ({ file, onRemove }: { file: PickedFile; onRemove: () => void }) => {
  const isImg = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const iconName: React.ComponentProps<typeof MaterialIcons>['name'] =
    isImg ? 'image' : isPdf ? 'picture-as-pdf' : 'insert-drive-file';
  const iconColor = isImg ? COLORS.success : isPdf ? COLORS.error : COLORS.info;

  return (
    <View style={dlgSt.fileRow}>
      {isImg ? (
        <Image source={{ uri: file.uri }} style={dlgSt.fileThumb} />
      ) : (
        <View style={[dlgSt.fileIconBox, { backgroundColor: `${iconColor}18` }]}>
          <MaterialIcons name={iconName} size={20} color={iconColor} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={dlgSt.fileName} numberOfLines={1}>{file.name}</Text>
        {file.size ? <Text style={dlgSt.fileSize}>{formatFileSize(file.size)}</Text> : null}
      </View>
      <TouchableOpacity onPress={onRemove} style={dlgSt.fileRemove}>
        <MaterialIcons name="close" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );
};

// ── Control Dialog ────────────────────────────────────────────────────────────

interface ControlDialogProps {
  task: ControlEntry | null;
  visible: boolean;
  viewMode: boolean;
  opcontrolo: MetaOpControlo[];
  isPending: boolean;
  onDismiss: () => void;
  onEdit: () => void;
  onSubmit: (classification: number, memo: string, files: PickedFile[]) => void;
}

const MAX_FILES = 5;

const ControlDialog = ({
  task, visible, viewMode, opcontrolo, isPending, onDismiss, onEdit, onSubmit,
}: ControlDialogProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [classification, setClassification] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [picking, setPicking] = useState(false);
  const [fileError, setFileError] = useState('');

  React.useEffect(() => {
    if (visible && task) {
      setClassification(task.control_tt_operacaocontrolo ?? null);
      setMemo(task.control_memo ?? '');
      setFiles([]);
      setFileError('');
    }
  }, [visible, task]);

  const { data: annexesRaw, isLoading: annexesLoading } = useControlAnnexes(task?.pk ?? null, visible);

  const annexes: ControlAnnex[] = useMemo(() => {
    if (!annexesRaw) return [];
    const inner = (annexesRaw as any)?.data;
    if (Array.isArray(inner?.data)) return inner.data;
    if (Array.isArray(inner)) return inner;
    if (Array.isArray(annexesRaw)) return annexesRaw as ControlAnnex[];
    return [];
  }, [annexesRaw]);

  const classificationOptions = useMemo((): PickerOption[] =>
    opcontrolo.map(opt => ({
      value: String(opt.pk),
      label: opt.value,
      icon: CONTROL_ICON[opt.pk] ?? 'info',
      iconColor: CONTROL_COLOR[opt.pk] ?? COLORS.textSecondary,
    })),
    [opcontrolo]
  );

  const handlePickFile = useCallback(async () => {
    if (files.length >= MAX_FILES) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf',
               'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled) {
        const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
        const oversized = result.assets.find(
          a => a.mimeType?.startsWith('video/') && (a.size ?? 0) > MAX_VIDEO_BYTES
        );
        if (oversized) {
          setFileError(`O vídeo "${oversized.name}" excede o limite de 200 MB.`);
          return;
        }
        setFileError('');
        const toAdd = result.assets.slice(0, MAX_FILES - files.length);
        setFiles(prev => [...prev, ...toAdd.map(a => ({
          uri: a.uri,
          name: a.name,
          mimeType: a.mimeType ?? 'application/octet-stream',
          size: a.size ?? undefined,
        }))]);
      }
    } finally {
      setPicking(false);
    }
  }, [files.length]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDismiss = () => {
    setClassification(null);
    setMemo('');
    setFiles([]);
    setFileError('');
    onDismiss();
  };

  const handleSubmit = () => {
    if (!classification) return;
    onSubmit(classification, memo.trim(), files);
  };

  if (!task) return null;

  const executor = task.updt_client ?? task.ts_client;
  const date     = formatDateOnly(task.dia_operacao ?? task.data);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} style={dlgSt.dialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={dlgSt.header}>
          <Text style={dlgSt.title}>
            {viewMode ? 'Detalhes do Controlo' : 'Validar Tarefa'}
          </Text>
          {viewMode && (
            <View style={dlgSt.readonlyBadge}>
              <MaterialIcons name="visibility" size={12} color={COLORS.textSecondary} />
              <Text style={dlgSt.readonlyText}>Modo leitura</Text>
            </View>
          )}
        </View>

        <Dialog.ScrollArea style={{ maxHeight: 560 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={dlgSt.content} keyboardShouldPersistTaps="handled">

            {/* ── Info da tarefa ── */}
            <View style={dlgSt.infoBox}>
              <View style={dlgSt.infoGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={dlgSt.infoLabel}>Ação</Text>
                  <Text style={dlgSt.infoValue}>{task.tt_operacaoaccao}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dlgSt.infoLabel}>Valor Registado</Text>
                  <ValueDisplay item={task} />
                </View>
              </View>

              <View style={dlgSt.infoGrid}>
                {date ? (
                  <View style={{ flex: 1 }}>
                    <Text style={dlgSt.infoLabel}>Data</Text>
                    <Text style={dlgSt.infoValue}>{date}</Text>
                  </View>
                ) : null}
                {executor ? (
                  <View style={{ flex: 1 }}>
                    <Text style={dlgSt.infoLabel}>Executado por</Text>
                    <Text style={dlgSt.infoValue}>{executor}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── Classificação ── */}
            <Text style={dlgSt.fieldLabel}>Classificação *</Text>
            <ExpandablePicker
              placeholder="Selecione uma classificação..."
              value={classification ? String(classification) : ''}
              options={classificationOptions}
              onSelect={(val) => setClassification(Number(val))}
              disabled={viewMode}
            />

            {/* ── Observações ── */}
            <Text style={dlgSt.fieldLabel}>Observações</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              mode="outlined"
              multiline
              numberOfLines={3}
              disabled={viewMode}
              style={dlgSt.input}
              outlineStyle={dlgSt.inputOutline}
              placeholder="Adicione observações sobre a validação..."
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
            />

            {/* ── Ficheiros já anexados ── */}
            {annexesLoading && (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.sm }} />
            )}
            {!annexesLoading && annexes.length > 0 && (
              <>
                <Text style={dlgSt.fieldLabel}>Ficheiros já anexados ({annexes.length})</Text>
                {annexes.map((annex) => {
                  const displayName = annex.descr || annex.filename;
                  const iconName    = getAnnexIcon(annex.filename);
                  const iconColor   = getAnnexIconColor(annex.filename);
                  return (
                    <TouchableOpacity
                      key={annex.pk}
                      style={dlgSt.annexRow}
                      onPress={() => {
                        const url = `${apiClient.defaults.baseURL}/operation_control/annex/${annex.pk}/download`;
                        Linking.openURL(url).catch(() => {});
                      }}
                    >
                      <View style={[dlgSt.fileIconBox, { backgroundColor: `${iconColor}18` }]}>
                        <MaterialIcons name={iconName as any} size={18} color={iconColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={dlgSt.annexName} numberOfLines={1}>{displayName}</Text>
                        {annex.data ? <Text style={dlgSt.annexDate}>{annex.data}</Text> : null}
                      </View>
                      <MaterialIcons name="download" size={16} color={COLORS.textDisabled} />
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* ── Upload novos ficheiros (só em modo edição) ── */}
            {!viewMode && (
              <>
                <Text style={dlgSt.fieldLabel}>
                  Anexos {files.length > 0 ? `(${files.length}/${MAX_FILES})` : `(opcional, até ${MAX_FILES} ficheiros)`}
                </Text>

                {files.length < MAX_FILES && (
                  <TouchableOpacity
                    style={[dlgSt.dropzone, picking && { opacity: 0.6 }]}
                    onPress={handlePickFile}
                    disabled={picking}
                    activeOpacity={0.7}
                  >
                    {picking ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <MaterialIcons name="cloud-upload" size={32} color={COLORS.primary} style={{ opacity: 0.7 }} />
                    )}
                    <Text style={dlgSt.dropzoneText}>
                      {picking ? 'A selecionar...' : 'Toque para selecionar ficheiros'}
                    </Text>
                    <Text style={dlgSt.uploadHint}>
                      Imagens (comprimidas), PDF, Word, Excel, Vídeo (máx. 200 MB)
                    </Text>
                  </TouchableOpacity>
                )}

                {fileError ? (
                  <View style={dlgSt.fileErrorRow}>
                    <MaterialIcons name="error-outline" size={14} color={COLORS.error} />
                    <Text style={dlgSt.fileErrorText}>{fileError}</Text>
                  </View>
                ) : null}

                {files.map((f, i) => (
                  <PendingFileItem key={i} file={f} onRemove={() => handleRemoveFile(i)} />
                ))}

                {files.length >= MAX_FILES && (
                  <View style={dlgSt.maxFilesNote}>
                    <MaterialIcons name="info-outline" size={14} color={COLORS.warning} />
                    <Text style={dlgSt.maxFilesText}>Máximo de {MAX_FILES} ficheiros atingido</Text>
                  </View>
                )}
              </>
            )}

          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions>
          <Button onPress={handleDismiss} textColor={COLORS.textSecondary}>Fechar</Button>
          {viewMode ? (
            <Button mode="outlined" onPress={onEdit} style={dlgSt.btn} icon="lock-open">
              Editar Validação
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isPending}
              disabled={isPending || !classification}
              style={dlgSt.btn}
            >
              Guardar Validação
            </Button>
          )}
        </Dialog.Actions>
      </KeyboardAvoidingView>
      </Dialog>
    </Portal>
  );
};

const dlgSt = StyleSheet.create({
  dialog:        { borderRadius: RADIUS.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  title:         { fontWeight: '700', color: COLORS.textPrimary, fontSize: 16, flex: 1 },
  readonlyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.overlay, borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  readonlyText:  { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  content:       { paddingVertical: SPACING.sm, gap: SPACING.sm },

  // Info box
  infoBox:       { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs },
  infoLabel:     { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue:     { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: 1 },
  infoGrid:      { flexDirection: 'row', gap: SPACING.md },

  // Classification + section labels
  fieldLabel:    { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: SPACING.xs, marginTop: SPACING.xs },

  // Input
  input:         { backgroundColor: COLORS.surface, marginBottom: SPACING.xs },
  inputOutline:  { borderRadius: RADIUS.md },

  // Existing annexes
  annexRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  annexName:  { fontSize: 13, color: COLORS.textPrimary },
  annexDate:  { fontSize: 11, color: COLORS.textSecondary },

  // File upload — dropzone card (mirrors frontend-v2 FileUploadControl)
  dropzone: {
    alignItems: 'center', gap: SPACING.xs,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  dropzoneText: { fontSize: 13, color: COLORS.textSecondary },
  uploadHint: { fontSize: 11, color: COLORS.textDisabled, textAlign: 'center' },
  fileErrorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 2, marginBottom: SPACING.xs,
  },
  fileErrorText: { fontSize: 12, color: COLORS.error, flex: 1 },

  // Pending file item
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fileThumb:   { width: 36, height: 36, borderRadius: RADIUS.xs, resizeMode: 'cover' },
  fileIconBox: { width: 36, height: 36, borderRadius: RADIUS.xs, alignItems: 'center', justifyContent: 'center' },
  fileName:    { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  fileSize:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  fileRemove:  { padding: 4 },

  maxFilesNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.warningSurface, borderRadius: RADIUS.xs,
  },
  maxFilesText: { fontSize: 12, color: COLORS.warning, fontWeight: '600' },

  btn:        { borderRadius: RADIUS.pill, marginLeft: SPACING.sm },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

const OperationControlScreen = () => {
  // ── Filters ───────────────────────────────────────────────────────────────────
  const [instType, setInstType]         = useState<'ETAR' | 'EE' | ''>('');
  const [municipality, setMunicipality] = useState('');
  const [pkInstalacao, setPkInstalacao] = useState<number | null>(null);
  const [lastDays, setLastDays]         = useState('7');
  const [search, setSearch]             = useState('');
  const [queryPayload, setQueryPayload] = useState<{ tb_instalacao: number; last_days: number } | null>(null);

  // ── Dialog ────────────────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<ControlEntry | null>(null);
  const [viewMode, setViewMode]         = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);

  // ── Snackbar ──────────────────────────────────────────────────────────────────
  const [snackMsg, setSnackMsg]   = useState('');
  const [snackShow, setSnackShow] = useState(false);
  const toast = (msg: string) => { setSnackMsg(msg); setSnackShow(true); };

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: metadata } = useOperationMetadata();
  const { data: response, isLoading, isFetching, refetch } = useOperationControl(queryPayload);
  const { mutate: updateControl, isPending: isSaving } = useUpdateControl();

  const opcontrolo: MetaOpControlo[] = metadata?.opcontrolo?.length
    ? metadata.opcontrolo
    : FALLBACK_OPCONTROLO;

  const etarList: any[] = metadata?.etar ?? [];
  const eeList:   any[] = metadata?.ee   ?? [];
  const installList = instType === 'ETAR' ? etarList : instType === 'EE' ? eeList : [];

  const municipalityOptions = useMemo((): PickerOption[] => {
    const seen = new Set<string>();
    return installList
      .map((i: any) => i.ts_entity as string)
      .filter((e: string) => e && !seen.has(e) && seen.add(e))
      .sort((a: string, b: string) => a.localeCompare(b, 'pt'))
      .map((e) => ({ value: e, label: e }));
  }, [installList]);

  const installationOptions = useMemo((): PickerOption[] =>
    installList
      .filter((i: any) => i.ts_entity === municipality)
      .map((i: any) => ({ value: String(i.pk), label: i.nome ?? i.name ?? String(i.pk) })),
    [installList, municipality]
  );

  const entries = response?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      e.tt_operacaoaccao?.toLowerCase().includes(q) ||
      e.tb_instalacao?.toLowerCase().includes(q)    ||
      (e.updt_client ?? e.ts_client)?.toLowerCase().includes(q) ||
      e.valuetext?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const getControlLabel = (pk?: number | null) =>
    opcontrolo.find(o => o.pk === pk)?.value ?? '';

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    if (!pkInstalacao) return;
    setQueryPayload({ tb_instalacao: pkInstalacao, last_days: Number(lastDays) || 7 });
  };

  const handleOpenDialog = (task: ControlEntry) => {
    setSelectedTask(task);
    setViewMode(task.control_tt_operacaocontrolo != null);
    setDialogOpen(true);
  };

  const handleSave = (classificationPk: number, memoText: string, files: PickedFile[]) => {
    if (!selectedTask) return;
    updateControl(
      { pk: selectedTask.pk, control_tt_operacaocontrolo: classificationPk, control_memo: memoText || undefined, files },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedTask(null);
          refetch();
          toast('Controlo guardado com sucesso');
        },
        onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao guardar controlo'),
      }
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={st.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Filter Card ───────────────────────────────── */}
        <View style={st.filterCard}>

          {/* Tipo */}
          <Text style={st.fieldLabel}>Tipo de Instalação</Text>
          <View style={st.chipRow}>
            {(['ETAR', 'EE'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[st.typeChip, instType === t && st.typeChipActive]}
                onPress={() => {
                  setInstType(t);
                  setMunicipality('');
                  setPkInstalacao(null);
                  setQueryPayload(null);
                }}
              >
                <Text style={[st.typeChipText, instType === t && st.typeChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Município */}
          {instType !== '' && (
            <>
              <Text style={st.fieldLabel}>Município</Text>
              <ExpandablePicker
                placeholder="Selecionar município..."
                value={municipality}
                options={municipalityOptions}
                onSelect={(val) => {
                  setMunicipality(val);
                  setPkInstalacao(null);
                  setQueryPayload(null);
                }}
              />
            </>
          )}

          {/* Instalação */}
          {municipality !== '' && (
            <>
              <Text style={st.fieldLabel}>Instalação ({instType})</Text>
              <ExpandablePicker
                placeholder={installationOptions.length ? 'Selecionar instalação...' : 'Sem instalações disponíveis'}
                value={pkInstalacao ? String(pkInstalacao) : ''}
                options={installationOptions}
                onSelect={(val) => {
                  setPkInstalacao(Number(val));
                  setQueryPayload(null);
                }}
                disabled={installationOptions.length === 0}
              />
            </>
          )}

          {/* Dias + Pesquisar */}
          <View style={st.searchRow}>
            <View style={st.daysWrap}>
              <MaterialIcons name="schedule" size={15} color={COLORS.textDisabled} />
              <RNTextInput
                style={st.daysInput}
                value={lastDays}
                onChangeText={setLastDays}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              <Text style={st.daysLabel}>dias atrás</Text>
            </View>
            <TouchableOpacity
              style={[st.searchBtn, !pkInstalacao && st.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={!pkInstalacao}
            >
              <MaterialIcons name="search" size={16} color="#fff" />
              <Text style={st.searchBtnText}>Pesquisar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Loading ───────────────────────────────────── */}
        {isLoading && (
          <View style={st.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        )}

        {/* ── Results ───────────────────────────────────── */}
        {!isLoading && queryPayload !== null && (
          <>
            {/* Search + Stats bar */}
            <View style={st.searchWrap}>
              <MaterialIcons name="search" size={18} color={COLORS.textDisabled} />
              <RNTextInput
                style={st.searchInput}
                placeholder="Filtrar resultados..."
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

            <View style={st.statsRow}>
              <View style={st.statChip}>
                <MaterialIcons name="list-alt" size={13} color={COLORS.primary} />
                <Text style={st.statText}>
                  {filtered.length}
                  {response?.total && filtered.length !== response.total ? `/${response.total}` : ''}
                  {' operações'}
                </Text>
              </View>
              {isFetching && <ActivityIndicator size="small" color={COLORS.primary} />}
              <TouchableOpacity onPress={() => refetch()} style={st.refreshBtn}>
                <MaterialIcons name="refresh" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Cards */}
            {filtered.length === 0 ? (
              <View style={st.emptyContainer}>
                <MaterialIcons name="search" size={48} color={COLORS.textDisabled} />
                <Text style={st.emptyText}>
                  {search ? 'Nenhuma operação encontrada.' : 'Sem operações no período selecionado.'}
                </Text>
              </View>
            ) : (
              filtered.map((item) => {
                const controlled    = item.control_tt_operacaocontrolo != null;
                const controlLabel  = getControlLabel(item.control_tt_operacaocontrolo);
                const executor      = item.updt_client ?? item.ts_client;
                const date          = formatDateOnly(item.dia_operacao ?? item.data);
                const accentColor   = controlled ? COLORS.success : COLORS.primary;
                const iconBg        = controlled ? COLORS.successSurface : COLORS.primarySurface;
                const iconName      = controlled ? 'verified' : 'engineering';
                const iconColor     = controlled ? COLORS.success : COLORS.primary;

                return (
                  <View key={item.pk} style={st.card}>
                    <View style={[st.cardAccent, { backgroundColor: accentColor }]} />
                    <View style={st.cardBody}>

                      {/* Header: icon + title */}
                      <View style={st.cardHeader}>
                        <View style={[st.iconWrap, { backgroundColor: iconBg }]}>
                          <MaterialIcons name={iconName as any} size={16} color={iconColor} />
                        </View>
                        <Text style={st.taskTitle} numberOfLines={2}>{item.tt_operacaoaccao}</Text>
                      </View>

                      {/* Installation */}
                      <View style={st.instalacaoRow}>
                        <MaterialIcons name="location-on" size={13} color={COLORS.textSecondary} />
                        <Text style={st.instalacao} numberOfLines={1}>{item.tb_instalacao}</Text>
                      </View>

                      {/* Meta chips */}
                      <View style={st.metaRow}>
                        {executor ? (
                          <View style={[st.metaChip, { backgroundColor: COLORS.secondarySurface }]}>
                            <MaterialIcons name="person-outline" size={11} color={COLORS.secondary} />
                            <Text style={[st.metaText, { color: COLORS.secondary }]}>{executor}</Text>
                          </View>
                        ) : null}
                        {date ? (
                          <View style={[st.metaChip, { backgroundColor: COLORS.overlay }]}>
                            <MaterialIcons name="today" size={11} color={COLORS.textDisabled} />
                            <Text style={[st.metaText, { color: COLORS.textDisabled }]}>{date}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Valor */}
                      <View style={st.valueRow}>
                        <Text style={st.valueLabel}>Valor</Text>
                        <ValueDisplay item={item} />
                      </View>

                      {/* Footer: status chip + action button */}
                      <View style={st.cardFooter}>
                        <ControlChip pk={item.control_tt_operacaocontrolo} label={controlLabel} />
                        <TouchableOpacity
                          style={[st.actionBtn, controlled && st.actionBtnView]}
                          onPress={() => handleOpenDialog(item)}
                        >
                          <MaterialIcons
                            name={controlled ? 'visibility' : 'edit'}
                            size={13}
                            color={controlled ? COLORS.textSecondary : '#fff'}
                          />
                          <Text style={[st.actionBtnText, controlled && st.actionBtnTextView]}>
                            {controlled ? 'Ver' : 'Controlar'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ── Placeholder (before first search) ────────── */}
        {!isLoading && queryPayload === null && (
          <View style={st.placeholderContainer}>
            <MaterialIcons name="find-in-page" size={56} color={COLORS.textDisabled} />
            <Text style={st.placeholderTitle}>Selecione uma Instalação</Text>
            <Text style={st.placeholderSub}>
              Escolha o tipo, município e instalação, depois pressione Pesquisar.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Dialog ───────────────────────────────────────── */}
      <ControlDialog
        task={selectedTask}
        visible={dialogOpen}
        viewMode={viewMode}
        opcontrolo={opcontrolo}
        isPending={isSaving}
        onDismiss={() => { setDialogOpen(false); setSelectedTask(null); }}
        onEdit={() => setViewMode(false)}
        onSubmit={handleSave}
      />

      <Snackbar
        visible={snackShow}
        onDismiss={() => setSnackShow(false)}
        duration={3000}
        style={st.snackbar}
      >
        {snackMsg}
      </Snackbar>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll:    { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.md },
  center:    { alignItems: 'center', paddingVertical: SPACING.xl },

  // Filter card
  filterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4,
    marginBottom: SPACING.xs, marginTop: SPACING.xs,
  },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  typeChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: COLORS.border,
  },
  typeChipActive:     { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primary },
  typeChipText:       { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  typeChipTextActive: { color: COLORS.primary },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  daysWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.border, flex: 1,
  },
  daysInput:  { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, minWidth: 36 },
  daysLabel:  { fontSize: 12, color: COLORS.textSecondary },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md, paddingVertical: 10, flex: 2,
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Search/Stats bar
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 6 },
  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: 2 },
  statChip:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:    { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  refreshBtn:  { padding: 4 },

  // Empty / Placeholder
  emptyContainer:    { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyText:         { color: COLORS.textDisabled, fontSize: 15, textAlign: 'center' },
  placeholderContainer: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  placeholderTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  placeholderSub:    { fontSize: 14, color: COLORS.textDisabled, textAlign: 'center' },

  // Cards
  card: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: SPACING.md, gap: SPACING.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  iconWrap: {
    width: 28, height: 28, borderRadius: RADIUS.xs,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  taskTitle:    { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 20 },
  instalacaoRow:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  instalacao:   { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: 2 },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.xs },
  metaText:     { fontSize: 11, fontWeight: '500' },
  valueRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  valueLabel:   { fontSize: 10, fontWeight: '600', color: COLORS.textDisabled, textTransform: 'uppercase', letterSpacing: 0.4 },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xs },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
  },
  actionBtnView:     { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
  actionBtnText:     { fontSize: 12, fontWeight: '700', color: '#fff' },
  actionBtnTextView: { color: COLORS.textSecondary },

  snackbar: { backgroundColor: COLORS.navy },
});

export default OperationControlScreen;
