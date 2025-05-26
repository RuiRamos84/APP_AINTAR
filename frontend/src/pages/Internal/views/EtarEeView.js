// /views/EtarEeView.js
import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Checkbox,
    FormControlLabel,
    CircularProgress,
    Divider,
    Chip,
    InputAdornment,
    Tooltip
} from "@mui/material";
import InfoIcon from '@mui/icons-material/Info';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import BoltIcon from '@mui/icons-material/Bolt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import NatureIcon from '@mui/icons-material/Nature';
import LayersIcon from '@mui/icons-material/Layers';
import BuildIcon from '@mui/icons-material/Build';
import SecurityIcon from '@mui/icons-material/Security';
import OpacityIcon from '@mui/icons-material/Opacity';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useInternalContext } from "../context/InternalContext";
import { useMetaData } from "../../../contexts/MetaDataContext";
import DetailsModal from "../components/DetailsModal";
import { useEntityDetails } from "../hooks/useEntityDetails";
import { useRecords } from "../hooks/useRecords";
import GenericTable from "../components/GenericTable";
import RecordForm from "../components/RecordForm";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { getCurrentDateTime } from "../../../utils/dataUtils";
import { createInternalRequest, updateEntityDetails } from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";
import EntityDetailsView from '../components/EntityDetailsView';

// Colunas para tabelas de dados
const volumeColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "tipo", label: "Tipo", field: "tt_readspot" },
    { id: "valor", label: "Volume (m³)", field: "valor" },
    { id: "cliente", label: "Cliente", field: "ts_client" }
];

const energyColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "vazio", label: "Consumo Vazio", field: "valor_vazio" },
    { id: "ponta", label: "Consumo Ponta", field: "valor_ponta" },
    { id: "cheia", label: "Consumo Cheia", field: "valor_cheia" },
    { id: "cliente", label: "Cliente", field: "ts_client" }
];

const expenseColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "destino", label: "Destino", field: "tt_expensedest" },
    { id: "valor", label: "Valor (€)", field: "valor" },
    { id: "descricao", label: "Descrição", field: "memo" },
    { id: "associado", label: "Associado", field: "ts_associate" }
];

// Definição das subáreas
const SUB_AREAS = [
    { id: 'caracteristicas', name: 'Características', icon: <InfoIcon />, isMassRequest: false },
    { id: 'volumes', name: 'Registo de Volumes', icon: <EqualizerIcon />, isMassRequest: false },
    { id: 'energia', name: 'Registo de Energia', icon: <BoltIcon />, isMassRequest: false },
    { id: 'despesas', name: 'Registo de Despesas', icon: <AccountBalanceWalletIcon />, isMassRequest: false },
    { id: 'desmatacao', name: 'Desmatação', icon: <NatureIcon />, isMassRequest: true },
    { id: 'retirada_lamas', name: 'Retirada de Lamas', icon: <LayersIcon />, isMassRequest: true },
    { id: 'reparacao', name: 'Reparação', icon: <BuildIcon />, isMassRequest: false },
    { id: 'vedacao', name: 'Vedação', icon: <SecurityIcon />, isMassRequest: false },
    { id: 'qualidade_ambiental', name: 'Qualidade Ambiental', icon: <OpacityIcon />, isMassRequest: false }
];

const EtarEeView = ({ areaId }) => {
    const [selectedSubArea, setSelectedSubArea] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const { state, dispatch } = useInternalContext();
    const { metaData } = useMetaData();
    const {
        details,
        loading: detailsLoading,
        editableDetails,
        setEditableDetails,
        isEditMode,
        setIsEditMode,
        fetchDetails
    } = useEntityDetails();

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: areaId });
    }, [areaId, dispatch]);

    const handleSubAreaClick = (subAreaId) => {
        setSelectedSubArea(subAreaId);
        // Resetar seleções quando mudar de área
        setSelectedLocation("");
        setSelectedEntity(null);
    };

    const handleLocationChange = (event) => {
        setSelectedLocation(event.target.value);
        setSelectedEntity(null); // Limpar entidade selecionada ao mudar localização
    };

    const handleEntityChange = (event) => {
        const entityId = parseInt(event.target.value, 10);
        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
        setSelectedEntity(entities.find(entity => entity.pk === entityId) || null);
    };

    const handleOpenDetails = () => {
        if (selectedEntity) {
            // Atualizar o contexto com a entidade selecionada para o hook de detalhes
            dispatch({
                type: "SET_ENTITY",
                payload: selectedEntity
            });
            fetchDetails();
            setDetailsOpen(true);
        } else {
            notifyError(`Selecione uma ${areaId === 1 ? "ETAR" : "EE"} primeiro`);
        }
    };

    const handleSaveDetails = async (data) => {
        try {
            await updateEntityDetails(areaId, selectedEntity.pk, data);
            notifySuccess("Detalhes atualizados com sucesso");
            fetchDetails();
        } catch (error) {
            notifyError("Erro ao atualizar detalhes", error.message);
        }
    };

    // Obter as localizações disponíveis
    const getLocations = () => {
        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
        return [...new Set(entities?.map(entity => entity.ts_entity) || [])];
    };

    // Obter entidades filtradas por localização
    const getFilteredEntities = () => {
        if (!selectedLocation) return [];
        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
        return entities?.filter(entity => entity.ts_entity === selectedLocation) || [];
    };

    const isMassRequest = selectedSubArea ?
        SUB_AREAS.find(a => a.id === selectedSubArea)?.isMassRequest :
        false;

    // Renderizar conteúdo com base na subárea selecionada
    const renderSubAreaContent = () => {
        // Se for uma solicitação em massa, mostrar componente específico
        if (isMassRequest) {
            return (
                <MassRequestTab
                    areaId={areaId}
                    requestType={`${areaId === 1 ? 'etar' : 'ee'}_${selectedSubArea}`}
                    title={SUB_AREAS.find(sa => sa.id === selectedSubArea)?.name}
                />
            );
        }

        // Se não for solicitação em massa, mostrar seletor de entidade
        return (
            <Box>
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Selecionar {areaId === 1 ? "ETAR" : "EE"}</Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Localização</InputLabel>
                                <Select
                                    value={selectedLocation}
                                    onChange={handleLocationChange}
                                    label="Localização"
                                >
                                    {getLocations().map(location => (
                                        <MenuItem key={location} value={location}>
                                            {location}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth disabled={!selectedLocation}>
                                <InputLabel>{areaId === 1 ? "ETAR" : "EE"}</InputLabel>
                                <Select
                                    value={selectedEntity?.pk || ""}
                                    onChange={handleEntityChange}
                                    label={areaId === 1 ? "ETAR" : "EE"}
                                >
                                    {getFilteredEntities().map(entity => (
                                        <MenuItem key={entity.pk} value={entity.pk}>
                                            {entity.nome}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Paper>

                {selectedEntity && renderEntityContent()}
            </Box>
        );
    };

    // Renderiza o conteúdo específico para a entidade selecionada
    const renderEntityContent = () => {
        switch (selectedSubArea) {
            case 'caracteristicas':
                return (
                    <EntityDetailsView
                        entity={selectedEntity}
                        entityType={areaId}
                        onEdit={handleOpenDetails}
                    />
                );
            case 'volumes':
                return <VolumeTab areaId={areaId} entity={selectedEntity} />;
            case 'energia':
                return <EnergyTab areaId={areaId} entity={selectedEntity} />;
            case 'despesas':
                return <ExpenseTab areaId={areaId} entity={selectedEntity} />;
            case 'reparacao':
            case 'vedacao':
            case 'qualidade_ambiental':
                return (
                    <SingleRequestTab
                        areaId={areaId}
                        entity={selectedEntity}
                        requestType={`${areaId === 1 ? 'etar' : 'ee'}_${selectedSubArea}`}
                        title={SUB_AREAS.find(sa => sa.id === selectedSubArea)?.name}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Box>
            {selectedSubArea ? (
                <Box>
                    <Button
                        variant="outlined"
                        onClick={() => setSelectedSubArea(null)}
                        sx={{ mb: 2 }}
                        startIcon={<ArrowBackIcon />}
                    >
                        Voltar para Subáreas
                    </Button>

                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {SUB_AREAS.find(sa => sa.id === selectedSubArea)?.name}
                        </Typography>
                        {renderSubAreaContent()}
                    </Paper>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {SUB_AREAS.map((subArea) => (
                        <Grid item xs={12} sm={6} md={4} key={subArea.id}>
                            <Card
                                onClick={() => handleSubAreaClick(subArea.id)}
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    '&:hover': { transform: 'scale(1.03)', boxShadow: 3 }
                                }}
                            >
                                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ mr: 2, color: 'primary.main' }}>
                                        {subArea.icon}
                                    </Box>
                                    <Typography variant="h6">{subArea.name}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <DetailsModal
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                details={details}
                editableDetails={editableDetails}
                setEditableDetails={setEditableDetails}
                isEditMode={isEditMode}
                setIsEditMode={setIsEditMode}
                onSave={handleSaveDetails}
                entityType={areaId}
            />
        </Box>
    );
};

// Componente para a tab de volumes
const VolumeTab = ({ areaId, entity }) => {
    const { state, dispatch } = useInternalContext(); // Adiciona esta linha
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("volume");
    const { metaData } = useMetaData();

    useEffect(() => {
        // Atualizar o contexto com a entidade selecionada
        dispatch({ type: "SET_ENTITY", payload: entity });
    }, [entity, dispatch]);

    const handleAddRecord = async () => {
        const payload = {
            pnpk: entity.pk,
            pndate: newRecord.date,
            pnval: parseFloat(newRecord.value),
            pnspot: parseInt(newRecord.spot, 10)
        };

        if (await addRecord(payload)) {
            setNewRecord({
                date: getCurrentDateTime(),
                value: "",
                spot: ""
            });
        }
    };

    const volumeFieldsConfig = [
        { name: "date", label: "Data", type: "datetime-local", required: true, size: 3 },
        {
            name: "spot",
            label: "Tipo",
            type: "select",
            options: metaData?.spot || [],
            required: true,
            size: 3
        },
        { name: "value", label: "Volume (m³)", type: "number", required: true, size: 3 }
    ];

    return (
        <GenericTable
            title={`Registos de Volume - ${entity.nome}`}
            columns={volumeColumns}
            records={records}
            loading={loading}
            formatters={{
                data: formatDate
            }}
            renderForm={() => (
                <RecordForm
                    recordType="volume"
                    formData={newRecord}
                    setFormData={setNewRecord}
                    onSubmit={handleAddRecord}
                    metaData={metaData}
                    fieldsConfig={volumeFieldsConfig}
                />
            )}
        />
    );
};

const EnergyTab = ({ areaId, entity }) => {
    const { state, dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("energy");
    const { metaData } = useMetaData();

    useEffect(() => {
        dispatch({ type: "SET_ENTITY", payload: entity });
    }, [entity, dispatch]);

    const handleAddRecord = async () => {
        const payload = {
            pnpk: entity.pk,
            pndate: newRecord.date,
            pnval_vazio: parseFloat(newRecord.vazio),
            pnval_ponta: parseFloat(newRecord.ponta),
            pnval_cheia: parseFloat(newRecord.cheia)
        };

        if (await addRecord(payload)) {
            setNewRecord({
                date: getCurrentDateTime(),
                vazio: "",
                ponta: "",
                cheia: ""
            });
        }
    };

    const energyFieldsConfig = [
        { name: "date", label: "Data", type: "datetime-local", required: true, size: 3 },
        { name: "vazio", label: "Consumo Vazio", type: "number", required: true, size: 3 },
        { name: "ponta", label: "Consumo Ponta", type: "number", required: true, size: 3 },
        { name: "cheia", label: "Consumo Cheia", type: "number", required: true, size: 3 }
    ];

    return (
        <GenericTable
            title={`Registos de Energia - ${entity.nome}`}
            columns={energyColumns}
            records={records}
            loading={loading}
            formatters={{ data: formatDate }}
            renderForm={() => (
                <RecordForm
                    recordType="energy"
                    formData={newRecord}
                    setFormData={setNewRecord}
                    onSubmit={handleAddRecord}
                    metaData={metaData}
                    fieldsConfig={energyFieldsConfig}
                />
            )}
        />
    );
};

// Componente para a tab de despesas
const ExpenseTab = ({ areaId, entity }) => {
    const { state, dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("expense");
    const { metaData } = useMetaData();

    useEffect(() => {
        dispatch({ type: "SET_ENTITY", payload: entity });
    }, [entity, dispatch]);

    const handleAddRecord = async () => {
        const payload = {
            pntt_expensedest: parseInt(newRecord.expenseDest, 10),
            pndate: newRecord.date,
            pnval: parseFloat(newRecord.value),
            pnmemo: newRecord.memo,
            pnts_associate: newRecord.associate ? parseInt(newRecord.associate, 10) : undefined
        };

        if (areaId === 1) {
            payload.pntt_etar = entity.pk;
        } else {
            payload.pntt_ee = entity.pk;
        }

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
            title={`Registos de Despesas - ${entity.nome}`}
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
                    onSubmit={handleAddRecord}
                    metaData={metaData}
                    fieldsConfig={expenseFieldsConfig}
                />
            )}
        />
    );
};

// Componente para solicitações individuais
const SingleRequestTab = ({ areaId, entity, requestType, title }) => {
    const { metaData } = useMetaData();
    const [formData, setFormData] = useState({
        pnts_associate: "",
        pnmemo: ""
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.pnmemo) {
            notifyError("Descrição é obrigatória");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                pnts_associate: formData.pnts_associate || null,
                pnmemo: formData.pnmemo,
            };

            if (areaId === 1) {
                payload.pnpk_etar = entity.pk;
                payload.pnpk_ee = null;
            } else {
                payload.pnpk_etar = null;
                payload.pnpk_ee = entity.pk;
            }

            await createInternalRequest(payload, requestType);
            notifySuccess("Solicitação criada com sucesso");
            setFormData({ pnts_associate: "", pnmemo: "" });
        } catch (error) {
            notifyError("Erro ao criar solicitação");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>{title} - {entity.nome}</Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Associado</InputLabel>
                            <Select
                                value={formData.pnts_associate}
                                onChange={(e) => handleChange("pnts_associate", e.target.value)}
                                label="Associado"
                            >
                                <MenuItem value="">Nenhum</MenuItem>
                                {metaData?.associates?.map(associate => (
                                    <MenuItem key={associate.pk} value={associate.pk}>
                                        {associate.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Descrição da Solicitação"
                            value={formData.pnmemo}
                            onChange={(e) => handleChange("pnmemo", e.target.value)}
                            multiline
                            rows={4}
                            fullWidth
                            required
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={!formData.pnmemo || loading}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? "A processar..." : "Criar Solicitação"}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

// Componente para solicitações em massa (desmatação, retirada de lamas)
const MassRequestTab = ({ areaId, requestType, title }) => {
    const { metaData } = useMetaData();
    const [selectedAssociate, setSelectedAssociate] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [commonMemo, setCommonMemo] = useState("");
    const [loading, setLoading] = useState(false);

    // Obter entidades filtradas pelo associado selecionado
    const getFilteredEntities = () => {
        if (!selectedAssociate) return [];

        // Encontrar o nome do associado selecionado
        const associate = metaData?.associates?.find(a => a.pk === selectedAssociate);
        if (!associate) return [];

        // Extrair só a parte do município (remover "Município de ")
        const municipioName = associate.name.replace("Município de ", "");

        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
        return entities?.filter(entity => entity.ts_entity === municipioName) || [];
    };

    // Toggle seleção de entidade
    const handleEntityToggle = (entity) => {
        setSelectedItems(prev => {
            const isSelected = prev.some(item => item.id === entity.pk);

            if (isSelected) {
                return prev.filter(item => item.id !== entity.pk);
            } else {
                return [...prev, {
                    id: entity.pk,
                    name: entity.nome,
                    subsistema: entity.subsistema,
                    memo: "",
                    associate: selectedAssociate
                }];
            }
        });
    };

    // Quando muda o associado, limpa seleções
    const handleAssociateChange = (event) => {
        setSelectedAssociate(event.target.value);
        setSelectedItems([]);
    };

    // Atualizar memo individual
    const handleMemoChange = (entityId, value) => {
        setSelectedItems(prev =>
            prev.map(item =>
                item.id === entityId ? { ...item, memo: value } : item
            )
        );
    };

    // Aplicar memo comum a todos
    const applyCommonMemo = () => {
        if (!commonMemo) return;

        setSelectedItems(prev =>
            prev.map(item => ({ ...item, memo: commonMemo }))
        );

        notifySuccess("Descrição aplicada a todos os itens");
    };

    const areAllItemsValid = () => {
        return selectedItems.length > 0;
    };

    const handleSubmit = async () => {
        if (!selectedAssociate) {
            notifyError("Selecione um associado");
            return;
        }

        // if (!areAllItemsValid()) {
        //     notifyError("Preencha a descrição para todas as instalações selecionadas");
        //     return;
        // }

        setLoading(true);
        try {
            let successCount = 0;

            for (const item of selectedItems) {
                const payload = {
                    pnts_associate: selectedAssociate,
                    pnmemo: item.memo
                };

                if (areaId === 1) {
                    payload.pnpk_etar = item.id;
                    payload.pnpk_ee = null;
                } else {
                    payload.pnpk_etar = null;
                    payload.pnpk_ee = item.id;
                }

                await createInternalRequest(payload, requestType);
                successCount++;
            }

            notifySuccess(`${successCount} solicitações criadas com sucesso`);
            setSelectedItems([]);
            setCommonMemo("");
        } catch (error) {
            notifyError("Erro ao criar solicitações");
        } finally {
            setLoading(false);
        }
    };

    // Agrupar entidades por subsistema para melhor organização
    const getGroupedEntities = () => {
        const entities = getFilteredEntities();
        return entities.reduce((acc, entity) => {
            const subsistema = entity.subsistema || 'Sem subsistema';
            if (!acc[subsistema]) acc[subsistema] = [];
            acc[subsistema].push(entity);
            return acc;
        }, {});
    };

    // Verificar se a descrição comum está aplicada a todos os itens
    const isCommonMemoApplied = () => {
        return commonMemo &&
            selectedItems.length > 0 &&
            selectedItems.every(item => item.memo === commonMemo);
    };

    // Desfazer aplicação da descrição comum
    const undoCommonMemo = () => {
        setSelectedItems(prev =>
            prev.map(item => ({ ...item, memo: "" }))
        );
        notifySuccess("Descrição comum removida de todos os itens");
    };

    return (
        <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Município</InputLabel>
                            <Select
                                value={selectedAssociate}
                                onChange={handleAssociateChange}
                                label="Município"
                            >
                                <MenuItem value="">Selecionar Município</MenuItem>
                                {metaData?.associates?.map(associate => (
                                    <MenuItem key={associate.pk} value={associate.pk}>
                                        {associate.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={9}>
                        <TextField
                            label="Descrição Comum"
                            value={commonMemo}
                            onChange={(e) => setCommonMemo(e.target.value)}
                            multiline
                            size="small"
                            variant="outlined"
                            rows={1.7}
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color={isCommonMemoApplied() ? "error" : "primary"}
                                            onClick={isCommonMemoApplied() ? undoCommonMemo : applyCommonMemo}
                                            disabled={selectedItems.length === 0 || (!isCommonMemoApplied() && !commonMemo)}
                                            sx={{
                                                position: 'absolute',
                                                right: 8,
                                                top: 8,
                                                minWidth: 'auto',
                                                px: 2
                                            }}
                                        >
                                            {isCommonMemoApplied() ? "Desfazer" : "Aplicar a Todos"}
                                        </Button>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                '& .MuiInputBase-root': {
                                    paddingRight: '120px'
                                }
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Mostrar instalações do município selecionado */}
            {selectedAssociate && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            {areaId === 1 ? 'ETARs' : 'Estações Elevatórias'} Disponíveis
                        </Typography>
                        {/* Legenda das cores - só para ETARs */}
                        {areaId === 1 && (
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 16, height: 16, backgroundColor: '#1976d2', borderRadius: 1 }} />
                                    <Typography variant="caption">ETAR</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 16, height: 16, backgroundColor: '#ff9800', borderRadius: 1 }} />
                                    <Typography variant="caption">Fossa Séptica Coletiva</Typography>
                                </Box>
                            </Box>
                        )}
                        <Chip
                            label={`${selectedItems.length} selecionadas`}
                            color="primary"
                            variant="outlined"
                        />
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {getFilteredEntities().length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            Nenhuma instalação encontrada para este município
                        </Typography>
                    ) : (
                        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <Grid container spacing={0.5}>
                                {getFilteredEntities().map(entity => (
                                    <Grid item xs={6} sm={4} md={3} lg={2} key={entity.pk}>
                                        <Tooltip
                                            title={areaId === 1 ? `Tipo: ${entity.tt_tipoetar || 'N/A'}` : entity.nome}
                                            arrow
                                        >
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 1,
                                                    border: '2px solid',
                                                    borderColor: selectedItems.some(item => item.id === entity.pk)
                                                        ? 'primary.main'
                                                        : areaId === 1
                                                            ? (entity.tt_tipoetar === 'ETAR' ? '#1976d2' : '#ff9800') // Cores só para ETARs
                                                            : 'divider', // Cor padrão para outras áreas
                                                    backgroundColor: selectedItems.some(item => item.id === entity.pk)
                                                        ? 'primary.50'
                                                        : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        borderColor: selectedItems.some(item => item.id === entity.pk)
                                                            ? 'primary.main'
                                                            : areaId === 1
                                                                ? (entity.tt_tipoetar === 'ETAR' ? '#1565c0' : '#f57c00') // Hover só para ETARs
                                                                : 'primary.main', // Hover padrão para outras áreas
                                                        backgroundColor: 'primary.50',
                                                        transform: 'translateY(-1px)',
                                                        boxShadow: 1
                                                    }
                                                }}
                                                onClick={() => handleEntityToggle(entity)}
                                            >
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={selectedItems.some(item => item.id === entity.pk)}
                                                            onChange={() => handleEntityToggle(entity)}
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                                                            {entity.nome}
                                                        </Typography>
                                                    }
                                                    sx={{
                                                        m: 0,
                                                        width: '100%',
                                                        '& .MuiFormControlLabel-label': {
                                                            width: '100%',
                                                            overflow: 'hidden'
                                                        }
                                                    }}
                                                />
                                            </Paper>
                                        </Tooltip>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Botões de seleção rápida */}
                    {getFilteredEntities().length > 0 && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    const allEntities = getFilteredEntities();
                                    setSelectedItems(allEntities.map(entity => ({
                                        id: entity.pk,
                                        name: entity.nome,
                                        memo: "",
                                        associate: selectedAssociate
                                    })));
                                }}
                            >
                                Selecionar Todas
                            </Button>

                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setSelectedItems([])}
                                disabled={selectedItems.length === 0}
                            >
                                Limpar Seleção
                            </Button>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Lista de detalhes */}
            {selectedItems.length > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Detalhes das Solicitações ({selectedItems.length})
                    </Typography>

                    {selectedItems.map((item, index) => (
                        <Paper key={item.id} elevation={1} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={2}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {index + 1}. {item.name}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} md={10}>
                                    <TextField
                                        label="Descrição da Solicitação"
                                        value={item.memo || ""}
                                        onChange={(e) => handleMemoChange(item.id, e.target.value)}
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        multiline
                                            
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    ))}

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={!areAllItemsValid() || loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                        size="large"
                    >
                        {loading ? "A processar..." : `Criar ${selectedItems.length} Solicitações`}
                    </Button>
                </Paper>
            )}
        </Box>
    );
  };

export default EtarEeView;