import React from 'react';
import {
    Grid,
    Typography,
    Box,
    FormControlLabel,
    Checkbox,
    useTheme,
    Alert,
    Button
} from '@mui/material';
import {
    Business as BusinessIcon,
    Person as PersonIcon,
    Warning as WarningIcon
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
    isInterProfile
}) => {
    const theme = useTheme();

    // ✅ Função para verificar se entidade tem dados incompletos
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

    return (
        <Box>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                    borderBottom: !isRepresentative ? `1px solid ${theme.palette.divider}` : 'none',
                    pb: !isRepresentative ? 2 : 0,
                    mb: 2
                }}
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

            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }} md={isRepresentative ? 6 : 12}>
                    <Box
                        sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderLeft: entityData
                                ? (entityValidation?.isComplete
                                    ? `3px solid ${theme.palette.success.main}`
                                    : `3px solid ${theme.palette.warning.main}`)
                                : `3px solid ${theme.palette.primary.main}`,
                            borderRadius: 1,
                            p: 2
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
                            entityData={entityData}
                            error={!!errors.nipc}
                            helperText={errors.nipc}
                            name="nipc"
                            disabled={isInternal}
                        />

                        {/* ✅ Alerta de dados incompletos */}
                        {entityData && entityValidation && !entityValidation.isComplete && (
                            <Alert
                                severity="warning"
                                sx={{ mt: 2 }}
                                icon={<WarningIcon />}
                            >
                                <Box>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Dados incompletos:</strong>
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>
                                        {entityValidation.missingLabels.join(', ')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Complete os dados para prosseguir correctamente.
                                    </Typography>
                                </Box>
                            </Alert>
                        )}

                        {/* ✅ Confirmação de dados completos */}
                        {entityData && entityValidation?.isComplete && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                Dados da entidade completos ✓
                            </Alert>
                        )}
                    </Box>
                </Grid>

                {isRepresentative && (
                    <Grid size={{ xs: 12 }} md={6}>
                        <Box
                            sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderLeft: representativeData
                                    ? (representativeValidation?.isComplete
                                        ? `3px solid ${theme.palette.success.main}`
                                        : `3px solid ${theme.palette.warning.main}`)
                                    : `3px solid ${theme.palette.secondary.main}`,
                                borderRadius: 1,
                                p: 2,
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
                                onChange={handleChange}
                                onEntityFound={setRepresentativeData}
                                entityData={representativeData}
                                error={!!errors.tb_representative}
                                helperText={errors.tb_representative}
                                name="tb_representative"
                            />

                            {/* ✅ Alerta de dados incompletos do representante */}
                            {representativeData && representativeValidation && !representativeValidation.isComplete && (
                                <Alert
                                    severity="warning"
                                    sx={{ mt: 2 }}
                                    icon={<WarningIcon />}
                                >
                                    <Box>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Dados incompletos:</strong>
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            {representativeValidation.missingLabels.join(', ')}
                                        </Typography>
                                    </Box>
                                </Alert>
                            )}

                            {/* ✅ Confirmação de dados completos do representante */}
                            {representativeData && representativeValidation?.isComplete && (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    Dados do representante completos ✓
                                </Alert>
                            )}
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default IdentificationStep;