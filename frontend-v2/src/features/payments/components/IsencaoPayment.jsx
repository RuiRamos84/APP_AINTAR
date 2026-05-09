import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Paper,
    Divider,
    alpha,
    useTheme,
} from '@mui/material';
import {
    VerifiedUser as VerifiedIcon,
    CheckCircle as CheckIcon,
    AttachFile as AttachIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';

/**
 * IsencaoPayment — Confirmar isenção a 0€ após validação de comprovativo.
 * O operador já abriu e validou o anexo (fatura de saneamento em conta),
 * e usa este componente para registar a isenção de forma imediata.
 */
const IsencaoPayment = ({ documentId, regnumber, onSuccess }) => {
    const theme = useTheme();
    const [done, setDone] = useState(false);

    const { mutate: apply, isLoading, error } = useMutation({
        mutationFn: () => paymentService.applyExemption(documentId),
        onSuccess: (result) => {
            setDone(true);
            onSuccess?.({ payment_status: 'SUCCESS', ...result });
        },
    });

    if (done) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <CheckIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={700} color="success.main" gutterBottom>
                    Isenção Confirmada
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    O pedido <strong>{regnumber}</strong> foi registado como isento a 0,00 €.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Cabeçalho */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    bgcolor: alpha('#9c27b0', 0.1),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <VerifiedIcon sx={{ color: '#9c27b0', fontSize: 26 }} />
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Confirmar Isenção</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Pedido {regnumber}
                    </Typography>
                </Box>
            </Box>

            {/* Resumo */}
            <Paper
                variant="outlined"
                sx={{
                    borderRadius: 3, overflow: 'hidden', mb: 3,
                    borderColor: alpha('#9c27b0', 0.3),
                    bgcolor: alpha('#9c27b0', 0.03),
                }}
            >
                <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Valor a pagar</Typography>
                    <Typography variant="h5" fontWeight={800} color="#9c27b0">
                        0,00 €
                    </Typography>
                </Box>
                <Divider />
                <Box sx={{ px: 2.5, py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        Modalidade: <strong>Isenção</strong> — taxa de saneamento liquidada em conta de água
                    </Typography>
                </Box>
            </Paper>

            {/* Aviso de responsabilidade */}
            <Alert
                severity="info"
                icon={<AttachIcon fontSize="small" />}
                sx={{ mb: 3, borderRadius: 2, fontSize: '0.8rem' }}
            >
                Ao confirmar, está a declarar que validou o comprovativo de pagamento da taxa de saneamento
                em conta de água e que o mesmo é válido e correspondente a este pedido.
            </Alert>

            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error.response?.data?.error || error.message || 'Erro ao aplicar isenção.'}
                </Alert>
            )}

            <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => apply()}
                disabled={isLoading}
                startIcon={isLoading
                    ? <CircularProgress size={18} color="inherit" />
                    : <VerifiedIcon />
                }
                sx={{
                    borderRadius: 2.5,
                    py: 1.5,
                    fontWeight: 700,
                    bgcolor: '#9c27b0',
                    '&:hover': { bgcolor: '#7b1fa2' },
                    boxShadow: `0 6px 20px ${alpha('#9c27b0', 0.35)}`,
                }}
            >
                {isLoading ? 'A registar…' : 'Confirmar Isenção'}
            </Button>
        </Box>
    );
};

export default IsencaoPayment;
