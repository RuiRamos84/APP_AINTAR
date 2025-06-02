import React, { useState, useContext } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress,
    Autocomplete
} from '@mui/material';
import { LocationCity as MunicipalityIcon } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';

const municipalities = [
    'Lisboa', 'Porto', 'Setúbal', 'Almada', 'Seixal', 'Barreiro',
    'Montijo', 'Alcochete', 'Moita', 'Sesimbra'
];

const MunicipalityPayment = ({ onSuccess, userInfo }) => {
    const { state, payManual } = useContext(PaymentContext);
    const [formData, setFormData] = useState({
        municipality: '',
        reference: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');

    const hasPermission = userInfo && ['0', '2'].includes(userInfo.profil);

    const validateForm = () => {
        if (!formData.municipality) return 'Município obrigatório';
        if (!formData.reference.trim()) return 'Referência obrigatória';
        if (!formData.paymentDate) return 'Data obrigatória';
        return null;
    };

    const handlePay = async () => {
        const validation = validateForm();
        if (validation) {
            setError(validation);
            return;
        }

        setError('');
        try {
            const details = {
                municipality: formData.municipality,
                paymentReference: formData.reference,
                paymentDate: formData.paymentDate,
                paymentLocation: `Município de ${formData.municipality}`
            };

            const result = await payManual('MUNICIPALITY', details);
            onSuccess?.(result);
        } catch (err) {
            setError(err.message);
        }
    };

    if (!hasPermission) {
        return (
            <Alert severity="warning" sx={{ m: 3 }}>
                Sem permissão para este método.
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <MunicipalityIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6">Pagamento Municipal</Typography>
                <Typography variant="body2" color="text.secondary">
                    Registo de pagamento nos balcões municipais
                </Typography>
            </Box>

            <Autocomplete
                options={municipalities}
                value={formData.municipality}
                onChange={(_, value) => setFormData(prev => ({ ...prev, municipality: value }))}
                renderInput={(params) => (
                    <TextField {...params} label="Município" required />
                )}
                sx={{ mb: 2 }}
            />

            <TextField
                fullWidth
                required
                label="Referência do pagamento"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Ex: Recibo nº 12345"
                sx={{ mb: 2 }}
            />

            <TextField
                fullWidth
                required
                type="date"
                label="Data do pagamento"
                value={formData.paymentDate}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
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
                disabled={state.loading || !formData.municipality || !formData.reference.trim()}
                startIcon={state.loading ? <CircularProgress size={20} /> : <MunicipalityIcon />}
            >
                {state.loading ? 'A registar...' : 'Registar Pagamento'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
                Necessita validação posterior.
            </Alert>
        </Box>
    );
};

export default MunicipalityPayment;