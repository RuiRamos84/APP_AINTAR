import React, { useMemo, useState } from 'react';
import {
  Modal, View, ScrollView, StyleSheet, TouchableOpacity,
  TextInput as RNTextInput, Linking, useWindowDimensions,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import useAuthStore from '@/features/auth/store/authStore';
import {
  useDocumentDetails, useDocumentSteps, useDocumentAnnexes,
  useAddDocumentAnnex, useDownloadDocumentFile, useDownloadComprovativo,
  PickedAnnexFile,
} from '../hooks/useDocumentDetails';
import ParametrosTab from './ParametrosTab';
import PagamentosTab from './PagamentosTab';
import EditPedidoModal from './EditPedidoModal';
import ReplicarPedidoModal from './ReplicarPedidoModal';

// ─── Status mapping (mirrors frontend-v2 documentUtils.js) ───────────────────

const STATUS_COLOR: Record<string, string> = {
  '-3': COLORS.success, '-1': COLORS.error, '0': COLORS.success, '1': COLORS.textDisabled,
  '2': COLORS.primary, '4': COLORS.primary, '5': COLORS.warning, '6': COLORS.secondary,
  '7': COLORS.info, '8': COLORS.primary, '9': COLORS.warning, '10': COLORS.secondary,
  '11': COLORS.info, '12': COLORS.primary, '13': COLORS.warning, '100': COLORS.info,
};
const DEFAULT_STATUS_NAMES: Record<string, string> = {
  '-3': 'Concluído por Replicação', '-1': 'Anulado', '0': 'Concluído', '1': 'Entrada',
  '2': 'Para Validação', '4': 'Para Tratamento', '5': 'Análise Externa', '6': 'Pedido de Elementos',
  '7': 'Emissão de Ofício', '8': 'Para Pavimentação', '9': 'Avaliação no Terreno', '10': 'Para Execução',
  '11': 'Para Orçamentação', '12': 'Para Cobrança', '13': 'Aceitação de Orçamento', '100': 'Pag. Pavimentação',
};

const getStatusLabel = (what: unknown, metaData: any): string => {
  if (what == null) return '—';
  const arr = metaData?.what;
  if (Array.isArray(arr)) {
    const found = arr.find((s: any) => s.pk === parseInt(String(what), 10));
    if (found) return found.step;
  }
  return DEFAULT_STATUS_NAMES[String(what)] || `Estado ${what}`;
};
const getStatusColor = (what: unknown): string =>
  what == null ? COLORS.textDisabled : STATUS_COLOR[String(what)] ?? COLORS.textDisabled;

const findMetaValue = (arr: any[] | undefined, key: string, value: unknown): string => {
  if (!arr || value == null) return '—';
  const found = arr.find((item) => String(item.pk) === String(value) || String(item[key]) === String(value));
  return found ? (found.name ?? found.value ?? found.username ?? found.step ?? String(value)) : String(value);
};

const fmtDateTime = (val?: string | null) => {
  if (!val) return '—';
  try {
    const normalized = val.includes(' às ') ? val.replace(' às ', 'T') : val;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return val; }
};

const getAnnexIcon = (filename: string): React.ComponentProps<typeof MaterialIcons>['name'] => {
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) return 'image';
  if (/\.pdf$/i.test(filename)) return 'picture-as-pdf';
  if (/\.(xls|xlsx)$/i.test(filename)) return 'table-chart';
  if (/\.(doc|docx)$/i.test(filename)) return 'description';
  return 'insert-drive-file';
};
const getAnnexIconColor = (filename: string): string => {
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) return COLORS.success;
  if (/\.pdf$/i.test(filename)) return COLORS.error;
  if (/\.(xls|xlsx)$/i.test(filename)) return COLORS.success;
  if (/\.(doc|docx)$/i.test(filename)) return COLORS.info;
  return COLORS.info;
};

const ANNEX_MIME_TYPES = [
  'image/*', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_ANNEX_FILES = 5;

const TABS = [
  { id: 'detalhes', label: 'Detalhes', icon: 'info' as const },
  { id: 'parametros', label: 'Parâmetros', icon: 'edit' as const },
  { id: 'historico', label: 'Histórico', icon: 'history' as const },
  { id: 'pagamentos', label: 'Pagamentos', icon: 'receipt' as const },
  { id: 'anexos', label: 'Anexos', icon: 'attach-file' as const },
];

// ─── Small presentational helpers ─────────────────────────────────────────────

const InfoRow = ({ icon, label, value }: {
  icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value?: string | number | null;
}) => (
  <View style={pdm.infoRow}>
    <MaterialIcons name={icon} size={16} color={COLORS.primary} style={{ opacity: 0.85, marginTop: 1 }} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={pdm.infoLabel}>{label}</Text>
      <Text style={pdm.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

const SectionHeader = ({ icon, title }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; title: string }) => (
  <View style={pdm.sectionHeader}>
    <View style={pdm.sectionIconWrap}>
      <MaterialIcons name={icon} size={15} color={COLORS.primary} />
    </View>
    <Text style={pdm.sectionTitle}>{title}</Text>
  </View>
);

// ─── Main Modal ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  pk: number | null;
  metaData: any;
  onClose: () => void;
}

const WIDE_BREAKPOINT = 700;

const PedidoDetailsModal = ({ visible, pk, metaData, onClose }: Props) => {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const { user, hasPermission } = useAuthStore();
  const { data: doc, isLoading: docLoading } = useDocumentDetails(visible ? pk : null);
  const { data: steps = [], isLoading: stepsLoading } = useDocumentSteps(visible ? pk : null);
  const { data: annexes = [], isLoading: annexesLoading } = useDocumentAnnexes(visible ? pk : null);
  const addAnnex = useAddDocumentAnnex();
  const downloadFile = useDownloadDocumentFile();
  const downloadComprovativo = useDownloadComprovativo();

  const [activeTab, setActiveTab] = useState('detalhes');
  const [infoOpen, setInfoOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [replicateOpen, setReplicateOpen] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<PickedAnnexFile[]>([]);
  const [picking, setPicking] = useState(false);
  const [fileError, setFileError] = useState('');

  const isAdmin = user?.profile_pk === 0;
  const effectiveIsOwner = !!doc && !!user && Number(doc.who) === Number(user.pk);
  const effectiveIsCreator = !!doc && !!user && Number(doc.creator) === Number(user.pk);
  const canEditCoords = effectiveIsOwner && hasPermission('docs.view.assigned');
  const showEditButton = isAdmin || canEditCoords;
  const canReplicate = hasPermission('docs.edit');
  const canDownloadComprovativo = effectiveIsCreator || hasPermission('docs.view.owner');

  const nuts = useMemo(
    () => [doc?.nut4, doc?.nut3, doc?.nut2, doc?.nut1].filter(Boolean).join(' › '),
    [doc]
  );

  const handleClose = () => {
    setActiveTab('detalhes');
    setInfoOpen(false);
    setPendingFiles([]);
    setFileError('');
    onClose();
  };

  const handlePickFile = async () => {
    if (pendingFiles.length >= MAX_ANNEX_FILES) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ANNEX_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled) {
        setFileError('');
        const toAdd = result.assets.slice(0, MAX_ANNEX_FILES - pendingFiles.length);
        setPendingFiles((prev) => [...prev, ...toAdd.map((a) => ({
          uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', description: '',
        }))]);
      }
    } finally {
      setPicking(false);
    }
  };

  const handleRemoveFile = (index: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  const handleDescChange = (index: number, description: string) =>
    setPendingFiles((prev) => prev.map((f, i) => (i === index ? { ...f, description } : f)));

  const handleUploadAnnexes = () => {
    if (!doc) return;
    if (pendingFiles.some((f) => !f.description.trim())) {
      setFileError('Todos os ficheiros devem ter uma descrição.');
      return;
    }
    addAnnex.mutate({ docId: doc.pk, files: pendingFiles }, {
      onSuccess: () => { setPendingFiles([]); setFileError(''); },
    });
  };

  const handleOpenAnnex = (filename: string) => {
    if (!doc?.regnumber) return;
    downloadFile.mutate({ regnumber: doc.regnumber, filename });
  };

  const handleOpenMap = () => {
    if (!doc?.glat || !doc?.glong) return;
    const url = `https://www.google.com/maps?q=${doc.glat},${doc.glong}`;
    Linking.openURL(url).catch(() => {});
  };

  const infoRowsNode = doc ? (
    <>
      <InfoRow icon="calendar-today" label="DATA DE SUBMISSÃO" value={fmtDateTime(doc.submission)} />
      {doc.exec_data ? <InfoRow icon="event-available" label="DATA DE EXECUÇÃO" value={fmtDateTime(doc.exec_data)} /> : null}
      <InfoRow icon="assignment" label="TIPO DE PEDIDO" value={doc.tt_type || 'Geral'} />
      {doc.tt_presentation ? <InfoRow icon="info" label="APRESENTAÇÃO" value={findMetaValue(metaData?.presentation, 'name', doc.tt_presentation)} /> : null}
      <InfoRow icon="business" label="ENTIDADE" value={doc.ts_entity_name || doc.ts_entity} />
      {doc.nipc ? <InfoRow icon="badge" label="NIPC" value={doc.nipc} /> : null}
      {doc.phone ? <InfoRow icon="phone" label="TELEFONE" value={doc.phone} /> : null}
    </>
  ) : null;

  const tabBarNode = (
    <View style={pdm.tabBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pdm.tabBarContent}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[pdm.tabBtn, active && pdm.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.75}
            >
              <MaterialIcons name={tab.icon} size={16} color={active ? COLORS.primary : COLORS.textDisabled} />
              <Text style={[pdm.tabLabel, active && pdm.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const tabContentNode = doc ? (
    <>
      {/* ── Detalhes ── */}
      {activeTab === 'detalhes' && (
        <>
          <View>
            <SectionHeader icon="edit-note" title="Descrição do Pedido" />
            <View style={pdm.memoBox}>
              <Text style={pdm.memoText}>{doc.memo || 'Sem descrição.'}</Text>
            </View>
          </View>

          <View>
            <SectionHeader icon="location-on" title="Localização" />
            <View style={{ flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' }}>
              <View style={[pdm.locationBox, { flex: 1, minWidth: 160 }]}>
                {doc.address ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <MaterialIcons name="location-on" size={13} color={COLORS.primary} />
                      <Text style={pdm.locationLabel}>MORADA</Text>
                    </View>
                    <Text style={pdm.locationText}>{doc.address}</Text>
                    {doc.floor ? <Text style={pdm.locationText}>Andar: {doc.floor}</Text> : null}
                    <Text style={pdm.locationSub}>
                      {doc.postal}{doc.door ? ` - ${doc.door}` : ''}{doc.nut4 ? `  ${doc.nut4}` : ''}
                    </Text>
                    {(doc.nut3 || doc.nut2 || doc.nut1) && (
                      <View style={pdm.nutChipsWrap}>
                        {doc.nut3 ? <View style={pdm.nutChip}><MaterialIcons name="location-on" size={11} color={COLORS.primary} /><Text style={pdm.nutChipText}>Freguesia: {doc.nut3}</Text></View> : null}
                        {doc.nut2 ? <View style={pdm.nutChip}><MaterialIcons name="location-on" size={11} color={COLORS.primary} /><Text style={pdm.nutChipText}>Concelho: {doc.nut2}</Text></View> : null}
                        {doc.nut1 ? <View style={pdm.nutChip}><MaterialIcons name="location-on" size={11} color={COLORS.primary} /><Text style={pdm.nutChipText}>Distrito: {doc.nut1}</Text></View> : null}
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={pdm.locationEmpty}>Morada não definida.</Text>
                )}
              </View>

              <TouchableOpacity
                style={[pdm.mapBox, { flex: 1, minWidth: 160 }]}
                onPress={handleOpenMap}
                disabled={!doc.glat || !doc.glong}
                activeOpacity={0.7}
              >
                {doc.glat && doc.glong ? (
                  <>
                    <MaterialIcons name="map" size={30} color={COLORS.info} style={{ opacity: 0.8 }} />
                    <Text style={pdm.mapCoordsText}>{doc.glat}, {doc.glong}</Text>
                    <Text style={pdm.mapHint}>Toque para abrir no mapa</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="location-off" size={30} color={COLORS.textDisabled} style={{ opacity: 0.6 }} />
                    <Text style={pdm.mapEmptyText}>Coordenadas não definidas</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <SectionHeader icon="groups" title="Responsáveis" />
            <View style={{ flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' }}>
              <View style={[pdm.respCard, { backgroundColor: COLORS.success + '0d', borderColor: COLORS.success + '33' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <MaterialIcons name="person" size={14} color={COLORS.success} />
                  <Text style={pdm.respLabel}>CRIADO POR</Text>
                </View>
                <Text style={pdm.respValue}>{findMetaValue(metaData?.who, 'username', doc.creator)}</Text>
              </View>
              <View style={[pdm.respCard, { backgroundColor: COLORS.warning + '0d', borderColor: COLORS.warning + '33' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <MaterialIcons name="person-outline" size={14} color={COLORS.warning} />
                  <Text style={pdm.respLabel}>ASSIGNADO A</Text>
                </View>
                <Text style={pdm.respValue}>{findMetaValue(metaData?.who, 'username', doc.who)}</Text>
              </View>
              <View style={[pdm.respCard, { backgroundColor: COLORS.info + '0d', borderColor: COLORS.info + '33' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <MaterialIcons name="business" size={14} color={COLORS.info} />
                  <Text style={pdm.respLabel}>ASSOCIADO</Text>
                </View>
                <Text style={pdm.respValue}>{findMetaValue(metaData?.associates, 'name', doc.ts_associate)}</Text>
              </View>
            </View>
          </View>

          {(doc.type_countyear != null || doc.type_countall != null) && (
            <View>
              <SectionHeader icon="bar-chart" title="Estatísticas" />
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                {doc.type_countyear != null && (
                  <View style={pdm.statBox}>
                    <Text style={pdm.statValue}>{doc.type_countyear}</Text>
                    <Text style={pdm.statLabel}>Pedidos Este Ano</Text>
                  </View>
                )}
                {doc.type_countall != null && (
                  <View style={pdm.statBox}>
                    <Text style={pdm.statValue}>{doc.type_countall}</Text>
                    <Text style={pdm.statLabel}>Total de Pedidos</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </>
      )}

      {/* ── Parâmetros ── */}
      {activeTab === 'parametros' && <ParametrosTab docId={doc.pk} />}

      {/* ── Histórico ── */}
      {activeTab === 'historico' && (
        stepsLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.sm }} />
        ) : steps.length === 0 ? (
          <Text style={pdm.emptyText}>Sem histórico disponível.</Text>
        ) : (
          <View>
            {steps.map((step, i) => {
              const isFirst = i === 0;
              const isLast = i === steps.length - 1;
              return (
                <View key={step.pk ?? i} style={pdm.timelineRow}>
                  <View style={pdm.timelineRail}>
                    <View style={[pdm.timelineAvatar, isFirst && pdm.timelineAvatarActive]}>
                      <MaterialIcons name={isFirst ? 'check' : 'person'} size={15} color={isFirst ? '#fff' : COLORS.textSecondary} />
                    </View>
                    {!isLast && <View style={pdm.timelineLine} />}
                  </View>
                  <View style={pdm.timelineContent}>
                    <View style={pdm.stepTopRow}>
                      <Text style={pdm.stepTitle} numberOfLines={1}>
                        {findMetaValue(metaData?.what, 'step', step.what) || step.step_label || `Passo ${steps.length - i}`}
                      </Text>
                      <Text style={pdm.stepDate}>{fmtDateTime(step.when_start)}</Text>
                    </View>
                    <View style={pdm.stepCard}>
                      <Text style={pdm.stepMemo}>{step.memo || 'Sem observações.'}</Text>
                      {step.who != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <MaterialIcons name="person" size={12} color={COLORS.textDisabled} />
                          <Text style={pdm.stepWho}>{findMetaValue(metaData?.who, 'username', step.who)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )
      )}

      {/* ── Pagamentos ── */}
      {activeTab === 'pagamentos' && <PagamentosTab docId={doc.pk} />}

      {/* ── Anexos ── */}
      {activeTab === 'anexos' && (
        <View style={{ gap: SPACING.xs }}>
          {annexesLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.sm }} />}
          {!annexesLoading && annexes.length === 0 && (
            <Text style={pdm.emptyText}>Sem anexos.</Text>
          )}
          {annexes.map((annex) => {
            const displayName = annex.descr || annex.filename;
            const iconName = getAnnexIcon(annex.filename);
            const iconColor = getAnnexIconColor(annex.filename);
            const isDownloading = downloadFile.isPending;
            return (
              <TouchableOpacity key={annex.pk} style={pdm.annexRow} onPress={() => handleOpenAnnex(annex.filename)} disabled={isDownloading}>
                <View style={[pdm.annexIconBox, { backgroundColor: `${iconColor}18` }]}>
                  <MaterialIcons name={iconName} size={18} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pdm.annexName} numberOfLines={1}>{displayName}</Text>
                  {annex.data ? <Text style={pdm.annexDate}>{annex.data}</Text> : null}
                </View>
                {isDownloading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <MaterialIcons name="download" size={16} color={COLORS.textDisabled} />}
              </TouchableOpacity>
            );
          })}

          {pendingFiles.length < MAX_ANNEX_FILES && (
            <TouchableOpacity style={[pdm.dropzone, picking && { opacity: 0.6 }]} onPress={handlePickFile} disabled={picking}>
              {picking ? <ActivityIndicator size="small" color={COLORS.primary} /> : <MaterialIcons name="cloud-upload" size={26} color={COLORS.primary} style={{ opacity: 0.7 }} />}
              <Text style={pdm.dropzoneText}>{picking ? 'A selecionar...' : 'Adicionar anexo'}</Text>
            </TouchableOpacity>
          )}
          {fileError ? <Text style={pdm.errorText}>{fileError}</Text> : null}

          {pendingFiles.map((f, i) => (
            <View key={i} style={pdm.pendingFileCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <MaterialIcons name={getAnnexIcon(f.name)} size={18} color={COLORS.primary} />
                <Text style={[pdm.annexName, { flex: 1 }]} numberOfLines={1}>{f.name}</Text>
                <TouchableOpacity onPress={() => handleRemoveFile(i)}>
                  <MaterialIcons name="close" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
              <RNTextInput
                style={[pdm.input, { marginTop: SPACING.xs }]}
                value={f.description}
                onChangeText={(v) => handleDescChange(i, v)}
                placeholder="Descrição do ficheiro (obrigatório)"
                placeholderTextColor={COLORS.textDisabled}
              />
            </View>
          ))}

          {pendingFiles.length > 0 && (
            <TouchableOpacity style={pdm.saveBtn} onPress={handleUploadAnnexes} disabled={addAnnex.isPending}>
              {addAnnex.isPending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="check" size={15} color="#fff" />}
              <Text style={pdm.saveBtnText}>{addAnnex.isPending ? 'A enviar...' : `Enviar ${pendingFiles.length} ficheiro(s)`}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  ) : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} presentationStyle="pageSheet">
      <SafeAreaView style={pdm.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={pdm.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {docLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : doc ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap' }}>
                <Text style={pdm.headerTitle}>{doc.regnumber}</Text>
                <View style={[pdm.statusChip, { backgroundColor: getStatusColor(doc.what) }]}>
                  <Text style={pdm.statusChipText}>
                    {getStatusLabel(doc.what, metaData).toUpperCase()}
                  </Text>
                </View>
                {!!doc.urgency && String(doc.urgency) !== '0' && (
                  <View style={[pdm.statusChip, { borderWidth: 1, borderColor: COLORS.error, backgroundColor: COLORS.errorSurface }]}>
                    <Text style={[pdm.statusChipText, { color: COLORS.error }]}>
                      {String(doc.urgency) === '2' ? 'Muito Urgente' : 'Urgente'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ color: COLORS.error }}>Erro ao carregar pedido</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {docLoading && !doc ? (
          <View style={pdm.center}><ActivityIndicator color={COLORS.primary} /></View>
        ) : !doc ? (
          <View style={pdm.center}>
            <MaterialIcons name="error-outline" size={40} color={COLORS.error} />
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>Não foi possível carregar o pedido.</Text>
          </View>
        ) : (
          <>
            {isWide ? (
              /* ── Wide layout (tablet/landscape): fixed left sidebar, like frontend-v2 desktop ── */
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <View style={pdm.sidebarOuter}>
                  <ScrollView style={pdm.sidebarInner} contentContainerStyle={pdm.sidebarContent} showsVerticalScrollIndicator={false}>
                    <Text style={pdm.sidebarTitle}>Informação do Pedido</Text>
                    {infoRowsNode}
                  </ScrollView>
                </View>
                <View style={{ flex: 1 }}>
                  {tabBarNode}
                  <ScrollView contentContainerStyle={pdm.content} keyboardShouldPersistTaps="handled">
                    {tabContentNode}
                  </ScrollView>
                </View>
              </View>
            ) : (
              /* ── Narrow layout (phone): collapsible info panel stacked above tabs ── */
              <>
                <TouchableOpacity style={pdm.infoToggle} onPress={() => setInfoOpen((v) => !v)} activeOpacity={0.7}>
                  <Text style={pdm.infoToggleText}>Informação do Pedido</Text>
                  <MaterialIcons name={infoOpen ? 'expand-less' : 'expand-more'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {infoOpen && (
                  <View style={pdm.infoPanel}>
                    {infoRowsNode}
                  </View>
                )}

                {tabBarNode}

                <ScrollView contentContainerStyle={pdm.content} keyboardShouldPersistTaps="handled">
                  {tabContentNode}
                </ScrollView>
              </>
            )}

            {/* Footer actions */}
            <View style={pdm.footer}>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                {canDownloadComprovativo && (
                  <TouchableOpacity
                    style={pdm.footerOutlineBtn}
                    onPress={() => downloadComprovativo.mutate(doc.pk)}
                    disabled={downloadComprovativo.isPending}
                  >
                    {downloadComprovativo.isPending
                      ? <ActivityIndicator size="small" color={COLORS.primary} />
                      : <MaterialIcons name="file-download" size={15} color={COLORS.primary} />}
                    <Text style={pdm.footerOutlineBtnText}>Comprovativo</Text>
                  </TouchableOpacity>
                )}
                {canReplicate && (
                  <TouchableOpacity style={pdm.footerOutlineBtn} onPress={() => setReplicateOpen(true)}>
                    <MaterialIcons name="file-copy" size={14} color={COLORS.primary} />
                    <Text style={pdm.footerOutlineBtnText}>Replicar</Text>
                  </TouchableOpacity>
                )}
              </View>
              {showEditButton && (
                <TouchableOpacity style={pdm.footerEditBtn} onPress={() => setEditOpen(true)}>
                  <MaterialIcons name="edit" size={14} color={COLORS.primary} />
                  <Text style={pdm.footerEditBtnText}>Editar Pedido</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </SafeAreaView>

      <EditPedidoModal
        visible={editOpen}
        document={doc ?? null}
        isAdmin={isAdmin}
        onClose={() => setEditOpen(false)}
      />
      <ReplicarPedidoModal
        visible={replicateOpen}
        document={doc ?? null}
        metaData={metaData}
        onClose={() => setReplicateOpen(false)}
        onSuccess={handleClose}
      />
    </Modal>
  );
};

const pdm = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  statusChip: {
    borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  statusChipText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },

  infoToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primarySurface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoToggleText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  infoPanel: {
    padding: SPACING.md, gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },

  sidebarOuter: {
    width: 260, flexShrink: 0,
    borderRightWidth: 1, borderRightColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  sidebarInner: {
    alignSelf: 'flex-start', width: '100%',
    backgroundColor: COLORS.surface,
  },
  sidebarContent: { padding: SPACING.md, gap: SPACING.md },
  sidebarTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },

  tabBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBarContent: { paddingHorizontal: SPACING.sm, gap: SPACING.xs },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textDisabled },
  tabLabelActive: { color: COLORS.primary },

  content: { padding: SPACING.md, gap: SPACING.lg, paddingBottom: SPACING.xxl },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1, marginBottom: SPACING.sm },
  sectionIconWrap: {
    width: 24, height: 24, borderRadius: RADIUS.xs, backgroundColor: COLORS.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },

  memoBox: {
    backgroundColor: COLORS.primarySurface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  memoText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  infoLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: 1 },

  locationBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: 2,
  },
  locationLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  locationText: { fontSize: 13, color: COLORS.textPrimary },
  locationSub: { fontSize: 12, color: COLORS.textSecondary },
  locationEmpty: { fontSize: 13, color: COLORS.textDisabled, fontStyle: 'italic' },
  nutChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: SPACING.xs },
  nutChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: COLORS.primary + '55', borderRadius: RADIUS.pill,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  nutChipText: { fontSize: 10, color: COLORS.textSecondary },

  mapBox: {
    backgroundColor: COLORS.overlay, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', gap: 4,
    minHeight: 100,
  },
  mapCoordsText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  mapHint: { fontSize: 10, color: COLORS.info },
  mapEmptyText: { fontSize: 12, color: COLORS.textDisabled, textAlign: 'center' },

  respCard: {
    flex: 1, minWidth: 120, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, borderWidth: 1,
  },
  respLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  respValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

  statBox: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.md, paddingVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  emptyText: { fontSize: 13, color: COLORS.textDisabled, fontStyle: 'italic' },

  timelineRow: { flexDirection: 'row' },
  timelineRail: { alignItems: 'center', width: 32 },
  timelineAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center',
  },
  timelineAvatarActive: { backgroundColor: COLORS.primary },
  timelineLine: { flex: 1, width: 2, minHeight: 24, backgroundColor: COLORS.border, marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: SPACING.md, paddingLeft: SPACING.sm },
  stepCard: {
    backgroundColor: COLORS.overlay, borderRadius: RADIUS.md, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 4,
  },
  stepTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
  stepTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  stepDate: { fontSize: 11, color: COLORS.textSecondary },
  stepMemo: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2 },
  stepWho: { fontSize: 11, color: COLORS.textDisabled },

  annexRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  annexIconBox: { width: 32, height: 32, borderRadius: RADIUS.xs, alignItems: 'center', justifyContent: 'center' },
  annexName: { fontSize: 13, color: COLORS.textPrimary },
  annexDate: { fontSize: 11, color: COLORS.textSecondary },

  dropzone: {
    alignItems: 'center', gap: 4,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    borderRadius: RADIUS.lg, paddingVertical: SPACING.md,
  },
  dropzoneText: { fontSize: 13, color: COLORS.textSecondary },

  pendingFileCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 8, fontSize: 13, color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  errorText: { fontSize: 12, color: COLORS.error },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  footerOutlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
  },
  footerOutlineBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  footerEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
  },
  footerEditBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});

export default PedidoDetailsModal;
