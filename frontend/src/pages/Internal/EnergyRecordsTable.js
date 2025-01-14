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
    Grid,
} from "@mui/material";
import { getCurrentDateTime } from "../../utils/dataUtils";
import { getEnergyRecords, addEnergyRecord } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom } from "../../components/common/Toaster/ThemedToaster";

const EnergyRecordsTable = ({ selectedEntity, selectedArea }) => {
    const [energyData, setEnergyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRecord, setNewRecord] = useState({ date: getCurrentDateTime(), vazio: "", ponta: "", cheia: "" });

    const fetchEnergyRecords = async () => {
        if (!selectedEntity) return;
        setLoading(true);
        try {
            const response = await getEnergyRecords(selectedArea, selectedEntity.pk);
            setEnergyData(response.energy || []);
            // console.log(response)
        } catch (error) {
            console.error("Erro ao carregar registos de energia:", error);
            notifyError("Erro ao carregar registos de energia");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEnergyRecords();
    }, [selectedEntity, selectedArea]);

    const handleInputChange = (field, value) => {
        setNewRecord((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddRecord = async () => {
        if (!newRecord.date || !newRecord.vazio || !newRecord.ponta || !newRecord.cheia) {
            notifyWarning("Por favor, preencha todos os campos.");
            return;
        }

        if (!selectedEntity) {
            notifyWarning("Por favor, selecione uma ETAR/EE.");
            return;
        }

        try {
            const payload = {
                pnpk: selectedEntity.pk,
                pndate: newRecord.date,
                pnval_vazio: parseFloat(newRecord.vazio),
                pnval_ponta: parseFloat(newRecord.ponta),
                pnval_cheia: parseFloat(newRecord.cheia),
            };

            await addEnergyRecord(selectedArea, payload);
            notifySuccess("Registo de energia adicionado com sucesso");
            fetchEnergyRecords();
            setNewRecord({ date: "", vazio: "", ponta: "", cheia: "" });
        } catch (error) {
            console.error("Erro ao adicionar registo de energia:", error);
            notifyError("Erro ao adicionar registo de energia");
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
                Novo Registo de Energia
            </Typography>
            <Grid container spacing={2} alignItems="center" mb={3}>
                <Grid item xs={12} sm={6} md={2.5}>
                    <TextField
                        type="datetime-local"
                        label="Data"
                        value={newRecord.date}
                        onChange={(e) => handleInputChange("date", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                    <TextField
                        type="number"
                        label="Consumo Vazio"
                        value={newRecord.vazio}
                        onChange={(e) => handleInputChange("vazio", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                    <TextField
                        type="number"
                        label="Consumo Ponta"
                        value={newRecord.ponta}
                        onChange={(e) => handleInputChange("ponta", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2.5}>
                    <TextField
                        type="number"
                        label="Consumo Cheia"
                        value={newRecord.cheia}
                        onChange={(e) => handleInputChange("cheia", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddRecord}
                        disabled={!newRecord.date || !newRecord.vazio || !newRecord.ponta || !newRecord.cheia}
                        fullWidth
                    >
                        Adicionar
                    </Button>
                </Grid>
            </Grid>
            <Typography variant="h6" gutterBottom>
                Registos de Energia
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Consumo Vazio</TableCell>
                            <TableCell>Consumo Ponta</TableCell>
                            <TableCell>Consumo Cheia</TableCell>
                            <TableCell>Cliente</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {energyData.map((record, index) => (
                            <TableRow key={index}>
                                <TableCell>{formatDate(record.data)}</TableCell>
                                <TableCell>{record.valor_vazio}</TableCell>
                                <TableCell>{record.valor_ponta}</TableCell>
                                <TableCell>{record.valor_cheia}</TableCell>
                                <TableCell>{record.ts_client || "-"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        </Box>
    );
};

export default EnergyRecordsTable;
