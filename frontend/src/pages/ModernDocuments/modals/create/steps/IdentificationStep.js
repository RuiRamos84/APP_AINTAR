import React from 'react';
import {
    Grid,
    Typography,
    Box,
    FormControlLabel,
    Checkbox,
    useTheme,
    Alert,
    Paper,
    Button,
    alpha
} from '@mui/material';
import {
    Business as BusinessIcon,
    Person as PersonIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

// Componentes personalizados
import EntitySearchField from '../fields/EntitySearchField';

const IdentificationStep = ({
    formData,
    handleChange,
    handleNipcChange,
    errors,
    entityData,
    representativeData,
    setEntityData,
    setRepresentativeData,
    isRepresentative,
    handleRepresentativeToggle,
    isInternal,
    handleInternalSwitch,
    isInterProfile,
    // ✅ Hook da entidade para accesso às funções
    entityDataHook
}) => {
    const theme = useTheme();

    // Validação entidade
    const getEntityValidationStatus = (entity) => {
        if (!entity) return null;

        const requiredFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
        const missingFields = requiredFields.filter(field =>
            !entity[field] || entity[field].toString().trim() === ''
        );

        return {
            isComplete: missingFields.length === 0,
            missingFields,
            missingLabels: missingFields.map(field => {
                const labels = {
                    phone: 'Telefone',
                    nut1: 'Distrito',
                    nut2: 'Concelho',
                    nut3: 'Freguesia',
                    nut4: 'Localidade'
                };
                return labels[field] || field;
            })
        };
    };

    const entityValidation = getEntityValidationStatus(entityData);
    const representativeValidation = getEntityValidationStatus(representativeData);

    // Componente para mostrar dados da entidade
    const EntityDataDisplay = ({ entity, validation, title, icon }) => {
        if (!entity) return null;

        const isComplete = validation?.isComplete;

        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    borderLeft: isComplete
                        ? `4px solid ${theme.palette.success.main}`
                        : `4px solid ${theme.palette.warning.main}`,
                    bgcolor: isComplete
                        ? alpha(theme.palette.success.main, 0.1)
                        : alpha(theme.palette.warning.main, 0.1)
                }}
            >
                {/* Header com título à esquerda e status à direita */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                        {icon}
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ ml: 1 }}>
                            {title}
                        </Typography>
                    </Box>

                    {/* Status do lado direito */}
                    {isComplete ? (
                        <Typography variant="body2" color="success.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleIcon fontSize="small" />
                            Dados completos
                        </Typography>
                    ) : (
                        <Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WarningIcon fontSize="small" />
                            Dados incompletos
                        </Typography>
                    )}
                </Box>

                <Typography variant="h6" fontWeight="medium" gutterBottom sx={{ color: 'text.primary' }}>
                    {entity.name}
                </Typography>

                {isComplete ? (
                    /* Contactos quando dados completos */
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {entity.email && (
                            <Typography variant="body2" color="text.secondary">
                                📧 {entity.email}
                            </Typography>
                        )}
                        {entity.phone && (
                            <Typography variant="body2" color="text.secondary">
                                📞 {entity.phone}
                            </Typography>
                        )}
                    </Box>
                ) : (
                    /* Botão de actualizar quando dados incompletos */
                    <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => {
                                entityDataHook.setEntityToUpdate(entity);
                                entityDataHook.setEntityDetailOpen(true);
                            }}
                        >
                            Actualizar
                        </Button>
                    </Box>
                )}
            </Paper>
        );
    };

    return (
        <Box>
            {/* Controlos superiores */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3, pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
            >
                {isInterProfile && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isInternal}
                                onChange={handleInternalSwitch}
                            />
                        }
                        label="Pedido Interno"
                    />
                )}
                <FormControlLabel
                    label="É o representante legal?"
                    control={
                        <Checkbox
                            checked={isRepresentative}
                            onChange={handleRepresentativeToggle}
                            disabled={isInternal}
                            color="secondary"
                        />
                    }
                    labelPlacement="start"
                    sx={{ m: 0 }}
                />
            </Box>

            {/* Layout duas colunas */}
            <Grid container spacing={3}>
                {/* COLUNA ESQUERDA - Inputs */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            height: '100%'
                        }}
                    >
                        {/* Input da entidade principal */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderLeft: `4px solid ${theme.palette.primary.main}`
                            }}
                        >
                            <Box display="flex" alignItems="center" mb={2}>
                                <BusinessIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">
                                    Identificação da Entidade
                                </Typography>
                            </Box>

                            <EntitySearchField
                                value={formData.nipc}
                                onChange={handleNipcChange}
                                onEntityFound={setEntityData}
                                entityData={null} // Não mostrar card aqui
                                error={!!errors.nipc}
                                helperText={errors.nipc}
                                name="nipc"
                                disabled={isInternal}
                            />
                        </Paper>

                        {/* Input do representante (se activado) */}
                        {isRepresentative && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderLeft: `4px solid ${theme.palette.secondary.main}`
                                }}
                            >
                                <Box display="flex" alignItems="center" mb={2}>
                                    <PersonIcon color="secondary" sx={{ mr: 1 }} />
                                    <Typography variant="h6">
                                        Dados do Representante
                                    </Typography>
                                </Box>
                                <EntitySearchField
                                    value={formData.tb_representative}
                                    onChange={(e) => {
                                        handleChange(e);
                                        if (e.target.value?.length === 9) {
                                            entityDataHook.checkRepresentativeData(e.target.value);
                                        }
                                    }}
                                    onEntityFound={setRepresentativeData}
                                    entityData={null}
                                    error={!!errors.tb_representative}
                                    helperText={errors.tb_representative}
                                    name="tb_representative"
                                />
                            </Paper>
                        )}
                    </Box>
                </Grid>

                {/* COLUNA DIREITA - Dados das entidades */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            height: '100%'
                        }}
                    >
                        {/* Dados da entidade principal */}
                        {entityData ? (
                            <EntityDataDisplay
                                entity={entityData}
                                validation={entityValidation}
                                title="Entidade Principal"
                                icon={<BusinessIcon color="primary" />}
                            />
                        ) : (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 3,
                                    textAlign: 'center',
                                    bgcolor: 'background.default',
                                    border: `2px dashed ${theme.palette.divider}`
                                }}
                            >
                                <BusinessIcon
                                    sx={{
                                        fontSize: 48,
                                        color: 'text.disabled',
                                        mb: 1
                                    }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                    Introduza um NIF válido para ver os dados da entidade
                                </Typography>
                            </Paper>
                        )}

                        {/* Dados do representante */}
                        {isRepresentative && (
                            representativeData ? (
                                <EntityDataDisplay
                                    entity={representativeData}
                                    validation={representativeValidation}
                                    title="Representante Legal"
                                    icon={<PersonIcon color="secondary" />}
                                />
                            ) : (
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 3,
                                        textAlign: 'center',
                                        bgcolor: 'background.default',
                                        border: `2px dashed ${theme.palette.divider}`
                                    }}
                                >
                                    <PersonIcon
                                        sx={{
                                            fontSize: 48,
                                            color: 'text.disabled',
                                            mb: 1
                                        }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        Introduza o NIF do representante legal
                                    </Typography>
                                </Paper>
                            )
                        )}
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default IdentificationStep;