import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { Lock as LockIcon, ArrowBack as ArrowBackIcon, Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/**
 * Página a ser exibida quando um utilizador não tem permissão para aceder a uma rota.
 * 
 * @param {object} props
 * @param {string} [props.requiredPermission] - O nome da permissão necessária (opcional).
 */
const AccessDenied = ({ requiredPermission }) => {
    const navigate = useNavigate();

    return (
        <Container component="main" maxWidth="sm" sx={{ mt: 8 }}>
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    textAlign: 'center',
                    borderRadius: 3,
                    borderTop: '4px solid',
                    borderColor: 'error.main'
                }}
            >
                <LockIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />

                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Acesso Negado
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Você não tem as permissões necessárias para aceder a esta página.
                </Typography>

                {requiredPermission && (
                    <Box 
                        sx={{ 
                            p: 1.5, 
                            mb: 3, 
                            bgcolor: 'action.hover', 
                            borderRadius: 2,
                            border: '1px dashed',
                            borderColor: 'divider'
                        }}
                    >
                        <Typography variant="caption" color="text.secondary">
                            Permissão necessária:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {requiredPermission}
                        </Typography>
                    </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                    >
                        Voltar
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<HomeIcon />}
                        onClick={() => navigate('/')}
                    >
                        Página Inicial
                    </Button>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 4 }}>
                    Se acredita que isto é um erro, por favor, contacte o administrador do sistema.
                </Typography>
            </Paper>
        </Container>
    );
};

export default AccessDenied;