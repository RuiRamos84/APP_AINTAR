// frontend/src/pages/Global/components/forms/SimpleRequestForm.js

import React, { useState } from 'react';
import { Box, TextField, Button, FormControl, InputLabel, Select, MenuItem, Grid, Typography } from '@mui/material';
import { useGlobal } from '../../context/GlobalContext';
import { useMetaData } from '../../../../contexts/MetaDataContext';
import { createInternalRequest } from '../../../../services/InternalService';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';
import { REQUEST_CONFIGS } from '../../utils/constants';

const SimpleRequestForm = ({ areaId, requestType, onSuccess }) => {
    const { state } = useGlobal();
    const { metaData } = useMetaData();
    const [formData, setFormData] = useState({
        pnts_associate: '',
        pnmemo: ''
    });
    const [loading, setLoading] = useState(false);

    const config = REQUEST_CONFIGS[requestType];

    const handleSubmit = async () => {
        if (!formData.pnmemo.trim()) {
            notifyError('Descrição obrigatória');
            return;
        }

        if ((requestType?.includes('etar_') || requestType?.includes('ee_')) && !state.selectedEntity) {
            notifyError('Seleccione uma entidade');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                pnts_associate: formData.pnts_associate || null,
                pnmemo: formData.pnmemo
            };

            if (state.selectedEntity) {
                if (areaId === 1) {
                    payload.pnpk_etar = state.selectedEntity.pk;
                    payload.pnpk_ee = null;
                } else if (areaId === 2) {
                    payload.pnpk_etar = null;
                    payload.pnpk_ee = state.selectedEntity.pk;
                }
            }

            await createInternalRequest(payload, requestType);
            notifySuccess('Pedido criado');
            setFormData({ pnts_associate: '', pnmemo: '' });
            onSuccess?.();
        } catch (error) {
            notifyError('Erro ao criar pedido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {config?.title}
            </Typography>

            {state.selectedEntity && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Entidade: {state.selectedEntity.nome}
                </Typography>
            )}

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                        <InputLabel>Associado</InputLabel>
                        <Select
                            value={formData.pnts_associate}
                            onChange={(e) => setFormData(prev => ({ ...prev, pnts_associate: e.target.value }))}
                            label="Associado"
                            disabled={loading}
                        >
                            <MenuItem value="">Nenhum</MenuItem>
                            {metaData?.associates?.map(associate => (
                                <MenuItem key={associate.pk} value={associate.pk}>
                                    {associate.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <TextField
                        label="Descrição"
                        value={formData.pnmemo}
                        onChange={(e) => setFormData(prev => ({ ...prev, pnmemo: e.target.value }))}
                        multiline
                        rows={4}
                        fullWidth
                        required
                        disabled={loading}
                    />
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!formData.pnmemo.trim() || loading}
                    >
                        {loading ? 'A processar...' : 'Criar Pedido'}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SimpleRequestForm;