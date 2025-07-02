import React, { useEffect } from 'react';
import {
    Grid,
    Typography,
    Box,
    Paper,
    FormControlLabel,
    Checkbox,
    useTheme,
    Alert
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    LocalShipping as ShippingIcon
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
    isInternal
}) => {
    const theme = useTheme();

    // Logs para depuração
    // useEffect(() => {
    //     console.log("AddressStep - billingAddress:", billingAddress);
    //     console.log("AddressStep - shippingAddress:", shippingAddress);
    //     console.log("AddressStep - isEntityFound:", isEntityFound);
    // }, [billingAddress, shippingAddress, isEntityFound]);

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                        <LocationIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            Morada de Pedido
                        </Typography>
                    </Box>

                    {isEntityFound && (
                        <Alert severity="success" sx={{ ml: 2, flexGrow: 1 }}>
                            Os dados da morada foram preenchidos automaticamente com os dados da entidade. Queira validar se correspondem aos dados po pedido.
                        </Alert>
                    )}
                </Box>

                {/* Passamos title="" para não mostrar o título dentro do ModernAddressForm */}
                <ModernAddressForm
                    addressData={billingAddress}
                    setAddressData={setBillingAddress}
                    errors={errors}
                    required={!isInternal}
                    isAutoFilled={isEntityFound}
                    title=""
                    skipPaper={true}
                />
            </Grid>

            <Grid size={{ xs: 12 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={isDifferentAddress}
                            onChange={handleDifferentAddressToggle}
                            disabled={isInternal}
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
                    />
                </Grid>
            )}
        </Grid>
    );
};

export default AddressStep;