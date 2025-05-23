import {
    CreditCard as CardIcon,
    PhoneAndroid as MBWayIcon,
    AccountBalance as MultibancoIcon,
    Euro as CashIcon,
    Payments as BankTransferIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    FormControlLabel,
    Grid,
    Radio,
    RadioGroup,
    Typography,
    useTheme
} from '@mui/material';
import React from 'react';
import {
    PAYMENT_METHODS,
    PAYMENT_METHOD_LABELS
} from '../services/paymentTypes';

/**
 * Componente para seleção do método de pagamento
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onSelect - Função chamada quando um método é selecionado
 * @param {string} props.selectedMethod - Método atualmente selecionado
 * @param {Array} props.availableMethods - Lista de métodos disponíveis (opcional)
 */
const PaymentMethodSelector = ({ onSelect, selectedMethod, availableMethods }) => {
    const theme = useTheme();

    // Handler para mudança de método
    const handleChange = (event) => {
        onSelect(event.target.value);
    };

    // Lista de métodos a mostrar (todos ou apenas os disponíveis se especificado)
    const methodsToShow = availableMethods || Object.values(PAYMENT_METHODS);

    // Configurações dos métodos de pagamento
    const paymentMethods = [
        {
            id: PAYMENT_METHODS.CARD,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CARD],
            icon: <CardIcon fontSize="large" />,
            description: 'Pague com cartão de crédito ou débito'
        },
        {
            id: PAYMENT_METHODS.MBWAY,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.MBWAY],
            icon: <MBWayIcon fontSize="large" />,
            description: 'Pagamento rápido pelo seu smartphone'
        },
        {
            id: PAYMENT_METHODS.MULTIBANCO,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.MULTIBANCO],
            icon: <MultibancoIcon fontSize="large" />,
            description: 'Pague no multibanco ou homebanking com referência'
        },
        {
            id: PAYMENT_METHODS.CASH,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CASH],
            icon: <CashIcon fontSize="large" />,
            description: 'Registe um pagamento em dinheiro (sujeito a validação)'
        },
        {
            id: PAYMENT_METHODS.BANK_TRANSFER,
            label: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.BANK_TRANSFER],
            icon: <BankTransferIcon fontSize="large" />,
            description: 'Pague por transferência bancária (sujeito a validação)'
        }
    ].filter(method => methodsToShow.includes(method.id));

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Escolha o método de pagamento
            </Typography>

            <RadioGroup
                value={selectedMethod || ''}
                onChange={handleChange}
            >
                <Grid container spacing={2}>
                    {paymentMethods.map((method) => (
                        <Grid item xs={12} sm={6} md={4} key={method.id}>
                            <Card
                                variant="outlined"
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    borderColor: selectedMethod === method.id
                                        ? theme.palette.primary.main
                                        : theme.palette.divider,
                                    backgroundColor: selectedMethod === method.id
                                        ? theme.palette.primary.light + '20'
                                        : theme.palette.background.paper,
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        boxShadow: theme.shadows[2]
                                    }
                                }}
                                onClick={() => onSelect(method.id)}
                            >
                                <CardContent>
                                    <Box
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                    >
                                        <FormControlLabel
                                            value={method.id}
                                            control={<Radio />}
                                            label={method.label}
                                            sx={{ flexGrow: 1 }}
                                        />
                                        {method.icon}
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mt: 1 }}
                                    >
                                        {method.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </RadioGroup>
        </Box>
    );
};

export default PaymentMethodSelector;