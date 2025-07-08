import {
    Euro,
    LocationCity,
    Lock,
    Payments,
    Schedule
} from '@mui/icons-material';
import { Avatar, Box, Card, CardContent, Chip, Grid, Radio, Typography } from '@mui/material';
import { canUsePaymentMethod, PAYMENT_METHOD_LABELS } from '../services/paymentTypes';

// Ícones SIBS reais
const MBWayIcon = ({ sx, ...props }) => (
    <img
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Logo_MBWay.svg/512px-Logo_MBWay.svg.png?20201121193832"
        alt="MB Way"
        style={{ width: 48, height: 24, ...sx }}
        {...props}
    />
);

const MultibancoIcon = ({ sx, ...props }) => (
    <img
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Multibanco.svg/512px-Multibanco.svg.png?20201121201922"
        alt="Multibanco"
        style={{ width: 24, height: 34, ...sx }}
        {...props}
    />
);

const methods = {
    MBWAY: {
        label: PAYMENT_METHOD_LABELS.MBWAY,
        icon: MBWayIcon,
        color: '#3b5998',
        description: 'Pagamento via telemóvel',
        features: ['Imediato'],
        time: 'Instantâneo',
        bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        requiresCheckout: true
    },
    MULTIBANCO: {
        label: PAYMENT_METHOD_LABELS.MULTIBANCO,
        icon: MultibancoIcon,
        color: '#0066cc',
        description: 'Referência ATM/homebanking',
        features: ['Tradicional'],
        time: '24h',
        bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        requiresCheckout: true
    },
    BANK_TRANSFER: {
        label: PAYMENT_METHOD_LABELS.BANK_TRANSFER,
        icon: Payments,
        color: '#00897b',
        description: 'Transferência bancária',
        features: ['Manual'],
        time: '1-3 dias',
        bgGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        requiresCheckout: false
    },
    CASH: {
        label: PAYMENT_METHOD_LABELS.CASH,
        icon: Euro,
        color: '#4caf50',
        description: 'Pagamento presencial',
        features: ['Presencial'],
        time: 'Imediato',
        bgGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        requiresCheckout: false
    },
    MUNICIPALITY: {
        label: PAYMENT_METHOD_LABELS.MUNICIPALITY,
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
    sibsReady = false,
    internalReady = false,
    loading = false,
    user
}) => {

    const isMethodAvailable = (methodId) => {
        const method = methods[methodId];
        if (!method || loading) return false;

        // SIBS: precisa de sibsReady
        if (method.requiresCheckout) return sibsReady;

        // Manual: precisa de internalReady
        return internalReady;
    };

    // Usar gestão centralizada de permissões
    const filteredMethods = availableMethods.filter(method =>
        canUsePaymentMethod(user?.profil, method, user?.user_id)
    );

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Escolha como pagar
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 500 }}>
                    €{Number(amount || 0).toFixed(2)}
                </Typography>
            </Box>

            <Grid container spacing={2}>
                {filteredMethods.map((methodId) => {
                    const method = methods[methodId];
                    if (!method) return null;

                    const Icon = method.icon;
                    const isSelected = selectedMethod === methodId;
                    const isAvailable = isMethodAvailable(methodId);

                    return (
                        <Grid size={{ xs: 12, sm: 6 }} lg={4} key={methodId}>
                            <Card
                                sx={{
                                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                                    height: '100%',
                                    border: isSelected ? 2 : 1,
                                    borderColor: isSelected ? method.color : 'divider',
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.3s ease',
                                    background: isSelected ? method.bgGradient : 'white',
                                    color: isSelected ? 'white' : 'inherit',
                                    opacity: isAvailable ? 1 : 0.4,
                                    position: 'relative',
                                    '&:hover': isAvailable ? {
                                        transform: 'scale(1.02)',
                                        borderColor: method.color
                                    } : {}
                                }}
                                onClick={() => isAvailable && onSelect(methodId)}
                            >
                                <CardContent sx={{ p: 2 }}>
                                    {!isAvailable && (
                                        <Lock sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            fontSize: 16,
                                            opacity: 0.5
                                        }} />
                                    )}

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                        <Avatar
                                            sx={{
                                                bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : `${method.color}15`,
                                                width: 40,
                                                height: 40
                                            }}
                                        >
                                            <Icon sx={{ color: isSelected ? 'white' : method.color }} />
                                        </Avatar>
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

                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        {method.label}
                                    </Typography>

                                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 1.5 }}>
                                        {method.description}
                                    </Typography>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Chip
                                            label={method.features[0]}
                                            size="small"
                                            sx={{
                                                bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : `${method.color}15`,
                                                color: isSelected ? 'white' : method.color,
                                                fontSize: '0.7rem',
                                                height: 24
                                            }}
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Schedule sx={{ fontSize: 12, opacity: 0.7 }} />
                                            <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                                {method.time}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Status indicator */}
                                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                                        {method.requiresCheckout ? (
                                            <Chip
                                                label={sibsReady ? "Pronto" : "A preparar..."}
                                                size="small"
                                                color={sibsReady ? "success" : "warning"}
                                                sx={{ fontSize: '0.65rem', height: 20 }}
                                            />
                                        ) : (
                                            <Chip
                                                label={internalReady ? "Disponível" : "A preparar..."}
                                                size="small"
                                                color={internalReady ? "success" : "warning"}
                                                sx={{ fontSize: '0.65rem', height: 20 }}
                                            />
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Debug info (apenas dev) */}
            {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', fontSize: '0.7rem' }}>
                    SIBS: {sibsReady ? '✅' : '❌'} | Internal: {internalReady ? '✅' : '❌'} | Loading: {loading ? '⏳' : '✅'}
                    <br />
                    Métodos permitidos: {filteredMethods.join(', ')}
                </Box>
            )}
        </Box>
    );
};

export default PaymentMethodSelector;