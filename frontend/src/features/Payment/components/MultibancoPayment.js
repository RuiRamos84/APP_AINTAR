import React, { useState, useContext } from 'react';
import {
    Box, Button, Typography, Alert, CircularProgress,
    Paper, Grid, Chip, IconButton
} from '@mui/material';
import { ContentCopy as CopyIcon, AccountBalance as BankIcon } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';

const MultibancoPayment = ({ onSuccess }) => {
    const { state, payWithMultibanco } = useContext(PaymentContext);
    const [reference, setReference] = useState(null);
    const [copied, setCopied] = useState({ entity: false, ref: false });

    const handleGenerate = async () => {
        try {
            const result = await payWithMultibanco();
            setReference(result.reference);
            onSuccess?.(result);
        } catch (err) {
            console.error(err);
        }
    };

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopied({ ...copied, [field]: true });
        setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
    };

    if (reference) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Referência Multibanco
                </Typography>

                <Paper sx={{ p: 3, mb: 2, bgcolor: 'primary.light', color: 'white' }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2">Entidade</Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h5" fontFamily="monospace">
                                    {reference.entity}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(reference.entity, 'entity')}
                                    sx={{ color: 'white' }}
                                >
                                    <CopyIcon fontSize="small" />
                                </IconButton>
                            </Box>
                            {copied.entity && <Chip label="Copiado!" size="small" />}
                        </Grid>

                        <Grid item xs={12} sm={8}>
                            <Typography variant="subtitle2">Referência</Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h5" fontFamily="monospace">
                                    {reference.reference}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(reference.reference, 'ref')}
                                    sx={{ color: 'white' }}
                                >
                                    <CopyIcon fontSize="small" />
                                </IconButton>
                            </Box>
                            {copied.ref && <Chip label="Copiado!" size="small" />}
                        </Grid>
                    </Grid>
                </Paper>

                <Alert severity="info">
                    Use estes dados no Multibanco ou homebanking para efectuar o pagamento.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
            <BankIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />

            <Typography variant="h6" gutterBottom>
                Gerar Referência Multibanco
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
                Clique para gerar a referência e pagar no Multibanco
            </Typography>

            <Button
                variant="contained"
                size="large"
                onClick={handleGenerate}
                disabled={state.loading}
                startIcon={state.loading ? <CircularProgress size={20} /> : <BankIcon />}
            >
                {state.loading ? 'A gerar...' : 'Gerar Referência'}
            </Button>
        </Box>
    );
};

export default MultibancoPayment;