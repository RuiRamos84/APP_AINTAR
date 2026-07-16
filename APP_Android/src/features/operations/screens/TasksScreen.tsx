import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  TextInput as RNTextInput, Platform, KeyboardAvoidingView, Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useDraft } from '@/shared/hooks/useDraft';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import {
  Text, ActivityIndicator, Snackbar, Portal,
  Dialog, Button, TextInput, Checkbox, RadioButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useOperationTasks, useConcluirTask, useOperationMetadata, useAddOperationAnnexes,
  useCreateOperacaoDirect, usePedidos, useCreateRequisicao, useCreateDescarga,
  OperationTask, Pedido, PickedFile, ACTIONS_BY_TYPE, FIXED_PK,
} from '@/features/operations/hooks/useOperationTasks';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';

// ─── Operation type constants ────────────────────────────────────────────────
const OP_TYPE = { NUMBER: 1, TEXT: 2, REFERENCE: 3, BOOLEAN: 4, ANALYSIS: 5, ENERGY: 6 };

// ─── Annex upload constants (mirrors frontend-v2 FileUploadControl) ──────────
const MAX_FILES = 5;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const ANNEX_MIME_TYPES = [
  'image/*', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
];

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PendingFileItem = ({ file, onRemove }: { file: PickedFile; onRemove: () => void }) => {
  const isImg = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const iconName: React.ComponentProps<typeof MaterialIcons>['name'] =
    isImg ? 'image' : isPdf ? 'picture-as-pdf' : 'insert-drive-file';
  const iconColor = isImg ? COLORS.success : isPdf ? COLORS.error : COLORS.info;

  return (
    <View style={styles.fileRow}>
      <View style={[styles.fileIconBox, { backgroundColor: `${iconColor}18` }]}>
        <MaterialIcons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
        {file.size ? <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text> : null}
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.fileRemove}>
        <MaterialIcons name="close" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Annex uploader (shared: mirrors frontend-v2 FileUploadControl conditions) ─
interface AnnexUploaderProps {
  files: PickedFile[];
  setFiles: React.Dispatch<React.SetStateAction<PickedFile[]>>;
}

const AnnexUploader = ({ files, setFiles }: AnnexUploaderProps) => {
  const [picking, setPicking] = useState(false);
  const [fileError, setFileError] = useState('');

  const handlePickFile = async () => {
    if (files.length >= MAX_FILES) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ANNEX_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled) {
        const oversized = result.assets.find(
          (a) => a.mimeType?.startsWith('video/') && (a.size ?? 0) > MAX_VIDEO_BYTES
        );
        if (oversized) {
          setFileError(`O vídeo "${oversized.name}" excede o limite de 200 MB.`);
          return;
        }
        setFileError('');
        const toAdd = result.assets.slice(0, MAX_FILES - files.length);
        setFiles((prev) => [...prev, ...toAdd.map((a) => ({
          uri: a.uri,
          name: a.name,
          mimeType: a.mimeType ?? 'application/octet-stream',
          size: a.size ?? undefined,
        }))]);
      }
    } finally {
      setPicking(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Text style={styles.anexosLabel}>
        <Text style={styles.anexosLabelBold}>Anexos: </Text>
        {files.length > 0
          ? `${files.length}/${MAX_FILES} selecionado(s)`
          : `(opcional, até ${MAX_FILES} ficheiros — imagens, PDF, Word, Excel, vídeo)`}
      </Text>

      {files.length < MAX_FILES && (
        <TouchableOpacity
          style={[styles.uploadBox, picking && { opacity: 0.6 }]}
          onPress={handlePickFile}
          disabled={picking}
          activeOpacity={0.7}
        >
          <MaterialIcons name="cloud-upload" size={30} color={COLORS.primary} />
          <Text style={styles.uploadBoxTitle}>
            {picking ? 'A selecionar...' : 'Toque para selecionar ficheiros'}
          </Text>
          <Text style={styles.uploadBoxSubtitle}>
            Imagens (comprimidas), PDF, Word, Excel, Vídeo (máx. 200 MB)
          </Text>
        </TouchableOpacity>
      )}

      {fileError ? (
        <View style={styles.fileErrorRow}>
          <MaterialIcons name="error-outline" size={14} color={COLORS.error} />
          <Text style={styles.fileErrorText}>{fileError}</Text>
        </View>
      ) : null}

      {files.map((f, i) => (
        <PendingFileItem key={i} file={f} onRemove={() => handleRemoveFile(i)} />
      ))}

      {files.length >= MAX_FILES && (
        <View style={styles.maxFilesNote}>
          <MaterialIcons name="info-outline" size={14} color={COLORS.warning} />
          <Text style={styles.maxFilesText}>Máximo de {MAX_FILES} ficheiros atingido</Text>
        </View>
      )}
    </>
  );
};

// ─── Date formatting (mirrors frontend-v2 formatDateOnly) ────────────────────
const formatDateOnly = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── Task type chip (mirrors frontend-v2 TASK_TYPE) ──────────────────────────
const TASK_TYPE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Numérico',    color: COLORS.primary,       bg: COLORS.primarySurface },
  2: { label: 'Texto',       color: COLORS.textSecondary, bg: COLORS.overlay },
  3: { label: 'Seleção',     color: COLORS.secondary,     bg: COLORS.secondarySurface },
  4: { label: 'Confirmação', color: COLORS.success,       bg: COLORS.successSurface },
  5: { label: 'Análise',     color: COLORS.info,          bg: COLORS.infoSurface },
  6: { label: 'Foto',        color: COLORS.warning,       bg: COLORS.warningSurface },
};

const INST_TYPES = [
  { key: 'ETAR',  label: 'ETAR',  color: COLORS.success,  bg: COLORS.successSurface },
  { key: 'EE',    label: 'EE',    color: COLORS.primary,  bg: COLORS.primarySurface },
  { key: 'REDE',  label: 'Rede',  color: COLORS.warning,  bg: COLORS.warningSurface },
  { key: 'CAIXA', label: 'Caixa', color: COLORS.error,    bg: COLORS.errorSurface   },
];

function getOpType(task: OperationTask): number {
  const t = Number(task.tt_operacaoaccao_type);
  return isNaN(t) ? 4 : t;
}

function getInstallationLicenseColor(licenseStatus?: number): string {
  switch (licenseStatus) {
    case 3: return COLORS.successLight; // Licença ativa
    case 2: return COLORS.warningLight; // A aguardar licenciamento
    default: return COLORS.textDisabled; // Sem licença
  }
}

// ─── Task Card ───────────────────────────────────────────────────────────────
const TaskCard = ({ item, done, onDetails, onConcluir }: {
  item: OperationTask; done?: boolean; onDetails?: () => void; onConcluir?: () => void;
}) => {
  const tipo = TASK_TYPE[Number(item.tt_operacaoaccao_type)];
  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={[styles.cardAccent, { backgroundColor: done ? COLORS.success : COLORS.warning }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: done ? COLORS.successSurface : COLORS.warningSurface }]}>
            <MaterialIcons name={done ? 'check-circle' : 'assignment'} size={16} color={done ? COLORS.success : COLORS.warning} />
          </View>
          <Text style={[styles.taskTitle, done && styles.titleDone]} numberOfLines={2}>
            {item.tt_operacaoaccao}
          </Text>
          {done && <MaterialIcons name="check-circle" size={16} color={COLORS.success} />}
        </View>

        {!done && (!!item.photo || tipo) && (
          <View style={styles.chipRow}>
            {!!item.photo && (
              <View style={[styles.typeChip, { borderColor: COLORS.warning, backgroundColor: COLORS.warningSurface }]}>
                <MaterialIcons name="photo-camera" size={11} color={COLORS.warning} />
                <Text style={[styles.typeChipText, { color: COLORS.warning }]}>Foto</Text>
              </View>
            )}
            {tipo && (
              <View style={[styles.typeChip, { borderColor: tipo.color, backgroundColor: tipo.bg }]}>
                <Text style={[styles.typeChipText, { color: tipo.color }]}>{tipo.label}</Text>
              </View>
            )}
          </View>
        )}

        {!!item.valuetext && done && (
          <Text style={styles.resultText}>Resultado: {item.valuetext}</Text>
        )}
        {!!(item.dia_operacao ?? item.data) && (
          <View style={styles.metaRow}>
            <MaterialIcons name="today" size={12} color={COLORS.textDisabled} />
            <Text style={styles.metaText}>{formatDateOnly(item.dia_operacao ?? item.data)}</Text>
          </View>
        )}
        {!!item.descr && item.descr !== item.tt_operacaoaccao && (
          <Text style={styles.descText} numberOfLines={1}>{item.descr}</Text>
        )}
        {!!item.ts_operador1 && (
          <View style={styles.metaRow}>
            <MaterialIcons name="person" size={12} color={COLORS.textDisabled} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.ts_operador1}{item.ts_operador2 ? ` · ${item.ts_operador2}` : ''}
            </Text>
          </View>
        )}

        {!done && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.detailsBtn} onPress={onDetails} activeOpacity={0.75}>
              <Text style={styles.detailsBtnText}>Detalhes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.concluirBtn} onPress={onConcluir} activeOpacity={0.75}>
              <Text style={styles.concluirBtnText}>Concluir</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Details Dialog ──────────────────────────────────────────────────────────
interface DetailsDialogProps {
  task: OperationTask | null;
  visible: boolean;
  onDismiss: () => void;
  onConcluir: () => void;
}

const DetailsDialog = ({ task, visible, onDismiss, onConcluir }: DetailsDialogProps) => {
  if (!task) return null;
  const tipo = TASK_TYPE[Number(task.tt_operacaoaccao_type)];

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>Detalhes da Tarefa</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 420 }}>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            <Text style={styles.taskDesc}>{task.tt_operacaoaccao}</Text>
            <Text style={styles.taskInst}>{task.tb_instalacao}</Text>

            <View style={styles.dialogDivider} />

            {tipo && (
              <View style={styles.detailRow}>
                <Text style={styles.fieldLabel}>Tipo</Text>
                <View style={[styles.typeChip, { borderColor: tipo.color, backgroundColor: tipo.bg, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.typeChipText, { color: tipo.color }]}>{tipo.label}</Text>
                </View>
              </View>
            )}

            {!!(task.dia_operacao ?? task.data) && (
              <View style={styles.detailRow}>
                <Text style={styles.fieldLabel}>Data</Text>
                <Text style={styles.detailValue}>{formatDateOnly(task.dia_operacao ?? task.data)}</Text>
              </View>
            )}

            {!!task.descr && task.descr !== task.tt_operacaoaccao && (
              <View style={styles.detailRow}>
                <Text style={styles.fieldLabel}>Descrição</Text>
                <Text style={styles.detailValue}>{task.descr}</Text>
              </View>
            )}

            {!!task.ts_operador1 && (
              <View style={styles.detailRow}>
                <Text style={styles.fieldLabel}>Operador(es)</Text>
                <Text style={styles.detailValue}>
                  {task.ts_operador1}{task.ts_operador2 ? ` · ${task.ts_operador2}` : ''}
                </Text>
              </View>
            )}

            {!!task.photo && (
              <View style={styles.detailRow}>
                <Text style={styles.fieldLabel}>Requer Foto</Text>
                <Text style={styles.detailValue}>Sim</Text>
              </View>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={COLORS.textSecondary}>Fechar</Button>
          <Button mode="contained" onPress={onConcluir} style={[styles.dialogBtn, { backgroundColor: COLORS.success }]}>
            Concluir
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

// ─── Pedido Card ─────────────────────────────────────────────────────────────
const PedidoCard = ({ pedido }: { pedido: Pedido }) => {
  const urgencyColor =
    pedido.urgency === '2' ? COLORS.error :
    pedido.urgency === '1' ? COLORS.warning : COLORS.info;
  const urgencyBg =
    pedido.urgency === '2' ? COLORS.errorSurface :
    pedido.urgency === '1' ? COLORS.warningSurface : COLORS.infoSurface;

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: urgencyColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: COLORS.infoSurface }]}>
            <MaterialIcons name="description" size={16} color={COLORS.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {pedido.numero ?? `#${pedido.pk}`}
            </Text>
            {pedido.tipo && <Text style={styles.metaText}>{pedido.tipo}</Text>}
          </View>
          {pedido.urgency === '2' && (
            <View style={[styles.badge, { backgroundColor: urgencyBg }]}>
              <Text style={[styles.badgeText, { color: urgencyColor }]}>Urgente</Text>
            </View>
          )}
        </View>
        {(pedido.ts_entity ?? pedido.address) ? (
          <View style={styles.metaRow}>
            <MaterialIcons name="location-on" size={12} color={COLORS.textDisabled} />
            <Text style={styles.metaText} numberOfLines={1}>{pedido.ts_entity ?? pedido.address}</Text>
          </View>
        ) : null}
        {(pedido.submission ?? pedido.when_start) ? (
          <View style={styles.metaRow}>
            <MaterialIcons name="today" size={12} color={COLORS.textDisabled} />
            <Text style={styles.metaText}>{pedido.submission ?? pedido.when_start}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ─── Scroll the focused field into view once the keyboard has actually
// finished animating in — a fixed setTimeout on focus fires before Android's
// keyboard animation completes, leaving the field the user is typing in
// hidden behind the keyboard. ──────────────────────────────────────────────
const useScrollToEndOnKeyboard = (scrollRef: React.RefObject<ScrollView | null>, active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, [active, scrollRef]);
};

// ─── Completion Dialog ────────────────────────────────────────────────────────
interface CompletionDialogProps {
  task: OperationTask | null;
  visible: boolean;
  isPending: boolean;
  onDismiss: () => void;
  onSubmit: (payload: { valuetext?: string; valuememo?: string; files?: PickedFile[] }) => void;
}

const CompletionDialog = ({ task, visible, isPending, onDismiss, onSubmit }: CompletionDialogProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [valuetext, setValuetext] = useState('');
  const [valuememo, setValuememo] = useState('');
  const [boolChecked, setBoolChecked] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [vazio, setVazio] = useState('');
  const [ponta, setPonta] = useState('');
  const [cheia, setCheia] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);

  useScrollToEndOnKeyboard(scrollRef, visible);

  const reset = () => {
    setValuetext(''); setValuememo(''); setBoolChecked(false);
    setSelectedOption(''); setVazio(''); setPonta(''); setCheia('');
    setFiles([]);
  };

  const handleDismiss = () => { reset(); onDismiss(); };

  const handleSubmit = () => {
    if (!task) return;
    const type = getOpType(task);
    let vt: string | undefined;
    if (type === OP_TYPE.NUMBER)    vt = valuetext.trim() || undefined;
    if (type === OP_TYPE.TEXT)      vt = valuetext.trim() || undefined;
    if (type === OP_TYPE.REFERENCE) vt = selectedOption || undefined;
    if (type === OP_TYPE.BOOLEAN)   vt = boolChecked ? '1' : '0';
    if (type === OP_TYPE.ANALYSIS)  vt = boolChecked ? '1' : '0';
    if (type === OP_TYPE.ENERGY)    vt = [vazio, ponta, cheia].join('|');
    onSubmit({ valuetext: vt, valuememo: valuememo.trim() || undefined, files: files.length > 0 ? files : undefined });
    reset();
  };

  if (!task) return null;
  const type = getOpType(task);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Dialog.Title style={styles.dialogTitle}>
          <MaterialIcons name="check-circle" size={18} color={COLORS.success} />{'  '}
          {COMPLETION_TITLES[type] ?? 'Concluir Tarefa'}
        </Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 540 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.taskDesc}>{task.tt_operacaoaccao}</Text>
            <Text style={styles.taskInst}>{task.tb_instalacao}</Text>
            <View style={styles.dialogDivider} />

            {type === OP_TYPE.NUMBER && (
              <TextInput label={task.unidade ? `Valor (${task.unidade})` : 'Valor numérico'} value={valuetext}
                onChangeText={setValuetext} mode="outlined" keyboardType="numeric"
                style={styles.input} outlineStyle={styles.inputOutline}
                returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
            )}
            {type === OP_TYPE.TEXT && (
              <TextInput label="Observações" value={valuetext} onChangeText={setValuetext}
                mode="outlined" multiline numberOfLines={4}
                style={styles.input} outlineStyle={styles.inputOutline}
                placeholder="Descreva os detalhes da operação..."
                returnKeyType="done" blurOnSubmit onSubmitEditing={() => Keyboard.dismiss()} />
            )}
            {type === OP_TYPE.REFERENCE && (
              <>
                <Text style={styles.fieldLabel}>Selecione uma opção</Text>
                <RadioButton.Group onValueChange={setSelectedOption} value={selectedOption}>
                  {(task.opcoes ?? []).map((opt) => (
                    <RadioButton.Item key={opt} label={opt} value={opt} labelStyle={styles.radioLabel} />
                  ))}
                </RadioButton.Group>
              </>
            )}
            {type === OP_TYPE.BOOLEAN && (
              <TouchableOpacity style={styles.checkRow} onPress={() => setBoolChecked(v => !v)}>
                <Checkbox status={boolChecked ? 'checked' : 'unchecked'} />
                <Text style={styles.checkLabel}>Operação concluída com sucesso</Text>
              </TouchableOpacity>
            )}
            {type === OP_TYPE.ANALYSIS && (
              <TouchableOpacity style={styles.checkRow} onPress={() => setBoolChecked(v => !v)}>
                <Checkbox status={boolChecked ? 'checked' : 'unchecked'} />
                <Text style={styles.checkLabel}>Recolha de análise realizada</Text>
              </TouchableOpacity>
            )}
            {type === OP_TYPE.ENERGY && (
              <>
                <Text style={styles.fieldLabel}>Leituras do Contador</Text>
                <TextInput label="Vazio (kWh)" value={vazio} onChangeText={setVazio}
                  mode="outlined" keyboardType="numeric" style={styles.input} outlineStyle={styles.inputOutline} />
                <TextInput label="Ponta (kWh)" value={ponta} onChangeText={setPonta}
                  mode="outlined" keyboardType="numeric" style={styles.input} outlineStyle={styles.inputOutline} />
                <TextInput label="Cheia (kWh)" value={cheia} onChangeText={setCheia}
                  mode="outlined" keyboardType="numeric" style={styles.input} outlineStyle={styles.inputOutline} />
              </>
            )}

            <Text style={styles.commentLabel}>Comentário Adicional (Opcional)</Text>
            <TextInput value={valuememo} onChangeText={setValuememo}
              mode="outlined" multiline numberOfLines={3}
              placeholder="Adicione observações ou notas sobre esta tarefa..."
              style={styles.input} outlineStyle={styles.inputOutline}
              returnKeyType="done" blurOnSubmit onSubmitEditing={() => Keyboard.dismiss()} />

            <View style={styles.dialogDivider} />

            <AnnexUploader files={files} setFiles={setFiles} />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={handleDismiss} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button
            mode="contained"
            icon="check-circle"
            buttonColor={COLORS.success}
            onPress={handleSubmit}
            loading={isPending}
            disabled={isPending}
            style={styles.dialogBtn}
          >
            Concluir Tarefa
          </Button>
        </Dialog.Actions>
      </KeyboardAvoidingView>
      </Dialog>
    </Portal>
  );
};

// ─── Create Task Dialog ───────────────────────────────────────────────────────
interface CreateDialogProps {
  visible: boolean;
  isPending: boolean;
  onDismiss: () => void;
  onSubmit: (p: any) => void;
  metadata: any;
}

interface CreateDraft {
  instType: string; municipality: string; pkInstalacao: string;
  ttAccao: string; pkOperador: string; dateISO: string;
  clat: string; clong: string; memo: string;
}

const CreateTaskDialog = ({ visible, isPending, onDismiss, onSubmit, metadata }: CreateDialogProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [instType, setInstType]       = useState('');
  const [municipality, setMunicipality] = useState('');
  const [pkInstalacao, setPkInstalacao] = useState('');
  const [ttAccao, setTtAccao]         = useState('');
  const [pkOperador, setPkOperador]   = useState('');
  const [date, setDate]               = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clat, setClat]               = useState('');
  const [clong, setClong]             = useState('');
  const [memo, setMemo]               = useState('');
  const [files, setFiles]             = useState<PickedFile[]>([]);
  const [formError, setFormError]     = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { loadDraft, saveDraft, clearDraft } = useDraft<CreateDraft>('create_task');

  useScrollToEndOnKeyboard(scrollRef, visible);

  useEffect(() => {
    if (!visible) { setDraftLoaded(false); setFiles([]); return; }
    loadDraft().then(d => {
      if (d) {
        setInstType(d.instType); setMunicipality(d.municipality); setPkInstalacao(d.pkInstalacao);
        setTtAccao(d.ttAccao); setPkOperador(d.pkOperador);
        setDate(d.dateISO ? new Date(d.dateISO) : new Date());
        setClat(d.clat); setClong(d.clong); setMemo(d.memo);
      }
      setDraftLoaded(true);
    });
  }, [visible, loadDraft]);

  useEffect(() => {
    if (draftLoaded) {
      saveDraft({
        instType, municipality, pkInstalacao, ttAccao, pkOperador,
        dateISO: date.toISOString(), clat, clong, memo,
      });
    }
  }, [instType, municipality, pkInstalacao, ttAccao, pkOperador, date, clat, clong, memo, draftLoaded, saveDraft]);

  const etarList: any[]    = metadata?.etar          ?? [];
  const eeList: any[]      = metadata?.ee             ?? [];
  const allActions: any[]  = metadata?.operacaoaccao  ?? [];
  const operators: any[]   = metadata?.who            ?? [];

  const installList = instType === 'ETAR' ? etarList : instType === 'EE' ? eeList : [];
  const needsInstPicker = instType === 'ETAR' || instType === 'EE';
  const needsCoords     = instType === 'REDE' || instType === 'CAIXA';

  const municipalityOptions = useMemo((): PickerOption[] => {
    const seen = new Set<string>();
    return installList
      .map((i: any) => i.ts_entity as string)
      .filter((e) => e && !seen.has(e) && seen.add(e))
      .sort((a, b) => a.localeCompare(b, 'pt'))
      .map((e) => ({ value: e, label: e }));
  }, [installList]);

  const installationOptions = useMemo((): PickerOption[] =>
    installList
      .filter((i: any) => i.ts_entity === municipality)
      .map((i: any) => ({ value: String(i.pk), label: i.nome ?? i.name ?? String(i.pk) })),
    [installList, municipality]
  );

  const actionOptions = useMemo((): PickerOption[] => {
    if (!instType) return [];
    const allowed = ACTIONS_BY_TYPE[instType] ?? [];
    return allActions
      .filter((a: any) => allowed.includes(a.pk))
      .map((a: any) => ({
        value: String(a.pk),
        label: a.value ?? a.name ?? String(a.pk),
        tag: String(a.pk),
        tagColor: COLORS.primary,
        tagBg: COLORS.primarySurface,
      }));
  }, [instType, allActions]);

  const operatorOptions = useMemo((): PickerOption[] =>
    operators.map((o: any) => ({
      value: String(o.pk),
      label: o.name,
      avatar: (o.name as string)[0]?.toUpperCase() ?? '?',
    })),
    [operators]
  );

  const dateLabel = date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dateISO   = date.toISOString().split('T')[0];

  const isValid = () => {
    if (!instType || !ttAccao || !pkOperador) return false;
    if (needsInstPicker && !pkInstalacao) return false;
    return true;
  };

  const handleSubmit = () => {
    if (!isValid()) { setFormError('Preencha todos os campos obrigatórios.'); return; }
    const pk = needsInstPicker ? Number(pkInstalacao) : FIXED_PK[instType as keyof typeof FIXED_PK];
    clearDraft();
    onSubmit({
      data: dateISO,
      pk_instalacao: pk,
      pk_operador: Number(pkOperador),
      tt_operacaoaccao: Number(ttAccao),
      memo: memo.trim() || undefined,
      files: files.length > 0 ? files : undefined,
      ...(needsCoords && clat && clong
        ? { clat: parseFloat(clat), clong: parseFloat(clong) }
        : {}),
    });
  };

  const handleTypeChange = (key: string) => {
    setInstType(key); setMunicipality(''); setPkInstalacao('');
    setTtAccao(''); setClat(''); setClong('');
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Dialog.Title style={styles.dialogTitle}>Criar Operação</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 560 }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.dialogContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Tipo de instalação ── */}
            <Text style={styles.fieldLabel}>Tipo de instalação *</Text>
            <View style={styles.instTypeRow}>
              {INST_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.instChip, { borderColor: t.color, backgroundColor: instType === t.key ? t.bg : 'transparent' }]}
                  onPress={() => handleTypeChange(t.key)}
                >
                  <Text style={[styles.instChipText, { color: t.color }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {instType !== '' && (
              <>
                {/* ── Coordenadas GPS (REDE / CAIXA) ── */}
                {needsCoords && (
                  <>
                    <View style={styles.coordsCard}>
                      <MaterialIcons name="location-on" size={16} color={clat && clong ? COLORS.success : COLORS.textDisabled} />
                      <Text style={[styles.coordsLabel, { color: clat && clong ? COLORS.success : COLORS.textSecondary }]}>
                        {clat && clong ? `${parseFloat(clat).toFixed(5)}, ${parseFloat(clong).toFixed(5)}` : 'Coordenadas (opcional)'}
                      </Text>
                    </View>
                    <View style={styles.coordsRow}>
                      <TextInput
                        label="Latitude" value={clat} onChangeText={setClat}
                        mode="outlined" keyboardType="numeric"
                        style={[styles.input, { flex: 1, marginRight: SPACING.xs }]}
                        outlineStyle={styles.inputOutline}
                      />
                      <TextInput
                        label="Longitude" value={clong} onChangeText={setClong}
                        mode="outlined" keyboardType="numeric"
                        style={[styles.input, { flex: 1 }]}
                        outlineStyle={styles.inputOutline}
                      />
                    </View>
                  </>
                )}

                {/* ── Município (ETAR/EE) ── */}
                {needsInstPicker && (
                  <>
                    <Text style={styles.fieldLabel}>Município *</Text>
                    <ExpandablePicker
                      placeholder="Selecionar município..."
                      value={municipality}
                      options={municipalityOptions}
                      onSelect={(v) => { setMunicipality(v); setPkInstalacao(''); setTtAccao(''); }}
                    />

                    <Text style={styles.fieldLabel}>Instalação ({instType}) *</Text>
                    <ExpandablePicker
                      placeholder={municipality ? 'Selecionar instalação...' : 'Selecione primeiro um município'}
                      value={pkInstalacao}
                      options={installationOptions}
                      onSelect={(v) => { setPkInstalacao(v); setTtAccao(''); }}
                      disabled={!municipality}
                    />
                  </>
                )}

                {/* ── Ação ── */}
                <Text style={styles.fieldLabel}>Ação *</Text>
                <ExpandablePicker
                  placeholder="Selecionar ação..."
                  value={ttAccao}
                  options={actionOptions}
                  onSelect={setTtAccao}
                />

                {/* ── Data ── */}
                <Text style={styles.fieldLabel}>Data *</Text>
                <TouchableOpacity style={ctStyles.dateTrigger} onPress={() => setShowDatePicker(true)}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
                  <Text style={ctStyles.dateText}>{dateLabel}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
                  />
                )}

                {/* ── Operador ── */}
                <Text style={styles.fieldLabel}>Operador *</Text>
                <ExpandablePicker
                  placeholder="Selecionar operador..."
                  value={pkOperador}
                  options={operatorOptions}
                  onSelect={setPkOperador}
                />

                {/* ── Observações ── */}
                <Text style={styles.fieldLabel}>Observações (opcional)</Text>
                <TextInput
                  value={memo}
                  onChangeText={setMemo}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  placeholder="Descreva os detalhes da operação..."
                  textAlignVertical="top"
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                />

                <AnnexUploader files={files} setFiles={setFiles} />
              </>
            )}

            {formError ? <Text style={styles.errorMsg}>{formError}</Text> : null}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button mode="contained" onPress={handleSubmit} loading={isPending} disabled={isPending || !isValid()} style={styles.dialogBtn}>
            Registar Operação
          </Button>
        </Dialog.Actions>
      </KeyboardAvoidingView>
      </Dialog>
    </Portal>
  );
};

// ─── Completion dialog titles per type (mirrors frontend-v2 getModalTitle) ───
const COMPLETION_TITLES: Record<number, string> = {
  1: 'Inserir Valor Numérico',
  2: 'Adicionar Observações',
  3: 'Inserir Referência',
  4: 'Confirmar Conclusão',
  5: 'Registar Análise',
  6: 'Registar Leituras do Contador',
};

const ctStyles = StyleSheet.create({
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface, marginBottom: SPACING.sm,
  },
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
});

// ─── Requisição Dialog ────────────────────────────────────────────────────────
interface RequisicaoDialogProps {
  visible: boolean;
  isPending: boolean;
  onDismiss: () => void;
  onSubmit: (p: { pnmemo: string; pk_instalacao?: number | null }) => void;
  metadata: any;
}

interface ReqDraft { memo: string; municipality: string; pkInstalacao: string; }

const RequisicaoDialog = ({ visible, isPending, onDismiss, onSubmit, metadata }: RequisicaoDialogProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [memo, setMemo] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [pkInstalacao, setPkInstalacao] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { loadDraft, saveDraft, clearDraft } = useDraft<ReqDraft>('requisicao');

  useScrollToEndOnKeyboard(scrollRef, visible);

  useEffect(() => {
    if (!visible) { setDraftLoaded(false); return; }
    loadDraft().then(d => {
      if (d) { setMemo(d.memo); setMunicipality(d.municipality); setPkInstalacao(d.pkInstalacao); }
      setDraftLoaded(true);
    });
  }, [visible, loadDraft]);

  useEffect(() => {
    if (draftLoaded) saveDraft({ memo, municipality, pkInstalacao });
  }, [memo, municipality, pkInstalacao, draftLoaded, saveDraft]);

  const etarList: any[] = metadata?.etar ?? [];
  const eeList:   any[] = metadata?.ee   ?? [];
  const combined = useMemo(() => [
    ...etarList.map((i: any) => ({ ...i, _tipo: 'ETAR' })),
    ...eeList.map((i: any) => ({ ...i, _tipo: 'EE' })),
  ], [etarList, eeList]);

  const municipalityOptions = useMemo((): PickerOption[] => {
    const seen = new Set<string>();
    return combined
      .map((i: any) => i.ts_entity as string)
      .filter((e) => e && !seen.has(e) && seen.add(e))
      .sort((a, b) => a.localeCompare(b, 'pt'))
      .map((e) => ({ value: e, label: e }));
  }, [combined]);

  const installationOptions = useMemo((): PickerOption[] =>
    combined
      .filter((i: any) => i.ts_entity === municipality)
      .map((i: any) => ({
        value: String(i.pk),
        label: i.nome ?? i.name ?? String(i.pk),
        tag: i._tipo,
        tagColor: i._tipo === 'ETAR' ? COLORS.success : COLORS.primary,
        tagBg:    i._tipo === 'ETAR' ? COLORS.successSurface : COLORS.primarySurface,
      })),
    [combined, municipality]
  );

  const handleSubmit = () => {
    const payload = { pnmemo: memo.trim(), pk_instalacao: pkInstalacao ? Number(pkInstalacao) : null };
    clearDraft();
    onSubmit(payload);
  };

  const showMinCharsHint = memo.length > 0 && memo.trim().length < 10;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <MaterialIcons name="description" size={20} color={COLORS.warning} />
            <Text style={styles.modalHeaderTitle}>Requisição de Material</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalHeaderDivider} />

        <Dialog.ScrollArea style={{ maxHeight: 520 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.dialogContent} nestedScrollEnabled keyboardShouldPersistTaps="handled">

            {/* 1 — Município */}
            <ExpandablePicker
              placeholder="Município"
              value={municipality}
              options={municipalityOptions}
              onSelect={(val) => { setMunicipality(val); setPkInstalacao(''); }}
            />
            <Text style={styles.helperText}>Opcional — filtre por município para associar uma instalação</Text>

            {/* 2 — Instalação (disponível após município) */}
            <ExpandablePicker
              placeholder="Instalação associada"
              value={pkInstalacao}
              options={installationOptions}
              onSelect={setPkInstalacao}
              disabled={!municipality}
            />
            <Text style={styles.helperText}>Opcional — selecione a instalação se o pedido for relativo a uma específica</Text>

            {/* 3 — Descrição */}
            <Text style={styles.commentLabel}>Descrição da Requisição *</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              mode="outlined"
              multiline
              numberOfLines={8}
              style={[styles.input, { minHeight: 140 }]}
              outlineStyle={styles.inputOutline}
              placeholder="Descreva o material ou serviço necessário, quantidade, urgência e qualquer informação relevante..."
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={[styles.charCount, showMinCharsHint && styles.charCountError]}>
              {showMinCharsHint ? 'Mínimo 10 caracteres' : `${memo.length} caracteres`}
            </Text>

          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button
            mode="contained"
            icon="send"
            onPress={handleSubmit}
            loading={isPending}
            disabled={isPending || memo.trim().length < 10}
            style={[styles.dialogBtn, { backgroundColor: COLORS.warning }]}
          >
            Submeter
          </Button>
        </Dialog.Actions>
      </KeyboardAvoidingView>
      </Dialog>
    </Portal>
  );
};

// ─── Descarga Dialog ──────────────────────────────────────────────────────────
interface DescargaDialogProps {
  visible: boolean;
  isPending: boolean;
  onDismiss: () => void;
  onSubmit: (p: { pk_instalacao: number; pnmemo: string }) => void;
  metadata: any;
}

interface DescDraft { memo: string; municipality: string; pkInstalacao: string; }

const DescargaDialog = ({ visible, isPending, onDismiss, onSubmit, metadata }: DescargaDialogProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [memo, setMemo] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [pkInstalacao, setPkInstalacao] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { loadDraft, saveDraft, clearDraft } = useDraft<DescDraft>('descarga');

  useScrollToEndOnKeyboard(scrollRef, visible);

  useEffect(() => {
    if (!visible) { setDraftLoaded(false); return; }
    loadDraft().then(d => {
      if (d) { setMemo(d.memo); setMunicipality(d.municipality); setPkInstalacao(d.pkInstalacao); }
      setDraftLoaded(true);
    });
  }, [visible, loadDraft]);

  useEffect(() => {
    if (draftLoaded) saveDraft({ memo, municipality, pkInstalacao });
  }, [memo, municipality, pkInstalacao, draftLoaded, saveDraft]);

  const etarList: any[] = metadata?.etar ?? [];
  const eeList:   any[] = metadata?.ee   ?? [];
  const combined = useMemo(() => [
    ...etarList.map((i: any) => ({ ...i, _tipo: 'ETAR' })),
    ...eeList.map((i: any) => ({ ...i, _tipo: 'EE' })),
  ], [etarList, eeList]);

  const municipalityOptions = useMemo((): PickerOption[] => {
    const seen = new Set<string>();
    return combined
      .map((i: any) => i.ts_entity as string)
      .filter((e) => e && !seen.has(e) && seen.add(e))
      .sort((a, b) => a.localeCompare(b, 'pt'))
      .map((e) => ({ value: e, label: e }));
  }, [combined]);

  const installationOptions = useMemo((): PickerOption[] =>
    combined
      .filter((i: any) => i.ts_entity === municipality)
      .map((i: any) => ({
        value: String(i.pk),
        label: i.nome ?? i.name ?? String(i.pk),
        tag: i._tipo,
        tagColor: i._tipo === 'ETAR' ? COLORS.success : COLORS.primary,
        tagBg:    i._tipo === 'ETAR' ? COLORS.successSurface : COLORS.primarySurface,
      })),
    [combined, municipality]
  );

  const isValid = () => memo.trim().length >= 10 && pkInstalacao !== '';

  const handleSubmit = () => {
    const payload = { pk_instalacao: Number(pkInstalacao), pnmemo: memo.trim() };
    clearDraft();
    onSubmit(payload);
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Dialog.Title style={[styles.dialogTitle, { color: COLORS.error }]}>Descarga Interdita</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 520 }}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.dialogContent} nestedScrollEnabled keyboardShouldPersistTaps="handled">

            {/* 1 — Município */}
            <Text style={styles.fieldLabel}>Município *</Text>
            <ExpandablePicker
              placeholder="Selecionar município..."
              value={municipality}
              options={municipalityOptions}
              onSelect={(val) => { setMunicipality(val); setPkInstalacao(''); }}
            />

            {/* 2 — Instalação (disponível após município) */}
            <Text style={styles.fieldLabel}>Instalação *</Text>
            <ExpandablePicker
              placeholder={municipality ? 'Selecionar instalação...' : 'Selecione primeiro um município'}
              value={pkInstalacao}
              options={installationOptions}
              onSelect={setPkInstalacao}
              disabled={!municipality}
            />

            {/* 3 — Descrição */}
            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>Descrição da ocorrência *</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              mode="outlined"
              multiline
              numberOfLines={8}
              style={[styles.input, { minHeight: 140 }]}
              outlineStyle={styles.inputOutline}
              placeholder="Descreva a descarga interdita (mínimo 10 caracteres)..."
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.charCount}>{memo.trim().length} caracteres</Text>

          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={COLORS.textSecondary}>Cancelar</Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isPending}
            disabled={isPending || !isValid()}
            style={[styles.dialogBtn, { backgroundColor: COLORS.error }]}
          >
            Registar
          </Button>
        </Dialog.Actions>
      </KeyboardAvoidingView>
      </Dialog>
    </Portal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const TasksScreen = () => {
  const { data: response, isLoading, error } = useOperationTasks();
  const { data: pedidos = [], isLoading: pedidosLoading } = usePedidos();
  const { data: metadata } = useOperationMetadata();
  const { mutate: concluir, isPending: isConcluindo } = useConcluirTask();
  const { mutate: addAnnexes } = useAddOperationAnnexes();
  const { mutate: createTask, isPending: isCreating } = useCreateOperacaoDirect();
  const { mutate: createReq, isPending: isCreatingReq } = useCreateRequisicao();
  const { mutate: createDesc, isPending: isCreatingDesc } = useCreateDescarga();

  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OperationTask | null>(null);
  const [detailsTask, setDetailsTask] = useState<OperationTask | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const toast = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const tasks     = response?.data      ?? [];
  const completed = response?.completed ?? [];
  const totalAssigned  = response?.stats?.total_assigned  ?? 0;
  const totalCompleted = response?.stats?.total_completed ?? 0;

  const q = search.toLowerCase();

  const filteredTasks = useMemo(() => {
    if (!q) return tasks;
    return tasks.filter(t =>
      t.tt_operacaoaccao?.toLowerCase().includes(q) ||
      t.tb_instalacao?.toLowerCase().includes(q)
    );
  }, [tasks, q]);

  const filteredCompleted = useMemo(() => {
    if (!q) return completed;
    return completed.filter(t =>
      t.tt_operacaoaccao?.toLowerCase().includes(q) ||
      t.tb_instalacao?.toLowerCase().includes(q)
    );
  }, [completed, q]);

  const sections = useMemo(() => {
    const map = new Map<string, OperationTask[]>();
    filteredTasks.forEach((t) => {
      const key = t.tb_instalacao || 'Sem instalação';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'pt'))
      .map(([title, data]) => ({
        title,
        data,
        licenseStatus: data[0]?.tt_instalacaolicenciamento,
      }));
  }, [filteredTasks]);

  const [expandedInstallations, setExpandedInstallations] = useState<Set<string>>(new Set());
  const toggleInstallation = (title: string) => {
    setExpandedInstallations((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  const handleConcluir = (payload: { valuetext?: string; valuememo?: string; files?: PickedFile[] }) => {
    if (!selectedTask) return;
    const { files, ...completionPayload } = payload;
    const taskPk = selectedTask.pk;
    concluir(
      { taskPk, payload: completionPayload },
      {
        onSuccess: () => {
          setSelectedTask(null);
          toast('Tarefa concluída com sucesso.');
          if (files && files.length > 0) {
            addAnnexes({ taskPk, files }); // tarefa já concluída — falha de upload não é bloqueante
          }
        },
        onError: (e: any) => { setSelectedTask(null); toast(e?.response?.data?.error ?? 'Erro ao concluir tarefa.'); },
      }
    );
  };

  const handleCreate = (payload: any) => {
    const { files, ...createPayload } = payload;
    createTask(createPayload, {
      onSuccess: (res: any) => {
        setCreateOpen(false);
        toast('Operação criada com sucesso.');
        const createdPk = res?.data?.pk;
        if (files && files.length > 0 && createdPk) {
          addAnnexes({ taskPk: createdPk, files }); // operação já criada — falha de upload não é bloqueante
        }
      },
      onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao criar operação.'),
    });
  };

  const handleReq = (payload: { pnmemo: string; pk_instalacao?: number | null }) => {
    createReq(payload, {
      onSuccess: () => { setReqOpen(false); toast('Requisição criada com sucesso.'); },
      onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao criar requisição.'),
    });
  };

  const handleDesc = (payload: { pk_instalacao: number; pnmemo: string }) => {
    createDesc(payload, {
      onSuccess: () => { setDescOpen(false); toast('Descarga registada com sucesso.'); },
      onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao registar descarga.'),
    });
  };

  if (isLoading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Erro ao carregar tarefas.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Stats bar ─────────────────────────────────── */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalAssigned}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>
              {totalAssigned - totalCompleted}
            </Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{totalCompleted}</Text>
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={[styles.statNumber, { color: COLORS.info }]}>{pedidos.length}</Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>
        </View>

        {/* ── Search bar ────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={COLORS.textDisabled} />
          <RNTextInput
            style={styles.searchInput}
            placeholder="Pesquisar tarefas ou pedidos..."
            placeholderTextColor={COLORS.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color={COLORS.textDisabled} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Panel 1: Tarefas Pendentes ────────────────── */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitle}>Tarefas Pendentes</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredTasks.length}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setCreateOpen(true)}>
              <MaterialIcons name="add" size={14} color={COLORS.primary} />
              <Text style={styles.outlineBtnText}>Criar Tarefa</Text>
            </TouchableOpacity>
          </View>

          {sections.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment-turned-in" size={40} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>
                {search ? 'Nenhum resultado encontrado.' : 'Nenhuma tarefa pendente para hoje'}
              </Text>
            </View>
          ) : (
            sections.map(({ title, data, licenseStatus }) => {
              const expanded = expandedInstallations.has(title);
              return (
                <View key={title} style={styles.installGroup}>
                  <TouchableOpacity
                    style={styles.installHeader}
                    onPress={() => toggleInstallation(title)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.installDot, { backgroundColor: getInstallationLicenseColor(licenseStatus) }]} />
                    <Text style={styles.installTitle}>{title}</Text>
                    <View style={styles.smallBadge}>
                      <Text style={styles.smallBadgeText}>{data.length}</Text>
                    </View>
                    <MaterialIcons
                      name={expanded ? 'expand-less' : 'expand-more'}
                      size={20}
                      color={COLORS.textDisabled}
                    />
                  </TouchableOpacity>
                  {expanded && (
                    <View style={styles.installTasks}>
                      {data.map((task) => (
                        <TaskCard
                          key={task.pk}
                          item={task}
                          onDetails={() => setDetailsTask(task)}
                          onConcluir={() => setSelectedTask(task)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}

          {completed.length > 0 && (
            <>
              <TouchableOpacity style={styles.toggleRow} onPress={() => setShowCompleted(v => !v)}>
                <MaterialIcons
                  name={showCompleted ? 'expand-less' : 'expand-more'}
                  size={18}
                  color={COLORS.success}
                />
                <Text style={styles.toggleText}>
                  {showCompleted ? 'Ocultar' : 'Ver'} concluídas ({filteredCompleted.length})
                </Text>
              </TouchableOpacity>
              {showCompleted && filteredCompleted.map((task) => (
                <TaskCard key={task.pk} item={task} done />
              ))}
            </>
          )}
        </View>

        {/* ── Panel 2: Pedidos Atribuídos ───────────────── */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitle}>Pedidos Atribuídos</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pedidos.length}</Text>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.filledBtn, { backgroundColor: COLORS.warning }]} onPress={() => setReqOpen(true)}>
                <MaterialIcons name="description" size={12} color="#fff" />
                <Text style={styles.filledBtnText}>Requisição</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filledBtn, { backgroundColor: COLORS.error }]} onPress={() => setDescOpen(true)}>
                <MaterialIcons name="block" size={12} color="#fff" />
                <Text style={styles.filledBtnText}>Descarga</Text>
              </TouchableOpacity>
            </View>
          </View>

          {pedidosLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
          ) : pedidos.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={40} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>Sem pedidos atribuídos</Text>
            </View>
          ) : (
            (pedidos as Pedido[]).map((p) => <PedidoCard key={p.pk} pedido={p} />)
          )}
        </View>
      </ScrollView>

      {/* ── Dialogs ────────────────────────────────────── */}
      <DetailsDialog
        task={detailsTask}
        visible={!!detailsTask}
        onDismiss={() => setDetailsTask(null)}
        onConcluir={() => {
          setSelectedTask(detailsTask);
          setDetailsTask(null);
        }}
      />

      <CompletionDialog
        task={selectedTask}
        visible={!!selectedTask}
        isPending={isConcluindo}
        onDismiss={() => setSelectedTask(null)}
        onSubmit={handleConcluir}
      />

      <CreateTaskDialog
        visible={createOpen}
        isPending={isCreating}
        onDismiss={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        metadata={metadata}
      />

      <RequisicaoDialog
        visible={reqOpen}
        isPending={isCreatingReq}
        onDismiss={() => setReqOpen(false)}
        onSubmit={handleReq}
        metadata={metadata}
      />

      <DescargaDialog
        visible={descOpen}
        isPending={isCreatingDesc}
        onDismiss={() => setDescOpen(false)}
        onSubmit={handleDesc}
        metadata={metadata}
      />

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackMsg}
      </Snackbar>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  scroll:     { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.md },
  errorText:  { color: COLORS.error, textAlign: 'center' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  statItem:   { flex: 1, alignItems: 'center', paddingVertical: SPACING.xs },
  statBorder: { borderLeftWidth: 1, borderLeftColor: COLORS.border },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  statLabel:  { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 6 },

  // Panel
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
    elevation: 2,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    gap: SPACING.xs,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1 },
  panelTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Panel action buttons
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 5,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  btnRow: { flexDirection: 'row', gap: SPACING.xs },
  filledBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 5,
  },
  filledBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Installation sub-header
  installGroup: { marginBottom: SPACING.xs },
  installTasks: { paddingTop: SPACING.sm },
  installHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  installDot: { width: 10, height: 10, borderRadius: 5 },
  installTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  smallBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 1,
  },
  smallBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Toggle completed
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingTop: SPACING.sm, paddingBottom: SPACING.xs,
  },
  toggleText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm,
  },
  emptyText: { color: COLORS.textDisabled, fontSize: 14, textAlign: 'center' },

  // Cards
  card: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 1, marginBottom: SPACING.xs,
    shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  cardDone:   { opacity: 0.72 },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: SPACING.sm, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  iconWrap: {
    width: 28, height: 28, borderRadius: RADIUS.xs,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  taskTitle:   { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18 },
  titleDone:   { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  resultText:  { fontSize: 11, color: COLORS.success, fontWeight: '500' },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 11, color: COLORS.textDisabled, flex: 1 },
  descText:    { fontSize: 12, color: COLORS.textSecondary },
  badge:       { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.xs },
  badgeText:   { fontSize: 10, fontWeight: '600' },

  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 36 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.xs, borderWidth: 1,
  },
  typeChipText: { fontSize: 10, fontWeight: '700' },

  cardActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  detailsBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  detailsBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  concluirBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: RADIUS.md, backgroundColor: COLORS.success,
  },
  concluirBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  detailRow:   { marginBottom: SPACING.sm },
  detailValue: { fontSize: 14, color: COLORS.textPrimary, marginTop: 2 },

  // Dialogs
  dialog:        { borderRadius: RADIUS.xl },
  dialogTitle:   { fontWeight: '700', color: COLORS.textPrimary, fontSize: 16 },
  dialogContent: { paddingVertical: SPACING.sm },
  dialogDivider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.md },
  dialogBtn:     { borderRadius: RADIUS.pill, marginLeft: SPACING.sm },
  taskDesc:      { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  taskInst:      { fontSize: 13, color: COLORS.textSecondary },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4,
    marginBottom: SPACING.xs, marginTop: SPACING.sm,
  },
  input:         { marginBottom: SPACING.sm, backgroundColor: COLORS.surface },
  inputOutline:  { borderRadius: RADIUS.md },
  radioLabel:    { color: COLORS.textPrimary },
  checkRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  checkLabel:    { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  errorMsg:      { color: COLORS.error, fontSize: 13, marginTop: SPACING.xs },
  commentLabel:  { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },

  // Annex upload (task completion)
  anexosLabel:     { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  anexosLabelBold: { fontWeight: '700', color: COLORS.textPrimary },
  uploadBox: {
    alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
    borderRadius: RADIUS.md, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primarySurface, marginBottom: SPACING.xs,
  },
  uploadBoxTitle:    { fontSize: 14, color: COLORS.primary, fontWeight: '600', textAlign: 'center' },
  uploadBoxSubtitle: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  fileErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginBottom: SPACING.xs },
  fileErrorText: { fontSize: 12, color: COLORS.error, flex: 1 },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
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

  // Create form pickers
  instTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  instChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    borderRadius: RADIUS.pill, borderWidth: 1.5,
  },
  instChipText: { fontSize: 13, fontWeight: '700' },
  charCount: { fontSize: 11, color: COLORS.textDisabled, textAlign: 'right', marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  charCountError: { color: COLORS.error },
  helperText: { fontSize: 11, color: COLORS.textDisabled, marginTop: -SPACING.xs, marginBottom: SPACING.sm },

  // Custom modal header (icon + title + close)
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  modalHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  modalHeaderDivider: { height: 1, backgroundColor: COLORS.divider },
  coordsCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.xs, marginBottom: SPACING.xs,
  },
  coordsLabel: { fontSize: 13, fontWeight: '500' },
  coordsRow: { flexDirection: 'row', marginBottom: SPACING.xs },

  snackbar: { backgroundColor: COLORS.navy },
});

export default TasksScreen;
