// frontend/src/features/Payment/components/PaymentMethodSelector.js

import React from 'react';
import {
    Box,
    Card,
    CardContent,
    FormControlLabel,
    Grid,
    Radio,
    RadioGroup,
    Typography,
    useTheme,
    useMediaQuery,
    Chip
} from '@mui/material';
import {
    CreditCard as CardIcon,
    PhoneAndroid as MBWayIcon,
    AccountBalance as MultibancoIcon,
    Euro as CashIcon,
    Payments as BankTransferIcon,
    LocationCity as MunicipalityIcon
} from '@mui/icons-material';
import {
    PAYMENT_METHODS,
    PAYMENT_METHOD_LABELS,
    canUsePaymentMethod
} from '../services/paymentTypes';
import { useAuth } from '../../../contexts/AuthContext';

const PaymentMethodSelector = ({ onSelect, selectedMethod, availableMethods }) => {
    const theme = useTheme();
    const { user } = useAuth();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    const handleChange = (event) => {
        onSelect(event.target.value);
    };

    // Configuração dos métodos com validação de permissões
    const paymentMethods = [
        {
            id: PAYMENT_METHODS.MBWAY,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.MBWAY],
            icon: <MBWayIcon fontSize={isMobile ? "medium" : "large"} />,
            description: 'Pagamento rápido pelo smartphone',
            color: '#3b5998'
        },
        {
            id: PAYMENT_METHODS.MULTIBANCO,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.MULTIBANCO],
            icon: <MultibancoIcon fontSize={isMobile ? "medium" : "large"} />,
            description: 'Pague no multibanco ou homebanking',
            color: '#0066cc'
        },
        {
            id: PAYMENT_METHODS.BANK_TRANSFER,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.BANK_TRANSFER],
            icon: <BankTransferIcon fontSize={isMobile ? "medium" : "large"} />,
            description: 'Transferência bancária (validação manual)',
            color: '#00897b'
        },
        {
            id: PAYMENT_METHODS.CASH,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CASH],
            icon: <CashIcon fontSize={isMobile ? "medium" : "large"} />,
            description: 'Pagamento em dinheiro (validação manual)',
            color: '#4caf50',
            restricted: true
        },
        {
            id: PAYMENT_METHODS.MUNICIPALITY,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.MUNICIPALITY],
            icon: <MunicipalityIcon fontSize={isMobile ? "medium" : "large"} />,
            description: 'Pague nos balcões municipais',
            color: '#795548',
            restricted: true
        }
    ].filter(method => {
        // Filtrar apenas métodos disponíveis e permitidos
        const isAvailable = availableMethods.includes(method.id);
        const hasPermission = canUsePaymentMethod(user?.profil, method.id);
        return isAvailable && hasPermission;
    });

    // Calcular grid cols baseado em responsividade
    const getGridCols = () => {
        if (isMobile) return 12;
        if (isTablet) return 6;
        return 4;
    };

    return (
        <Box>
            <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                gutterBottom
                sx={{ mb: 2 }}
            >
                Escolha o método de pagamento
            </Typography>

            {paymentMethods.length === 0 && (
                <Typography color="error" align="center">
                    Nenhum método de pagamento disponível para o seu perfil.
                </Typography>
            )}

            <RadioGroup
                value={selectedMethod || ''}
                onChange={handleChange}
            >
                <Grid container spacing={isMobile ? 1 : 2}>
                    {paymentMethods.map((method) => (
                        <Grid item xs={getGridCols()} key={method.id}>
                            <Card
                                variant="outlined"
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    borderColor: selectedMethod === method.id
                                        ? method.color || theme.palette.primary.main
                                        : theme.palette.divider,
                                    backgroundColor: selectedMethod === method.id
                                        ? theme.palette.action.selected
                                        : theme.palette.background.paper,
                                    borderWidth: selectedMethod === method.id ? 2 : 1,
                                    '&:hover': {
                                        borderColor: method.color || theme.palette.primary.main,
                                        boxShadow: theme.shadows[2],
                                        transform: 'translateY(-2px)'
                                    },
                                    position: 'relative',
                                    overflow: 'visible'
                                }}
                                onClick={() => onSelect(method.id)}
                            >
                                {method.restricted && (
                                    <Chip
                                        label="Restrito"
                                        size="small"
                                        color="warning"
                                        sx={{
                                            position: 'absolute',
                                            top: -10,
                                            right: 10,
                                            fontSize: '0.7rem'
                                        }}
                                    />
                                )}

                                <CardContent sx={{
                                    p: isMobile ? 1.5 : 2,
                                    '&:last-child': { pb: isMobile ? 1.5 : 2 }
                                }}>
                                    <Box
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        mb={1}
                                    >
                                        <FormControlLabel
                                            value={method.id}
                                            control={<Radio size={isMobile ? "small" : "medium"} />}
                                            label={
                                                <Typography
                                                    variant={isMobile ? "body2" : "body1"}
                                                    fontWeight="medium"
                                                >
                                                    {method.label}
                                                </Typography>
                                            }
                                            sx={{ flexGrow: 1, m: 0 }}
                                        />
                                        <Box sx={{ color: method.color }}>
                                            {method.icon}
                                        </Box>
                                    </Box>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            display: 'block',
                                            mt: 0.5,
                                            fontSize: isMobile ? '0.7rem' : '0.75rem'
                                        }}
                                    >
                                        {method.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </RadioGroup>

            {/* Informação adicional para métodos restritos */}
            {paymentMethods.some(m => m.restricted) && (
                <Box sx={{
                    mt: 2,
                    p: 1.5,
                    bgcolor: theme.palette.warning.light + '20',
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.warning.light}`
                }}>
                    <Typography variant="caption" color="text.secondary">
                        <strong>Nota:</strong> Alguns métodos de pagamento estão disponíveis apenas para utilizadores específicos.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default PaymentMethodSelector;