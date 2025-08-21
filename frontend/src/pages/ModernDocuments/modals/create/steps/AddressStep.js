import React, { useEffect, useMemo } from 'react';
import {
    Grid,
    Typography,
    Box,
    Paper,
    FormControlLabel,
    Checkbox,
    useTheme,
    Alert,
    Button
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    LocalShipping as ShippingIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

// Importar o ModernAddressForm
import ModernAddressForm from '../../../../../components/AddressForm/ModernAddressForm';

const AddressStep = ({
    billingAddress,
    setBillingAddress,
    shippingAddress,
    setShippingAddress,
    errors,
    isDifferentAddress,
    handleDifferentAddressToggle,
    isEntityFound,
    isInternal,
    // ✅ Props adicionais necessárias
    entityData,
    setEntityDetailOpen,
    setEntityToUpdate
}) => {
    const theme = useTheme();

    // ✅ Validação dos dados da entidade para campos críticos
    const entityValidation = useMemo(() => {
        if (!entityData) return null;

        const requiredFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
        const missingFields = requiredFields.filter(field =>
            !entityData[field] || entityData[field].toString().trim() === ''
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
    }, [entityData]);

    // ✅ Handler para abrir modal de actualização da entidade
    const handleUpdateEntity = () => {
        if (entityData) {
            setEntityToUpdate(entityData);
            setEntityDetailOpen(true);
        }
    };

    return (
        <Grid container spacing={3}>
            {/* ✅ Alerta crítico se dados da entidade incompletos */}
            {entityData && entityValidation && !entityValidation.isComplete && (
                <Grid size={{ xs: 12 }}>
                    <Alert
                        severity="error"
                        sx={{ mb: 3 }}
                        icon={<WarningIcon />}
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={handleUpdateEntity}
                                variant="outlined"
                                sx={{ ml: 1 }}
                            >
                                Actualizar Entidade
                            </Button>
                        }
                    >
                        <Typography variant="body2" gutterBottom>
                            <strong>Dados da entidade incompletos!</strong>
                        </Typography>
                        <Typography variant="body2">
                            Campos em falta: <strong>{entityValidation.missingLabels.join(', ')}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Complete os dados da entidade antes de prosseguir.
                        </Typography>
                    </Alert>
                </Grid>
            )}

            <Grid size={{ xs: 12 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                        <LocationIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            Morada de Pedido
                        </Typography>
                    </Box>

                    {isEntityFound && entityValidation?.isComplete && (
                        <Alert severity="success" sx={{ ml: 2, flexGrow: 1 }}>
                            Os dados da morada são preenchidos automaticamente com os dados da entidade.
                            Queira validar se correspondem aos dados do pedido.
                        </Alert>
                    )}

                    {isEntityFound && entityValidation && !entityValidation.isComplete && (
                        <Alert severity="warning" sx={{ ml: 2, flexGrow: 1 }}>
                            Dados da entidade incompletos. Complete os dados antes de prosseguir.
                        </Alert>
                    )}
                </Box>

                {/* Passamos title="" para não mostrar o título dentro do ModernAddressForm */}
                <ModernAddressForm
                    addressData={billingAddress}
                    setAddressData={setBillingAddress}
                    errors={errors}
                    required={!isInternal}
                    isAutoFilled={isEntityFound && entityValidation?.isComplete}
                    title=""
                    skipPaper={true}
                    disabled={entityValidation && !entityValidation.isComplete} // ✅ Desabilitar se dados incompletos
                />
            </Grid>

            <Grid size={{ xs: 12 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={isDifferentAddress}
                            onChange={handleDifferentAddressToggle}
                            disabled={isInternal || (entityValidation && !entityValidation.isComplete)}
                        />
                    }
                    label="Morada do pedido diferente da morada de faturação?"
                />
            </Grid>

            {isDifferentAddress && (
                <Grid size={{ xs: 12 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                        <ShippingIcon color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            Morada de Faturação
                        </Typography>
                    </Box>

                    <ModernAddressForm
                        addressData={shippingAddress}
                        setAddressData={setShippingAddress}
                        errors={errors}
                        prefix="shipping"
                        required={!isInternal}
                        variant="secondary"
                        title=""
                        skipPaper={true}
                        disabled={entityValidation && !entityValidation.isComplete} // ✅ Desabilitar se dados incompletos
                    />
                </Grid>
            )}
        </Grid>
    );
};

export default AddressStep;