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
    useTheme,
    TableContainer,
} from "@mui/material";
import { getCurrentDateTime } from "../../utils/dataUtils";
import { getExpenseRecords, addExpenseRecord } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom } from "../../components/common/Toaster/ThemedToaster";


const ExpenseRecordsTable = ({ selectedEntity, selectedArea, metaData }) => {
    const theme = useTheme();
    const [expenseData, setExpenseData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRecord, setNewRecord] = useState({
        pndate: getCurrentDateTime(),
        pnval: "",
        pntt_expensedest: "",
        pnmemo: "",
        pnts_associate: "",
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
            if (!selectedEntity && selectedArea !== 3 && selectedArea !== 4 && selectedArea !== 5) return;

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
                case 5:
                    type = "manutencao";
                    break;
                default:
                    console.error("Tipo de área inválido para despesas.");
                    return;
            }
            try {
                const response = await getExpenseRecords(type, selectedEntity?.pk);
                const expenses = response.expenses || [];
                setExpenseData(expenses);
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
        if (!selectedEntity && (selectedArea === 1 || selectedArea === 2)) {
            notifyWarning("Por favor, selecione uma ETAR/EE.");
            return;
        }
        try {
            // Criar payload base
            let payload = {
                pntt_expensedest: parseInt(newRecord.pntt_expensedest, 10),
                pndate: newRecord.pndate,
                pnval: parseFloat(newRecord.pnval),
                pnmemo: newRecord.pnmemo,
            };

            // Adiciona pnts_associate apenas se estiver preenchido
            if (newRecord.pnts_associate) {
                payload.pnts_associate = parseInt(newRecord.pnts_associate, 10);
            }

            // Adiciona campos específicos para ETAR e EE
            let type;
            switch (selectedArea) {
                case 1:
                    type = "etar";
                    payload.pntt_etar = selectedEntity.pk;
                    break;
                case 2:
                    type = "ee";
                    payload.pntt_ee = selectedEntity.pk;
                    break;
                case 3:
                    type = "rede";
                    break;
                case 4:
                    type = "ramal";
                    break;
                case 5:
                    type = "manutencao";
                    break;
                default:
                    throw new Error("Invalid area");
            }

            await addExpenseRecord(type, payload);
            notifySuccess("Registo de despesa adicionado com sucesso");
            const response = await getExpenseRecords(type, selectedEntity?.pk);
            setExpenseData(response.expenses || []);
            setNewRecord({
                pndate: getCurrentDateTime(),
                pnval: "",
                pntt_expensedest: "",
                pnmemo: "",
                pnts_associate: ""
            });
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
        <Box sx={{ backgroundColor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>
                {selectedArea === 5 ? "Registo de Material de Manutenção" :
                    selectedArea === 3 ? "Registo de Despesas na Rede" :
                        selectedArea === 4 ? "Registo de Despesas nos Ramais" :
                            selectedArea === 2 ? "Registo de Despesas na EE" :
                                "Registo de Despesas na ETAR"}
            </Typography>
            <Grid container spacing={2} mb={3}>
                <Grid size={{ xs: 12, sm: 6, md: 2.2 }}>
                    <TextField
                        type="datetime-local"
                        label="Data"
                        value={newRecord.pndate}
                        onChange={(e) => handleInputChange("pndate", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: theme.palette.background.paper,
                                '& input': {
                                    color: theme.palette.text.primary
                                },
                                '& svg': {
                                    color: theme.palette.text.primary
                                }
                            }
                        }}
                        fullWidth
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.0 }}>
                    <FormControl fullWidth>
                        <InputLabel sx={{ color: theme.palette.text.primary }}>
                            Tipo da Despesa
                        </InputLabel>
                        <Select
                            value={newRecord.pntt_expensedest}
                            onChange={(e) => handleInputChange("pntt_expensedest", e.target.value)}
                            label="Tipo da Despesa"
                            sx={{
                                backgroundColor: theme.palette.background.paper,
                                color: theme.palette.text.primary,
                                '& .MuiSelect-icon': {
                                    color: theme.palette.text.primary
                                }
                            }}
                        >
                            {metaData?.expense?.map((expense) => (
                                <MenuItem key={expense.pk} value={expense.pk}>
                                    {expense.value}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        type="number"
                        label="Valor"
                        value={newRecord.pnval}
                        onChange={(e) => handleInputChange("pnval", e.target.value)}
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: theme.palette.background.paper,
                                '& input': {
                                    color: theme.palette.text.primary
                                }
                            }
                        }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <TextField
                        type="text"
                        label="Descrição"
                        value={newRecord.pnmemo}
                        onChange={(e) => handleInputChange("pnmemo", e.target.value)}
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: theme.palette.background.paper,
                                '& input': {
                                    color: theme.palette.text.primary
                                }
                            }
                        }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel sx={{ color: theme.palette.text.primary }}>
                            Associado
                        </InputLabel>
                        <Select
                            value={newRecord.pnts_associate}
                            onChange={(e) => handleInputChange("pnts_associate", e.target.value)}
                            label="Associado"
                            sx={{
                                backgroundColor: theme.palette.background.paper,
                                color: theme.palette.text.primary,
                                '& .MuiSelect-icon': {
                                    color: theme.palette.text.primary
                                }
                            }}
                        >
                            {metaData?.associates?.map((associate) => (
                                <MenuItem key={associate.pk} value={associate.pk}>
                                    {associate.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }} display="flex" justifyContent="center" alignItems="center" md={1}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddRecord}
                        disabled={typeof newRecord.pntt_expensedest !== 'number' || !newRecord.pndate || !newRecord.pnval || !newRecord.pnmemo}
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
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{
                                backgroundColor: theme.palette.table.header.backgroundColor,
                            }}>
                                <TableCell sx={{ color: theme.palette.table.header.color }}>Data</TableCell>
                                <TableCell sx={{ color: theme.palette.table.header.color }}>Destino</TableCell>
                                <TableCell sx={{ color: theme.palette.table.header.color }}>Valor (€)</TableCell>
                                <TableCell sx={{ color: theme.palette.table.header.color }}>Descrição</TableCell>
                                <TableCell sx={{ color: theme.palette.table.header.color }}>Associado</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {expenseData.map((record, index) => (
                                <TableRow
                                    key={index}
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: theme.palette.table.rowHover.backgroundColor
                                        }
                                    }}
                                >
                                    <TableCell>{formatDate(record.data)}</TableCell>
                                    <TableCell>{record.tt_expensedest || "N/A"}</TableCell>
                                    <TableCell>
                                        {parseFloat(record.valor).toLocaleString("pt-PT", {
                                            style: "currency",
                                            currency: "EUR",
                                        })}
                                    </TableCell>
                                    <TableCell>{record.memo || ""}</TableCell>
                                    <TableCell>{record.ts_associate || " - "}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default ExpenseRecordsTable;
