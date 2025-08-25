import React, { useEffect, useState } from 'react';
import {
    Grid, Typography, Box, FormControlLabel, Checkbox, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, Button
} from '@mui/material';
import { LocationOn as LocationIcon, Warning as WarningIcon } from '@mui/icons-material';
import ModernAddressForm from '../../../../../components/AddressForm/ModernAddressForm';

const AddressStep = ({
    entityData, entityAddress, requestAddress, setRequestAddress,
    isCustomRequestAddress, handleCustomAddressToggle, errors, isInternal
}) => {
    const [showAddressDialog, setShowAddressDialog] = useState(false);
    const [hasShownInternalDialog, setHasShownInternalDialog] = useState(false);

    const displayAddress = `${entityAddress.postal || 'N/A'}, ${entityAddress.address || 'N/A'}, ${entityAddress.floor || 'N/A'}, ${entityAddress.nut4 || ''}`;

    // ✅ Pre-seleccionar para pedidos internos com confirmação
    useEffect(() => {
        if (isInternal && !hasShownInternalDialog && entityData) {
            setShowAddressDialog(true);
            setHasShownInternalDialog(true);
        }
    }, [isInternal, hasShownInternalDialog, entityData]);

    const handleInternalAddressConfirm = (useDifferentAddress) => {
        setShowAddressDialog(false);
        handleCustomAddressToggle(useDifferentAddress);

        if (useDifferentAddress) {
            // ✅ Morada diferente - limpar campos para preenchimento manual
            setRequestAddress({
                postal: '', address: '', door: '', floor: '',
                nut1: '', nut2: '', nut3: '', nut4: ''
            });
        } else {
            // ✅ Mesma morada - copiar da entidade
            setRequestAddress({ ...entityAddress });
        }
    };

    const handleAddressToggle = (e) => {
        const isDifferent = e.target.checked;

        if (isDifferent) {
            // ✅ Checkbox marcado - limpar para preenchimento manual
            setRequestAddress({
                postal: '', address: '', door: '', floor: '',
                nut1: '', nut2: '', nut3: '', nut4: ''
            });
        } else {
            // ✅ Checkbox desmarcado - usar morada da entidade
            setRequestAddress({ ...entityAddress });
        }

        handleCustomAddressToggle(isDifferent);
    };

    return (
        <>
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
                                    disabled={isInternal && showAddressDialog}
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
                        disabled={!isCustomRequestAddress}
                        title=""
                        skipPaper={true}
                    />
                </Grid>
            </Grid>

            {/* ✅ Diálogo para pedidos internos */}
            <Dialog open={showAddressDialog} onClose={() => { }}>
                <DialogTitle>
                    <Box display="flex" alignItems="center">
                        <WarningIcon color="warning" sx={{ mr: 1 }} />
                        Pedido Interno - Confirmar Morada
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        A morada do pedido é <strong>a mesma</strong> da morada da entidade?
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            <strong>Morada da entidade:</strong><br />
                            {displayAddress}
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => handleInternalAddressConfirm(false)}
                        variant="outlined"
                    >
                        Não, usar a mesma morada
                    </Button>
                    <Button
                        onClick={() => handleInternalAddressConfirm(true)}
                        variant="contained"
                        color="primary"
                    >
                        Sim, morada diferente
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AddressStep;