import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    AlertTitle,
    Stack,
    Chip,
    useMediaQuery,
    useTheme
} from '@mui/material';
import {
    Refresh,
    Clear,
    ErrorOutline,
    Warning,
    Info
} from '@mui/icons-material';
import MESSAGES from '../../constants/messages';

/**
 * COMPONENTE DE ERRO UNIFICADO
 *
 * ✅ Otimizado para mobile
 * ✅ Responsivo e acessível
 * ✅ Textos em PT-PT
 */
const ErrorContainer = ({
    error,
    message,
    onRetry,
    onClear,
    variant = 'card',
    severity = 'error',
    fullHeight = true,
    showDetails = false,
    inline = false
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    // Determinar tipo de erro e mensagem apropriada
    const getErrorInfo = (error, customMessage) => {
        // Se foi passada uma mensagem customizada, usar essa
        if (customMessage) {
            return {
                title: MESSAGES.ERROR.DEFAULT,
                message: customMessage,
                type: 'custom'
            };
        }

        if (typeof error === 'string') {
            return {
                title: MESSAGES.ERROR.DEFAULT,
                message: error,
                type: 'generic'
            };
        }

        if (error?.response?.status) {
            const status = error.response.status;
            switch (status) {
                case 401:
                    return {
                        title: 'Não Autorizado',
                        message: MESSAGES.ERROR.UNAUTHORIZED,
                        type: 'auth'
                    };
                case 403:
                    return {
                        title: 'Acesso Negado',
                        message: MESSAGES.ERROR.UNAUTHORIZED,
                        type: 'permission'
                    };
                case 404:
                    return {
                        title: 'Não Encontrado',
                        message: MESSAGES.ERROR.NOT_FOUND,
                        type: 'notfound'
                    };
                case 500:
                    return {
                        title: 'Erro do Servidor',
                        message: MESSAGES.ERROR.GENERIC,
                        type: 'server'
                    };
                default:
                    return {
                        title: `Erro ${status}`,
                        message: error.response.data?.message || MESSAGES.ERROR.GENERIC,
                        type: 'http'
                    };
            }
        }

        if (error?.message) {
            return {
                title: MESSAGES.ERROR.DEFAULT,
                message: error.message,
                type: 'generic'
            };
        }

        return {
            title: 'Erro Desconhecido',
            message: MESSAGES.ERROR.GENERIC,
            type: 'unknown'
        };
    };

    const errorInfo = getErrorInfo(error, message);

    const getIcon = () => {
        switch (severity) {
            case 'warning':
                return <Warning />;
            case 'info':
                return <Info />;
            default:
                return <ErrorOutline />;
        }
    };

    const containerStyles = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(fullHeight && { height: '100vh' }),
        ...(inline && { height: 'auto', py: isMobile ? 1.5 : 2 }),
        px: isMobile ? 2 : 0
    };

    if (variant === 'alert' || inline) {
        return (
            <Box sx={containerStyles}>
                <Alert
                    severity={severity}
                    icon={getIcon()}
                    sx={{ maxWidth: 600, width: '100%' }}
                    role="alert"
                    aria-live="polite"
                    aria-label={MESSAGES.ARIA.ERROR}
                    action={
                        !isMobile && (
                            <Stack direction="row" spacing={1}>
                                {onClear && (
                                    <Button
                                        size="small"
                                        startIcon={<Clear />}
                                        onClick={onClear}
                                        aria-label={MESSAGES.UI.CLEAR}
                                    >
                                        {MESSAGES.UI.CLEAR}
                                    </Button>
                                )}
                                {onRetry && (
                                    <Button
                                        size="small"
                                        startIcon={<Refresh />}
                                        onClick={onRetry}
                                        variant="contained"
                                        color={severity}
                                        aria-label={MESSAGES.ACTIONS.RETRY}
                                    >
                                        {MESSAGES.ACTIONS.RETRY}
                                    </Button>
                                )}
                            </Stack>
                        )
                    }
                >
                    <AlertTitle>{errorInfo.title}</AlertTitle>
                    {errorInfo.message}

                    {/* Botões mobile - abaixo do conteúdo */}
                    {isMobile && (onRetry || onClear) && (
                        <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
                            {onClear && (
                                <Button
                                    size="small"
                                    startIcon={<Clear />}
                                    onClick={onClear}
                                    aria-label={MESSAGES.UI.CLEAR}
                                >
                                    {MESSAGES.UI.CLEAR}
                                </Button>
                            )}
                            {onRetry && (
                                <Button
                                    size="small"
                                    startIcon={<Refresh />}
                                    onClick={onRetry}
                                    variant="contained"
                                    color={severity}
                                    aria-label={MESSAGES.ACTIONS.RETRY}
                                >
                                    {MESSAGES.ACTIONS.RETRY}
                                </Button>
                            )}
                        </Stack>
                    )}

                    {showDetails && error?.stack && (
                        <Box sx={{ mt: 2 }}>
                            <Chip
                                label={`Tipo: ${errorInfo.type}`}
                                size="small"
                                variant="outlined"
                            />
                            <Typography
                                variant="caption"
                                component="pre"
                                sx={{
                                    display: 'block',
                                    mt: 1,
                                    p: 1,
                                    bgcolor: 'grey.100',
                                    borderRadius: 1,
                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                    overflow: 'auto',
                                    maxHeight: isMobile ? 150 : 200
                                }}
                            >
                                {error.stack}
                            </Typography>
                        </Box>
                    )}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={containerStyles}>
            <Card
                elevation={isMobile ? 1 : 3}
                sx={{
                    maxWidth: isMobile ? '95%' : 500,
                    width: '100%',
                    textAlign: 'center'
                }}
            >
                <CardContent sx={{ py: isMobile ? 3 : 4, px: isMobile ? 2 : 3 }}>
                    <Box
                        sx={{
                            color: theme => theme.palette[severity].main,
                            mb: 2
                        }}
                        role="img"
                        aria-label={`Ícone de ${severity}`}
                    >
                        {React.cloneElement(getIcon(), { sx: { fontSize: isMobile ? 48 : 60 } })}
                    </Box>

                    <Typography
                        variant={isMobile ? 'h6' : 'h5'}
                        gutterBottom
                        sx={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
                    >
                        {errorInfo.title}
                    </Typography>

                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                            mb: 3,
                            fontSize: isMobile ? '0.9rem' : '1rem'
                        }}
                    >
                        {errorInfo.message}
                    </Typography>

                    <Stack
                        direction={isMobile ? 'column' : 'row'}
                        spacing={isMobile ? 1.5 : 2}
                        justifyContent="center"
                        alignItems="stretch"
                    >
                        {onRetry && (
                            <Button
                                variant="contained"
                                startIcon={<Refresh />}
                                onClick={onRetry}
                                size={isMobile ? 'medium' : 'large'}
                                fullWidth={isMobile}
                                aria-label={MESSAGES.ACTIONS.RETRY}
                            >
                                {MESSAGES.ACTIONS.RETRY}
                            </Button>
                        )}

                        {onClear && (
                            <Button
                                variant="outlined"
                                startIcon={<Clear />}
                                onClick={onClear}
                                size={isMobile ? 'medium' : 'large'}
                                fullWidth={isMobile}
                                aria-label="Limpar Erro"
                            >
                                Limpar Erro
                            </Button>
                        )}
                    </Stack>

                    {showDetails && (
                        <Box sx={{ mt: 3, textAlign: 'left' }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Detalhes Técnicos:
                            </Typography>
                            <Chip
                                label={`Tipo: ${errorInfo.type}`}
                                size="small"
                                variant="outlined"
                                sx={{ mb: 1 }}
                            />
                            {error?.stack && (
                                <Typography
                                    variant="caption"
                                    component="pre"
                                    sx={{
                                        display: 'block',
                                        p: 2,
                                        bgcolor: 'grey.50',
                                        borderRadius: 1,
                                        fontSize: '0.75rem',
                                        overflow: 'auto',
                                        maxHeight: 150,
                                        border: '1px solid',
                                        borderColor: 'grey.200'
                                    }}
                                >
                                    {error.stack}
                                </Typography>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default ErrorContainer;