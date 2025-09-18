// frontend/src/features/Pavimentations/components/PavimentationList/index.js

import React, { useState } from 'react';
import {
    Paper,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Fade,
    Skeleton,
    Divider,
    IconButton,
    Collapse
} from '@mui/material';
import {
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    AttachFile as AttachIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { usePavimentations } from '../../hooks/usePavimentations';
import { usePavimentationActions } from '../../hooks/usePavimentationActions';
import { StatusUtils } from '../../constants/pavimentationTypes';
import PavimentationTable from './PavimentationTable';
import PavimentationFilters from './PavimentationFilters';
import PavimentationStats from './PavimentationStats';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';
import { addDocumentAnnex } from '../../../../services/documentService';


/**
 * Componente principal para listagem de pavimentações
 */
const PavimentationList = ({
    status,
    title,
    subtitle,
    allowActions = false,
    showExport = true,
    showStats = true,
    showFilters = true,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000,
    maxHeight,
    dense = false,
    elevation = 2,
    sx = {},
    ...otherProps
}) => {
    const theme = useTheme();

    // Estados locais
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        details: '',
        onConfirm: null,
        onCancel: null,
        actionColor: 'primary',
        allowAttachments: false,
        attachmentRequired: false,
        attachmentLabel: 'Anexar comprovativo'
    });
    const [statsExpanded, setStatsExpanded] = useState(false);

    // CORREÇÃO: Validar status ANTES dos hooks
    const statusConfig = StatusUtils.getStatusConfig(status);

    // CORREÇÃO: Hooks sempre chamados, independente do status
    const {
        data,
        paginatedData,
        groupedData,
        statistics,
        loading,
        error,
        lastFetch,
        filters,
        updateFilters,
        resetFilters,
        expandedRows,
        selectedRows,
        toggleRowExpansion,
        toggleRowSelection,
        selectAllRows,
        refresh,
        removeItem,
        hasData,
        hasFilteredData,
        isFiltered,
        totalCount,
        filteredCount
    } = usePavimentations(status, {
        autoRefresh,
        refreshInterval
    });

    const {
        executeAction,
        loading: actionLoading,
        isActionPending
    } = usePavimentationActions(
        (pavimentationId, actionId, result) => {
            notifySuccess(result.message);
            removeItem(pavimentationId);
            refresh();
        },
        (pavimentationId, actionId, error) => {
            notifyError(`Erro na ação: ${error.message}`);
        }
    );

    // CORREÇÃO: Validação após hooks
    if (!statusConfig) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                Status inválido: {status}
            </Alert>
        );
    }

    /**
     * Executar ação com confirmação e anexos
     */
    const handleActionWithConfirmation = async (pavimentationId, actionId) => {
        try {
            const actionConfig = StatusUtils.getActionConfig(actionId);
            if (!actionConfig) return;

            if (actionConfig.requiresConfirmation) {
                // Verificar se é ação de pagamento que requer anexos
                const isPaymentAction = actionId === 'pay';

                setConfirmDialog({
                    open: true,
                    title: actionConfig.confirmTitle,
                    message: actionConfig.confirmMessage,
                    details: actionConfig.confirmDetails,
                    actionColor: actionConfig.color,
                    allowAttachments: isPaymentAction,
                    attachmentRequired: false, // opcional por defeito
                    attachmentLabel: isPaymentAction ? 'Anexar comprovativo de pagamento' : 'Anexar documentos',
                    onConfirm: async (attachments = []) => {
                        setConfirmDialog(prev => ({ ...prev, open: false }));

                        try {
                            // 1. Primeiro adicionar anexos se existirem
                            if (attachments.length > 0) {
                                console.log(`📎 Adicionando ${attachments.length} anexos...`);
                                await addAttachmentsForPavimentation(pavimentationId, attachments);
                            }

                            // 2. Depois executar a ação
                            await executeAction(pavimentationId, actionId);

                        } catch (error) {
                            console.error('Erro no processo:', error);
                            notifyError(`Erro: ${error.message}`);
                        }
                    },
                    onCancel: () => {
                        setConfirmDialog(prev => ({ ...prev, open: false }));
                    }
                });
            } else {
                await executeAction(pavimentationId, actionId);
            }
        } catch (error) {
            console.error('Erro ao executar ação:', error);
        }
    };

    /**
     * Adicionar anexos para uma pavimentação
     */
    const addAttachmentsForPavimentation = async (pavimentationId, attachments) => {
        try {
            const pavimentationData = data.find(item => item.pk === pavimentationId);
            if (!pavimentationData?.regnumber) {
                throw new Error('Não foi possível obter o número de registo');
            }

            for (const attachment of attachments) {
                const formData = new FormData();
                formData.append('files', attachment.file);
                formData.append('descr', attachment.description || '');
                formData.append('tb_document', pavimentationData.pk);

                await addDocumentAnnex(formData);
                console.log(`✅ Anexo ${attachment.file.name} adicionado`);
            }

            notifySuccess(`${attachments.length} anexo(s) adicionado(s)`);

        } catch (error) {
            console.error('Erro ao adicionar anexos:', error);
            throw new Error(`Falha ao adicionar anexos: ${error.message}`);
        }
    };

    /**
     * Renderizar loading skeleton
     */
    const renderLoadingSkeleton = () => (
        <Box sx={{ p: 3 }}>
            <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="60%" height={24} sx={{ mb: 4 }} />
            {Array.from({ length: 5 }).map((_, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                    <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                </Box>
            ))}
        </Box>
    );

    /**
     * Renderizar estado vazio
     */
    const renderEmptyState = () => (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                px: 3,
                textAlign: 'center'
            }}
        >
            <statusConfig.icon
                sx={{
                    fontSize: 64,
                    color: 'text.secondary',
                    mb: 2,
                    opacity: 0.5
                }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
                {isFiltered
                    ? 'Nenhum resultado encontrado'
                    : `Nenhuma pavimentação ${statusConfig.label.toLowerCase()}`
                }
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {isFiltered
                    ? 'Tenta ajustar os filtros de pesquisa'
                    : statusConfig.description
                }
            </Typography>
        </Box>
    );

    /**
     * Renderizar cabeçalho
     */
    const renderHeader = () => (
        <Box sx={{ p: 3, pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" component="h1" gutterBottom>
                        {title || `Pavimentações ${statusConfig.pluralLabel}`}
                    </Typography>

                    {subtitle && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {subtitle}
                        </Typography>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" color="text.secondary">
                            {statusConfig.description}
                        </Typography>

                        {hasData && (
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                                {isFiltered
                                    ? `${filteredCount} de ${totalCount} registos`
                                    : `${totalCount} ${totalCount === 1 ? 'registo' : 'registos'}`
                                }
                            </Typography>
                        )}

                        {lastFetch && (
                            <Typography variant="caption" color="text.secondary">
                                Actualizado: {lastFetch.toLocaleTimeString('pt-PT')}
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {showStats && hasData && (
                        <IconButton
                            onClick={() => setStatsExpanded(!statsExpanded)}
                            size="small"
                            sx={{ mr: 1 }}
                        >
                            {statsExpanded ? <CollapseIcon /> : <ExpandIcon />}
                        </IconButton>
                    )}
                    <statusConfig.icon
                        sx={{
                            fontSize: 32,
                            color: `${statusConfig.color}.main`,
                            opacity: 0.8
                        }}
                    />
                </Box>
            </Box>

            {/* Estatísticas colapsáveis */}
            {showStats && hasData && (
                <Collapse in={statsExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 2, mb: 1 }}>
                        <PavimentationStats
                            statistics={statistics}
                            status={status}
                            compact={dense}
                            showAverages={false}
                            isFiltered={isFiltered}
                        />
                    </Box>
                </Collapse>
            )}
        </Box>
    );

    // Loading principal
    if (loading && !hasData) {
        return (
            <Paper elevation={elevation} sx={{ m: 2, ...sx }} {...otherProps}>
                {renderLoadingSkeleton()}
            </Paper>
        );
    }

    // Erro
    if (error && !hasData) {
        return (
            <Paper elevation={elevation} sx={{ m: 2, ...sx }} {...otherProps}>
                <Alert
                    severity="error"
                    sx={{ m: 3 }}
                    action={
                        <Typography
                            variant="button"
                            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={refresh}
                        >
                            Tentar novamente
                        </Typography>
                    }
                >
                    {error}
                </Alert>
            </Paper>
        );
    }

    return (
        <>
            <Paper
                elevation={elevation}
                sx={{
                    m: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight,
                    overflow: 'hidden',
                    ...sx
                }}
                {...otherProps}
            >
                {/* Cabeçalho */}
                {renderHeader()}

                {/* Divisor */}
                {(showStats && hasData) && <Divider />}

                {/* Filtros */}
                {showFilters && hasData && (
                    <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <PavimentationFilters
                            filters={filters}
                            onChange={updateFilters}
                            onReset={resetFilters}
                            showExport={showExport}
                            data={data}
                            status={status}
                            loading={loading}
                            onRefresh={refresh}
                        />
                    </Box>
                )}

                {/* Conteúdo principal */}
                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {!hasData ? (
                        renderEmptyState()
                    ) : !hasFilteredData ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                Nenhum resultado encontrado
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Tenta ajustar os filtros de pesquisa
                            </Typography>
                        </Box>
                    ) : (
                        <Fade in timeout={300}>
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <PavimentationTable
                                    data={paginatedData}
                                    groupedData={groupedData}
                                    status={status}
                                    allowActions={allowActions}
                                    onAction={handleActionWithConfirmation}
                                    actionLoading={actionLoading}
                                    isActionPending={isActionPending}
                                    filters={filters}
                                    onFiltersChange={updateFilters}
                                    expandedRows={expandedRows}
                                    selectedRows={selectedRows}
                                    onToggleExpansion={toggleRowExpansion}
                                    onToggleSelection={toggleRowSelection}
                                    onSelectAll={selectAllRows}
                                    totalCount={filteredCount}
                                    dense={dense}
                                />
                            </Box>
                        </Fade>
                    )}
                </Box>

                {/* Loading overlay */}
                {loading && hasData && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            zIndex: 1
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}
            </Paper>

            {/* Dialog de confirmação com anexos */}
            <ConfirmationDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                details={confirmDialog.details}
                confirmLabel={confirmDialog.actionColor === 'success' ? 'Marcar como Paga' : 'Executar'}
                confirmColor={confirmDialog.actionColor}
                onConfirm={confirmDialog.onConfirm}
                onCancel={confirmDialog.onCancel}
                loading={actionLoading}
                allowAttachments={confirmDialog.allowAttachments}
                attachmentRequired={confirmDialog.attachmentRequired}
                attachmentLabel={confirmDialog.attachmentLabel}
            />
        </>
    );
};

export default PavimentationList;