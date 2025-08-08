import React, { useEffect, useState } from "react";
import {
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Box,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Paper,
    Chip,
    TableContainer,
} from "@mui/material";
import { getCurrentDateTime } from "../../../utils/dataUtils";
import { getIncumprimentoRecords, addIncumprimentoRecord } from "../../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning } from "../../../components/common/Toaster/ThemedToaster";

const IncumprimentosTable = ({ selectedEntity, metaData }) => {
    const [incumprimentosData, setIncumprimentosData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newRecord, setNewRecord] = useState({
        data: getCurrentDateTime(),
        tt_analiseparam: "",
        resultado: "",
        limite: "",
        operador1: "",
        operador2: ""
    });

    const fetchIncumprimentos = async () => {
        if (!selectedEntity) return;

        setLoading(true);
        try {
            const response = await getIncumprimentoRecords(selectedEntity.pk);
            setIncumprimentosData(response.incumprimentos || []);
        } catch (error) {
            console.error("Erro ao carregar incumprimentos:", error);
            notifyError("Erro ao carregar incumprimentos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncumprimentos();
    }, [selectedEntity]);

    const handleInputChange = (field, value) => {
        setNewRecord(prev => ({ ...prev, [field]: value }));
    };

    const handleAddRecord = async () => {
        // Validações
        if (!newRecord.data || !newRecord.tt_analiseparam || !newRecord.resultado || !newRecord.limite) {
            notifyWarning("Preencha todos os campos obrigatórios");
            return;
        }

        if (!selectedEntity) {
            notifyWarning("Selecione uma ETAR primeiro");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                tb_etar: selectedEntity.pk,
                tt_analiseparam: parseInt(newRecord.tt_analiseparam, 10),
                resultado: parseFloat(newRecord.resultado),
                limite: parseFloat(newRecord.limite),
                data: newRecord.data,
                operador1: newRecord.operador1 || null,
                operador2: newRecord.operador2 || null
            };

            await addIncumprimentoRecord(payload);
            notifySuccess("Incumprimento registado com sucesso");

            // Limpar formulário
            setNewRecord({
                data: getCurrentDateTime(),
                tt_analiseparam: "",
                resultado: "",
                limite: "",
                operador1: "",
                operador2: ""
            });

            // Recarregar dados
            await fetchIncumprimentos();
        } catch (error) {
            console.error("Erro ao registar incumprimento:", error);
            notifyError("Erro ao registar incumprimento");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("pt-PT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getSeverityConfig = (falha) => {
        if (falha >= 100) return { color: 'error', label: 'Crítico' };      // >100% excesso
        if (falha >= 50) return { color: 'warning', label: 'Alto' };        // 50-99% excesso  
        if (falha >= 20) return { color: 'info', label: 'Moderado' };       // 20-49% excesso
        return { color: 'success', label: 'Baixo' };                        // <20% excesso
    };

    if (loading) return <CircularProgress />;

    return (
        <Box>
            {/* Formulário */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Novo Registo de Incumprimento
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <TextField
                            type="datetime-local"
                            label="Data"
                            value={newRecord.data}
                            onChange={(e) => handleInputChange("data", e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            required
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <FormControl fullWidth required>
                            <InputLabel>Parâmetro</InputLabel>
                            <Select
                                value={newRecord.tt_analiseparam}
                                onChange={(e) => handleInputChange("tt_analiseparam", e.target.value)}
                                label="Parâmetro"
                            >
                                {metaData?.analiseParams?.map((param) => (
                                    <MenuItem key={param.pk} value={param.pk}>
                                        {param.value}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                        <TextField
                            type="number"
                            label="Resultado"
                            value={newRecord.resultado}
                            onChange={(e) => handleInputChange("resultado", e.target.value)}
                            fullWidth
                            required
                            inputProps={{ step: "0.01" }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                        <TextField
                            type="number"
                            label="Limite"
                            value={newRecord.limite}
                            onChange={(e) => handleInputChange("limite", e.target.value)}
                            fullWidth
                            required
                            inputProps={{ step: "0.01" }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 1.75 }}>
                        <FormControl fullWidth>
                            <InputLabel>Operador 1</InputLabel>
                            <Select
                                value={newRecord.operador1}
                                onChange={(e) => handleInputChange("operador1", e.target.value)}
                                label="Operador 1"
                            >
                                <MenuItem value="">Nenhum</MenuItem>
                                {metaData?.who?.map((operator) => (
                                    <MenuItem key={operator.pk} value={operator.pk}>
                                        {operator.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 1.75 }}>
                        <FormControl fullWidth>
                            <InputLabel>Operador 2</InputLabel>
                            <Select
                                value={newRecord.operador2}
                                onChange={(e) => handleInputChange("operador2", e.target.value)}
                                label="Operador 2"
                            >
                                <MenuItem value="">Nenhum</MenuItem>
                                {metaData?.who?.map((operator) => (
                                    <MenuItem key={operator.pk} value={operator.pk}>
                                        {operator.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAddRecord}
                            disabled={submitting || !newRecord.data || !newRecord.tt_analiseparam || !newRecord.resultado || !newRecord.limite}
                            startIcon={submitting ? <CircularProgress size={20} /> : null}
                        >
                            {submitting ? "A processar..." : "Registar Incumprimento"}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabela */}
            <Typography variant="h6" gutterBottom>
                Incumprimentos Registados
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Parâmetro</TableCell>
                            <TableCell>Resultado</TableCell>
                            <TableCell>Limite</TableCell>
                            <TableCell>Severidade</TableCell>
                            <TableCell>Operador 1</TableCell>
                            <TableCell>Operador 2</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {incumprimentosData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    Nenhum incumprimento registado
                                </TableCell>
                            </TableRow>
                        ) : (
                            incumprimentosData.map((record, index) => (
                                <TableRow key={index}>
                                    <TableCell>{formatDate(record.data)}</TableCell>
                                    <TableCell>{record.tt_analiseparam || "-"}</TableCell>
                                    <TableCell>{record.resultado}</TableCell>
                                    <TableCell>{record.limite}</TableCell>
                                    {/* <TableCell>{record.falha} </TableCell> */}
                                    <TableCell>
                                        <Chip 
    label={`${record.falha}% - ${getSeverityConfig(record.falha).label}`}
    color={getSeverityConfig(record.falha).color}
    size="small"
/>
                                    </TableCell>
                                    <TableCell>{record.operador1 || "-"}</TableCell>
                                    <TableCell>{record.operador2 || "-"}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default IncumprimentosTable;