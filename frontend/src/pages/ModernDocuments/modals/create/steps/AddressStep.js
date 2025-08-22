import React from 'react';
import {
    Grid, Typography, Box, FormControlLabel, Checkbox, Alert
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import ModernAddressForm from '../../../../../components/AddressForm/ModernAddressForm';

const AddressStep = ({
    entityData, entityAddress, requestAddress, setRequestAddress,
    isCustomRequestAddress, handleCustomAddressToggle, errors, isInternal
}) => {
    const displayAddress = `${entityAddress.postal || 'N/A'}, ${entityAddress.address || 'N/A'}, ${entityAddress.floor || 'N/A'}, ${entityAddress.nut4 || ''}`;

    const handleAddressToggle = (e) => {
        const isDifferent = e.target.checked;

        if (isDifferent) {
            // Limpar campos
            setRequestAddress({
                postal: '', address: '', door: '', floor: '',
                nut1: '', nut2: '', nut3: '', nut4: ''
            });
        } else {
            // Usar morada da entidade
            setRequestAddress({ ...entityAddress });
        }

        handleCustomAddressToggle(isDifferent);
    };

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                        <LocationIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Morada do Pedido</Typography>
                    </Box>

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isCustomRequestAddress}
                                onChange={handleAddressToggle}
                                disabled={isInternal}
                            />
                        }
                        label="A morada do pedido é diferente da entidade?"
                        labelPlacement="start"
                        sx={{ marginLeft: 0 }}
                    />
                </Box>

                {entityData && isCustomRequestAddress && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Morada da entidade: {displayAddress}
                    </Alert>
                )}


                <ModernAddressForm
                    addressData={requestAddress}
                    setAddressData={setRequestAddress}
                    errors={errors}
                    required={!isInternal}
                    disabled={!isCustomRequestAddress || isInternal}
                    title=""
                    skipPaper={true}
                />
            </Grid>
        </Grid>
    );
};

export default AddressStep;