// frontend/src/features/Pavimentations/components/common/ConfirmationDialog.js

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    Button,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon
} from '@mui/icons-material';

/**
 * Dialog de confirmação reutilizável para ações em pavimentações
 */
const ConfirmationDialog = ({
    open,
    title,
    message,
    details,
    severity = 'warning',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    confirmColor = 'primary',
    onConfirm,
    onCancel,
    loading = false,
    disabled = false,
    showIcon = true,
    maxWidth = 'sm',
    fullWidth = true,
    additionalContent,
    footerContent,
    ...dialogProps
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    /**
     * Obter ícone baseado na severidade
     */
    const getIcon = () => {
        const iconProps = {
            sx: {
                fontSize: 32,
                color: `${severity}.main`,
                mb: 1
            }
        };

        switch (severity) {
            case 'success':
                return <SuccessIcon {...iconProps} />;
            case 'error':
                return <ErrorIcon {...iconProps} />;
            case 'info':
                return <InfoIcon {...iconProps} />;
            case 'warning':
            default:
                return <WarningIcon {...iconProps} />;
        }
    };

    /**
     * Obter cor do botão de confirmação baseada na severidade
     */
    const getConfirmButtonColor = () => {
        if (confirmColor !== 'primary') return confirmColor;

        switch (severity) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'success':
                return 'success';
            default:
                return 'primary';
        }
    };

    /**
     * Manipular confirmação
     */
    const handleConfirm = () => {
        if (onConfirm && !loading && !disabled) {
            onConfirm();
        }
    };

    /**
     * Manipular cancelamento
     */
    const handleCancel = () => {
        if (onCancel && !loading) {
            onCancel();
        }
    };

    /**
     * Manipular teclas
     */
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !loading && !disabled) {
            handleConfirm();
        } else if (event.key === 'Escape' && !loading) {
            handleCancel();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            fullScreen={isMobile}
            onKeyDown={handleKeyDown}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 2,
                    minHeight: isMobile ? '100vh' : 'auto'
                }
            }}
            {...dialogProps}
        >
            {/* Cabeçalho */}
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexDirection: isMobile ? 'column' : 'row',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    {showIcon && getIcon()}
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="div">
                            {title}
                        </Typography>
                        <Chip
                            label={severity === 'warning' ? 'Ação Irreversível' : 'Confirmação'}
                            size="small"
                            color={severity}
                            variant="outlined"
                            sx={{ mt: 1 }}
                        />
                    </Box>
                </Box>
            </DialogTitle>

            {/* Conteúdo */}
            <DialogContent sx={{ pt: 1 }}>
                {/* Mensagem principal */}
                <DialogContentText component="div" sx={{ mb: 2 }}>
                    <Typography variant="body1" color="text.primary" paragraph>
                        {message}
                    </Typography>

                    {details && (
                        <Typography variant="body2" color="text.secondary">
                            {details}
                        </Typography>
                    )}
                </DialogContentText>

                {/* Alerta visual para ações críticas */}
                {severity === 'error' || severity === 'warning' && (
                    <Alert
                        severity={severity}
                        sx={{ mb: 2 }}
                        icon={false}
                    >
                        <Typography variant="body2">
                            {severity === 'error'
                                ? 'Esta ação pode ter consequências permanentes.'
                                : 'Esta ação não pode ser desfeita. Certifique-se antes de continuar.'
                            }
                        </Typography>
                    </Alert>
                )}

                {/* Conteúdo adicional */}
                {additionalContent && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        {additionalContent}
                    </>
                )}
            </DialogContent>

            {/* Ações */}
            <DialogActions sx={{ p: 3, pt: 1 }}>
                {/* Conteúdo do rodapé */}
                {footerContent && (
                    <Box sx={{ flex: 1, mr: 2 }}>
                        {footerContent}
                    </Box>
                )}

                {/* Botões */}
                <Box sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: isMobile ? 'column-reverse' : 'row',
                    width: isMobile ? '100%' : 'auto'
                }}>
                    <Button
                        onClick={handleCancel}
                        disabled={loading}
                        size={isMobile ? 'large' : 'medium'}
                        fullWidth={isMobile}
                        sx={{ minWidth: isMobile ? 'auto' : 100 }}
                    >
                        {cancelLabel}
                    </Button>

                    <Button
                        onClick={handleConfirm}
                        disabled={disabled || loading}
                        color={getConfirmButtonColor()}
                        variant="contained"
                        size={isMobile ? 'large' : 'medium'}
                        fullWidth={isMobile}
                        startIcon={loading && (
                            <CircularProgress size={16} color="inherit" />
                        )}
                        sx={{
                            minWidth: isMobile ? 'auto' : 120,
                            position: 'relative'
                        }}
                    >
                        {loading ? 'Processando...' : confirmLabel}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

/**
 * Hook para usar dialog de confirmação
 */
export const useConfirmationDialog = () => {
    const [dialogState, setDialogState] = React.useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        ...{}
    });

    const showConfirmation = React.useCallback((options) => {
        return new Promise((resolve) => {
            setDialogState({
                open: true,
                onConfirm: () => {
                    setDialogState(prev => ({ ...prev, open: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setDialogState(prev => ({ ...prev, open: false }));
                    resolve(false);
                },
                ...options
            });
        });
    }, []);

    const hideConfirmation = React.useCallback(() => {
        setDialogState(prev => ({ ...prev, open: false }));
    }, []);

    const ConfirmationDialogComponent = React.useCallback(() => (
        <ConfirmationDialog {...dialogState} />
    ), [dialogState]);

    return {
        showConfirmation,
        hideConfirmation,
        ConfirmationDialog: ConfirmationDialogComponent
    };
};

/**
 * Variantes pré-configuradas do dialog
 */
export const DeleteConfirmationDialog = (props) => (
    <ConfirmationDialog
        severity="error"
        confirmLabel="Excluir"
        confirmColor="error"
        {...props}
    />
);

export const SaveConfirmationDialog = (props) => (
    <ConfirmationDialog
        severity="info"
        confirmLabel="Salvar"
        confirmColor="primary"
        {...props}
    />
);

export const ActionConfirmationDialog = (props) => (
    <ConfirmationDialog
        severity="warning"
        confirmLabel="Executar"
        confirmColor="primary"
        {...props}
    />
);

export default ConfirmationDialog;