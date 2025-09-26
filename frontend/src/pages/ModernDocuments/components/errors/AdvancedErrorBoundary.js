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
 * Error Boundary avançado com:
 * - Recovery automático
 * - Error reporting
 * - Fallback UI inteligente
 * - Debug information
 * - Performance monitoring
 */
class AdvancedErrorBoundary extends Component {
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
            retryCount: this.state.retryCount
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
        // Log local
        console.group('🚨 Advanced Error Boundary');
        console.error('Error Details:', errorDetails);
        console.groupEnd();

        // Analytics tracking
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: errorDetails.message,
                fatal: false,
                custom_map: {
                    error_id: this.state.errorId,
                    retry_count: errorDetails.retryCount
                }
            });
        }

        // Error reporting service
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
                    context: this.props.context || 'ModernDocuments'
                })
            });
        } catch (reportingError) {
            console.warn('Failed to report error:', reportingError);
        }
    };

    isRecoverableError = (error) => {
        const recoverablePatterns = [
            /ChunkLoadError/,
            /Loading chunk/,
            /NetworkError/,
            /fetch.*failed/i,
            /timeout/i
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

        // Critical errors
        if (error.message.includes('Cannot read property') ||
            error.message.includes('is not a function')) {
            return 'high';
        }

        // Network errors
        if (error.message.includes('fetch') ||
            error.message.includes('network')) {
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
            suggestions.push('Contactar o suporte se o erro persistir');
        }

        if (error?.message.includes('network') || error?.message.includes('fetch')) {
            suggestions.push('Verificar ligação à internet');
            suggestions.push('Tentar novamente em alguns segundos');
        }

        if (error?.message.includes('chunk')) {
            suggestions.push('Nova versão da aplicação disponível');
            suggestions.push('Recarregar para obter a versão mais recente');
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
                        justifyContent: 'center'
                    }}
                >
                    <Card
                        sx={{
                            maxWidth: 600,
                            width: '100%',
                            boxShadow: 3
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

                                <Stack direction="row" spacing={1} justifyContent="center" mb={2}>
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
                                </Stack>
                            </Box>

                            {suggestions.length > 0 && (
                                <Alert severity="info" sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Sugestões:
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

                            <Stack direction="row" spacing={2} justifyContent="center" mb={3}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={isRecovering ? <RestoreIcon /> : <RefreshIcon />}
                                    onClick={this.handleRetry}
                                    disabled={isRecovering}
                                >
                                    {isRecovering ? 'Recuperando...' : 'Tentar Novamente'}
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
                                            Error ID: {this.state.errorId}
                                        </Typography>

                                        <Typography variant="body2" component="pre" sx={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontSize: '0.75rem',
                                            maxHeight: '200px',
                                            overflow: 'auto'
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
                                                color: 'text.secondary'
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
                            sx={{ mt: 2, opacity: 0.7 }}
                        >
                            Development Mode - Detalhes adicionais disponíveis no console
                        </Typography>
                    )}
                </Box>
            );
        }

        return this.props.children;
    }
}

export default AdvancedErrorBoundary;