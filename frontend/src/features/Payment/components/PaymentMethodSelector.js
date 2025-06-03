import React from 'react';
import { Box, Card, CardContent, Grid, Typography, Radio, Chip, Avatar } from '@mui/material';
import {
    PhoneAndroid, AccountBalance, Euro, Payments, LocationCity,
    Speed, Security, Schedule
} from '@mui/icons-material';

const methods = {
    MBWAY: {
        label: 'MB WAY',
        icon: PhoneAndroid,
        color: '#3b5998',
        description: 'Pagamento instantâneo via telemóvel',
        features: ['Imediato', 'Seguro'],
        time: 'Instantâneo',
        bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    MULTIBANCO: {
        label: 'Multibanco',
        icon: AccountBalance,
        color: '#0066cc',
        description: 'Referência para ATM ou homebanking',
        features: ['Tradicional', 'Confiável'],
        time: '24h',
        bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    BANK_TRANSFER: {
        label: 'Transferência',
        icon: Payments,
        color: '#00897b',
        description: 'Transferência bancária manual',
        features: ['Manual', 'Validação'],
        time: '1-3 dias',
        bgGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    CASH: {
        label: 'Numerário',
        icon: Euro,
        color: '#4caf50',
        description: 'Pagamento em dinheiro presencial',
        features: ['Presencial', 'Validação'],
        time: 'Imediato',
        bgGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    MUNICIPALITY: {
        label: 'Municípios',
        icon: LocationCity,
        color: '#795548',
        description: 'Pagamento nos balcões municipais',
        features: ['Presencial', 'Validação'],
        time: '1-2 dias',
        bgGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }
};

const PaymentMethodSelector = ({ availableMethods, selectedMethod, onSelect, amount }) => {
    const handleSelect = (method) => {
        onSelect(method);
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                    Escolha como pagar
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 500 }}>
                    €{Number(amount || 0).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Selecione o método de pagamento preferido
                </Typography>
            </Box>

            {/* Methods Grid */}
            <Grid container spacing={3}>
                {availableMethods.map((methodId) => {
                    const method = methods[methodId];
                    if (!method) return null;

                    const Icon = method.icon;
                    const isSelected = selectedMethod === methodId;

                    return (
                        <Grid item xs={12} sm={6} md={4} key={methodId}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    height: '100%',
                                    border: isSelected ? 3 : 1,
                                    borderColor: isSelected ? method.color : 'divider',
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.3s ease-in-out',
                                    background: isSelected ? method.bgGradient : 'white',
                                    color: isSelected ? 'white' : 'inherit',
                                    boxShadow: isSelected ? `0 8px 25px ${method.color}40` : 1,
                                    '&:hover': {
                                        transform: 'scale(1.02)',
                                        boxShadow: `0 8px 25px ${method.color}30`,
                                        borderColor: method.color
                                    }
                                }}
                                onClick={() => handleSelect(methodId)}
                            >
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    {/* Method Icon & Radio */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Avatar
                                            sx={{
                                                bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : `${method.color}15`,
                                                width: 56,
                                                height: 56
                                            }}
                                        >
                                            <Icon
                                                sx={{
                                                    fontSize: 32,
                                                    color: isSelected ? 'white' : method.color
                                                }}
                                            />
                                        </Avatar>
                                        <Radio
                                            checked={isSelected}
                                            sx={{
                                                color: isSelected ? 'white' : method.color,
                                                '&.Mui-checked': { color: isSelected ? 'white' : method.color }
                                            }}
                                        />
                                    </Box>

                                    {/* Method Name */}
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                        {method.label}
                                    </Typography>

                                    {/* Description */}
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            mb: 2,
                                            opacity: isSelected ? 0.9 : 0.7,
                                            minHeight: 40,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {method.description}
                                    </Typography>

                                    {/* Features */}
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2 }}>
                                        {method.features.map((feature, idx) => (
                                            <Chip
                                                key={idx}
                                                label={feature}
                                                size="small"
                                                sx={{
                                                    bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : `${method.color}15`,
                                                    color: isSelected ? 'white' : method.color,
                                                    fontSize: '0.75rem'
                                                }}
                                            />
                                        ))}
                                    </Box>

                                    {/* Processing Time */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <Schedule sx={{ fontSize: 16, opacity: 0.7 }} />
                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                            {method.time}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Security Notice */}
            <Box
                sx={{
                    mt: 4,
                    p: 2,
                    backgroundColor: 'grey.50',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}
            >
                <Security color="primary" />
                <Typography variant="body2" color="text.secondary">
                    Todos os pagamentos são processados de forma segura e encriptada
                </Typography>
            </Box>
        </Box>
    );
};

export default PaymentMethodSelector;