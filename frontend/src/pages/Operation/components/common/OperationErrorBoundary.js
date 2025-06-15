// frontend/src/pages/Operation/components/common/OperationErrorBoundary.js
import React from 'react';
import { Box, Typography, Button, Card, CardContent, Alert } from '@mui/material';
import { Refresh, BugReport } from '@mui/icons-material';

class OperationErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Operation Error:', error, errorInfo);

        this.setState({ errorInfo });

        if (window.captureException) {
            window.captureException(error, {
                tags: { module: 'operations' },
                extra: errorInfo
            });
        }
    }

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1
        }));
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const isNetworkError = this.state.error?.message?.includes('fetch') ||
                this.state.error?.message?.includes('network');

            return (
                <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <BugReport sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                                <Typography variant="h5" gutterBottom>
                                    Erro no Módulo de Operações
                                </Typography>
                            </Box>

                            <Alert severity="error" sx={{ mb: 3 }}>
                                {isNetworkError
                                    ? 'Erro de ligação. Verifica a tua internet.'
                                    : 'Ocorreu um erro inesperado. A equipa técnica foi notificada.'
                                }
                            </Alert>

                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Refresh />}
                                    onClick={this.handleRetry}
                                    disabled={this.state.retryCount >= 3}
                                >
                                    Tentar Novamente
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={this.handleReload}
                                >
                                    Recarregar Página
                                </Button>
                            </Box>

                            {this.state.retryCount >= 3 && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                                    Muitas tentativas. Contacta o suporte técnico.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default OperationErrorBoundary;
