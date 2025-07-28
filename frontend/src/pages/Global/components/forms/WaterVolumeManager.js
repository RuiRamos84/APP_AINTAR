// frontend/src/pages/Global/components/forms/WaterVolumeManager.js

import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Grid, Paper, Alert, Tooltip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useGlobal } from '../../context/GlobalContext';
import { useRecords } from '../../hooks/useRecords';
import DataTable from '../common/DataTable';
import { getCurrentDateTime, formatNumber } from '../../utils/helpers';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';

const WaterVolumeManager = () => {
    const { state } = useGlobal();
    const { records, loading, addRecord } = useRecords('water_volume');
    const [formData, setFormData] = useState({
        date: getCurrentDateTime(),
        value: ''
    });

    // Processar registos com cálculos
    const processedRecords = records.map((record, index) => {
        const nextRecord = records[index + 1];
        let diasDecorridos = '-';
        let volumeConsumido = '-';

        if (nextRecord) {
            const dataActual = new Date(record.data);
            const dataAnterior = new Date(nextRecord.data);
            diasDecorridos = Math.floor((dataActual - dataAnterior) / (1000 * 60 * 60 * 24));

            const valorActual = parseFloat(record.valor) || 0;
            const valorAnterior = parseFloat(nextRecord.valor) || 0;
            volumeConsumido = Math.max(0, valorActual - valorAnterior);
        }

        return { ...record, diasDecorridos, volumeConsumido };
    });

    const columns = [
        { id: 'data', label: 'Data', field: 'data' },
        { id: 'valor', label: 'Leitura (m³)', field: 'valor' },
        {
            id: 'diasDecorridos',
            label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Dias
                    <Tooltip title="Dias decorridos desde a leitura anterior">
                        <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </Tooltip>
                </Box>
            ),
            field: 'diasDecorridos'
        },
        {
            id: 'volumeConsumido',
            label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Consumo (m³)
                    <Tooltip title="Volume consumido = Leitura actual - Leitura anterior">
                        <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </Tooltip>
                </Box>
            ),
            field: 'volumeConsumido'
        },
        { id: 'cliente', label: 'Registado por', field: 'ts_client' }
    ];

    const formatters = {
        valor: (value) => formatNumber(parseFloat(value), 3),
        volumeConsumido: (value) => value === '-' ? '-' : formatNumber(value, 3)
    };

    const validateForm = () => {
        if (!formData.date || !formData.value) {
            notifyError('Preencha todos os campos');
            return false;
        }

        const currentValue = parseFloat(formData.value);
        if (currentValue <= 0) {
            notifyError('Valor deve ser maior que zero');
            return false;
        }

        // Validar contra última leitura
        if (records.length > 0) {
            const lastValue = parseFloat(records[0].valor);
            if (currentValue < lastValue) {
                notifyError(`Leitura actual (${currentValue}m³) não pode ser inferior à última (${lastValue}m³)`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (!state.selectedEntity) {
            notifyError('Seleccione uma entidade');
            return;
        }

        const payload = {
            pnpk: state.selectedEntity.pk,
            pndate: formData.date,
            pnval: parseFloat(formData.value)
        };

        const success = await addRecord(payload);
        if (success) {
            setFormData({ date: getCurrentDateTime(), value: '' });
        }
    };

    const isFormValid = () => {
        return formData.date && formData.value && parseFloat(formData.value) > 0;
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Registo Volume Água {state.selectedEntity ? `- ${state.selectedEntity.nome}` : ''}
            </Typography>

            {/* Info última leitura */}
            {records.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Última leitura: {formatNumber(parseFloat(records[0].valor), 3)}m³
                    em {new Date(records[0].data).toLocaleDateString('pt-PT')}
                </Alert>
            )}

            {/* Formulário */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="end">
                    <Grid size={{ xs: 12, md: 5 }}>
                        <TextField
                            label="Data da Leitura"
                            type="datetime-local"
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 5 }}>
                        <TextField
                            label="Leitura do Contador (m³)"
                            type="number"
                            value={formData.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                            fullWidth
                            required
                            inputProps={{ min: '0', step: '0.001' }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            fullWidth
                            disabled={!isFormValid()}
                            sx={{ height: '56px' }}
                        >
                            Adicionar
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabela */}
            <DataTable
                title="Histórico Leituras"
                columns={columns}
                records={processedRecords}
                loading={loading}
                formatters={formatters}
            />
        </Box>
    );
};

export default WaterVolumeManager;