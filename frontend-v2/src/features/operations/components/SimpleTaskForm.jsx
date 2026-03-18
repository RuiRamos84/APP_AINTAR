import React, { useState } from 'react';
import {
    Box, Stack, TextField, FormControl, InputLabel, Select, MenuItem,
    Grid, Button, CircularProgress, Alert, Typography
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchMetaData } from '@/services/metadataService';

const getMeta = (raw) => raw?.data ?? raw ?? {};

const EMPTY_FORM = {
    data: new Date().toISOString().split('T')[0],
    descr: '',
    tb_instalacao: '',
    tt_operacaoaccao: '',
    tt_operacaomodo: 1, // Normal
    ts_operador1: '',
    ts_operador2: '',
};

const SimpleTaskForm = ({ onSubmit, onCancel, initialData = null }) => {
    const [formData, setFormData] = useState(initialData || EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const { data: rawMetaData, isLoading: metaLoading } = useQuery({
        queryKey: ['metadata'],
        queryFn: fetchMetaData,
        staleTime: 1000 * 60 * 60,
    });
    const metaData = getMeta(rawMetaData);

    const handleChange = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.tb_instalacao || !formData.tt_operacaoaccao || !formData.ts_operador1 || !formData.data) {
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                tb_instalacao: parseInt(formData.tb_instalacao, 10),
                tt_operacaoaccao: parseInt(formData.tt_operacaoaccao, 10),
                tt_operacaomodo: parseInt(formData.tt_operacaomodo, 10),
                ts_operador1: parseInt(formData.ts_operador1, 10),
                ts_operador2: formData.ts_operador2 ? parseInt(formData.ts_operador2, 10) : undefined,
            };
            await onSubmit(payload);
        } catch (error) {
            console.error('Error submitting direct task:', error);
        } finally {
            setSaving(false);
        }
    };

    if (metaLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    // Chaves corretas conforme meta_data_service.py
    const etarList  = metaData?.etar || [];
    const eeList    = metaData?.ee || [];
    // Combinar ETAR e EE numa lista unificada de instalações
    const installations = [
        ...etarList.map(i => ({ pk: i.pk, name: i.nome, type: 'ETAR' })),
        ...eeList.map(i => ({ pk: i.pk, name: i.nome, type: 'EE' })),
    ];
    const actions = metaData?.operacaoaccao || [];
    const modes = metaData?.operacamodo || [];     // nota: chave é 'operacamodo' (sem 'o')
    const operators = metaData?.who || [];         // vst_document_step$who

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
            <Stack spacing={3}>
                <Typography variant="subtitle2" color="text.secondary">
                    Inserir registo de operação ad-hoc (execução real direta)
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Data"
                            type="date"
                            fullWidth
                            required
                            value={formData.data}
                            onChange={handleChange('data')}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required>
                            <InputLabel>Instalação</InputLabel>
                            <Select
                                value={formData.tb_instalacao}
                                onChange={handleChange('tb_instalacao')}
                                label="Instalação"
                            >
                                {installations.map(i => (
                                    <MenuItem key={i.pk} value={i.pk}>
                                        [{i.type}] {i.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={12}>
                        <FormControl fullWidth required>
                            <InputLabel>Ação</InputLabel>
                            <Select
                                value={formData.tt_operacaoaccao}
                                onChange={handleChange('tt_operacaoaccao')}
                                label="Ação"
                            >
                                {actions.map(a => (
                                    <MenuItem key={a.pk} value={a.pk}>
                                        {a.value || a.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                            <InputLabel>Modo</InputLabel>
                            <Select
                                value={formData.tt_operacaomodo}
                                onChange={handleChange('tt_operacaomodo')}
                                label="Modo"
                            >
                                {modes.map(m => (
                                    <MenuItem key={m.pk} value={m.pk}>
                                        {m.value}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required>
                            <InputLabel>Operador 1</InputLabel>
                            <Select
                                value={formData.ts_operador1}
                                onChange={handleChange('ts_operador1')}
                                label="Operador 1"
                            >
                                {operators.map(o => (
                                    <MenuItem key={o.pk} value={o.pk}>
                                        {o.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                            <InputLabel>Operador 2 (Opcional)</InputLabel>
                            <Select
                                value={formData.ts_operador2}
                                onChange={handleChange('ts_operador2')}
                                label="Operador 2 (Opcional)"
                            >
                                <MenuItem value=""><em>Nenhum</em></MenuItem>
                                {operators.filter(o => o.pk !== parseInt(formData.ts_operador1)).map(o => (
                                    <MenuItem key={o.pk} value={o.pk}>
                                        {o.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={12}>
                        <TextField
                            label="Descrição / Observações"
                            fullWidth
                            multiline
                            rows={3}
                            value={formData.descr}
                            onChange={handleChange('descr')}
                        />
                    </Grid>
                </Grid>

                <Box display="flex" justifyContent="flex-end" gap={2} sx={{ mt: 2 }}>
                    <Button onClick={onCancel} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={saving || !formData.tb_instalacao || !formData.tt_operacaoaccao || !formData.ts_operador1}
                        startIcon={saving ? <CircularProgress size={16} /> : null}
                    >
                        {saving ? 'A gravar...' : 'Inserir Registo'}
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
};

export default SimpleTaskForm;
