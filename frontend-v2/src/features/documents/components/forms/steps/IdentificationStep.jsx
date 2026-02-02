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
import { toast } from 'sonner';
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
                     <Typography variant="caption" color="error">
                        Falta: {validation.missingFields.join(', ')}
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
    
    // Entity Creation Logic
    const { openCreateModal, selectedEntity } = useEntityStore();
    const [searchStatus, setSearchStatus] = useState(null); // 'loading', 'success', 'error', 'not_found'

    const handleCreateEntity = () => {
        openCreateModal({ nipc: formData.nipc });
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
    
    // Handle entity creation success - replicate legacy pattern with retry logic
    useEffect(() => {
        console.log('[IdentificationStep] useEffect triggered', {
            hasSelectedEntity: !!selectedEntity,
            selectedEntityNipc: selectedEntity?.nipc,
            formDataNipc: formData.nipc,
            hasEntityData: !!entityData,
            entityDataName: entityData?.name
        });

        const fetchEntityWithRetry = async (nipc, retries = 3, delay = 500) => {
            for (let i = 0; i < retries; i++) {
                try {
                    console.log(`[IdentificationStep] Fetch attempt ${i + 1}/${retries} for NIF:`, nipc);
                    
                    const { entitiesService } = await import('@/features/entities/api/entitiesService');
                    const response = await entitiesService.getEntityByNipc(nipc);
                    
                    console.log(`[IdentificationStep] API response for attempt ${i + 1}:`, response);
                    
                    // Extract entity from response
                    const entity = response?.entity || response;
                    
                    if (entity && entity.nipc) {
                        console.log('[IdentificationStep] ✅ Entity data fetched successfully:', entity.name, 'NIPC:', entity.nipc);
                        return entity;
                    }
                    
                    // If we got a response but no entity data, wait before retry
                    if (i < retries - 1) {
                        console.log(`[IdentificationStep] ⚠️ Entity not yet available (empty response), retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 1.5; // Exponential backoff
                    }
                    
                } catch (error) {
                    console.error(`[IdentificationStep] ❌ Fetch attempt ${i + 1} failed:`, error);
                    console.error(`[IdentificationStep] Error status:`, error.response?.status);
                    
                    // If it's a 404 or 204, retry
                    if (error.response?.status === 404 || error.response?.status === 204) {
                        if (i < retries - 1) {
                            console.log(`[IdentificationStep] 🔄 Got ${error.response.status}, retrying in ${delay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            delay *= 1.5; // Exponential backoff
                            continue;
                        }
                    }
                    
                    throw error;
                }
            }
            
            console.error('[IdentificationStep] ❌ All retry attempts exhausted');
            return null;
        };

        const handleCreateEntitySuccess = async () => {
            // Only proceed if we have a newly created entity that matches our current NIF
            if (!selectedEntity) {
                console.log('[IdentificationStep] ⏭️ Skipping: No selectedEntity');
                return;
            }

            // Extract entity from potentially wrapped response
            const entity = selectedEntity?.entity || selectedEntity;
            const entityNipc = String(entity?.nipc || '');
            const formNipc = String(formData.nipc || '');

            console.log('[IdentificationStep] Comparing NIPCs:', { entityNipc, formNipc, rawSelectedEntity: selectedEntity });

            if (!entityNipc || entityNipc !== formNipc) {
                console.log('[IdentificationStep] ⏭️ Skipping: NIPCs don\'t match', {
                    entityNipc,
                    formNipc
                });
                return;
            }

            if (entityData) {
                console.log('[IdentificationStep] ⏭️ Skipping: Entity data already exists:', entityData.name);
                return;
            }

            console.log('[IdentificationStep] ✅ Conditions met! Starting entity fetch for:', selectedEntity.nipc);
            
            try {
                const entity = await fetchEntityWithRetry(selectedEntity.nipc);
                
                if (!entity) {
                    console.error('[IdentificationStep] ❌ Failed to get entity data after all retries');
                    toast.error('Erro ao obter dados da entidade criada. Por favor, pesquise novamente.');
                    return;
                }
                
                console.log('[IdentificationStep] ✅ Calling handleEntityFound with entity:', entity.name);
                
                // Apply entity data directly (like legacy applyEntityData)
                handleEntityFound(entity);
                toast.success('Entidade criada e selecionada com sucesso!');
                
            } catch (error) {
                console.error('[IdentificationStep] ❌ Error in handleCreateEntitySuccess:', error);
                toast.error('Erro ao processar entidade criada');
            }
        };
        
        handleCreateEntitySuccess();
    }, [selectedEntity, formData.nipc, entityData, handleEntityFound]);

    // Toast notification for not found
    useEffect(() => {
        if (searchStatus === 'not_found') {
            toast.warning('Entidade não encontrada.', {
                description: 'Deseja criar uma nova ficha para este NIF?',
                action: {
                    label: 'Criar Entidade',
                    onClick: handleCreateEntity
                },
                duration: 8000
            });
        }
    }, [searchStatus]);

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
