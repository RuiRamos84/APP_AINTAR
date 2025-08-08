import React, { useEffect } from "react";
import { Box, Typography, Paper, Button, TextField, Grid } from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import GenericTable from "./GenericTable";
import { useRecords } from "../hooks/useRecords";
import { formatDate } from "../utils/recordsFormatter";
import { getCurrentDateTime } from "../../../utils/dataUtils";
import { notifyError } from "../../../components/common/Toaster/ThemedToaster";

const waterVolumeColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "valor", label: "Leitura (m³)", field: "valor" },
    { id: "diasDecorridos", label: "Dias", field: "diasDecorridos" },
    { id: "volumeConsumido", label: "Consumo (m³)", field: "volumeConsumido" },
    { id: "cliente", label: "Registado por", field: "ts_client" }
];

const WaterVolumeRecordsTable = ({ selectedEntity, selectedArea }) => {
    const { dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("water_volume");

    useEffect(() => {
        if (selectedEntity) {
            dispatch({ type: "SET_ENTITY", payload: selectedEntity });
        }
    }, [selectedEntity, dispatch]);

    const handleAddRecord = async () => {
        if (!newRecord.date || !newRecord.value) {
            notifyError("Preencha todos os campos obrigatórios");
            return;
        }

        const currentValue = parseFloat(newRecord.value);
        if (currentValue <= 0) {
            notifyError("O valor da leitura deve ser maior que zero");
            return;
        }

        // Validar se leitura não é inferior à anterior
        if (records && records.length > 0) {
            const lastValue = parseFloat(records[0].valor);
            if (currentValue < lastValue) {
                notifyError(`A leitura actual (${currentValue}m³) não pode ser inferior à última (${lastValue}m³)`);
                return;
            }
        }

        const payload = {
            pnpk: selectedEntity.pk,
            pndate: newRecord.date,
            pnval: currentValue
        };

        if (await addRecord(payload)) {
            setNewRecord({
                date: getCurrentDateTime(),
                value: ""
            });
        }
    };

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

        return {
            ...record,
            diasDecorridos,
            volumeConsumido
        };
    });

    const renderForm = () => (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="end">
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        label="Data da Leitura"
                        type="datetime-local"
                        value={newRecord.date}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        label="Leitura do Contador (m³)"
                        type="number"
                        value={newRecord.value}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, value: e.target.value }))}
                        fullWidth
                        required
                        inputProps={{ min: "0", step: "0.001" }}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleAddRecord}
                        fullWidth
                        disabled={!newRecord.date || !newRecord.value}
                        sx={{ height: '56px' }}
                    >
                        Adicionar
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">
                    Registo de Volumes de Água - {selectedEntity?.nome}
                </Typography>
            </Paper>

            <GenericTable
                columns={waterVolumeColumns}
                records={processedRecords}
                loading={loading}
                formatters={{
                    data: formatDate,
                    valor: (value) => `${parseFloat(value || 0).toFixed(3)}`,
                    diasDecorridos: (value) => value === '-' ? '-' : `${value}`,
                    volumeConsumido: (value) => value === '-' ? '-' : `${value.toFixed(3)}`
                }}
                renderForm={renderForm}
            />
        </Box>
    );
};

export default WaterVolumeRecordsTable;