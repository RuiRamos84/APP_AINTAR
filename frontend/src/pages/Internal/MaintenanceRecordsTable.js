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
import { getInterventionRecords, getUnblockingRecords, addMaintenance, addInterventionRecord, addUnblockingRecord } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom } from "../../components/common/Toaster/ThemedToaster";

const MaintenanceRecordsTable = ({
    selectedEntity,
    selectedArea,
    metaData,
    recordType
}) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRecord, setNewRecord] = useState({
        pndate: "",
        pndescription: "",
        pnresponsible: "",
        pntype: "",
        pnstatus: "",
        pncost: ""
    });

    const fetchRecords = async () => {
        if (!selectedEntity && selectedArea !== 3 && selectedArea !== 4) return;
        setLoading(true);
        try {
            let type = getType(selectedArea);
            let response;

            switch (recordType) {
                case 'intervention':
                    response = await getInterventionRecords(type, selectedEntity?.pk);
                    break;
                case 'unblocking':
                    response = await getUnblockingRecords(type, selectedEntity?.pk);
                    break;
                case 'maintenance':
                    response = await addMaintenance(type, selectedEntity?.pk);
                    break;
                default:
                    throw new Error("Tipo de registo inválido");
            }
            setRecords(response?.data?.records || []);
        } catch (error) {
            console.error(`Erro ao carregar registos de ${recordType}:`, error);
            notifyError(`Erro ao carregar registos de ${recordType}.`);
        } finally {
            setLoading(false);
        }
    };

    const getType = (area) => {
        switch (area) {
            case 1: return "etar";
            case 2: return "ee";
            case 3: return "rede";
            case 4: return "ramal";
            default: throw new Error("Área inválida");
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [selectedEntity, selectedArea, recordType]);

    const handleInputChange = (field, value) => {
        setNewRecord(prev => ({ ...prev, [field]: value }));
    };

    const handleAddRecord = async () => {
        if (!selectedEntity) {
                    notifyWarning("Por favor, selecione uma ETAR/EE.");
                    return;
                }
        try {
            const type = getType(selectedArea);
            let payload = {
                pnpk: selectedEntity?.pk,
                ...newRecord
            };

            let response;
            switch (recordType) {
                case 'intervention':
                    response = await addInterventionRecord(type, payload);
                    break;
                case 'unblocking':
                    response = await addUnblockingRecord(type, payload);
                    break;
                case 'maintenance':
                    response = await addMaintenance(type, selectedEntity?.pk);
                    break;
                default:
                    throw new Error("Tipo de registo inválido");
            }
            if (response.status === 200 || response.status === 201) {
                await fetchRecords();
                setNewRecord({});
                notifySuccess(`Registo adicionado com sucesso!`)
            } else {                
                resetForm();
                notifyWarning(`Erro ao adicionar registo de ${recordType}.`);
            }
        } catch (error) {
            console.error(`Erro ao adicionar registo de ${recordType}:`, error);
            notifyError(`Erro ao adicionar registo de ${recordType}.`);
        }
    };

    const resetForm = () => {
        setNewRecord({
            pndate: "",
            pndescription: "",
            pnresponsible: "",
            pntype: "",
            pnstatus: "",
            pncost: ""
        });
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
                Novo Registo de {recordType === 'maintenance' ? 'Manutenção' :
                    recordType === 'intervention' ? 'Intervenção' :
                        'Desobstrução'}
            </Typography>
            <Grid container spacing={2} alignItems="center" mb={3}>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        type="datetime-local"
                        label="Data"
                        value={newRecord.date}
                        onChange={(e) => handleInputChange("date", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        type="text"
                        label="Responsável"
                        value={newRecord.responsible}
                        onChange={(e) => handleInputChange("responsible", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                            value={newRecord.type}
                            onChange={(e) => handleInputChange("type", e.target.value)}
                            label="Tipo"
                        >
                            {metaData?.maintenanceTypes?.map((type) => (
                                <MenuItem key={type.pk} value={type.pk}>
                                    {type.value}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth>
                        <InputLabel>Estado</InputLabel>
                        <Select
                            value={newRecord.status}
                            onChange={(e) => handleInputChange("status", e.target.value)}
                            label="Estado"
                        >
                            {metaData?.maintenanceStatus?.map((status) => (
                                <MenuItem key={status.pk} value={status.pk}>
                                    {status.value}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        type="number"
                        label="Custo"
                        value={newRecord.cost}
                        onChange={(e) => handleInputChange("cost", e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Descrição"
                        value={newRecord.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddRecord}
                        disabled={!newRecord.date || !newRecord.type || !newRecord.status}
                    >
                        Adicionar
                    </Button>
                </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
                Registos
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Responsável</TableCell>
                        <TableCell>Custo</TableCell>
                        <TableCell>Descrição</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {records.map((record, index) => (
                        <TableRow key={index}>
                            <TableCell>{formatDate(record.date)}</TableCell>
                            <TableCell>{record.type}</TableCell>
                            <TableCell>{record.status}</TableCell>
                            <TableCell>{record.responsible}</TableCell>
                            <TableCell>{record.cost}€</TableCell>
                            <TableCell>{record.description}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
};

export default MaintenanceRecordsTable;