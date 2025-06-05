import React from 'react';
import { Box, Card, CardContent, Grid, Typography, Radio, Chip } from '@mui/material';
import {
    Euro, Payments, LocationCity, Schedule, Lock
} from '@mui/icons-material';

const methods = {
    MBWAY: {
        label: 'MB WAY',
        color: '#3b5998',
        description: 'Pagamento via telemóvel',
        features: ['Imediato'],
        time: 'Instantâneo',
        bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Logo_MBWay.svg/512px-Logo_MBWay.svg.png',
        requiresCheckout: true
    },
    MULTIBANCO: {
        label: 'Multibanco',
        color: '#0066cc',
        description: 'Referência ATM/homebanking',
        features: ['Tradicional'],
        time: '24h',
        bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Multibanco.svg/512px-Multibanco.svg.png',
        requiresCheckout: true
    },
    BANK_TRANSFER: {
        label: 'Transferência',
        icon: Payments,
        color: '#00897b',
        description: 'Transferência bancária',
        features: ['Manual'],
        time: '1-3 dias',
        bgGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        requiresCheckout: false
    },
    CASH: {
        label: 'Numerário',
        icon: Euro,
        color: '#4caf50',
        description: 'Pagamento presencial',
        features: ['Presencial'],
        time: 'Imediato',
        bgGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        requiresCheckout: false
    },
    MUNICIPALITY: {
        label: 'Municípios',
        icon: LocationCity,
        color: '#795548',
        description: 'Balcões municipais',
        features: ['Presencial'],
        time: '1-2 dias',
        bgGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        requiresCheckout: false
    }
};

const PaymentMethodSelector = ({
    availableMethods,
    selectedMethod,
    onSelect,
    amount,
    transactionId,
    checkoutLoading = false
}) => {
    const isMethodAvailable = (methodId) => {
        const method = methods[methodId];
        if (!method) return false;
        if (method.requiresCheckout) {
            return !!transactionId && !checkoutLoading;
        }
        return true;
    };

    const handleSelect = (methodId) => {
        if (isMethodAvailable(methodId)) {
            onSelect(methodId);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Escolha como pagar
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 500 }}>
                    €{Number(amount || 0).toFixed(2)}
                </Typography>
            </Box>

            {/* Grid */}
            <Grid container spacing={2}>
                {availableMethods.map((methodId) => {
                    const method = methods[methodId];
                    if (!method) return null;

                    const Icon = method.icon;
                    const isSelected = selectedMethod === methodId;
                    const isAvailable = isMethodAvailable(methodId);

                    return (
                        <Grid item xs={12} sm={6} lg={4} key={methodId}>
                            <Card
                                sx={{
                                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                                    height: 140,
                                    border: isSelected ? 2 : 1,
                                    borderColor: isSelected ? method.color : 'divider',
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.3s ease',
                                    background: isSelected ? method.bgGradient : 'white',
                                    color: isSelected ? 'white' : 'inherit',
                                    opacity: isAvailable ? 1 : 0.4,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover': isAvailable ? {
                                        transform: 'scale(1.02)',
                                        borderColor: method.color
                                    } : {}
                                }}
                                onClick={() => handleSelect(methodId)}
                            >
                                {/* Logo como fundo para SIBS */}
                                {method.logoUrl && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: 80,
                                            height: 80,
                                            backgroundImage: `url(${method.logoUrl})`,
                                            backgroundSize: 'contain',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center',
                                            opacity: isSelected ? 0.3 : 0.1,
                                            transition: 'opacity 0.3s ease'
                                        }}
                                    />
                                )}

                                <CardContent sx={{ p: 2, position: 'relative', zIndex: 1 }}>
                                    {/* Header */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {/* Ícone só para não-SIBS */}
                                            {Icon && !method.logoUrl && (
                                                <Icon sx={{
                                                    fontSize: 24,
                                                    color: isSelected ? 'white' : method.color
                                                }} />
                                            )}
                                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                                                {method.label}
                                            </Typography>
                                        </Box>

                                        <Radio
                                            checked={isSelected}
                                            disabled={!isAvailable}
                                            size="small"
                                            sx={{
                                                color: isSelected ? 'white' : method.color,
                                                '&.Mui-checked': { color: isSelected ? 'white' : method.color }
                                            }}
                                        />
                                    </Box>

                                    {/* Lock */}
                                    {!isAvailable && method.requiresCheckout && (
                                        <Lock sx={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            fontSize: 16,
                                            opacity: 0.5
                                        }} />
                                    )}

                                    {/* Descrição */}
                                    <Typography variant="body2" sx={{
                                        opacity: 0.8,
                                        mb: 2,
                                        fontSize: '0.8rem'
                                    }}>
                                        {method.description}
                                    </Typography>

                                    {/* Bottom info */}
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        position: 'absolute',
                                        bottom: 16,
                                        left: 16,
                                        right: 16
                                    }}>
                                        <Chip
                                            label={method.features[0]}
                                            size="small"
                                            sx={{
                                                bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : `${method.color}15`,
                                                color: isSelected ? 'white' : method.color,
                                                fontSize: '0.7rem',
                                                height: 20
                                            }}
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Schedule sx={{ fontSize: 10, opacity: 0.7 }} />
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                                {method.time}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Status SIBS */}
                                    {method.requiresCheckout && (
                                        <Box sx={{
                                            position: 'absolute',
                                            bottom: 45,
                                            left: 16,
                                            right: 16
                                        }}>
                                            {checkoutLoading && (
                                                <Chip label="A preparar..." size="small" color="warning" sx={{ fontSize: '0.6rem', height: 18 }} />
                                            )}
                                            {!checkoutLoading && !transactionId && (
                                                <Chip label="Aguarda" size="small" color="default" sx={{ fontSize: '0.6rem', height: 18 }} />
                                            )}
                                            {!checkoutLoading && transactionId && (
                                                <Chip label="Pronto" size="small" color="success" sx={{ fontSize: '0.6rem', height: 18 }} />
                                            )}
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Info checkout */}
            {checkoutLoading && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        A preparar checkout SIBS...
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default PaymentMethodSelector;