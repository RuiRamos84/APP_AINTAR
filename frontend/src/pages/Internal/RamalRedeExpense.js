import React, { useState } from "react";
import {
    Box,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    CircularProgress,
} from "@mui/material";
import { addExpenseRecord, getExpenseRecords } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom } from "../../components/common/Toaster/ThemedToaster";

const RamalRedeExpense = ({ selectedArea, metaData }) => {
    const [expenseData, setExpenseData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRecord, setNewRecord] = useState({
        pntt_expensedest: "",
        pndate: "",
        pnval: "",
        pnmemo: "",
        pnts_associate: "",
    });

    const handleInputChange = (field, value) => {
        setNewRecord((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddRecord = async () => {
        try {
            const type = selectedArea === 3 ? "rede" : "ramal" : "manutencao";

            const payload = {
                pntt_expensedest: parseInt(newRecord.pntt_expensedest, 10),
                pndate: newRecord.pndate,
                pnval: parseFloat(newRecord.pnval),
                pnmemo: newRecord.pnmemo,
                pnts_associate: newRecord.pnts_associate,
            };

            // console.log("Adicionando despesa:", payload);
            await addExpenseRecord(type, payload);
            notifySuccess("Despesa adicionada com sucesso");

            // Atualizar lista de despesas
            const response = await getExpenseRecords(type, null);
            setExpenseData(response.expenses || []);

            // Limpar o formulário
            setNewRecord({ pndate: "", pnval: "", pntt_expensedest: "", pnmemo: "", pnts_associate: "" });
        } catch (error) {
            console.error("Erro ao adicionar despesa:", error);
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {selectedArea === 5 ? "Material de Manutenção" :
                    selectedArea === 3 ? "Despesas na Rede" :
                        selectedArea === 4 ? "Despesas nos Ramais" :
                            "Novo Registo de Despesas"}
            </Typography>

            {/* Formulário Responsivo */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Destino da Despesa</InputLabel>
                        <Select
                            value={newRecord.pntt_expensedest}
                            onChange={(e) => handleInputChange("pntt_expensedest", e.target.value)}
                        >
                            {metaData?.expense?.map((dest) => (
                                <MenuItem key={dest.pk} value={dest.pk}>
                                    {dest.value}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        type="datetime-local"
                        label="Data"
                        value={newRecord.pndate}
                        onChange={(e) => handleInputChange("pndate", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        type="number"
                        label="Valor (€)"
                        value={newRecord.pnval}
                        onChange={(e) => handleInputChange("pnval", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        label="Descrição"
                        value={newRecord.pnmemo}
                        onChange={(e) => handleInputChange("pnmemo", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddRecord}
                        disabled={
                            !newRecord.pntt_expensedest || !newRecord.pndate || !newRecord.pnval
                        }
                    >
                        Adicionar
                    </Button>
                </Grid>
            </Grid>

            {/* Tabela de Registos */}
            <Typography variant="h6" gutterBottom>
                Registos de Despesas
            </Typography>
            {loading ? (
                <CircularProgress />
            ) : (
                <Grid container>
                    {expenseData.map((record, index) => (
                        <Grid item xs={12} key={index}>
                            <Typography>
                                {new Date(record.pndate).toLocaleDateString("pt-PT")} -{" "}
                                {record.pntt_expensedest} - {record.pnval}€
                            </Typography>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default RamalRedeExpense;
