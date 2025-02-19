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
    TableContainer,
} from "@mui/material";
import { getCurrentDateTime } from "../../utils/dataUtils";
import { getExpenseRecords, addExpenseRecord } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning } from "../../components/common/Toaster/ThemedToaster";

const EquipExpenseTable = ({ metaData }) => {
    const [expenseData, setExpenseData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRecord, setNewRecord] = useState({
        pndate: getCurrentDateTime(),
        pnval: "",
        pntt_expensedest: "",
        pnmemo: "",
        pnts_associate: "",
    });

    // Carregar dados iniciais
    useEffect(() => {
        fetchExpenseRecords();
    }, []);

    const fetchExpenseRecords = async () => {
        setLoading(true);
        try {
            const response = await getExpenseRecords("equip", null);
            setExpenseData(response.expenses || []);
        } catch (error) {
            console.error("Erro ao carregar despesas de equipamento:", error);
            notifyError("Erro ao carregar despesas de equipamento");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setNewRecord(prev => ({ ...prev, [field]: value }));
    };

    const handleAddRecord = async () => {
        try {
            const payload = {
                pntt_expensedest: parseInt(newRecord.pntt_expensedest, 10),
                pndate: newRecord.pndate,
                pnval: parseFloat(newRecord.pnval),
                pnmemo: newRecord.pnmemo,
            };

            // Adicionar associado apenas se estiver preenchido
            if (newRecord.pnts_associate) {
                payload.pnts_associate = parseInt(newRecord.pnts_associate, 10);
            }

            await addExpenseRecord("equip", payload);
            notifySuccess("Despesa de equipamento adicionada com sucesso");

            // Recarregar dados e limpar formulário
            await fetchExpenseRecords();
            setNewRecord({
                pndate: getCurrentDateTime(),
                pnval: "",
                pntt_expensedest: "",
                pnmemo: "",
                pnts_associate: "",
            });
        } catch (error) {
            console.error("Erro ao adicionar despesa de equipamento:", error);
            notifyError("Erro ao adicionar despesa de equipamento");
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

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Registo de Despesas com Equipamento Básico
            </Typography>

            {/* Formulário de Nova Despesa */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        type="datetime-local"
                        label="Data"
                        value={newRecord.pndate}
                        onChange={(e) => handleInputChange("pndate", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                    <FormControl fullWidth>
                        <InputLabel>Tipo da Despesa</InputLabel>
                        <Select
                            value={newRecord.pntt_expensedest}
                            onChange={(e) => handleInputChange("pntt_expensedest", e.target.value)}
                            label="Tipo da Despesa"
                        >
                            {metaData?.expense?.map((expense) => (
                                <MenuItem key={expense.pk} value={expense.pk}>
                                    {expense.value}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        type="number"
                        label="Valor (€)"
                        value={newRecord.pnval}
                        onChange={(e) => handleInputChange("pnval", e.target.value)}
                        fullWidth
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                    <TextField
                        label="Descrição"
                        value={newRecord.pnmemo}
                        onChange={(e) => handleInputChange("pnmemo", e.target.value)}
                        fullWidth
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth>
                        <InputLabel>Associado</InputLabel>
                        <Select
                            value={newRecord.pnts_associate}
                            onChange={(e) => handleInputChange("pnts_associate", e.target.value)}
                            label="Associado"
                        >
                            <MenuItem value="">Nenhum</MenuItem>
                            {metaData?.associates?.map((associate) => (
                                <MenuItem key={associate.pk} value={associate.pk}>
                                    {associate.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={1}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddRecord}
                        disabled={!newRecord.pntt_expensedest || !newRecord.pndate || !newRecord.pnval || !newRecord.pnmemo}
                        // fullWidth
                    >
                        Adicionar
                    </Button>
                </Grid>
            </Grid>

            {/* Tabela de Despesas */}
            <Typography variant="h6" gutterBottom>
                Lista de Despesas com Equipamento Básico
            </Typography>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Valor (€)</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Associado</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {expenseData.map((record, index) => (
                            <TableRow key={index}>
                                <TableCell>{formatDate(record.data)}</TableCell>
                                <TableCell>{record.tt_expensedest}</TableCell>
                                <TableCell>
                                    {parseFloat(record.valor).toLocaleString("pt-PT", {
                                        style: "currency",
                                        currency: "EUR",
                                    })}
                                </TableCell>
                                <TableCell>{record.memo}</TableCell>
                                <TableCell>{record.ts_associate || "-"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default EquipExpenseTable;