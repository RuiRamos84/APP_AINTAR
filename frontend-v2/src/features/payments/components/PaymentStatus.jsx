import React, { useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { CheckCircle, Schedule, Euro, VerifiedUser } from '@mui/icons-material';

const PaymentStatus = ({ transactionId, status: paymentResult, onComplete }) => {
    const isIsencao = transactionId?.startsWith('ISENCAO-');
    const isManual = transactionId?.startsWith('MANUAL-');

    // Isenção: fechar automaticamente após breve delay
    useEffect(() => {
        if (isIsencao) {
            const t = setTimeout(() => onComplete?.({ status: 'SUCCESS', transactionId }), 1500);
            return () => clearTimeout(t);
        }
    }, [isIsencao, transactionId, onComplete]);

    const getStatusInfo = () => {
        if (isIsencao) return {
            icon: <VerifiedUser sx={{ fontSize: 60, color: '#9c27b0' }} />,
            title: 'Isenção Confirmada',
            message: 'O pedido foi registado como isento a 0,00 €.',
            btnColor: '#9c27b0',
            btnIcon: <VerifiedUser />,
        };
        if (isManual) return {
            icon: <Schedule sx={{ fontSize: 60, color: 'warning.main' }} />,
            title: 'Pagamento Registado',
            message: 'O pagamento foi registado e aguarda validação.',
            btnColor: null,
            btnIcon: <Euro />,
        };
        return {
            icon: <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />,
            title: 'Pagamento Processado',
            message: 'O pagamento foi processado com sucesso.',
            btnColor: null,
            btnIcon: <Euro />,
        };
    };

    const info = getStatusInfo();

    return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
            {info.icon}
            <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{info.title}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{info.message}</Typography>
            <Button
                variant="contained"
                onClick={() => onComplete?.({ status: paymentResult || 'SUCCESS', transactionId })}
                startIcon={info.btnIcon}
                sx={{
                    px: 4,
                    ...(info.btnColor
                        ? { bgcolor: info.btnColor, '&:hover': { bgcolor: info.btnColor, filter: 'brightness(0.9)' } }
                        : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
                    )
                }}
            >
                Concluir
            </Button>
        </Box>
    );
};

export default PaymentStatus;
