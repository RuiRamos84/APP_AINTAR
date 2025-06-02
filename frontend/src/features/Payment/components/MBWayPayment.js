import React, { useState, useContext } from 'react';
import {
    Box, Button, TextField, Alert, CircularProgress,
    Typography, InputAdornment
} from '@mui/material';
import { PhoneAndroid as PhoneIcon } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';

const MBWayPayment = ({ onSuccess }) => {
    const { state, payWithMBWay } = useContext(PaymentContext);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const validatePhone = (phone) => {
        const clean = phone.replace(/\s/g, '');
        return /^9\d{8}$/.test(clean);
    };

    const handlePay = async () => {
        if (!validatePhone(phone)) {
            setError('Número inválido (ex: 912345678)');
            return;
        }

        setError('');
        try {
            const result = await payWithMBWay(phone);
            onSuccess?.(result);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Pagamento MB WAY
            </Typography>

            <TextField
                fullWidth
                label="Número de telemóvel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                inputProps={{ maxLength: 9 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <PhoneIcon />
                        </InputAdornment>
                    )
                }}
                sx={{ mb: 2 }}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Button
                fullWidth
                variant="contained"
                onClick={handlePay}
                disabled={state.loading || !phone}
                startIcon={state.loading ? <CircularProgress size={20} /> : null}
            >
                {state.loading ? 'A processar...' : 'Pagar'}
            </Button>
        </Box>
    );
};

export default MBWayPayment;