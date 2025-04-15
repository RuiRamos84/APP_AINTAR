import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Paper, Alert, useTheme } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';

const EmptyState = ({
    searchTerm = '',
    error = null,
    onCreateDocument,
    onRefresh,
    showCreateButton = true,
    emptyMessage,
}) => {
    const theme = useTheme();
    let icon, title, message;
    if (error) {
        icon = '/static/images/error-icon.svg';
        title = 'Erro ao carregar dados';
        message = error;
    } else if (searchTerm) {
        icon = <SearchIcon sx={{ fontSize: 60, color: theme.palette.action.disabled }} />;
        title = 'Nenhum pedido encontrado';
        message = 'Tente ajustar os filtros ou a pesquisa';
    } else {
        icon = '/static/images/empty-folder.svg';
        title = 'Nenhum pedido disponível';
        message = emptyMessage || 'Adicione um novo pedido para começar';
    }
    return (
        <Paper
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: 300,
                p: 3,
            }}
        >
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {typeof icon === 'string' ? (
                    <img
                        src={icon}
                        alt={title}
                        style={{
                            width: 80,
                            height: 80,
                            opacity: 0.7,
                            marginBottom: theme.spacing(2),
                        }}
                    />
                ) : (
                    icon
                )}
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    {title}
                </Typography>
                <Alert
                    severity={error ? 'error' : 'info'}
                    sx={{ maxWidth: 450, mb: 2 }}
                    action={
                        error && onRefresh ? (
                            <Button color="inherit" size="small" onClick={onRefresh}>
                                Tentar novamente
                            </Button>
                        ) : null
                    }
                >
                    {message}
                </Alert>
            </Box>

            {showCreateButton && !error && onCreateDocument && (
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={onCreateDocument}
                >
                    Novo Pedido
                </Button>
            )}
        </Paper>
    );
};

EmptyState.propTypes = {
    searchTerm: PropTypes.string,
    error: PropTypes.string,
    onCreateDocument: PropTypes.func,
    onRefresh: PropTypes.func,
    showCreateButton: PropTypes.bool,
    emptyMessage: PropTypes.string,
};

export default EmptyState;
