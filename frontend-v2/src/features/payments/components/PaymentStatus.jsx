import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { CheckCircle, Schedule, Euro } from '@mui/icons-material';

const PaymentStatus = ({ transactionId, onComplete }) => {
    const getStatusInfo = () => {
        if (transactionId?.startsWith('MANUAL-')) {
            return {
                icon: <Schedule sx={{ fontSize: 60, color: 'warning.main' }} />,
                title: 'Pagamento Registado',
                message: 'O seu pagamento foi registado e aguarda validação.',
                color: 'warning',
                details: `ID: ${transactionId}`
            };
        }

        return {
            icon: <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />,
            title: 'Pagamento Processado',
            message: 'O seu pagamento foi processado com sucesso.',
            color: 'success',
            details: `ID: ${transactionId}`
        };
    };

    const status = getStatusInfo();

    return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
            {status.icon}
            <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{status.title}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{status.message}</Typography>
            <Button variant="contained" onClick={onComplete} startIcon={<Euro />} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', px: 4 }}>
                Concluir
            </Button>
        </Box>
    );
};

export default PaymentStatus;
