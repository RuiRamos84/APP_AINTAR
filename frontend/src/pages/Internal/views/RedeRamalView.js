// /views/RedeRamalView.js
import React, { useState, useEffect } from "react";
import {
    Box, Tabs, Tab, Typography, Paper, TextField, Grid, Button, FormControl,
    InputLabel, Select, MenuItem, Collapse, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions
} from "@mui/material";
import { ExpandMore, ExpandLess, LocationOn } from '@mui/icons-material';
import { useInternalContext } from "../context/InternalContext";
import TabPanel from "../components/TabPanel";
import GenericTable from "../components/GenericTable";
import RecordForm from "../components/RecordForm";
import { useRecords } from "../hooks/useRecords";
import { useMetaData } from "../../../contexts/MetaDataContext";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { getCurrentDateTime } from "../../../utils/dataUtils";
import { createInternalRequest } from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

// Colunas das tabelas
const expenseColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "destino", label: "Destino", field: "tt_expensedest" },
    { id: "valor", label: "Valor (€)", field: "valor" },
    { id: "descricao", label: "Descrição", field: "memo" },
    { id: "associado", label: "Associado", field: "ts_associate" }
];

const RedeRamalView = ({ areaId }) => {
    const [selectedTab, setSelectedTab] = useState(0);
    const { state, dispatch } = useInternalContext();
    const { metaData } = useMetaData();

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: areaId });
    }, [areaId, dispatch]);

    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    const tabOptions = [
        { id: 0, label: "Registo de Despesa" },
        { id: 1, label: areaId === 3 ? "Desobstrução da Conduta" : "Desobstrução de Ramais" },
        { id: 2, label: areaId === 3 ? "Reparação/Colapso da Conduta" : "Reparação de Ramais" },
    ];

    if (areaId === 3) {
        // Opções adicionais específicas para Rede
        tabOptions.push({ id: 3, label: "Desobstrução de Caixas" });
        tabOptions.push({ id: 4, label: "Reparação de Caixas" });
        tabOptions.push({ id: 5, label: "Reparação de Tampas" });
    }

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">
                    {areaId === 3 ? "Gestão da Rede" : "Gestão de Ramais"}
                </Typography>
            </Paper>

            <Tabs value={selectedTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                {tabOptions.map(tab => (
                    <Tab key={tab.id} label={tab.label} />
                ))}
            </Tabs>

            <TabPanel value={selectedTab} index={0}>
                <ExpenseTab areaId={areaId} />
            </TabPanel>

            <TabPanel value={selectedTab} index={1}>
                <MaintenanceFormTab
                    areaId={areaId}
                    type={areaId === 3 ? "rede_desobstrucao" : "ramal_desobstrucao"}
                    title={areaId === 3 ? "Desobstrução da Conduta" : "Desobstrução de Ramais"}
                    metaData={metaData}
                />
            </TabPanel>

            <TabPanel value={selectedTab} index={2}>
                <MaintenanceFormTab
                    areaId={areaId}
                    type={areaId === 3 ? "rede_reparacao_colapso" : "ramal_reparacao"}
                    title={areaId === 3 ? "Reparação/Colapso da Conduta" : "Reparação de Ramais"}
                    metaData={metaData}
                />
            </TabPanel>

            {areaId === 3 && (
                <>
                    <TabPanel value={selectedTab} index={3}>
                        <MaintenanceFormTab
                            areaId={areaId}
                            type="caixa_desobstrucao"
                            title="Desobstrução de Caixas"
                            metaData={metaData}
                        />
                    </TabPanel>

                    <TabPanel value={selectedTab} index={4}>
                        <MaintenanceFormTab
                            areaId={areaId}
                            type="caixa_reparacao"
                            title="Reparação de Caixas"
                            metaData={metaData}
                        />
                    </TabPanel>

                    <TabPanel value={selectedTab} index={5}>
                        <MaintenanceFormTab
                            areaId={areaId}
                            type="caixa_reparacao_tampa"
                            title="Reparação de Tampas"
                            metaData={metaData}
                        />
                    </TabPanel>
                </>
            )}
        </Box>
    );
};

// Componente para despesas (inalterado)
const ExpenseTab = ({ areaId }) => {
    const { metaData } = useMetaData();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("expense");

    const handleAddExpense = async () => {
        const payload = {
            pntt_expensedest: parseInt(newRecord.expenseDest, 10),
            pndate: newRecord.date,
            pnval: parseFloat(newRecord.value),
            pnmemo: newRecord.memo,
            pnts_associate: newRecord.associate ? parseInt(newRecord.associate, 10) : undefined
        };

        if (await addRecord(payload)) {
            setNewRecord({
                date: getCurrentDateTime(),
                expenseDest: "",
                value: "",
                memo: "",
                associate: ""
            });
        }
    };

    const expenseFieldsConfig = [
        { name: "date", label: "Data", type: "datetime-local", required: true, size: 3 },
        {
            name: "expenseDest",
            label: "Tipo da Despesa",
            type: "select",
            options: metaData?.expense || [],
            required: true,
            size: 3
        },
        { name: "value", label: "Valor (€)", type: "number", required: true, size: 2 },
        { name: "memo", label: "Descrição", type: "text", required: true, size: 3 },
        {
            name: "associate",
            label: "Associado",
            type: "select",
            options: metaData?.associates || [],
            required: false,
            size: 3
        }
    ];

    return (
        <GenericTable
            title={`Registo de Despesas - ${areaId === 3 ? "Rede" : "Ramais"}`}
            columns={expenseColumns}
            records={records}
            loading={loading}
            formatters={{
                data: formatDate,
                valor: formatCurrency
            }}
            renderForm={() => (
                <RecordForm
                    recordType="expense"
                    formData={newRecord}
                    setFormData={setNewRecord}
                    onSubmit={handleAddExpense}
                    metaData={metaData}
                    fieldsConfig={expenseFieldsConfig}
                />
            )}
        />
    );
};

// Novo componente para formulários de manutenção com localização
// Substituir apenas o componente MaintenanceFormTab no teu código existente

const MaintenanceFormTab = ({ areaId, type, title, metaData }) => {
    const [loading, setLoading] = useState(false);
    const [locationOpen, setLocationOpen] = useState(false); // NOVO
    const [confirmDialog, setConfirmDialog] = useState(false); // NOVO
    const [formData, setFormData] = useState({
        pnts_associate: "",
        pnmemo: "",
        // Campos de localização (mantidos como estavam)
        pnaddress: "",
        pnpostal: "",
        pndoor: "",
        pnfloor: "",
        pnnut1: "",
        pnnut2: "",
        pnnut3: "",
        pnnut4: "",
        pnglat: "",
        pnglong: ""
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // NOVO: Verificar se há dados de localização
    const hasLocationData = () => {
        return formData.pnaddress || formData.pnpostal || formData.pndoor ||
            formData.pnfloor || formData.pnnut1 || formData.pnnut2 ||
            formData.pnnut3 || formData.pnnut4 || formData.pnglat || formData.pnglong;
    };

    // ALTERADO: Verificar localização antes de submeter
    const handleSubmit = async () => {
        if (!formData.pnts_associate || !formData.pnmemo) {
            notifyError("Preencha os campos obrigatórios");
            return;
        }

        // Se não há dados de localização, mostrar confirmação
        if (!hasLocationData()) {
            setConfirmDialog(true);
            return;
        }

        await executeSubmit();
    };

    // NOVO: Executar submissão
    const executeSubmit = async () => {
        setLoading(true);
        setConfirmDialog(false);

        try {
            const payload = {
                pnts_associate: parseInt(formData.pnts_associate, 10),
                pnmemo: formData.pnmemo,
                pnaddress: formData.pnaddress || null,
                pnpostal: formData.pnpostal || null,
                pndoor: formData.pndoor || null,
                pnfloor: formData.pnfloor || null,
                pnnut1: formData.pnnut1 || null,
                pnnut2: formData.pnnut2 || null,
                pnnut3: formData.pnnut3 || null,
                pnnut4: formData.pnnut4 || null,
                pnglat: formData.pnglat ? parseFloat(formData.pnglat) : null,
                pnglong: formData.pnglong ? parseFloat(formData.pnglong) : null
            };

            await createInternalRequest(payload, type);
            notifySuccess(`Pedido criado com sucesso`);

            // Reset
            setFormData({
                pnts_associate: "",
                pnmemo: "",
                pnaddress: "",
                pnpostal: "",
                pndoor: "",
                pnfloor: "",
                pnnut1: "",
                pnnut2: "",
                pnnut3: "",
                pnnut4: "",
                pnglat: "",
                pnglong: ""
            });
        } catch (error) {
            notifyError(`Erro ao criar pedido`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {`Pedido de ${title}`}
            </Typography>

            <Paper sx={{ p: 3 }}>
                <Grid container spacing={3}>
                    {/* Campos obrigatórios - MANTIDOS IGUAIS */}
                    <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth required>
                            <InputLabel>Associado</InputLabel>
                            <Select
                                value={formData.pnts_associate}
                                onChange={(e) => handleInputChange("pnts_associate", e.target.value)}
                                label="Associado"
                            >
                                <MenuItem value="">Seleccionar...</MenuItem>
                                {metaData?.associates?.map(associate => (
                                    <MenuItem key={associate.pk} value={associate.pk}>
                                        {associate.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 9 }}>
                        <TextField
                            label="Descrição"
                            value={formData.pnmemo}
                            onChange={(e) => handleInputChange("pnmemo", e.target.value)}
                            fullWidth
                            required
                        />
                    </Grid>

                    {/* NOVO: Header clickável para collapse */}
                    <Grid size={{ xs: 12 }}>
                        <Box
                            display="flex"
                            alignItems="center"
                            sx={{ cursor: 'pointer', mt: 2 }}
                            onClick={() => setLocationOpen(!locationOpen)}
                        >
                            <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="h6">
                                Localização (Opcional)
                            </Typography>
                            <IconButton size="small" sx={{ ml: 1 }}>
                                {locationOpen ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                        </Box>
                    </Grid>

                    {/* ALTERADO: Toda a área de localização dentro do collapse */}
                    <Grid size={{ xs: 12 }}>
                        <Collapse in={locationOpen}>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid size={{ xs: 12, md: 2 }}>
                                    <TextField
                                        label="Código Postal"
                                        value={formData.pnpostal}
                                        onChange={(e) => handleInputChange("pnpostal", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: 1000-001"
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        label="Morada"
                                        value={formData.pnaddress}
                                        onChange={(e) => handleInputChange("pnaddress", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: Rua das Flores, 123"
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 1 }}>
                                    <TextField
                                        label="Porta"
                                        value={formData.pndoor}
                                        onChange={(e) => handleInputChange("pndoor", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: 2º Esq"
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 1 }}>
                                    <TextField
                                        label="Andar"
                                        value={formData.pnfloor}
                                        onChange={(e) => handleInputChange("pnfloor", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: 2"
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 2 }}>
                                    <TextField
                                        label="Latitude"
                                        type="number"
                                        value={formData.pnglat}
                                        onChange={(e) => handleInputChange("pnglat", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: 38.736946"
                                        inputProps={{ step: "any" }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 2 }}>
                                    <TextField
                                        label="Longitude"
                                        type="number"
                                        value={formData.pnglong}
                                        onChange={(e) => handleInputChange("pnglong", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: -9.142685"
                                        inputProps={{ step: "any" }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField
                                        label="Localidade"
                                        value={formData.pnnut4}
                                        onChange={(e) => handleInputChange("pnnut4", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: Naia"
                                    />
                                </Grid>

                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField
                                        label="Freguesia"
                                        value={formData.pnnut3}
                                        onChange={(e) => handleInputChange("pnnut3", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: Canas de Santa Maria"
                                    />
                                </Grid>

                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField
                                        label="Concelho"
                                        value={formData.pnnut2}
                                        onChange={(e) => handleInputChange("pnnut2", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: Tondela"
                                    />
                                </Grid>

                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField
                                        label="Distrito"
                                        value={formData.pnnut1}
                                        onChange={(e) => handleInputChange("pnnut1", e.target.value)}
                                        fullWidth
                                        placeholder="Ex: Viseu"
                                    />
                                </Grid>
                            </Grid>
                        </Collapse>
                    </Grid>

                    {/* Botão - MANTIDO IGUAL */}
                    <Grid size={{ xs: 12 }}>
                        <Box display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                onClick={handleSubmit}
                                disabled={!formData.pnts_associate || !formData.pnmemo || loading}
                            >
                                {loading ? "A processar..." : `Criar Pedido`}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* NOVO: Diálogo de confirmação */}
            <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
                <DialogTitle>Confirmar criação sem localização</DialogTitle>
                <DialogContent>
                    <Typography>
                        Pretende criar o pedido sem dados de localização?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={executeSubmit}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? "A processar..." : "Confirmar"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RedeRamalView;