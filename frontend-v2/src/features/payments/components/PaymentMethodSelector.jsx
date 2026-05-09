import {
    CheckCircle,
    Euro,
    LocationCity,
    Lock,
    Payments,
    Schedule,
    VerifiedUser,
} from '@mui/icons-material';
import { alpha, Avatar, Box, Chip, Grid, Typography, useTheme } from '@mui/material';
import { PAYMENT_METHOD_LABELS } from '../services/paymentTypes';

const MBWayIcon = () => (
    <img src="/mbway.svg" alt="MB Way" style={{ width: 44, height: 22, objectFit: 'contain' }} />
);

const MultibancoIcon = () => (
    <img src="/multibanco.svg" alt="Multibanco" style={{ width: 26, height: 26, objectFit: 'contain' }} />
);

const methods = {
    MBWAY: {
        label: PAYMENT_METHOD_LABELS.MBWAY,
        icon: MBWayIcon,
        isImage: true,
        color: '#5c6bc0',
        description: 'Pagamento via telemóvel',
        feature: 'Imediato',
        time: 'Instantâneo',
        requiresCheckout: true,
    },
    MULTIBANCO: {
        label: PAYMENT_METHOD_LABELS.MULTIBANCO,
        icon: MultibancoIcon,
        isImage: true,
        color: '#e91e8c',
        description: 'Referência ATM/homebanking',
        feature: 'Tradicional',
        time: '24h',
        requiresCheckout: true,
    },
    BANK_TRANSFER: {
        label: PAYMENT_METHOD_LABELS.BANK_TRANSFER,
        icon: Payments,
        color: '#0288d1',
        description: 'Transferência bancária',
        feature: 'Manual',
        time: '1-3 dias',
        requiresCheckout: false,
    },
    CASH: {
        label: PAYMENT_METHOD_LABELS.CASH,
        icon: Euro,
        color: '#2e7d32',
        description: 'Pagamento presencial',
        feature: 'Presencial',
        time: 'Imediato',
        requiresCheckout: false,
    },
    MUNICIPALITY: {
        label: PAYMENT_METHOD_LABELS.MUNICIPALITY,
        icon: LocationCity,
        color: '#e65100',
        description: 'Balcões municipais',
        feature: 'Presencial',
        time: '1-2 dias',
        requiresCheckout: false,
    },
    ISENCAO: {
        label: PAYMENT_METHOD_LABELS.ISENCAO,
        icon: VerifiedUser,
        color: '#9c27b0',
        description: 'Comprovativo validado — 0,00 €',
        feature: 'Isento',
        time: 'Imediato',
        requiresCheckout: false,
    },
};

const PaymentMethodSelector = ({
    availableMethods,
    selectedMethod,
    onSelect,
    amount,
    sibsReady = false,
    internalReady = false,
    loading = false,
}) => {
    const theme = useTheme();

    const isMethodAvailable = (methodId) => {
        const method = methods[methodId];
        if (!method || loading) return false;
        return method.requiresCheckout ? sibsReady : internalReady;
    };

    const filteredMethods = availableMethods ? availableMethods.filter((m) => methods[m]) : [];

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Amount header */}
            <Box sx={{ textAlign: 'center', mb: 3.5 }}>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Escolha como pagar
                </Typography>
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 3,
                        py: 1,
                        borderRadius: 6,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
                    }}
                >
                    <Typography variant="h5" fontWeight={700} color="white" letterSpacing={1}>
                        €{Number(amount || 0).toFixed(2)}
                    </Typography>
                </Box>
            </Box>

            {/* Method cards */}
            <Grid container spacing={1.5}>
                {filteredMethods.map((methodId) => {
                    const method = methods[methodId];
                    if (!method) return null;

                    const Icon = method.icon;
                    const isSelected = selectedMethod === methodId;
                    const isAvailable = isMethodAvailable(methodId);

                    return (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={methodId}>
                            <Box
                                onClick={() => isAvailable && onSelect(methodId)}
                                sx={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: 2.5,
                                    border: `1.5px solid`,
                                    borderColor: isSelected ? method.color : alpha(theme.palette.divider, 0.8),
                                    borderLeft: isSelected ? `4px solid ${method.color}` : `1.5px solid ${alpha(theme.palette.divider, 0.8)}`,
                                    bgcolor: isSelected ? alpha(method.color, 0.06) : theme.palette.background.paper,
                                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                                    opacity: isAvailable ? 1 : 0.45,
                                    transition: 'all 0.2s ease',
                                    boxShadow: isSelected
                                        ? `0 2px 12px ${alpha(method.color, 0.2)}`
                                        : '0 1px 3px rgba(0,0,0,0.06)',
                                    '&:hover': isAvailable ? {
                                        borderColor: method.color,
                                        borderLeft: `4px solid ${method.color}`,
                                        boxShadow: `0 4px 16px ${alpha(method.color, 0.18)}`,
                                        bgcolor: alpha(method.color, 0.04),
                                    } : {},
                                }}
                            >
                                {/* Icon avatar */}
                                <Avatar
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        bgcolor: alpha(method.color, isSelected ? 0.15 : 0.08),
                                        flexShrink: 0,
                                    }}
                                >
                                    {method.isImage
                                        ? <Icon />
                                        : <Icon sx={{ color: method.color, fontSize: 22 }} />
                                    }
                                </Avatar>

                                {/* Content */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                                        {method.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                        {method.description}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, alignItems: 'center' }}>
                                        <Chip
                                            label={method.feature}
                                            size="small"
                                            sx={{
                                                height: 18,
                                                fontSize: '0.65rem',
                                                bgcolor: alpha(method.color, 0.1),
                                                color: method.color,
                                                fontWeight: 600,
                                            }}
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                            <Schedule sx={{ fontSize: 11, color: 'text.disabled' }} />
                                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                                {method.time}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Right indicator */}
                                <Box sx={{ flexShrink: 0 }}>
                                    {!isAvailable ? (
                                        <Lock sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    ) : isSelected ? (
                                        <CheckCircle sx={{ fontSize: 22, color: method.color }} />
                                    ) : (
                                        <Box sx={{
                                            width: 20, height: 20, borderRadius: '50%',
                                            border: `2px solid ${alpha(theme.palette.text.disabled, 0.3)}`,
                                        }} />
                                    )}
                                </Box>
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

export default PaymentMethodSelector;
