// /views/RequisicaoInternaView.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, CircularProgress } from '@mui/material';
import { useInternalContext } from '../context/InternalContext';
import { createInternalRequest } from '../../../services/InternalService';
import { notifySuccess, notifyError } from '../../../components/common/Toaster/ThemedToaster';

const RequisicaoInternaView = () => {
    const { dispatch } = useInternalContext();
    const [memo, setMemo] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        dispatch({ type: 'SET_AREA', payload: 7 }); // ID 7 para Requisição Interna
    }, [dispatch]);

    const handleSubmit = async () => {
        if (!memo) {
            notifyError('A descrição da requisição é obrigatória');
            return;
        }

        setLoading(true);
        try {
            await createInternalRequest({ pnmemo: memo }, 'requisicao_interna');
            notifySuccess('Requisição interna criada com sucesso');
            setMemo('');
        } catch (error) {
            notifyError('Erro ao criar requisição interna');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">Gestão de Requisições Internas</Typography>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Nova Requisição Interna</Typography>

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Descrição da Requisição"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            multiline
                            rows={6}
                            fullWidth
                            required
                            placeholder="Descreva detalhadamente a sua requisição..."
                            sx={{ mb: 2 }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleSubmit}
                            disabled={!memo || loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading ? 'A Processar...' : 'Criar Requisição Interna'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

export default RequisicaoInternaView;