import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Dialog, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import type { SupervisorMetaData, DirectTaskPayload, PickedAnnexFile } from '../hooks/useSupervisorData';

// Mapeamento de ações disponíveis por tipo de instalação (mirrors frontend-v2 DirectTaskForm.jsx)
const ACTIONS_BY_TYPE: Record<string, number[]> = {
  ETAR: [100, 102, 104, 105, 6],
  EE: [100, 102, 104, 105, 6],
  CAIXA: [101, 106, 102],
  REDE: [102, 101],
};

// PK fixo de "instalação genérica" para REDE e CAIXA (PKs negativos na tb_instalacao)
const FIXED_PK: Record<string, number> = { REDE: -1, CAIXA: -2 };

type InstType = '' | 'ETAR' | 'EE' | 'REDE' | 'CAIXA';

const INST_TYPES: { key: InstType; label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }[] = [
  { key: 'ETAR', label: 'ETAR', icon: 'water-drop', color: COLORS.success },
  { key: 'EE', label: 'EE', icon: 'bolt', color: COLORS.primary },
  { key: 'REDE', label: 'Rede', icon: 'account-tree', color: COLORS.warning },
  { key: 'CAIXA', label: 'Caixa', icon: 'inbox', color: COLORS.error },
];

const MAX_FILES = 5;
const todayISO = () => new Date().toISOString().split('T')[0];
const installLabel = (i?: { nome?: string; name?: string }) => i?.nome ?? i?.name ?? '';

interface Props {
  visible: boolean;
  metaData: SupervisorMetaData | undefined;
  isSubmitting: boolean;
  onDismiss: () => void;
  onSubmit: (payload: DirectTaskPayload, files: PickedAnnexFile[]) => Promise<{ pk?: number } | void>;
}

const DirectTaskDialog = ({ visible, metaData, isSubmitting, onDismiss, onSubmit }: Props) => {
  const [instType, setInstType] = useState<InstType>('');
  const [associate, setAssociate] = useState('');
  const [pkInstalacao, setPkInstalacao] = useState('');
  const [ttAccao, setTtAccao] = useState('');
  const [pkOperador, setPkOperador] = useState('');
  const [data, setData] = useState(todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [memo, setMemo] = useState('');
  const [clat, setClat] = useState('');
  const [clong, setClong] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [files, setFiles] = useState<(PickedAnnexFile & { size?: number })[]>([]);
  const [picking, setPicking] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const reset = useCallback(() => {
    setInstType(''); setAssociate(''); setPkInstalacao(''); setTtAccao('');
    setPkOperador(''); setData(todayISO()); setMemo(''); setClat(''); setClong('');
    setFiles([]); setFileError(''); setSubmitError('');
  }, []);

  const handleDismiss = () => { reset(); onDismiss(); };

  const installationList = useMemo(() => {
    if (instType === 'ETAR') return metaData?.etar ?? [];
    if (instType === 'EE') return metaData?.ee ?? [];
    return [];
  }, [instType, metaData]);

  const associateOptions = useMemo<PickerOption[]>(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    installationList.forEach(i => {
      const name = i.ts_entity;
      if (name && !seen.has(name)) { seen.add(name); names.push(name); }
    });
    return names.sort((a, b) => a.localeCompare(b, 'pt')).map(a => ({ value: a, label: a }));
  }, [installationList]);

  const filteredInstallations = useMemo<PickerOption[]>(() => {
    if (!associate) return [];
    return installationList
      .filter(i => i.ts_entity === associate)
      .map(i => ({ value: String(i.pk), label: installLabel(i) }));
  }, [installationList, associate]);

  const actionOptions = useMemo<PickerOption[]>(() => {
    if (!instType) return [];
    const allowed = ACTIONS_BY_TYPE[instType] ?? [];
    return (metaData?.operacaoaccao ?? [])
      .filter(a => allowed.includes(a.pk))
      .map(a => ({ value: String(a.pk), label: a.value ?? a.name ?? '' }));
  }, [instType, metaData]);

  const operatorOptions = useMemo<PickerOption[]>(() =>
    (metaData?.who ?? []).map(o => ({ value: String(o.pk), label: o.name })),
    [metaData]
  );

  const needsInstPicker = instType === 'ETAR' || instType === 'EE';
  const needsCoords = instType === 'REDE' || instType === 'CAIXA';
  const hasCoords = clat !== '' && clong !== '';

  const handleTypeChange = (key: InstType) => {
    setInstType(key);
    setAssociate(''); setPkInstalacao(''); setTtAccao(''); setClat(''); setClong('');
  };

  const isValid = () => {
    if (!instType || !ttAccao || !pkOperador || !data) return false;
    if (needsInstPicker && !pkInstalacao) return false;
    if (needsCoords && (!clat || !clong)) return false;
    return true;
  };

  const handleUseGps = async () => {
    setGpsLoading(true);
    setSubmitError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setSubmitError('Permissão de localização negada.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setClat(pos.coords.latitude.toFixed(6));
      setClong(pos.coords.longitude.toFixed(6));
    } catch {
      setSubmitError('Erro ao obter localização GPS.');
    } finally {
      setGpsLoading(false);
    }
  };

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

  const handleRemoveFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!isValid()) return;
    const pk_instalacao = needsInstPicker ? Number(pkInstalacao) : FIXED_PK[instType];
    setSubmitError('');
    try {
      await onSubmit({
        data,
        pk_instalacao,
        pk_operador: Number(pkOperador),
        tt_operacaoaccao: Number(ttAccao),
        memo: memo.trim() || undefined,
        ...(needsCoords && hasCoords ? { clat: parseFloat(clat), clong: parseFloat(clong) } : {}),
      }, files);
      reset();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || err?.message || 'Erro ao registar operação.');
    }
  };

  return (
    <Dialog visible={visible} onDismiss={handleDismiss} style={st.dialog}>
      <View style={st.header}>
        <Text style={st.title}>Registo Rápido de Operação</Text>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <Dialog.ScrollArea style={st.scrollArea}>
        <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
          {/* Tipo de instalação */}
          <Text style={st.label}>Tipo de instalação</Text>
          <View style={st.typeRow}>
            {INST_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[st.typeBtn, instType === t.key && { borderColor: t.color, backgroundColor: `${t.color}1A` }]}
                onPress={() => handleTypeChange(t.key)}
              >
                <MaterialIcons name={t.icon} size={16} color={instType === t.key ? t.color : COLORS.textSecondary} />
                <Text style={[st.typeBtnText, instType === t.key && { color: t.color }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Localização GPS (REDE / CAIXA) */}
          {needsCoords && (
            <View style={st.locationBox}>
              <View style={st.locationHeader}>
                <MaterialIcons name="pin-drop" size={16} color={hasCoords ? COLORS.success : COLORS.textSecondary} />
                <Text style={[st.locationTitle, hasCoords && { color: COLORS.success }]}>
                  {hasCoords ? 'Localização definida' : 'Localização obrigatória'}
                </Text>
              </View>
              <View style={st.locationRow}>
                <Button
                  mode={hasCoords ? 'outlined' : 'contained'}
                  icon="crosshairs-gps"
                  loading={gpsLoading}
                  onPress={handleUseGps}
                  disabled={gpsLoading}
                  style={{ flex: 1 }}
                  compact
                >
                  {gpsLoading ? 'A obter...' : 'Usar GPS'}
                </Button>
                {hasCoords && (
                  <TouchableOpacity onPress={() => { setClat(''); setClong(''); }} style={st.clearLocationBtn}>
                    <MaterialIcons name="close" size={16} color={COLORS.textDisabled} />
                  </TouchableOpacity>
                )}
              </View>
              {hasCoords && (
                <Text style={st.coordsText}>
                  Lat: {parseFloat(clat).toFixed(5)}  ·  Long: {parseFloat(clong).toFixed(5)}
                </Text>
              )}
            </View>
          )}

          {!!instType && (
            <>
              {needsInstPicker && (
                <>
                  <Text style={st.label}>Município *</Text>
                  <ExpandablePicker
                    placeholder="Selecionar município..."
                    value={associate}
                    options={associateOptions}
                    onSelect={(v) => { setAssociate(v); setPkInstalacao(''); setTtAccao(''); }}
                  />
                  {!!associate && (
                    <>
                      <Text style={st.label}>Instalação ({instType}) *</Text>
                      <ExpandablePicker
                        placeholder="Selecionar instalação..."
                        value={pkInstalacao}
                        options={filteredInstallations}
                        onSelect={(v) => { setPkInstalacao(v); setTtAccao(''); }}
                      />
                    </>
                  )}
                </>
              )}

              <Text style={st.label}>Ação *</Text>
              <ExpandablePicker
                placeholder="Selecionar ação..."
                value={ttAccao}
                options={actionOptions}
                onSelect={setTtAccao}
              />

              <Text style={st.label}>Data *</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
                <View pointerEvents="none">
                  <TextInput
                    value={data.split('-').reverse().join('/')}
                    mode="outlined"
                    editable={false}
                    style={st.input}
                    outlineStyle={{ borderRadius: RADIUS.md }}
                    right={<TextInput.Icon icon="calendar" color={COLORS.textSecondary} />}
                  />
                </View>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(data + 'T00:00:00')}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setData(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}

              <Text style={st.label}>Operador *</Text>
              <ExpandablePicker
                placeholder="Selecionar operador..."
                value={pkOperador}
                options={operatorOptions}
                onSelect={setPkOperador}
              />

              <Text style={st.label}>Observações (opcional)</Text>
              <TextInput
                value={memo}
                onChangeText={setMemo}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Descreva os detalhes da operação..."
                style={[st.input, { marginBottom: SPACING.md }]}
                outlineStyle={{ borderRadius: RADIUS.md }}
              />

              {/* Anexos */}
              <Text style={st.label}>Anexos (opcional, até {MAX_FILES} ficheiros)</Text>
              <TouchableOpacity
                style={[st.uploadBox, (picking || files.length >= MAX_FILES) && { opacity: 0.5 }]}
                onPress={handlePickFile}
                disabled={picking || files.length >= MAX_FILES}
              >
                {picking ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <MaterialIcons name="cloud-upload" size={24} color={COLORS.primary} />
                    <Text style={st.uploadText}>Toque para selecionar ficheiros</Text>
                    <Text style={st.uploadHint}>Imagens, PDF, Word, Excel, Vídeo (máx. 200 MB)</Text>
                  </>
                )}
              </TouchableOpacity>
              {!!fileError && <Text style={st.errorText}>{fileError}</Text>}
              {files.map((f, i) => (
                <View key={`${f.uri}-${i}`} style={st.fileRow}>
                  <MaterialIcons name="insert-drive-file" size={16} color={COLORS.primary} />
                  <Text style={st.fileName} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => handleRemoveFile(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={16} color={COLORS.textDisabled} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {!!submitError && (
            <View style={st.errorBox}>
              <MaterialIcons name="error-outline" size={16} color={COLORS.error} />
              <Text style={st.errorBoxText}>{submitError}</Text>
            </View>
          )}
        </ScrollView>
      </Dialog.ScrollArea>

      <Dialog.Actions style={st.actions}>
        <Button onPress={handleDismiss} disabled={isSubmitting} textColor={COLORS.textSecondary}>
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !isValid()}
          style={{ borderRadius: RADIUS.pill }}
        >
          {isSubmitting ? 'A registar...' : 'Registar Operação'}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const st = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl, marginHorizontal: SPACING.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  title: { fontWeight: '700', color: COLORS.textPrimary, fontSize: 16 },
  scrollArea: { maxHeight: 460, paddingHorizontal: 0 },
  content: { padding: SPACING.md },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: { backgroundColor: COLORS.surface },

  typeRow: { flexDirection: 'row', gap: SPACING.xs },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  locationBox: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.sm, gap: SPACING.xs,
  },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  clearLocationBtn: { padding: SPACING.xs },
  coordsText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },

  uploadBox: {
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg, alignItems: 'center', gap: 4, backgroundColor: COLORS.background,
  },
  uploadText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  uploadHint: { fontSize: 11, color: COLORS.textDisabled, textAlign: 'center' },
  errorText: { fontSize: 12, color: COLORS.error, marginTop: 4 },

  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, marginTop: SPACING.xs,
  },
  fileName: { flex: 1, fontSize: 12, color: COLORS.textPrimary },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs,
    backgroundColor: COLORS.errorSurface, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.md,
  },
  errorBoxText: { flex: 1, fontSize: 12, color: COLORS.error, lineHeight: 17 },

  actions: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
});

export default DirectTaskDialog;
