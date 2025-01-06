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
} from "@mui/material";
import { getExpenseRecords, addExpenseRecord } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom } from "../../components/common/Toaster/ThemedToaster";

const ExpenseRecordsTable = ({ selectedEntity, selectedArea, metaData }) => {
    const [expenseData, setExpenseData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRecord, setNewRecord] = useState({
        pndate: "",
        pnval: "",
        pntt_expensedest: "",
        pnmemo: "",
    });

    useEffect(() => {
        const loadExpenses = async () => {
            const type = selectedArea === 3 ? 'rede' : 'ramal';
            const response = await getExpenseRecords(type, null);
            setExpenseData(response.expenses || []);
        };

        if (selectedArea === 3 || selectedArea === 4) {
            loadExpenses();
        }
    }, [selectedArea]);

    useEffect(() => {
        const fetchExpenseRecords = async () => {
            if (!selectedEntity || !selectedArea) return;

            let type;
            switch (selectedArea) {
                case 1:
                    type = "etar";
                    break;
                case 2:
                    type = "ee";
                    break;
                case 3:
                    type = "rede";
                    break;
                case 4:
                    type = "ramal";
                    break;
                default:
                    console.error("Tipo de área inválido para despesas.");
                    return;
            }
            try {
                const response = await getExpenseRecords(type, selectedEntity.pk);
                // console.log(response)
                const expenses = response.expenses|| [];
                setExpenseData(expenses);
                console.log("expenseData", expenseData)
            } catch (error) {
                console.error("Erro ao carregar registros de despesas:", error);
                notifyError("Erro ao carregar registros de despesas");
            }
        };
        fetchExpenseRecords();
    }, [selectedEntity, selectedArea]);

    const handleInputChange = (field, value) => {
        setNewRecord((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddRecord = async () => {
        if (!selectedEntity) {
                    notifyWarning("Por favor, selecione uma ETAR/EE.");
                    return;
                }
        try {
            let type, payload;
            switch (selectedArea) {
                case 1:
                    type = "etar";
                    payload = {
                        pntt_expensedest: parseInt(newRecord.pntt_expensedest, 10),
                        pndate: newRecord.pndate,
                        pnval: parseFloat(newRecord.pnval),
                        pntt_etar: selectedEntity.pk,
                        pnmemo: newRecord.pnmemo,
                    };
                    break;
                case 2:
                    type = "ee";
                    payload = {
                        pntt_expensedest: parseInt(newRecord.pntt_expensedest, 10),
                        pndate: newRecord.pndate,
                        pnval: parseFloat(newRecord.pnval),
                        pntt_ee: selectedEntity.pk,
                        pnmemo: newRecord.pnmemo,
                    };
                    break;
                case 3:
                    type = "rede";
                    payload = {
                        pntt_expensedest: parseInt(newRecord.pntt_expensedest, 10),
                        pndate: newRecord.pndate,
                        pnval: parseFloat(newRecord.pnval),
                        pnmemo: newRecord.pnmemo,
                    };
                    break;
                case 4:
                    type = "ramal";
                    payload = {
                        pntt_expensedest: parseInt(newRecord.pntt_expensedest, 10),
                        pndate: newRecord.pndate,
                        pnval: parseFloat(newRecord.pnval),
                        pnmemo: newRecord.pnmemo,
                    };
                    break;
                default:
                    throw new Error("Invalid area");
            }
            await addExpenseRecord(type, payload);
            notifySuccess("Registo de despesa adicionado com sucesso");
            const response = await getExpenseRecords(type, selectedEntity?.pk);
            setExpenseData(response.expenses || []);
            setNewRecord({ pndate: "", pnval: "", pntt_expensedest: "", pnmemo: "" });
        } catch (error) {
            console.error("Erro ao adicionar registro de despesas:", error);
            notifyError("Erro ao adicionar registro de despesas");
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

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Novo Registo de Despesas
            </Typography>
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <TextField
                        type="datetime-local"
                        label="Data"
                        value={newRecord.pndate}
                        onChange={(e) => handleInputChange("pndate", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
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
                        label="Valor"
                        value={newRecord.pnval}
                        onChange={(e) => handleInputChange("pnval", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        type="text"
                        label="Descrição"
                        value={newRecord.pnmemo}
                        onChange={(e) => handleInputChange("pnmemo", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} display="flex" justifyContent="center" alignItems="center" md={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddRecord}
                        disabled={!newRecord.pndate || !newRecord.pnval || !newRecord.pntt_expensedest || !newRecord.pnmemo}
                    >
                        Adicionar
                    </Button>
                </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
                Registos de Despesas
            </Typography>
            {loading ? (
                <CircularProgress />
            ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Data</TableCell>
                                <TableCell>Destino</TableCell>
                                {/* <TableCell>Tipo de Despesa</TableCell>
                                <TableCell>Entidade Associada</TableCell> */}
                                <TableCell>Valor (€)</TableCell>
                                <TableCell>Descrição</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {expenseData.map((record, index) => (
                                <TableRow key={index}>
                                    {/* Data formatada */}
                                    <TableCell>{formatDate(record.data)}</TableCell>

                                    {/* Destino */}
                                    <TableCell>{record.tt_expensedest || "N/A"}</TableCell>

                                    {/* Tipo de Despesa */}
                                    {/* <TableCell>
                                        {record.tt_expensetype === 1
                                            ? "Operacional"
                                            : record.tt_expensetype === 2
                                                ? "Investimento"
                                                : "Outro"}
                                    </TableCell> */}

                                    {/* Entidade Associada */}
                                    {/* <TableCell>
                                        {record.tb_etar
                                            ? `ETAR: ${record.tb_etar}`
                                            : record.tb_ee
                                                ? `EE: ${record.tb_ee}`
                                                : "N/A"}
                                    </TableCell> */}

                                    {/* Valor Formatado */}
                                    <TableCell>
                                        {parseFloat(record.valor).toLocaleString("pt-PT", {
                                            style: "currency",
                                            currency: "EUR",
                                        })}
                                    </TableCell>

                                    {/* Descrição/Memo */}
                                    <TableCell>{record.memo || ""}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>


            )}
        </Box>
    );
};

export default ExpenseRecordsTable;
