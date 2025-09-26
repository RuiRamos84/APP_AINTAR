import React, { Component } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Collapse,
    Alert,
    Chip,
    Stack,
    IconButton
} from '@mui/material';
import {
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandIcon,
    BugReport as BugIcon,
    Home as HomeIcon,
    Restore as RestoreIcon
} from '@mui/icons-material';

/**
 * Error Boundary aprimorado com:
 * - Recovery automático
 * - Error reporting
 * - Fallback UI elegante
 * - Debug information
 * - Sugestões inteligentes
 * - Localização PT-PT
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            retryCount: 0,
            showDetails: false,
            isRecovering: false
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }

    componentDidCatch(error, errorInfo) {
        const enhancedError = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            retryCount: this.state.retryCount,
            context: this.props.context || 'Global'
        };

        this.setState({
            error,
            errorInfo: enhancedError
        });

        // Log error para analytics
        this.logError(enhancedError);

        // Tentar recovery automático para erros conhecidos
        if (this.isRecoverableError(error)) {
            setTimeout(() => {
                this.handleAutoRecovery();
            }, 2000);
        }
    }

    logError = (errorDetails) => {
        // Log local melhorado
        console.group('🚨 Error Boundary - Sistema de Gestão');
        console.error('Detalhes do Erro:', errorDetails);
        console.error('Error ID:', this.state.errorId);
        console.error('Contexto:', this.props.context || 'Global');
        console.groupEnd();

        // Analytics tracking (se disponível)
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: errorDetails.message,
                fatal: false,
                custom_map: {
                    error_id: this.state.errorId,
                    retry_count: errorDetails.retryCount,
                    context: errorDetails.context
                }
            });
        }

        // Error reporting para produção
        if (process.env.NODE_ENV === 'production') {
            this.reportError(errorDetails);
        }
    };

    reportError = async (errorDetails) => {
        try {
            await fetch('/api/errors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...errorDetails,
                    errorId: this.state.errorId,
                    userId: localStorage.getItem('userId'),
                    sessionId: localStorage.getItem('sessionId')
                })
            });
        } catch (reportingError) {
            console.warn('Falha ao reportar erro:', reportingError);
        }
    };

    isRecoverableError = (error) => {
        const recoverablePatterns = [
            /ChunkLoadError/,
            /Loading chunk/,
            /NetworkError/,
            /fetch.*failed/i,
            /timeout/i,
            /socket.*disconnected/i,
            /Cannot read prop.*of undefined/,
            /Permission denied/i
        ];

        return recoverablePatterns.some(pattern =>
            pattern.test(error.message) || pattern.test(error.stack)
        );
    };

    handleAutoRecovery = () => {
        if (this.state.retryCount < 3) {
            this.setState({
                isRecovering: true
            });

            setTimeout(() => {
                this.handleRetry();
            }, 1000);
        }
    };

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1,
            isRecovering: false
        }));

        // Force re-render
        this.forceUpdate();
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    toggleDetails = () => {
        this.setState(prevState => ({
            showDetails: !prevState.showDetails
        }));
    };

    getErrorSeverity = () => {
        const { error } = this.state;

        if (!error) return 'low';

        // Erros críticos
        if (error.message.includes('Cannot read prop') ||
            error.message.includes('is not a function') ||
            error.message.includes('undefined')) {
            return 'high';
        }

        // Erros de rede
        if (error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('socket')) {
            return 'medium';
        }

        // Erros de permissão
        if (error.message.includes('permission') ||
            error.message.includes('unauthorized')) {
            return 'medium';
        }

        return 'low';
    };

    getSuggestions = () => {
        const { error } = this.state;
        const severity = this.getErrorSeverity();

        const suggestions = [];

        if (severity === 'high') {
            suggestions.push('Recarregar a página pode resolver o problema');
            suggestions.push('Contactar o suporte técnico se o erro persistir');
        }

        if (error?.message.includes('network') || error?.message.includes('fetch')) {
            suggestions.push('Verificar a ligação à internet');
            suggestions.push('Tentar novamente em alguns segundos');
            suggestions.push('Verificar se o servidor está disponível');
        }

        if (error?.message.includes('chunk') || error?.message.includes('loading')) {
            suggestions.push('Nova versão da aplicação pode estar disponível');
            suggestions.push('Recarregar para obter a versão mais recente');
        }

        if (error?.message.includes('permission') || error?.message.includes('unauthorized')) {
            suggestions.push('Verificar se tem as permissões necessárias');
            suggestions.push('Fazer login novamente se necessário');
        }

        if (error?.message.includes('socket')) {
            suggestions.push('Ligação em tempo real perdida');
            suggestions.push('Recarregar para restabelecer a ligação');
        }

        return suggestions;
    };

    render() {
        if (this.state.hasError) {
            const { error, errorInfo, retryCount, showDetails, isRecovering } = this.state;
            const severity = this.getErrorSeverity();
            const suggestions = this.getSuggestions();

            return (
                <Box
                    sx={{
                        p: 3,
                        minHeight: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'background.default'
                    }}
                >
                    <Card
                        sx={{
                            maxWidth: 600,
                            width: '100%',
                            boxShadow: 3,
                            bgcolor: 'background.paper'
                        }}
                    >
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <ErrorIcon
                                    sx={{
                                        fontSize: 64,
                                        color: severity === 'high' ? 'error.main' : 'warning.main',
                                        mb: 2
                                    }}
                                />

                                <Typography variant="h5" gutterBottom>
                                    Oops! Algo correu mal
                                </Typography>

                                <Typography variant="body1" color="textSecondary" paragraph>
                                    Ocorreu um erro inesperado na aplicação.
                                    {isRecovering && ' Tentando recuperar automaticamente...'}
                                </Typography>

                                <Stack direction="row" spacing={1} justifyContent="center" mb={2} flexWrap="wrap">
                                    <Chip
                                        label={`Severidade: ${severity.toUpperCase()}`}
                                        color={severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info'}
                                        size="small"
                                    />
                                    {retryCount > 0 && (
                                        <Chip
                                            label={`Tentativas: ${retryCount}`}
                                            variant="outlined"
                                            size="small"
                                        />
                                    )}
                                    {this.props.context && (
                                        <Chip
                                            label={`Contexto: ${this.props.context}`}
                                            variant="outlined"
                                            size="small"
                                        />
                                    )}
                                </Stack>
                            </Box>

                            {suggestions.length > 0 && (
                                <Alert severity="info" sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Sugestões de resolução:
                                    </Typography>
                                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                        {suggestions.map((suggestion, index) => (
                                            <li key={index}>
                                                <Typography variant="body2">
                                                    {suggestion}
                                                </Typography>
                                            </li>
                                        ))}
                                    </ul>
                                </Alert>
                            )}

                            <Stack direction="row" spacing={2} justifyContent="center" mb={3} flexWrap="wrap" gap={1}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={isRecovering ? <RestoreIcon /> : <RefreshIcon />}
                                    onClick={this.handleRetry}
                                    disabled={isRecovering}
                                >
                                    {isRecovering ? 'A recuperar...' : 'Tentar Novamente'}
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    onClick={this.handleReload}
                                >
                                    Recarregar Página
                                </Button>

                                <Button
                                    variant="text"
                                    startIcon={<HomeIcon />}
                                    onClick={this.handleGoHome}
                                >
                                    Ir para Início
                                </Button>
                            </Stack>

                            {/* Debug information */}
                            <Box sx={{ textAlign: 'center' }}>
                                <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<BugIcon />}
                                    endIcon={<ExpandIcon sx={{
                                        transform: showDetails ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 0.3s'
                                    }} />}
                                    onClick={this.toggleDetails}
                                >
                                    Detalhes Técnicos
                                </Button>

                                <Collapse in={showDetails}>
                                    <Box sx={{
                                        mt: 2,
                                        p: 2,
                                        bgcolor: 'grey.100',
                                        borderRadius: 1,
                                        textAlign: 'left'
                                    }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            ID do Erro: {this.state.errorId}
                                        </Typography>

                                        <Typography variant="body2" component="pre" sx={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontSize: '0.75rem',
                                            maxHeight: '200px',
                                            overflow: 'auto',
                                            bgcolor: 'background.paper',
                                            p: 1,
                                            borderRadius: 0.5
                                        }}>
                                            {error?.message}
                                            {'\n\n'}
                                            {error?.stack}
                                        </Typography>

                                        {process.env.NODE_ENV === 'development' && errorInfo && (
                                            <Typography variant="body2" component="pre" sx={{
                                                whiteSpace: 'pre-wrap',
                                                fontSize: '0.75rem',
                                                mt: 1,
                                                color: 'text.secondary',
                                                bgcolor: 'background.paper',
                                                p: 1,
                                                borderRadius: 0.5
                                            }}>
                                                Component Stack:
                                                {errorInfo.componentStack}
                                            </Typography>
                                        )}
                                    </Box>
                                </Collapse>
                            </Box>
                        </CardContent>
                    </Card>

                    {process.env.NODE_ENV === 'development' && (
                        <Typography
                            variant="caption"
                            sx={{ mt: 2, opacity: 0.7, textAlign: 'center' }}
                        >
                            Modo de Desenvolvimento - Detalhes adicionais no console
                        </Typography>
                    )}
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;