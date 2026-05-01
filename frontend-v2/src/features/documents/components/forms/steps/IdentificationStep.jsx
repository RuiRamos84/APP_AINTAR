import React, { useState, useEffect, useCallback } from 'react';
import {
    Grid,
    Typography,
    Box,
    FormControlLabel,
    Checkbox,
    Paper,
    Button,
    alpha,
    Alert,
    useTheme
} from '@mui/material';
import notification from '@/core/services/notification';
import {
    Business as BusinessIcon,
    Person as PersonIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import EntitySearchField from '../../../../entities/components/fields/EntitySearchField';

import { useEntityStore } from '@/features/entities/store/entityStore';
import { validateNIF } from '@/shared/utils/validation/nif';

// Helper defined outside to prevent re-creation
const EntityDataDisplay = ({ entity, title, icon }) => {
// ... keep existing code ...
    const theme = useTheme();
    if (!entity) return null;
    
    // Simple validation helper
    const getEntityValidationStatus = (ent) => {
        if (!ent) return null;
        const requiredFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
        const missingFields = requiredFields.filter(f => !ent[f] || String(ent[f]).trim() === '');
        return { isComplete: missingFields.length === 0, missingFields };
    };

    const validation = getEntityValidationStatus(entity);
    const { isComplete } = validation;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                mt: 2,
                borderLeft: `4px solid ${isComplete ? theme.palette.success.main : theme.palette.warning.main}`,
                bgcolor: alpha(isComplete ? theme.palette.success.main : theme.palette.warning.main, 0.05)
            }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                    {icon}
                    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                </Box>
               {isComplete ? (
                    <Box display="flex" alignItems="center" gap={0.5} color="success.main">
                        <CheckCircleIcon fontSize="small" />
                        <Typography variant="caption" fontWeight="bold">Completo</Typography>
                    </Box>
                ) : (
                    <Box display="flex" alignItems="center" gap={0.5} color="warning.main">
                        <WarningIcon fontSize="small" />
                        <Typography variant="caption" fontWeight="bold">Incompleto</Typography>
                    </Box>
                )}
            </Box>
            
            <Typography variant="body1" fontWeight={500}>{entity.name}</Typography>
            <Typography variant="body2" color="text.secondary">NIPC: {entity.nipc}</Typography>
            
            {!isComplete && (
                <Box mt={1}>
                    <Typography variant="caption" color="warning.main">
                        Os dados da entidade não estão completos.
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

const IdentificationStep = ({
    formData,
    setFormData,
    errors,
    entityData,
    representativeData,
    setEntityData,
    setRepresentativeData,
    isRepresentative,
    setIsRepresentative,
    isInternal,
    setIsInternal,
    isInterProfile // If user has permission to create internal requests
}) => {
    const theme = useTheme();
    
    // Entity Creation/Edit Logic
    const { openCreateModal, openModal, selectedEntity, modalOpen } = useEntityStore();
    const [searchStatus, setSearchStatus] = useState(null); // 'loading', 'success', 'error', 'not_found'

    // Refs to read current values inside effects without adding them as deps
    const formNipcRef = React.useRef(formData.nipc);
    formNipcRef.current = formData.nipc;
    const entityDataRef = React.useRef(entityData);
    entityDataRef.current = entityData;
    const prevModalOpenRef = React.useRef(false);

    // Helper to check entity completeness
    const getEntityValidationStatus = (ent) => {
        if (!ent) return null;
        // Consistent with CreateDocumentModal validation
        const requiredFields = ['nut1', 'nut2', 'nut3', 'nut4', 'address', 'postal', 'phone'];
        const missingFields = requiredFields.filter(f => !ent[f] || String(ent[f]).trim() === '');
        return { isComplete: missingFields.length === 0, missingFields };
    };

    const entityValidation = getEntityValidationStatus(entityData);

    const handleCreateEntity = () => {
        openCreateModal({ nipc: formData.nipc });
    };

    const handleEditEntity = () => {
        if (entityData) {
            openModal(entityData);
        }
    };
    
    // Wrap in useCallback to prevent stale closures
    const handleEntityFound = useCallback((entity) => {
        setEntityData(entity);
        if (entity) {
            setFormData(prev => ({ ...prev, ts_entity: entity.pk, nipc: entity.nipc }));
            setSearchStatus('success');
        } else {
            setFormData(prev => ({ ...prev, ts_entity: null }));
        }
    }, [setEntityData, setFormData, setSearchStatus]);

    const handleRepresentativeFound = useCallback((entity) => {
        setRepresentativeData(entity);
        if (entity) {
            setFormData(prev => ({ ...prev, tb_representative: entity.nipc }));
        }
    }, [setRepresentativeData, setFormData]);
    
    // Refresh entity data when the edit modal closes (entity was updated)
    useEffect(() => {
        const wasOpen = prevModalOpenRef.current;
        prevModalOpenRef.current = modalOpen;

        // Only act on true → false transition
        if (!wasOpen || modalOpen) return;

        const nipc = formNipcRef.current;
        const current = entityDataRef.current;
        if (!nipc || !current) return;

        const refresh = async () => {
            try {
                const { entitiesService } = await import('@/features/entities/api/entitiesService');
                const response = await entitiesService.getEntityByNipc(nipc);
                const entity = response?.entity || response;
                if (entity?.nipc) handleEntityFound(entity);
            } catch {
                // Silent — entity display stays as-is
            }
        };
        refresh();
    }, [modalOpen, handleEntityFound]);

    // Handle entity creation success - fetch and apply newly created entity data
    useEffect(() => {
        const fetchEntityWithRetry = async (nipc, retries = 3, delay = 500) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const { entitiesService } = await import('@/features/entities/api/entitiesService');
                    const response = await entitiesService.getEntityByNipc(nipc);
                    const entity = response?.entity || response;
                    if (entity && entity.nipc) return entity;
                    if (i < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 1.5;
                    }
                } catch (error) {
                    if ((error.response?.status === 404 || error.response?.status === 204) && i < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 1.5;
                        continue;
                    }
                    throw error;
                }
            }
            return null;
        };

        const handleCreateEntitySuccess = async () => {
            if (!selectedEntity) return;

            const entity = selectedEntity?.entity || selectedEntity;
            const entityNipc = String(entity?.nipc || '');
            const formNipc = String(formData.nipc || '');

            if (!entityNipc || entityNipc !== formNipc) return;

            // Skip if we already have this entity's data — prevents loop when edit modal opens
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (entityData?.pk && entity?.pk && String(entityData.pk) === String(entity.pk)) return;

            try {
                const fetched = await fetchEntityWithRetry(selectedEntity.nipc);
                if (!fetched) {
                    notification.error('Erro ao obter dados da entidade. Por favor, pesquise novamente.');
                    return;
                }
                handleEntityFound(fetched);
                notification.success('Entidade criada e selecionada com sucesso!');
            } catch (error) {
                notification.error('Erro ao processar entidade criada');
            }
        };

        handleCreateEntitySuccess();
    // entityData is intentionally omitted from deps — read as a guard only to prevent
    // re-fetch loops when the edit modal is opened for an already-loaded entity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEntity, formData.nipc, handleEntityFound]);

    // Toast notification for not found
    useEffect(() => {
        if (searchStatus === 'not_found') {
            notification.warning('Entidade não encontrada.', {
                description: 'Deseja criar uma nova ficha para este NIF?',
                action: {
                    label: 'Criar Entidade',
                    onClick: handleCreateEntity
                },
                duration: 8000
            });
        }
    }, [searchStatus]);

    // Toast notification for incomplete data
    useEffect(() => {
        if (entityData && entityValidation && !entityValidation.isComplete) {
            notification.warning('Dados da entidade incompletos.', {
                description: 'Alguns dados obrigatórios não foram preenchidos.',
                action: {
                    label: 'Completar Dados',
                    onClick: handleEditEntity
                },
                duration: 8000
            });
        }
    }, [entityData?.pk, entityValidation?.isComplete]);

    const handleInternalSwitch = (e) => {
        setIsInternal(e.target.checked);
        if (e.target.checked) {
            // Clear entity data if switching to internal
            setEntityData(null);
            setFormData(prev => ({ 
                ...prev, 
                nipc: '', 
                ts_entity: null,
                tb_representative: null 
            }));
            
            // Also clear representative
            setIsRepresentative(false);
            setRepresentativeData(null);
            setSearchStatus(null);
        }
    };

    const handleRepresentativeToggle = (e) => {
        setIsRepresentative(e.target.checked);
        if (!e.target.checked) {
            setRepresentativeData(null);
            setFormData(prev => ({ ...prev, tb_representative: null }));
        }
    };

    const handleNipcChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, nipc: val, ts_entity: null }));
        if (entityData) setEntityData(null);
        setSearchStatus(null); // Reset status on type
    };

    const handleRepNipcChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, tb_representative: val }));
        if (representativeData) setRepresentativeData(null);
    };

    const isNipcValid = !formData.nipc || formData.nipc.length !== 9 || validateNIF(formData.nipc);
    const isRepNipcValid = !formData.tb_representative || formData.tb_representative.length !== 9 || validateNIF(formData.tb_representative);

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={3} borderBottom={1} borderColor="divider" pb={1}>
                {isInterProfile && (
                     <FormControlLabel
                        control={<Checkbox checked={isInternal} onChange={handleInternalSwitch} />}
                        label="Pedido Interno"
                    />
                )}
                 <FormControlLabel
                    control={<Checkbox checked={isRepresentative} onChange={handleRepresentativeToggle} disabled={isInternal} />}
                    label="Representante Legal"
                />
            </Box>

            <Grid container spacing={3}>
                {/* Left Column: Inputs */}
                <Grid size={{ xs: 12, md: 6 }}>
                    {!isInternal && (
                         <Box mb={3}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <BusinessIcon color="primary" />
                                <Typography variant="subtitle1">Entidade Principal</Typography>
                            </Box>
                            <EntitySearchField 
                                value={formData.nipc}
                                onChange={handleNipcChange}
                                onEntityFound={handleEntityFound}
                                onSearchStatusChange={setSearchStatus}
                                error={!!errors.nipc || (formData.nipc && !isNipcValid)}
                                helperText={errors.nipc?.message || (!isNipcValid ? 'NIF Inválido' : '')}
                            />
                            
                            {/* Entity Not Found Alert */}
                            {searchStatus === 'not_found' && isNipcValid && formData.nipc?.length === 9 && (
                                <Alert 
                                    severity="warning" 
                                    sx={{ mt: 2 }}
                                    action={
                                        <Button color="inherit" size="small" onClick={handleCreateEntity}>
                                            CRIAR
                                        </Button>
                                    }
                                >
                                    Entidade não encontrada.
                                </Alert>
                            )}

                            {/* Entity Incomplete Alert */}
                            {entityData && entityValidation && !entityValidation.isComplete && (
                                <Alert
                                    severity="warning"
                                    sx={{ mt: 2 }}
                                    action={
                                        <Button color="inherit" size="small" onClick={handleEditEntity}>
                                            EDITAR
                                        </Button>
                                    }
                                >
                                    Os dados desta entidade não estão completos.
                                </Alert>
                            )}
                        </Box>
                    )}

                    {isRepresentative && (
                        <Box mb={3}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <PersonIcon color="secondary" />
                                <Typography variant="subtitle1">Representante Legal</Typography>
                            </Box>
                            <EntitySearchField 
                                value={formData.tb_representative}
                                onChange={handleRepNipcChange}
                                onEntityFound={handleRepresentativeFound}
                                name="tb_representative"
                                error={!!errors.tb_representative || (formData.tb_representative && !isRepNipcValid)}
                                helperText={errors.tb_representative?.message || (!isRepNipcValid ? 'NIF Inválido' : '')}
                            />
                        </Box>
                    )}
                </Grid>

                {/* Right Column: Details */}
                {!isInternal && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        {entityData ? (
                            <EntityDataDisplay 
                                entity={entityData} 
                                title="Dados da Entidade" 
                                icon={<BusinessIcon color="primary" />} 
                            />
                        ) : (
                            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
                                <Typography color="text.secondary">Introduza um NIF para ver os dados.</Typography>
                            </Paper>
                        )}

                        {isRepresentative && representativeData && (
                            <EntityDataDisplay 
                                entity={representativeData} 
                                title="Dados do Representante" 
                                icon={<PersonIcon color="secondary" />} 
                            />
                        )}
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default IdentificationStep;
