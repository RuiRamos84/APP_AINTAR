import React, { useState, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, TextInput as RNTextInput, Modal,
} from 'react-native';
import {
  Text, FAB, Portal, Dialog, Button, TextInput, ActivityIndicator, Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useMyTasks, useCreatedTasks, useCreateTask, useUpdateTaskStatus,
  useUpdateTask, useCloseTask, useReopenTask,
  useTaskHistory, useAddNote, useMarkTaskRead, useWhoList, useCurrentUser,
  Task, TaskNote, TaskPriority, TaskStatus,
  PRIORITIES, STATUS_TRANSITIONS,
  getStatusMeta, getPriorityMeta,
} from '@/features/tasks/hooks/useTasks';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';

// ─── PriorityBadge ────────────────────────────────────────────────────────────
const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const meta = getPriorityMeta(priority);
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const meta = getStatusMeta(status);
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
};

// ─── TaskCard ─────────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: Task;
  showOwner?: boolean;
  currentUserPk: number | undefined;
  onPress: (t: Task) => void;
}

const TaskCard = ({ task, showOwner, currentUserPk, onPress }: TaskCardProps) => {
  const priorityMeta = getPriorityMeta(task.ts_priority);
  const hasNotif = currentUserPk != null && (
    (task.owner === currentUserPk && !!task.notification_owner) ||
    (task.ts_client === currentUserPk && !!task.notification_client)
  );

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(task)} activeOpacity={0.75}>
      <View style={[styles.cardAccent, { backgroundColor: priorityMeta.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.taskName} numberOfLines={2}>{task.name}</Text>
          {hasNotif && <View style={styles.notifDot} />}
        </View>
        <View style={styles.cardMeta}>
          <PriorityBadge priority={task.ts_priority} />
          <StatusBadge status={task.status} />
          {!!task.when_stop && (
            <View style={[styles.badge, { backgroundColor: COLORS.divider }]}>
              <Text style={[styles.badgeText, { color: COLORS.textSecondary }]}>Encerrada</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.assigneeRow}>
            <MaterialIcons name="person-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.assigneeText} numberOfLines={1}>
              {showOwner ? task.owner_name : task.ts_client_name}
            </Text>
          </View>
          {task.when_start && (
            <View style={styles.dateRow}>
              <MaterialIcons name="today" size={12} color={COLORS.textDisabled} />
              <Text style={styles.dateText}>
                {new Date(task.when_start).toLocaleDateString('pt-PT')}
              </Text>
            </View>
          )}
        </View>
        {task.memo ? <Text style={styles.memo} numberOfLines={1}>{task.memo}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

// ─── StatsBar ─────────────────────────────────────────────────────────────────
const StatsBar = ({ tasks }: { tasks: Task[] }) => {
  const total     = tasks.length;
  const pendentes = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const concluidas = tasks.filter(t => t.status === 'completed').length;

  return (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: COLORS.warning }]}>{pendentes}</Text>
        <Text style={styles.statLabel}>Pendentes</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: COLORS.success }]}>{concluidas}</Text>
        <Text style={styles.statLabel}>Concluídas</Text>
      </View>
    </View>
  );
};

// ─── FilterBar ────────────────────────────────────────────────────────────────
type StatusFilter = 'all' | TaskStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',         label: 'Todos'        },
  { value: 'pending',     label: 'Pendente'     },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'completed',   label: 'Concluída'    },
  { value: 'cancelled',   label: 'Cancelada'    },
];

const FilterBar = ({ active, onChange }: { active: StatusFilter; onChange: (f: StatusFilter) => void }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterBar}
  >
    {FILTER_OPTIONS.map(f => (
      <TouchableOpacity
        key={f.value}
        style={[styles.filterChip, active === f.value && styles.filterChipActive]}
        onPress={() => onChange(f.value)}
        activeOpacity={0.75}
      >
        <Text style={[styles.filterChipText, active === f.value && styles.filterChipTextActive]}>
          {f.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// ─── NoteItem (história) ──────────────────────────────────────────────────────
const NoteItem = ({
  note, isUnread, ownerName, clientName, isLast,
}: { note: TaskNote; isUnread: boolean; ownerName: string; clientName: string; isLast: boolean }) => {
  const dt      = new Date(note.when_submit);
  const dateStr = dt.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const author  = note.isadmin === 0 ? (clientName || 'Cliente') : (ownerName || 'Responsável');

  return (
    <View style={styles.noteItem}>
      <View style={styles.noteTimelineCol}>
        <View style={[styles.noteDot, { backgroundColor: isUnread ? COLORS.error : COLORS.primary }]} />
        {!isLast && <View style={styles.noteConnector} />}
      </View>
      <View style={[styles.noteCard, isUnread && styles.noteCardUnread]}>
        <View style={styles.noteCardHeader}>
          <Text style={styles.noteAuthor}>{author}</Text>
          {isUnread && (
            <View style={[styles.badge, { backgroundColor: COLORS.errorSurface, marginLeft: SPACING.xs }]}>
              <Text style={[styles.badgeText, { color: COLORS.error }]}>NOVO</Text>
            </View>
          )}
        </View>
        <Text style={styles.noteMemo}>{note.memo}</Text>
        <Text style={styles.noteDate}>{dateStr} · {timeStr}</Text>
      </View>
    </View>
  );
};

// ─── TaskDetailModal ──────────────────────────────────────────────────────────
interface TaskDetailModalProps {
  task: Task | null;
  visible: boolean;
  currentUserPk: number | undefined;
  currentUserProfile: number | undefined;
  onClose: () => void;
  onRefresh: () => void;
  toast: (msg: string) => void;
}

const TaskDetailModal = ({
  task, visible, currentUserPk, currentUserProfile, onClose, onRefresh, toast,
}: TaskDetailModalProps) => {
  const [activeTab,      setActiveTab]      = useState<0 | 1>(0);
  const [isEditing,      setIsEditing]      = useState(false);
  const [editName,       setEditName]       = useState('');
  const [editMemo,       setEditMemo]       = useState('');
  const [editPriority,   setEditPriority]   = useState<TaskPriority>('media');
  const [editClientPk,   setEditClientPk]   = useState('');
  const [editUserSearch, setEditUserSearch] = useState('');
  const [noteText,       setNoteText]       = useState('');
  const [confirmAction,  setConfirmAction]  = useState<'close' | 'reopen' | null>(null);

  const { data: history = [], isLoading: historyLoading, refetch: refetchHistory } =
    useTaskHistory(visible && task ? task.pk : null);

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateTaskStatus();
  const { mutate: updateTask,   isPending: isUpdatingTask }   = useUpdateTask();
  const { mutate: closeTask,    isPending: isClosing }        = useCloseTask();
  const { mutate: reopenTask,   isPending: isReopening }      = useReopenTask();
  const { mutate: addNote,      isPending: isAddingNote }     = useAddNote();
  const { mutate: markRead }                                  = useMarkTaskRead();
  const { data: users = [] }                                  = useWhoList();

  const isClosed  = !!task?.when_stop;
  const isOwner   = currentUserPk != null && task?.owner === currentUserPk;
  const isClient  = currentUserPk != null && task?.ts_client === currentUserPk;
  const isAdmin   = currentUserProfile === 0;

  const permissions = {
    canEdit:    (isOwner || isAdmin) && !isClosed,
    canClose:   (isOwner || isAdmin) && !isClosed,
    canReopen:  (isOwner || isAdmin) && isClosed,
    canAddNote: (isOwner || isClient) && !isClosed,
  };

  const hasNotification =
    (isOwner && !!task?.notification_owner) ||
    (isClient && !!task?.notification_client);

  // Marcar como lida ao abrir
  useEffect(() => {
    if (visible && task && hasNotification) markRead(task.pk);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, task?.pk]);

  // Preencher campos de edição quando tarefa muda
  useEffect(() => {
    if (task) {
      setEditName(task.name);
      setEditMemo(task.memo ?? '');
      setEditPriority(task.ts_priority);
      setEditClientPk(String(task.ts_client));
      setEditUserSearch(task.ts_client_name ?? '');
    }
  }, [task?.pk]);

  // Reset ao fechar
  useEffect(() => {
    if (!visible) {
      setActiveTab(0);
      setIsEditing(false);
      setNoteText('');
      setConfirmAction(null);
    }
  }, [visible]);

  const filteredUsers = useMemo(() => {
    if (!editUserSearch.trim()) return users.slice(0, 20);
    const q = editUserSearch.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q)).slice(0, 20);
  }, [users, editUserSearch]);

  const sortedHistory = useMemo(() =>
    [...history].sort((a, b) => new Date(b.when_submit).getTime() - new Date(a.when_submit).getTime()),
  [history]);

  const unreadNoteId = hasNotification && sortedHistory.length > 0 ? sortedHistory[0].pk : null;
  const transitions  = task ? STATUS_TRANSITIONS[task.status] : [];

  const handleStatusChange = (next: TaskStatus) => {
    if (!task) return;
    updateStatus(
      { taskPk: task.pk, status: next },
      {
        onSuccess: () => { toast('Estado atualizado.'); onRefresh(); onClose(); },
        onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao atualizar estado.'),
      }
    );
  };

  const handleSave = () => {
    if (!task || !editName.trim()) { toast('O título é obrigatório.'); return; }
    updateTask(
      {
        taskPk: task.pk,
        payload: {
          name: editName.trim(),
          memo: editMemo || undefined,
          ts_priority: editPriority,
          ts_client: Number(editClientPk) || undefined,
        },
      },
      {
        onSuccess: () => { setIsEditing(false); toast('Tarefa atualizada.'); onRefresh(); onClose(); },
        onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao guardar.'),
      }
    );
  };

  const handleClose = () => {
    if (!task) return;
    closeTask(task.pk, {
      onSuccess: () => { setConfirmAction(null); toast('Tarefa encerrada.'); onRefresh(); onClose(); },
      onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao encerrar.'),
    });
  };

  const handleReopen = () => {
    if (!task) return;
    reopenTask(task.pk, {
      onSuccess: () => { setConfirmAction(null); toast('Tarefa reaberta.'); onRefresh(); onClose(); },
      onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao reabrir.'),
    });
  };

  const handleAddNote = () => {
    if (!task || !noteText.trim()) return;
    addNote(
      { taskPk: task.pk, memo: noteText.trim() },
      {
        onSuccess: () => { setNoteText(''); toast('Nota adicionada.'); refetchHistory(); },
        onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao adicionar nota.'),
      }
    );
  };

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>

        {/* ── Header ── */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderTop}>
            <Text style={styles.modalTitle} numberOfLines={2}>{task.name}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBadges}>
            <PriorityBadge priority={task.ts_priority} />
            <StatusBadge status={task.status} />
            {isClosed && (
              <View style={[styles.badge, { backgroundColor: COLORS.divider }]}>
                <Text style={[styles.badgeText, { color: COLORS.textSecondary }]}>Encerrada</Text>
              </View>
            )}
            {hasNotification && (
              <View style={[styles.badge, { backgroundColor: COLORS.errorSurface }]}>
                <Text style={[styles.badgeText, { color: COLORS.error }]}>Nova</Text>
              </View>
            )}
          </View>
          <View style={styles.modalMeta}>
            <MaterialIcons name="today" size={13} color={COLORS.textDisabled} />
            <Text style={styles.modalMetaText}>
              {new Date(task.when_start).toLocaleDateString('pt-PT')}
            </Text>
            {isClosed && task.when_stop && (
              <>
                <MaterialIcons name="lock" size={13} color={COLORS.textDisabled} style={{ marginLeft: 8 }} />
                <Text style={styles.modalMetaText}>
                  Encerrada {new Date(task.when_stop).toLocaleDateString('pt-PT')}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.modalTabBar}>
          <TouchableOpacity
            style={[styles.modalTab, activeTab === 0 && styles.modalTabActive]}
            onPress={() => { setActiveTab(0); setIsEditing(false); }}
          >
            <MaterialIcons
              name="description"
              size={15}
              color={activeTab === 0 ? COLORS.primary : COLORS.textDisabled}
            />
            <Text style={[styles.modalTabText, activeTab === 0 && styles.modalTabTextActive]}>
              Detalhes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalTab, activeTab === 1 && styles.modalTabActive]}
            onPress={() => setActiveTab(1)}
          >
            <MaterialIcons
              name="history"
              size={15}
              color={activeTab === 1 ? COLORS.primary : COLORS.textDisabled}
            />
            <Text style={[styles.modalTabText, activeTab === 1 && styles.modalTabTextActive]}>
              Histórico
            </Text>
            {hasNotification && <View style={styles.tabNotifDot} />}
          </TouchableOpacity>
        </View>

        {/* ── Confirm overlay ── */}
        {confirmAction !== null && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <MaterialIcons
                name={confirmAction === 'close' ? 'archive' : 'replay'}
                size={36}
                color={confirmAction === 'close' ? COLORS.warning : COLORS.info}
              />
              <Text style={styles.confirmTitle}>
                {confirmAction === 'close' ? 'Encerrar tarefa?' : 'Reabrir tarefa?'}
              </Text>
              <Text style={styles.confirmMsg}>
                {confirmAction === 'close'
                  ? 'A tarefa ficará arquivada. Poderá reabri-la mais tarde se necessário.'
                  : 'A tarefa voltará a ficar ativa e editável.'}
              </Text>
              <View style={styles.confirmBtns}>
                <Button
                  mode="outlined"
                  onPress={() => setConfirmAction(null)}
                  style={styles.confirmBtnHalf}
                  textColor={COLORS.textSecondary}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  loading={isClosing || isReopening}
                  disabled={isClosing || isReopening}
                  onPress={confirmAction === 'close' ? handleClose : handleReopen}
                  buttonColor={confirmAction === 'close' ? COLORS.warning : COLORS.info}
                  style={styles.confirmBtnHalf}
                >
                  {confirmAction === 'close' ? 'Encerrar' : 'Reabrir'}
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* ── Tab content ── */}
        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Detalhes ── */}
          {activeTab === 0 && (
            <View>
              {!isEditing ? (
                <View>
                  {/* Info block */}
                  <View style={styles.infoBlock}>
                    <View style={styles.infoRow}>
                      <MaterialIcons name="person-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.infoLabel}>Atribuída a</Text>
                      <Text style={styles.infoValue}>{task.ts_client_name || '—'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <MaterialIcons name="supervisor-account" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.infoLabel}>Responsável</Text>
                      <Text style={styles.infoValue}>{task.owner_name || '—'}</Text>
                    </View>
                  </View>

                  {/* Descrição */}
                  {task.memo ? (
                    <View style={styles.descBlock}>
                      <Text style={styles.descLabel}>Descrição</Text>
                      <Text style={styles.descText}>{task.memo}</Text>
                    </View>
                  ) : (
                    <Text style={styles.noDesc}>Sem descrição.</Text>
                  )}

                  {/* Botão Editar */}
                  {permissions.canEdit && (
                    <Button
                      mode="outlined"
                      icon="pencil"
                      onPress={() => setIsEditing(true)}
                      style={styles.editBtn}
                    >
                      Editar
                    </Button>
                  )}

                  {/* Transições de estado */}
                  {transitions.length > 0 && !isClosed && (
                    <View style={styles.transitionsSection}>
                      <Text style={styles.transitionLabel}>Alterar Estado</Text>
                      <View style={styles.transitionButtons}>
                        {transitions.map(t => (
                          <Button
                            key={t.next}
                            mode="outlined"
                            loading={isUpdatingStatus}
                            disabled={isUpdatingStatus}
                            onPress={() => handleStatusChange(t.next)}
                            style={[styles.transitionBtn, { borderColor: t.color }]}
                            labelStyle={{ color: t.color, fontSize: 13, fontWeight: '600' }}
                          >
                            {t.action}
                          </Button>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                /* Modo edição */
                <View>
                  <TextInput
                    label="Título *"
                    value={editName}
                    onChangeText={setEditName}
                    mode="outlined"
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                  />

                  <Text style={styles.fieldLabel}>Prioridade *</Text>
                  <View style={styles.priorityRow}>
                    {PRIORITIES.map(p => (
                      <TouchableOpacity
                        key={p.value}
                        style={[
                          styles.priorityChip,
                          {
                            borderColor: p.color,
                            backgroundColor: editPriority === p.value ? p.bg : 'transparent',
                          },
                        ]}
                        onPress={() => setEditPriority(p.value)}
                      >
                        <Text style={[styles.priorityChipText, { color: p.color }]}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Atribuir a</Text>
                  <View style={styles.searchWrapSm}>
                    <MaterialIcons name="search" size={16} color={COLORS.textDisabled} />
                    <RNTextInput
                      style={styles.searchInputSm}
                      placeholder="Pesquisar utilizador..."
                      placeholderTextColor={COLORS.textDisabled}
                      value={editUserSearch}
                      onChangeText={setEditUserSearch}
                    />
                  </View>
                  <View style={styles.userList}>
                    {filteredUsers.map(u => (
                      <TouchableOpacity
                        key={u.pk}
                        style={[
                          styles.userItem,
                          String(u.pk) === editClientPk && styles.userItemSelected,
                        ]}
                        onPress={() => {
                          setEditClientPk(String(u.pk));
                          setEditUserSearch(u.name);
                        }}
                      >
                        <View style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>{u.name[0].toUpperCase()}</Text>
                        </View>
                        <Text
                          style={[
                            styles.userName,
                            String(u.pk) === editClientPk && styles.userNameSelected,
                          ]}
                        >
                          {u.name}
                        </Text>
                        {String(u.pk) === editClientPk && (
                          <MaterialIcons name="check" size={16} color={COLORS.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    {filteredUsers.length === 0 && (
                      <Text style={styles.noUsers}>Nenhum utilizador encontrado.</Text>
                    )}
                  </View>

                  <TextInput
                    label="Descrição (opcional)"
                    value={editMemo}
                    onChangeText={setEditMemo}
                    mode="outlined"
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    multiline
                    numberOfLines={3}
                  />

                  <View style={styles.editActions}>
                    <Button
                      mode="outlined"
                      onPress={() => setIsEditing(false)}
                      style={styles.editActionBtn}
                      textColor={COLORS.textSecondary}
                    >
                      Cancelar
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleSave}
                      loading={isUpdatingTask}
                      disabled={isUpdatingTask}
                      style={styles.editActionBtn}
                    >
                      Guardar
                    </Button>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Histórico ── */}
          {activeTab === 1 && (
            <View>
              {/* Adicionar nota */}
              {permissions.canAddNote ? (
                <View style={styles.addNoteSection}>
                  <Text style={styles.addNoteLabel}>Adicionar Nota</Text>
                  <TextInput
                    placeholder="Escreva uma nota..."
                    value={noteText}
                    onChangeText={setNoteText}
                    mode="outlined"
                    style={styles.noteInput}
                    outlineStyle={styles.inputOutline}
                    multiline
                    numberOfLines={3}
                  />
                  <Button
                    mode="contained"
                    icon="send"
                    onPress={handleAddNote}
                    loading={isAddingNote}
                    disabled={isAddingNote || !noteText.trim()}
                    style={styles.sendNoteBtn}
                  >
                    Enviar
                  </Button>
                </View>
              ) : (
                <View style={styles.noteInfoBanner}>
                  <MaterialIcons name="info-outline" size={16} color={COLORS.info} />
                  <Text style={styles.noteInfoText}>
                    {isClosed
                      ? 'Tarefa encerrada — não é possível adicionar notas.'
                      : 'Sem permissão para adicionar notas.'}
                  </Text>
                </View>
              )}

              {/* Cabeçalho histórico */}
              <View style={styles.historySectionHeader}>
                <Text style={styles.historyTitle}>Histórico de Atualizações</Text>
                {hasNotification && (
                  <View style={[styles.badge, { backgroundColor: COLORS.errorSurface }]}>
                    <Text style={[styles.badgeText, { color: COLORS.error }]}>1 nova</Text>
                  </View>
                )}
              </View>

              {/* Lista de notas */}
              {historyLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : sortedHistory.length === 0 ? (
                <Text style={styles.noHistory}>Sem histórico disponível.</Text>
              ) : (
                sortedHistory.map((note, idx) => (
                  <NoteItem
                    key={note.pk ?? idx}
                    note={note}
                    isUnread={note.pk === unreadNoteId}
                    ownerName={task.owner_name}
                    clientName={task.ts_client_name}
                    isLast={idx === sortedHistory.length - 1}
                  />
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* ── Footer: Encerrar / Reabrir ── */}
        {(permissions.canClose || permissions.canReopen) && (
          <View style={styles.modalFooter}>
            {permissions.canReopen && isClosed && (
              <Button
                mode="outlined"
                icon="replay"
                onPress={() => setConfirmAction('reopen')}
                style={styles.modalFooterBtn}
              >
                Reabrir
              </Button>
            )}
            {permissions.canClose && !isClosed && (
              <Button
                mode="contained"
                icon="archive"
                buttonColor={COLORS.warning}
                onPress={() => setConfirmAction('close')}
                style={styles.modalFooterBtn}
              >
                Encerrar
              </Button>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'mine' | 'created';

const TabBar = ({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) => (
  <View style={styles.tabBar}>
    {(['mine', 'created'] as Tab[]).map(t => (
      <TouchableOpacity
        key={t}
        style={[styles.tab, active === t && styles.tabActive]}
        onPress={() => onChange(t)}
        activeOpacity={0.75}
      >
        <Text style={[styles.tabText, active === t && styles.tabTextActive]}>
          {t === 'mine' ? 'Atribuídas a Mim' : 'Criadas por Mim'}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const TasksManagementScreen = () => {
  const currentUser = useCurrentUser();

  const [activeTab,     setActiveTab]     = useState<Tab>('mine');
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');
  const [selectedTask,  setSelectedTask]  = useState<Task | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Create dialog
  const [createVisible, setCreateVisible] = useState(false);
  const [newName,       setNewName]       = useState('');
  const [newPriority,   setNewPriority]   = useState<TaskPriority>('media');
  const [newMemo,       setNewMemo]       = useState('');
  const [newClientPk,   setNewClientPk]   = useState('');
  const [userSearch,    setUserSearch]    = useState('');

  const [snackMsg,     setSnackMsg]     = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const { data: myTasks,      isLoading: loadingMine,    refetch: refetchMine }    = useMyTasks();
  const { data: createdTasks, isLoading: loadingCreated, refetch: refetchCreated } = useCreatedTasks();
  const { data: users = [] }                                                        = useWhoList();
  const { mutate: createTask, isPending: isCreating }                               = useCreateTask();

  const isLoading = activeTab === 'mine' ? loadingMine : loadingCreated;
  const rawTasks  = activeTab === 'mine' ? (myTasks ?? []) : (createdTasks ?? []);

  const tasks = useMemo(() => {
    let list = rawTasks;
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.ts_client_name?.toLowerCase().includes(q) ||
      t.owner_name?.toLowerCase().includes(q) ||
      t.memo?.toLowerCase().includes(q)
    );
  }, [rawTasks, statusFilter, search]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users.slice(0, 20);
    const q = userSearch.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q)).slice(0, 20);
  }, [users, userSearch]);

  const toast = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const handleRefresh = () => {
    refetchMine();
    refetchCreated();
  };

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setDetailVisible(true);
  };

  const handleCreate = () => {
    if (!newName.trim()) { toast('Introduza um título.'); return; }
    if (!newClientPk)    { toast('Selecione um utilizador.'); return; }
    createTask(
      { name: newName.trim(), ts_client: Number(newClientPk), ts_priority: newPriority, memo: newMemo || undefined },
      {
        onSuccess: () => {
          setCreateVisible(false);
          setNewName(''); setNewPriority('media'); setNewMemo(''); setNewClientPk(''); setUserSearch('');
          toast('Tarefa criada com sucesso.');
        },
        onError: (e: any) => toast(e?.response?.data?.error ?? 'Erro ao criar tarefa.'),
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tabs mine/created */}
      <TabBar active={activeTab} onChange={t => { setActiveTab(t); setStatusFilter('all'); setSearch(''); }} />

      {/* Stats */}
      <StatsBar tasks={rawTasks} />

      {/* Filter chips */}
      <FilterBar active={statusFilter} onChange={setStatusFilter} />

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={20} color={COLORS.textDisabled} />
        <RNTextInput
          style={styles.searchInput}
          placeholder="Pesquisar tarefas..."
          placeholderTextColor={COLORS.textDisabled}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={COLORS.textDisabled} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => String(item.pk)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assignment" size={48} color={COLORS.textDisabled} />
              <Text style={styles.empty}>
                {search || statusFilter !== 'all' ? 'Nenhuma tarefa encontrada.' : 'Sem tarefas.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              showOwner={activeTab === 'created'}
              currentUserPk={currentUser?.pk}
              onPress={openTask}
            />
          )}
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => setCreateVisible(true)}
      />

      {/* Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        visible={detailVisible}
        currentUserPk={currentUser?.pk}
        currentUserProfile={currentUser?.profile_pk}
        onClose={() => { setDetailVisible(false); setSelectedTask(null); }}
        onRefresh={handleRefresh}
        toast={toast}
      />

      {/* ── Create dialog ── */}
      <Portal>
        <Dialog
          visible={createVisible}
          onDismiss={() => setCreateVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Nova Tarefa</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 500 }}>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <TextInput
                label="Título *"
                value={newName}
                onChangeText={setNewName}
                mode="outlined"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                maxLength={255}
              />

              <Text style={styles.fieldLabel}>Prioridade *</Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.priorityChip,
                      { borderColor: p.color, backgroundColor: newPriority === p.value ? p.bg : 'transparent' },
                    ]}
                    onPress={() => setNewPriority(p.value)}
                  >
                    <Text style={[styles.priorityChipText, { color: p.color }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Atribuir a *</Text>
              <View style={styles.searchWrapSm}>
                <MaterialIcons name="search" size={16} color={COLORS.textDisabled} />
                <RNTextInput
                  style={styles.searchInputSm}
                  placeholder="Pesquisar utilizador..."
                  placeholderTextColor={COLORS.textDisabled}
                  value={userSearch}
                  onChangeText={setUserSearch}
                />
              </View>
              <View style={styles.userList}>
                {filteredUsers.map(u => (
                  <TouchableOpacity
                    key={u.pk}
                    style={[styles.userItem, String(u.pk) === newClientPk && styles.userItemSelected]}
                    onPress={() => { setNewClientPk(String(u.pk)); setUserSearch(u.name); }}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{u.name[0].toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.userName, String(u.pk) === newClientPk && styles.userNameSelected]}>
                      {u.name}
                    </Text>
                    {String(u.pk) === newClientPk && (
                      <MaterialIcons name="check" size={16} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                {filteredUsers.length === 0 && (
                  <Text style={styles.noUsers}>Nenhum utilizador encontrado.</Text>
                )}
              </View>

              <TextInput
                label="Descrição (opcional)"
                value={newMemo}
                onChangeText={setNewMemo}
                mode="outlined"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                multiline
                numberOfLines={3}
                maxLength={5000}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setCreateVisible(false)} textColor={COLORS.textSecondary}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={isCreating}
              disabled={isCreating}
              style={styles.createBtn}
            >
              Criar Tarefa
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Main tabs ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textDisabled,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── Stats bar ──
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  // ── Filter bar ──
  filterBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── Search ──
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 6,
  },

  // ── List ──
  list: {
    padding: SPACING.md,
    paddingTop: SPACING.xs,
    gap: SPACING.sm,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: SPACING.sm,
  },
  empty: {
    color: COLORS.textDisabled,
    fontSize: 15,
  },

  // ── Task card ──
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody: {
    flex: 1,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  taskName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  notifDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
    marginTop: 5,
    flexShrink: 0,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  assigneeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textDisabled,
  },
  memo: {
    fontSize: 12,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
  },

  // ── Badges ──
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    backgroundColor: COLORS.primary,
  },

  // ── Dialog (create) ──
  dialog: { borderRadius: RADIUS.xl },
  dialogTitle: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  dialogContent: { paddingVertical: SPACING.sm },

  // ── Form fields ──
  input: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  inputOutline: { borderRadius: RADIUS.md },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  priorityChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── User picker ──
  searchWrapSm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  searchInputSm: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    paddingVertical: 4,
  },
  userList: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    maxHeight: 160,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  userItemSelected: { backgroundColor: COLORS.primarySurface },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  userName: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  userNameSelected: { fontWeight: '600', color: COLORS.primary },
  noUsers: {
    fontSize: 13,
    color: COLORS.textDisabled,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  createBtn: { borderRadius: RADIUS.pill, marginLeft: SPACING.sm },
  snackbar: { backgroundColor: COLORS.navy },

  // ── TaskDetailModal ──
  modalSafe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: RADIUS.sm,
  },
  modalBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  modalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalMetaText: {
    fontSize: 12,
    color: COLORS.textDisabled,
  },
  modalTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 5,
  },
  modalTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textDisabled,
  },
  modalTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabNotifDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginLeft: 2,
    marginBottom: 6,
  },
  modalBody: { flex: 1 },
  modalBodyContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalFooterBtn: { flex: 1, borderRadius: RADIUS.pill },

  // ── Confirm overlay ──
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,22,40,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    padding: SPACING.lg,
  },
  confirmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  confirmMsg: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    marginTop: SPACING.xs,
  },
  confirmBtnHalf: { flex: 1, borderRadius: RADIUS.pill },

  // ── Details tab ──
  infoBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    width: 90,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  descBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: SPACING.xs,
  },
  descText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  noDesc: {
    fontSize: 13,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  editBtn: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  transitionsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
    marginTop: SPACING.xs,
  },
  transitionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  transitionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  transitionBtn: { borderRadius: RADIUS.pill },

  // Edit mode
  editActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  editActionBtn: { flex: 1, borderRadius: RADIUS.pill },

  // ── History tab ──
  addNoteSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addNoteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  noteInput: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  sendNoteBtn: { borderRadius: RADIUS.pill },
  noteInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.infoSurface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  noteInfoText: {
    fontSize: 13,
    color: COLORS.info,
    flex: 1,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  noHistory: {
    fontSize: 13,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  // Note item
  noteItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  noteTimelineCol: {
    alignItems: 'center',
    width: 16,
    paddingTop: 6,
  },
  noteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  noteConnector: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.divider,
    marginTop: 3,
  },
  noteCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginBottom: 4,
  },
  noteCardUnread: {
    borderLeftColor: COLORS.error,
    backgroundColor: '#FFF8F8',
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  noteMemo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: SPACING.xs,
  },
  noteDate: {
    fontSize: 11,
    color: COLORS.textDisabled,
  },
});

export default TasksManagementScreen;
