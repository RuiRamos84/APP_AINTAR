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
import { getCurrentDateTime } from "../../utils/dataUtils";
import { getVolumeRecords, addVolumeRecord } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom } from "../../components/common/Toaster/ThemedToaster";

const VolumeRecordsTable = ({ selectedEntity, selectedArea, metaData }) => {
    const [volumeData, setVolumeData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRecord, setNewRecord] = useState({ pndate: getCurrentDateTime(), pnval: "", pnspot: "" });

    // Função para buscar os dados de volume
    const fetchVolumeRecords = async () => {
        if (!selectedEntity) return;
        setLoading(true);
        try {
            const response = await getVolumeRecords(selectedArea, selectedEntity.pk);
            setVolumeData(response.volumes || []);
        } catch (error) {
            console.error("Erro ao carregar registros de volume:", error);
            notifyError("Erro ao carregar registros de volume");
        } finally {
            setLoading(false);
        }
    };

    // Carregar os dados ao montar o componente
    useEffect(() => {
        fetchVolumeRecords();
    }, [selectedEntity, selectedArea]);

    // Atualizar os valores do novo registro
    const handleInputChange = (field, value) => {
        setNewRecord((prev) => ({ ...prev, [field]: value }));
    };

    // Submeter um novo registro e buscar os dados novamente
    const handleAddRecord = async () => {
        try {
            const payload = {
                pnpk: selectedEntity.pk, // PK da entidade selecionada
                pndate: newRecord.pndate,
                pnval: parseFloat(newRecord.pnval),
                pnspot: parseInt(newRecord.pnspot, 10),
            };
            if (isNaN(payload.pnval) || isNaN(payload.pnspot)) {
                notifyWarning("Por favor, preencha todos os campos corretamente");
            
            }
            await addVolumeRecord(selectedArea, payload);
            // Buscar os dados novamente para refletir as alterações
            fetchVolumeRecords();
            // Limpar o formulário
            notifySuccess("Registro adicionado com sucesso");
            setNewRecord({ pndate: "", pnval: "", pnspot: "" });
        } catch (error) {
            console.error("Erro ao adicionar registro de volume:", error);
            notifyError("Erro ao adicionar registro de volume");
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
                Novo Registo de Volume
            </Typography>
            {/* Formulário Responsivo */}
            <Grid container spacing={2} alignItems="center" mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        type="datetime-local"
                        label="Data"
                        value={newRecord.pndate}
                        onChange={(e) => handleInputChange("pndate", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                            value={newRecord.pnspot}
                            onChange={(e) => handleInputChange("pnspot", e.target.value)}
                            label="Tipo"
                        >
                            {metaData?.spot?.map((spot) => (
                                <MenuItem key={spot.pk} value={spot.pk}>
                                    {spot.value}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        type="number"
                        label="Volume (m³)"
                        value={newRecord.pnval}
                        onChange={(e) => handleInputChange("pnval", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddRecord}
                        disabled={!newRecord.pndate || !newRecord.pnval || !newRecord.pnspot}
                        fullWidth
                    >
                        Adicionar
                    </Button>
                </Grid>
            </Grid>
            {/* Tabela Responsiva */}
            <Typography variant="h6" gutterBottom>
                Volumes Registados
            </Typography>
            
                <Table>
                    <TableHead>
                    <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Volume (m³)</TableCell>
                        <TableCell>Cliente</TableCell>
                    </TableRow>
                    </TableHead>
                <TableBody>
                    {volumeData.map((record, index) => (
                        <TableRow key={index}>
                            <TableCell>{formatDate(record.data)}</TableCell>
                            <TableCell>{record.tt_readspot || "N/A"}</TableCell>
                            <TableCell>{record.valor}</TableCell>
                            <TableCell>{record.ts_client || "N/A"}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
        </Box>
    );
};

export default VolumeRecordsTable;