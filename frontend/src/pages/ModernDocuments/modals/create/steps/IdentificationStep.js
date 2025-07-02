import React from 'react';
import {
    Grid,
    Typography,
    Box,
    FormControlLabel,
    Checkbox,
    useTheme,
    Divider
} from '@mui/material';
import {
    Business as BusinessIcon,
    Person as PersonIcon
} from '@mui/icons-material';

// Componentes personalizados
import EntitySearchField from '../fields/EntitySearchField';

const IdentificationStep = ({
    formData,
    handleChange,
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
                            borderLeft: entityData ? `3px solid ${theme.palette.success.main}` : `3px solid ${theme.palette.primary.main}`,
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
                            onChange={handleChange}
                            onEntityFound={setEntityData}
                            entityData={entityData}
                            error={!!errors.nipc}
                            helperText={errors.nipc}
                            name="nipc"
                            disabled={isInternal}
                        />
                    </Box>
                </Grid>

                <Grid size={{ xs: 12 }} md={isRepresentative ? 6 : 12}>

                    {isRepresentative && (
                        <Box
                            sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderLeft: representativeData ? `3px solid ${theme.palette.success.main}` : `3px solid ${theme.palette.secondary.main}`,
                                borderRadius: 1,
                                p: 2,
                                // mt: 2
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
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default IdentificationStep;