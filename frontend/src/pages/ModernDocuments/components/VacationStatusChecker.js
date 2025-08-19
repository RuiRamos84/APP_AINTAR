import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
    CircularProgress,
    Chip
} from '@mui/material';
import {
    Warning as WarningIcon,
    BeachAccess as VacationIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon
} from '@mui/icons-material';
import { checkVacationStatus } from '../../../services/documentService';

/**
 * ✅ MIGRADO: Componente melhorado para verificação de status de férias
 * Inclui funcionalidades do modelo antigo + melhorias
 */
const VacationStatusChecker = ({
    open,
    onClose,
    onConfirm,
    userId,
    userName,
    title = "Verificação de Disponibilidade"
}) => {
    const [vacationStatus, setVacationStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ✅ VERIFICAR STATUS DE FÉRIAS quando modal abrir
    useEffect(() => {
        if (open && userId) {
            checkUserVacationStatus();
        }
    }, [open, userId]);

    const checkUserVacationStatus = async () => {
        setLoading(true);
        setError(null);

        try {
            const status = await checkVacationStatus(userId);
            setVacationStatus(status);
        } catch (err) {
            console.error('Erro ao verificar status de férias:', err);
            setError('Não foi possível verificar o status de disponibilidade');
            setVacationStatus(null);
        } finally {
            setLoading(false);
        }
    };

    // Determinar estilo baseado no status
    const getStatusInfo = () => {
        if (error) {
            return {
                icon: <ErrorIcon color="error" />,
                color: 'error',
                title: 'Erro na verificação',
                message: error,
                canProceed: true,
                warning: 'Não foi possível verificar a disponibilidade. Prosseguir com cuidado.'
            };
        }

        if (vacationStatus === 1) {
            return {
                icon: <VacationIcon color="warning" />,
                color: 'warning',
                title: 'Utilizador de férias',
                message: `${userName} encontra-se actualmente de férias`,
                canProceed: true,
                warning: 'O utilizador pode não ver o pedido em tempo útil!'
            };
        }

        if (vacationStatus === 0) {
            return {
                icon: <CheckIcon color="success" />,
                color: 'success',
                title: 'Utilizador disponível',
                message: `${userName} está disponível`,
                canProceed: true,
                warning: null
            };
        }

        return null;
    };

    const statusInfo = getStatusInfo();

    const handleConfirm = () => {
        onConfirm({
            userId,
            userName,
            vacationStatus,
            hasWarning: vacationStatus === 1 || error !== null
        });
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" alignItems="center">
                    <WarningIcon sx={{ mr: 1 }} color="primary" />
                    {title}
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">

                    {loading && (
                        <Box py={3}>
                            <CircularProgress size={40} />
                            <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                                A verificar disponibilidade de {userName}...
                            </Typography>
                        </Box>
                    )}

                    {!loading && statusInfo && (
                        <>
                            <Box mb={2}>
                                {statusInfo.icon}
                            </Box>

                            <Typography variant="h6" gutterBottom>
                                {statusInfo.title}
                            </Typography>

                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                {statusInfo.message}
                            </Typography>

                            <Box mt={2} mb={2}>
                                <Chip
                                    label={userName}
                                    color={statusInfo.color}
                                    variant="outlined"
                                />
                            </Box>

                            {statusInfo.warning && (
                                <Alert
                                    severity={statusInfo.color === 'success' ? 'info' : 'warning'}
                                    sx={{ mt: 2, width: '100%' }}
                                >
                                    {statusInfo.warning}
                                </Alert>
                            )}

                            {vacationStatus === 1 && (
                                <Box mt={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Deseja prosseguir mesmo assim?
                                    </Typography>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancelar
                </Button>

                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color={statusInfo?.color === 'error' ? 'warning' : 'primary'}
                    disabled={loading}
                >
                    {vacationStatus === 1 ? 'Prosseguir Mesmo Assim' : 'Confirmar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/**
 * ✅ HOOK: useVacationChecker para facilitar uso
 * Permite verificar férias de forma simples em qualquer componente
 */
export const useVacationChecker = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [onConfirmCallback, setOnConfirmCallback] = useState(null);

    const checkUserVacation = (userId, userName, onConfirm) => {
        setCurrentUser({ userId, userName });
        setOnConfirmCallback(() => onConfirm);
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setCurrentUser(null);
        setOnConfirmCallback(null);
    };

    const VacationDialog = currentUser ? (
        <VacationStatusChecker
            open={isOpen}
            onClose={handleClose}
            onConfirm={onConfirmCallback}
            userId={currentUser.userId}
            userName={currentUser.userName}
        />
    ) : null;

    return {
        checkUserVacation,
        VacationDialog
    };
};

/**
 * ✅ COMPONENTE: VacationWarningBadge
 * Badge para mostrar status de férias inline
 */
export const VacationWarningBadge = ({ userId, userName, size = "small" }) => {
    const [vacationStatus, setVacationStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userId) {
            const checkStatus = async () => {
                setLoading(true);
                try {
                    const status = await checkVacationStatus(userId);
                    setVacationStatus(status);
                } catch (error) {
                    console.error('Erro ao verificar férias:', error);
                } finally {
                    setLoading(false);
                }
            };

            checkStatus();
        }
    }, [userId]);

    if (loading) {
        return <CircularProgress size={16} />;
    }

    if (vacationStatus === 1) {
        return (
            <Chip
                icon={<VacationIcon />}
                label="Férias"
                color="warning"
                size={size}
                variant="outlined"
                title={`${userName} está de férias`}
            />
        );
    }

    return null;
};

export default VacationStatusChecker;