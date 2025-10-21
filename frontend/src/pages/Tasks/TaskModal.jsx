import React, { useMemo } from 'react';
import { Dialog, DialogContent, Box, Tab, Tabs, useTheme, useMediaQuery, Badge } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import NotesIcon from '@mui/icons-material/Notes';
import { useAuth } from '../../contexts/AuthContext';
import { useMetaData } from '../../contexts/MetaDataContext';
import { useSocket } from '../../contexts/SocketContext';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import TaskHeader from './components/TaskHeader';
import TaskDetailsTab from './components/TaskDetailsTab';
import TaskHistoryTab from './components/TaskHistoryTab';
import { useTaskModal } from './hooks/useTaskModal';
import { getTabsStyles, getContentBoxStyles } from './styles/themeHelpers';

/**
 * Painel de abas
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`task-tabpanel-${index}`}
      aria-labelledby={`task-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Keyframes para animação de pulse
 */
const pulseKeyframes = `
@keyframes pulse {
  0% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.6;
  }
}`;

/**
 * COMPONENTE PRINCIPAL - TASK MODAL REFATORADO
 * Versão modular e otimizada do modal de tarefas
 */
const TaskModal = ({ task, onClose, onRefresh }) => {
  const { user } = useAuth();
  const { metaData } = useMetaData();
  const { markTaskNotificationAsRead } = useSocket();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Hook personalizado com toda a lógica de negócio
  const {
    tabValue,
    newNote,
    taskHistory,
    isEditing,
    editedTask,
    isUpdating,
    isAddingNote,
    currentTask,
    showCloseConfirmation,
    showExitConfirmation,
    canEdit,
    canClose,
    canAddNote,
    setTabValue,
    setNewNote,
    setIsEditing,
    setEditedTask,
    setShowCloseConfirmation,
    setShowExitConfirmation,
    handleAddNote,
    handleCloseTask,
    handleUpdateTask,
    handleCancel,
    handleModalClose,
    handleConfirmExit
  } = useTaskModal(task, user, markTaskNotificationAsRead);

  // Obtém o nome do status baseado no ts_notestatus
  const getStatusName = (statusCode) => {
    if (!metaData || !metaData.task_status || !statusCode) {
      return `Status ${statusCode || '?'}`;
    }

    const statusObj = metaData.task_status.find((s) => s.pk === statusCode);
    return statusObj ? statusObj.value : `Status ${statusCode}`;
  };

  // Obtém a cor baseada no status
  const getStatusColor = (status) => {
    if (!status) return 'default';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('concluído') || statusLower.includes('concluido')) {
      return 'success';
    } else if (statusLower.includes('progresso')) {
      return 'info';
    } else if (statusLower.includes('fazer')) {
      return 'warning';
    }
    return 'default';
  };

  // Calcular número de notificações não lidas no histórico (ANTES do early return)
  const unreadHistoryCount = useMemo(() => {
    if (!taskHistory || taskHistory.length === 0 || !currentTask) return 0;

    const isOwner = currentTask.owner === user?.user_id;
    const isClient = currentTask.ts_client === user?.user_id;

    return taskHistory.filter(item => {
      if (isOwner && isClient) {
        return item?.notification_owner === 1 || item?.notification_client === 1;
      } else if (isOwner) {
        return item?.notification_owner === 1;
      } else if (isClient) {
        return item?.notification_client === 1;
      }
      return false;
    }).length;
  }, [taskHistory, currentTask, user?.user_id]);

  // Verificação de null antes de renderizar (DEPOIS de todos os hooks)
  if (!currentTask || !editedTask) return null;

  return (
    <>
      <Dialog
        open={Boolean(task)}
        onClose={() => handleModalClose(onClose)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        aria-labelledby="task-dialog-title"
        aria-describedby="task-dialog-description"
        sx={{
          '& .MuiDialog-paper': {
            maxHeight: isMobile ? '100vh' : '90vh',
            margin: isMobile ? 0 : undefined
          }
        }}
      >
        <style>{pulseKeyframes}</style>
        <DialogContent
          sx={{
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            maxHeight: isMobile ? '100vh' : '90vh',
            '&:first-of-type': {
              pt: 0
            }
          }}
        >
          {/* Cabeçalho */}
          <TaskHeader
            task={currentTask}
            isDarkMode={isDarkMode}
            theme={theme}
            getStatusName={getStatusName}
            getStatusColor={getStatusColor}
            onClose={() => handleModalClose(onClose)}
            user={user}
            hasUnreadUpdates={unreadHistoryCount > 0}
          />

          {/* Abas */}
          <Box
            sx={{
              borderBottom: 1,
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'divider'
            }}
          >
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              variant="fullWidth"
              sx={getTabsStyles(isDarkMode)}
            >
              <Tab icon={<InfoIcon />} label="Detalhes" id="task-tab-0" />
              <Tab
                icon={
                  <Badge
                    badgeContent={unreadHistoryCount}
                    color="error"
                    max={99}
                    sx={{
                      '& .MuiBadge-badge': {
                        animation: unreadHistoryCount > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                        '@keyframes pulse': {
                          '0%, 100%': { transform: 'scale(1)' },
                          '50%': { transform: 'scale(1.2)' }
                        }
                      }
                    }}
                  >
                    <NotesIcon />
                  </Badge>
                }
                label="Histórico"
                id="task-tab-1"
              />
            </Tabs>
          </Box>

          {/* Conteúdo das Abas */}
          <Box sx={getContentBoxStyles(isDarkMode, theme)}>
            {/* Aba de Detalhes */}
            <TabPanel value={tabValue} index={0}>
              <TaskDetailsTab
                task={currentTask}
                editedTask={editedTask}
                setEditedTask={setEditedTask}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                canEdit={canEdit}
                canClose={canClose}
                isUpdating={isUpdating}
                isDarkMode={isDarkMode}
                metaData={metaData}
                onUpdate={() => handleUpdateTask(onRefresh)}
                onCancel={handleCancel}
                onCloseTask={() => setShowCloseConfirmation(true)}
              />
            </TabPanel>

            {/* Aba de Histórico */}
            <TabPanel value={tabValue} index={1}>
              <TaskHistoryTab
                task={currentTask}
                taskHistory={taskHistory}
                newNote={newNote}
                setNewNote={setNewNote}
                canAddNote={canAddNote}
                isAddingNote={isAddingNote}
                isDarkMode={isDarkMode}
                theme={theme}
                onAddNote={handleAddNote}
                user={user}
              />
            </TabPanel>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Confirmação antes de encerrar tarefa */}
      <ConfirmationDialog
        open={showCloseConfirmation}
        onClose={() => setShowCloseConfirmation(false)}
        onConfirm={() => handleCloseTask(onRefresh, onClose)}
        title="Encerrar Tarefa"
        message="Tem certeza que deseja encerrar esta tarefa? Esta ação não pode ser desfeita."
        confirmText="Encerrar"
        cancelText="Cancelar"
        severity="warning"
        isDarkMode={isDarkMode}
      />

      {/* Confirmação antes de sair sem guardar */}
      <ConfirmationDialog
        open={showExitConfirmation}
        onClose={() => setShowExitConfirmation(false)}
        onConfirm={() => handleConfirmExit(onClose)}
        title="Sair sem guardar"
        message="Tem alterações não guardadas. Tem certeza que deseja sair sem guardar?"
        confirmText="Sair sem guardar"
        cancelText="Continuar a editar"
        severity="warning"
        isDarkMode={isDarkMode}
      />
    </>
  );
};

export default TaskModal;
