
import React, { useState } from "react";
import {
    Box, Button, Typography, Paper, Grid, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, TextField,
    Chip, Checkbox, FormControlLabel, CircularProgress, Divider,
    InputAdornment, Avatar, Collapse, Fade
} from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import WaterIcon from '@mui/icons-material/Water';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import BoltIcon from '@mui/icons-material/Bolt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import NatureIcon from '@mui/icons-material/Nature';
import LayersIcon from '@mui/icons-material/Layers';
import BuildIcon from '@mui/icons-material/Build';
import SecurityIcon from '@mui/icons-material/Security';
import OpacityIcon from '@mui/icons-material/Opacity';
import EditIcon from '@mui/icons-material/Edit';

import { useMetaData } from "../../../contexts/MetaDataContext";
import EntityDetailsView from '../components/EntityDetailsView';
import DetailsModal from "../components/DetailsModal";
import IncumprimentosTable from '../components/IncumprimentosTable';
import VolumeRecordsTable from "../components/VolumeRecordsTable";
import WaterVolumeRecordsTable from "../components/WaterVolumeRecordsTable";
import EnergyRecordsTable from "../components/EnergyRecordsTable";
import ExpenseRecordsTable from "../components/ExpenseRecordsTable";
import { useEntityDetails } from "../hooks/useEntityDetails";
import { updateEntityDetails, createInternalRequest } from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const SUB_AREAS = [
    { id: 'caracteristicas', name: 'Características', icon: <InfoIcon />, requiresEntity: true },
    { id: 'volumes', name: 'Registo de Volumes', icon: <WaterIcon />, requiresEntity: true },
    { id: 'water_volumes', name: 'Registo de Volumes de Água', icon: <WaterDropIcon />, requiresEntity: true },
    { id: 'energia', name: 'Registo de Energia', icon: <BoltIcon />, requiresEntity: true },
    { id: 'despesas', name: 'Registo de Despesas', icon: <AccountBalanceWalletIcon />, requiresEntity: true },
    { id: 'incumprimentos', name: 'Registo de Incumprimentos', icon: <AssignmentLateIcon />, requiresEntity: true, etarOnly: true },
    { id: 'desmatacao', name: 'Desmatação', icon: <NatureIcon />, requiresEntity: false, massRequest: true },
    { id: 'retirada_lamas', name: 'Retirada de Lamas', icon: <LayersIcon />, requiresEntity: false, massRequest: true },
    { id: 'reparacao', name: 'Reparação', icon: <BuildIcon />, requiresEntity: true },
    { id: 'vedacao', name: 'Vedação', icon: <SecurityIcon />, requiresEntity: true },
    { id: 'qualidade_ambiental', name: 'Qualidade Ambiental', icon: <OpacityIcon />, requiresEntity: true }
];

const EtarEeView = ({ areaId }) => {
    const [selectedSubArea, setSelectedSubArea] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const { metaData } = useMetaData();

    const { details, editableDetails, setEditableDetails, isEditMode, setIsEditMode, fetchDetails } = useEntityDetails();

    // Estado do selector: mostrar se não há localização OU entidade seleccionada
    const showSelectors = !selectedLocation || !selectedEntity;

    const handleLocationChange = (event) => {
        const location = event.target.value;
        setSelectedLocation(location);
        setSelectedEntity(null);

        if (location && metaData?.associates) {
            const matchedAssociate = metaData.associates.find(associate =>
                associate.name === `Município de ${location}` ||
                associate.name.replace("Município de ", "") === location
            );
            if (matchedAssociate) {
                console.log(`Auto-mapeado: ${location} → ${matchedAssociate.name}`);
            }
        }

        if (selectedSubArea) {
            const subArea = SUB_AREAS.find(sa => sa.id === selectedSubArea);
            if (subArea?.requiresEntity) {
                setSelectedSubArea(null);
            }
        }
    };

    const handleEntityChange = (event) => {
        const entityId = parseInt(event.target.value, 10);
        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
        const entity = entities?.find(e => e.pk === entityId) || null;
        setSelectedEntity(entity);
    };

    const handleClearSelection = () => {
        setSelectedLocation("");
        setSelectedEntity(null);
        if (selectedSubArea) {
            const subArea = SUB_AREAS.find(sa => sa.id === selectedSubArea);
            if (subArea?.requiresEntity) {
                setSelectedSubArea(null);
            }
        }
    };

    const handleSubAreaClick = (subAreaId) => {
        const subArea = SUB_AREAS.find(sa => sa.id === subAreaId);

        if (subArea.requiresEntity && !selectedEntity) {
            notifyError(`Seleccione uma ${areaId === 1 ? "ETAR" : "EE"} primeiro`);
            return;
        }

        if (subArea.etarOnly && areaId !== 1) {
            notifyError("Funcionalidade apenas para ETARs");
            return;
        }

        setSelectedSubArea(subAreaId);
    };

    const handleOpenDetails = () => {
        fetchDetails();
        setDetailsOpen(true);
    };

    const handleSaveDetails = async (data) => {
        try {
            await updateEntityDetails(areaId, selectedEntity.pk, data);
            notifySuccess("Detalhes actualizados");
            fetchDetails();
        } catch (error) {
            notifyError("Erro ao actualizar", error.message);
        }
    };

    const renderSubAreaCards = () => {
        const filteredSubAreas = SUB_AREAS.filter(subArea =>
            !(subArea.etarOnly && areaId !== 1)
        );

        return (
            <Grid container spacing={2}>
                {filteredSubAreas.map((subArea) => {
                    const isDisabled = subArea.requiresEntity && !selectedEntity;

                    return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={subArea.id}>
                            <Card
                                onClick={() => !isDisabled && handleSubAreaClick(subArea.id)}
                                sx={{
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isDisabled ? 0.5 : 1,
                                    transition: 'all 0.3s',
                                    '&:hover': isDisabled ? {} : {
                                        transform: 'scale(1.03)',
                                        boxShadow: 3
                                    }
                                }}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center">
                                        <Box sx={{ mr: 2, color: 'primary.main' }}>
                                            {subArea.icon}
                                        </Box>
                                        <Box>
                                            <Typography variant="h6">{subArea.name}</Typography>
                                            {isDisabled && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Deve identificar primeiro a instalação pretendida.
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        );
    };

    const renderSubAreaContent = () => {
        const subArea = SUB_AREAS.find(sa => sa.id === selectedSubArea);
        if (!subArea) return null;

        if (subArea.massRequest) {
            return (
                <MassRequestComponent
                    areaId={areaId}
                    requestType={`${areaId === 1 ? 'etar' : 'ee'}_${selectedSubArea}`}
                    title={subArea.name}
                    selectedLocation={selectedLocation}
                />
            );
        }

        switch (selectedSubArea) {
            case 'caracteristicas':
                return <EntityDetailsView entity={selectedEntity} entityType={areaId} onEdit={handleOpenDetails} />;
            case 'volumes':
                return <VolumeRecordsTable selectedEntity={selectedEntity} selectedArea={areaId} metaData={metaData} />;
            case 'water_volumes':
                return <WaterVolumeRecordsTable selectedEntity={selectedEntity} selectedArea={areaId} />;
            case 'energia':
                return <EnergyRecordsTable selectedEntity={selectedEntity} selectedArea={areaId} />;
            case 'despesas':
                return <ExpenseRecordsTable selectedEntity={selectedEntity} selectedArea={areaId} metaData={metaData} />;
            case 'incumprimentos':
                return <IncumprimentosTable selectedEntity={selectedEntity} metaData={metaData} />;
            case 'reparacao':
            case 'vedacao':
            case 'qualidade_ambiental':
                return (
                    <SingleRequestComponent
                        areaId={areaId}
                        entity={selectedEntity}
                        requestType={`${areaId === 1 ? 'etar' : 'ee'}_${selectedSubArea}`}
                        title={subArea.name}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Box sx={{ mt: -9 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} sx={{ mx: 12 }}>
                {/* Esquerda - Selector */}
                <Box display="flex" alignItems="center" gap={2}>
                    {/* Selects com transição */}
                    <Collapse in={showSelectors} orientation="horizontal">
                        <Box display="flex" alignItems="center" gap={2}>
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel>Localização</InputLabel>
                                <Select
                                    value={selectedLocation}
                                    onChange={handleLocationChange}
                                    label="Localização"
                                >
                                    <MenuItem value="">Seleccionar...</MenuItem>
                                    {[...new Set((areaId === 1 ? metaData?.etar : metaData?.ee)?.map(e => e.ts_entity) || [])].sort().map(location => (
                                        <MenuItem key={location} value={location}>
                                            {location}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 200 }} disabled={!selectedLocation}>
                                <InputLabel>{areaId === 1 ? 'ETAR' : 'EE'}</InputLabel>
                                <Select
                                    value={selectedEntity?.pk || ""}
                                    onChange={handleEntityChange}
                                    label={areaId === 1 ? 'ETAR' : 'EE'}
                                >
                                    <MenuItem value="">Seleccionar...</MenuItem>
                                    {(selectedLocation ? (areaId === 1 ? metaData?.etar : metaData?.ee)?.filter(e => e.ts_entity === selectedLocation) : []).map(entity => (
                                        <MenuItem key={entity.pk} value={entity.pk}>
                                            {entity.nome}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Collapse>

                    {/* Chip quando seleccionado */}
                    {!showSelectors && (
                        <Fade in={!showSelectors}>
                            <Chip
                                label={`${selectedEntity.nome} • ${selectedLocation}`}
                                variant="outlined"
                                color="primary"
                                onDelete={handleClearSelection}
                                avatar={
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                        {areaId === 1 ? <WaterDropIcon fontSize="small" /> : <OpacityIcon fontSize="small" />}
                                    </Avatar>
                                }
                                sx={{
                                    fontSize: '0.9rem',
                                    maxWidth: 350,
                                    '&:hover': { backgroundColor: 'primary.50' }
                                }}
                            />
                        </Fade>
                    )}
                </Box>

                {/* Direita - Botões */}
                <Box display="flex" alignItems="center" gap={1}>
                    {!showSelectors && (
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<EditIcon />}
                            onClick={handleClearSelection}
                            sx={{ fontSize: '0.8rem' }}
                        >
                            Alterar
                        </Button>
                    )}

                    {selectedSubArea && (
                        <Button
                            variant="outlined"
                            onClick={() => setSelectedSubArea(null)}
                            startIcon={<ArrowBackIcon />}
                        >
                            Anterior
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Conteúdo */}
            {selectedSubArea ? (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {SUB_AREAS.find(sa => sa.id === selectedSubArea)?.name}
                        {selectedEntity && (
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                • {selectedEntity.nome} ({selectedEntity.ts_entity})
                            </Typography>
                        )}
                    </Typography>
                    {renderSubAreaContent()}
                </Paper>
            ) : (
                <Box>
                    {renderSubAreaCards()}
                </Box>
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

// Componente para solicitações individuais
const SingleRequestComponent = ({ areaId, entity, requestType, title }) => {
    const { metaData } = useMetaData();
    const [formData, setFormData] = useState({ pnts_associate: "", pnmemo: "" });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!formData.pnmemo.trim()) {
            notifyError("Descrição obrigatória");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                pnts_associate: formData.pnts_associate || null,
                pnmemo: formData.pnmemo,
                ...(areaId === 1 ? { pnpk_etar: entity.pk, pnpk_ee: null } : { pnpk_etar: null, pnpk_ee: entity.pk })
            };

            await createInternalRequest(payload, requestType);
            notifySuccess("Solicitação criada");
            setFormData({ pnts_associate: "", pnmemo: "" });
        } catch (error) {
            notifyError("Erro ao criar solicitação");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                    <InputLabel>Associado</InputLabel>
                    <Select
                        value={formData.pnts_associate}
                        onChange={(e) => setFormData(prev => ({ ...prev, pnts_associate: e.target.value }))}
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
            <Grid size={{ xs: 12 }}>
                <TextField
                    label="Descrição"
                    value={formData.pnmemo}
                    onChange={(e) => setFormData(prev => ({ ...prev, pnmemo: e.target.value }))}
                    multiline
                    rows={4}
                    fullWidth
                    required
                />
            </Grid>
            <Grid size={{ xs: 12 }}>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading || !formData.pnmemo.trim()}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                    {loading ? "A processar..." : "Criar Solicitação"}
                </Button>
            </Grid>
        </Grid>
    );
};

// Componente para solicitações em massa
const MassRequestComponent = ({ areaId, requestType, title, selectedLocation }) => {
    const { metaData } = useMetaData();
    const [selectedAssociate, setSelectedAssociate] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [commonMemo, setCommonMemo] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

    React.useEffect(() => {
        if (selectedLocation && metaData?.associates) {
            const matchedAssociate = metaData.associates.find(associate =>
                associate.name === `Município de ${selectedLocation}` ||
                associate.name.replace("Município de ", "") === selectedLocation
            );
            if (matchedAssociate && matchedAssociate.pk !== selectedAssociate) {
                setSelectedAssociate(matchedAssociate.pk);
                setSelectedItems([]);
            }
        }
    }, [selectedLocation, metaData?.associates]);

    const getFilteredEntities = () => {
        if (!selectedAssociate) return [];
        const associate = metaData?.associates?.find(a => a.pk === selectedAssociate);
        if (!associate) return [];

        const municipioName = associate.name.replace("Município de ", "");
        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
        return entities?.filter(entity => entity.ts_entity === municipioName) || [];
    };

    const handleEntityToggle = (entity) => {
        setSelectedItems(prev => {
            const isSelected = prev.some(item => item.id === entity.pk);
            if (isSelected) {
                return prev.filter(item => item.id !== entity.pk);
            } else {
                return [...prev, {
                    id: entity.pk,
                    name: entity.nome,
                    memo: "",
                    associate: selectedAssociate
                }];
            }
        });
    };

    const handleAssociateChange = (event) => {
        setSelectedAssociate(event.target.value);
        setSelectedItems([]);
    };

    const handleMemoChange = (entityId, value) => {
        setSelectedItems(prev =>
            prev.map(item =>
                item.id === entityId ? { ...item, memo: value } : item
            )
        );
    };

    const applyCommonMemo = () => {
        if (!commonMemo) return;
        setSelectedItems(prev =>
            prev.map(item => ({ ...item, memo: commonMemo }))
        );
        notifySuccess("Descrição aplicada a todos");
    };

    const areAllItemsValid = () => {
        return selectedItems.length > 0 &&
            selectedItems.every(item => item.memo && item.memo.trim() !== "");
    };

    const handleSubmit = async () => {
        setHasAttemptedSubmit(true);
        if (!selectedAssociate) {
            notifyError("Seleccione um associado");
            return;
        }
        if (!areAllItemsValid()) {
            notifyError("Preencha a descrição para todas");
            return;
        }

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
            notifySuccess(`${successCount} solicitações criadas`);
            setSelectedItems([]);
            setCommonMemo("");
        } catch (error) {
            notifyError("Erro ao criar solicitações");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel>Município</InputLabel>
                            <Select
                                value={selectedAssociate}
                                onChange={handleAssociateChange}
                                label="Município"
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
                            label="Descrição Comum"
                            value={commonMemo}
                            onChange={(e) => setCommonMemo(e.target.value)}
                            multiline
                            rows={2}
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Button
                                            size="small"
                                            onClick={applyCommonMemo}
                                            disabled={!commonMemo || selectedItems.length === 0}
                                        >
                                            Aplicar
                                        </Button>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {selectedAssociate && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            {areaId === 1 ? 'ETARs' : 'EEs'} Disponíveis
                        </Typography>
                        <Chip
                            label={`${selectedItems.length} seleccionadas`}
                            color="primary"
                            variant="outlined"
                        />
                    </Box>

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

                    {getFilteredEntities().length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            Nenhuma instalação encontrada
                        </Typography>
                    ) : (
                        <Grid container spacing={1}>
                            {getFilteredEntities().map(entity => (
                                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={entity.pk}>
                                    <Card
                                        onClick={() => handleEntityToggle(entity)}
                                        sx={{
                                            cursor: 'pointer',
                                            border: '2px solid',
                                            borderColor: selectedItems.some(item => item.id === entity.pk)
                                                ? 'primary.main'
                                                : areaId === 1
                                                    ? (entity.tt_tipoetar === 'ETAR' ? '#1976d2' : '#ff9800')
                                                    : 'divider',
                                            backgroundColor: selectedItems.some(item => item.id === entity.pk)
                                                ? 'primary.50' : 'background.paper',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                borderColor: selectedItems.some(item => item.id === entity.pk)
                                                    ? 'primary.main'
                                                    : areaId === 1
                                                        ? (entity.tt_tipoetar === 'ETAR' ? '#1565c0' : '#f57c00')
                                                        : 'primary.main',
                                                backgroundColor: 'primary.50'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 2 }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        checked={selectedItems.some(item => item.id === entity.pk)}
                                                        onChange={() => handleEntityToggle(entity)}
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                                                        {entity.nome}
                                                    </Typography>
                                                }
                                                sx={{ m: 0, width: '100%' }}
                                            />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {getFilteredEntities().length > 0 && (
                        <Box mt={2} display="flex" gap={1}>
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
                                Seleccionar Todas
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setSelectedItems([])}
                                disabled={selectedItems.length === 0}
                            >
                                Limpar
                            </Button>
                        </Box>
                    )}
                </Paper>
            )}

            {selectedItems.length > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Detalhes das Solicitações ({selectedItems.length})
                        {areaId === 1 && (
                            <Box component="span" sx={{ ml: 2 }}>
                                {(() => {
                                    const etarCount = selectedItems.filter(item => {
                                        const entity = getFilteredEntities().find(e => e.pk === item.id);
                                        return entity?.tt_tipoetar === 'ETAR';
                                    }).length;
                                    const fossaCount = selectedItems.length - etarCount;
                                    return (
                                        <>
                                            {etarCount > 0 && (
                                                <Chip size="small" label={`${etarCount} ETAR`} sx={{ bgcolor: '#1976d2', color: 'white', mr: 1 }} />
                                            )}
                                            {fossaCount > 0 && (
                                                <Chip size="small" label={`${fossaCount} Fossa`} sx={{ bgcolor: '#ff9800', color: 'white' }} />
                                            )}
                                        </>
                                    );
                                })()}
                            </Box>
                        )}
                    </Typography>

                    {selectedItems.map((item, index) => {
                        const entity = getFilteredEntities().find(e => e.pk === item.id);
                        const entityType = areaId === 1 && entity?.tt_tipoetar !== 'ETAR' ? 'Fossa Séptica' : (areaId === 1 ? 'ETAR' : 'EE');

                        return (
                            <Paper key={item.id} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 3 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {index + 1}. {item.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {entityType}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 9 }}>
                                        <TextField
                                            label="Descrição"
                                            value={item.memo || ""}
                                            onChange={(e) => handleMemoChange(item.id, e.target.value)}
                                            fullWidth
                                            size="small"
                                            required
                                            error={hasAttemptedSubmit && !item.memo?.trim()}
                                            helperText={hasAttemptedSubmit && !item.memo?.trim() ? "Obrigatório" : ""}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        );
                    })}

                    <Button
                        variant="contained"
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