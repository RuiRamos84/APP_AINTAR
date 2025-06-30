import React, { useState, useEffect, useContext } from 'react';
import {
    Box,
    Typography,
    Paper,
    Skeleton,
    Card,
    CardContent,
    Divider,
    Chip,
    Grid,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    Alert,
    AlertTitle,
    Link,
    useTheme
} from '@mui/material';
import {
    Payment as PaymentIcon,
    AttachMoney as MoneyIcon,
    Receipt as ReceiptIcon,
    CreditCard as CardIcon,
    Done as DoneIcon,
    Error as ErrorIcon,
    Pending as PendingIcon,
    CalendarToday as CalendarIcon,
    AccountBalance as BankIcon,
    AccessTime as TimeIcon,
    Phone as PhoneIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import paymentService from '../../../../../features/Payment/services/paymentService';
import { PaymentContext } from '../../../../../features/Payment/context/PaymentContext';
import { useAuth } from '../../../../../contexts/AuthContext';

const PaymentsTab = ({ document, invoiceAmount, loading = false, onPayment }) => {
    const theme = useTheme();
    const [paymentDetails, setPaymentDetails] = useState(null);
    const { reset, state } = useContext(PaymentContext);
    const { user } = useAuth();
    const [error, setError] = useState(null);

    // Verificar se existem dados de fatura e pagamento
    const hasInvoiceData = invoiceAmount && invoiceAmount.invoice_data;
    const hasPaymentInfo = hasInvoiceData && (
        invoiceAmount.invoice_data.payment_status ||
        invoiceAmount.invoice_data.payment_method ||
        invoiceAmount.invoice_data.payment_reference
    );

    // Determinar o status do pagamento
    const getPaymentStatus = () => {
        if (!hasInvoiceData) return { status: 'unknown', label: 'Desconhecido', color: 'default' };

        const status = invoiceAmount.invoice_data.payment_status;

        if (!status) return { status: 'pending', label: 'Pendente', color: 'warning' };

        const statusLower = status.toLowerCase();
        if (statusLower.includes('success') || statusLower === 'paid') {
            return { status: 'success', label: 'Pago', color: 'success' };
        } else if (statusLower.includes('pending') || statusLower === 'processing') {
            return { status: 'pending', label: 'Pendente', color: 'warning' };
        } else if (statusLower.includes('failed') || statusLower.includes('error') || statusLower === 'declined') {
            return { status: 'failed', label: 'Falha', color: 'error' };
        }

        return { status: 'unknown', label: status, color: 'default' };
    };

    const paymentStatus = getPaymentStatus();

    // Ícone do status de pagamento
    const getStatusIcon = () => {
        switch (paymentStatus.status) {
            case 'success':
                return <DoneIcon />;
            case 'pending':
                return <PendingIcon />;
            case 'failed':
                return <ErrorIcon />;
            default:
                return <InfoIcon />;
        }
    };

    // Formatar data/hora
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/D';

        try {
            const date = new Date(dateString);
            return date.toLocaleString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    useEffect(() => {
        if (hasInvoiceData && invoiceAmount.invoice_data.payment_method === 'MULTIBANCO') {
            const fetchSibsData = async () => {
                try {
                    const orderId = invoiceAmount.invoice_data.order_id;
                    const sibsData = await paymentService.getSibsData(orderId);
                    console.log('Dados SIBS obtidos:', sibsData);

                    if (sibsData && sibsData.data) {
                        setPaymentDetails(sibsData.data);
                    } else {
                        // Fallback
                        setPaymentDetails({
                            entity: '52791',
                            reference: invoiceAmount.invoice_data.payment_reference
                        });
                    }
                } catch (error) {
                    console.error('Erro SIBS:', error);
                    setPaymentDetails({
                        entity: '52791',
                        reference: invoiceAmount.invoice_data.payment_reference
                    });
                }
            };

            fetchSibsData();
        }
    }, [hasInvoiceData, invoiceAmount]);

    // Extrair dados de pagamento da referência (que pode ser um JSON string)
    useEffect(() => {
        if (hasInvoiceData && invoiceAmount.invoice_data.payment_reference) {
            try {
                // Tenta fazer parse do JSON se for um string
                let paymentRef = invoiceAmount.invoice_data.payment_reference;
                if (typeof paymentRef === 'string' && paymentRef.startsWith('{')) {
                    const parsedRef = JSON.parse(paymentRef);
                    setPaymentDetails(parsedRef);
                } else {
                    // Se não for JSON, usar como está
                    setPaymentDetails({ reference: paymentRef });
                }
            } catch (error) {
                console.error("Erro ao processar referência de pagamento:", error);
                setPaymentDetails({ reference: invoiceAmount.invoice_data.payment_reference });
            }
        }
    }, [invoiceAmount]);

    // Obter método de pagamento
    const getPaymentMethod = () => {
        if (!hasInvoiceData || !invoiceAmount.invoice_data.payment_method) return 'N/D';

        const method = invoiceAmount.invoice_data.payment_method.toUpperCase();

        switch (method) {
            case 'MBWAY':
                return 'MB WAY';
            case 'CARD':
                return 'Cartão de Crédito/Débito';
            case 'MULTIBANCO':
            case 'REFERENCE':
                return 'Referência Multibanco';
            default:
                return method;
        }
    };

    // Renderizar o conteúdo de pagamento MBWAY
    const renderMBWayContent = () => {
        const phoneNumber = paymentDetails?.token?.value ||
            paymentDetails?.reference ||
            "Não disponível";

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                    Detalhes do Pagamento MB WAY
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Box display="flex" alignItems="center">
                                <PhoneIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">
                                        Número de Telefone
                                    </Typography>
                                    <Typography variant="body1">
                                        {phoneNumber}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Box display="flex" alignItems="center">
                                <TimeIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">
                                        Data do Pagamento
                                    </Typography>
                                    <Typography variant="body1">
                                        {formatDateTime(invoiceAmount.invoice_data.updated_at) || 'N/D'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        );
    };

    // Renderizar o conteúdo de pagamento Multibanco
    const renderMultibancoContent = () => {
        const entity = paymentDetails?.entity || '52791';
        const reference = paymentDetails?.payment_reference ||
            invoiceAmount.invoice_data.payment_reference ||
            'N/D';
        const expiryDate = paymentDetails?.expiry_date ?
            formatDateTime(paymentDetails.expiry_date) : 'N/D';

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                    Detalhes da Referência Multibanco
                </Typography>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 1,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 150, 136, 0.08)' : 'rgba(0, 150, 136, 0.05)'
                    }}
                >
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box display="flex" alignItems="center">
                                <BankIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">
                                        Entidade
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                                        {entity}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                            <Box display="flex" alignItems="center">
                                <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">
                                        Referência
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                                        {reference}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Box display="flex" alignItems="center">
                                <CalendarIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">
                                        Válida até
                                    </Typography>
                                    <Typography variant="body1">
                                        {expiryDate}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        );
    };

    // Render loading state
    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" width="100%" height={100} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" width="100%" height={150} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" width="100%" height={100} />
            </Box>
        );
    }

    // Se não houver dados da fatura
    if (!invoiceAmount || !invoiceAmount.invoice_data) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>Informação</AlertTitle>
                    Não foram encontrados dados de fatura para este documento.
                </Alert>
                <Typography variant="body2" color="textSecondary">
                    Os dados de pagamento serão exibidos aqui quando disponíveis.
                </Typography>
            </Box>
        );
    }

    // Se não houver fatura (valor a pagar)
    if (!invoiceAmount.invoice_data.invoice) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Alert severity="info">
                    <AlertTitle>Informação</AlertTitle>
                    Este documento não possui valor a pagar.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {/* Resumo do Pagamento */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between' // NOVO
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <MoneyIcon sx={{ mr: 1 }} color="primary" />
                            Resumo do Pagamento
                        </Box>

                        {hasPaymentInfo &&
                            user?.user_id === 17 &&
                            paymentStatus.status !== 'success' && ( // NOVA CONDIÇÃO
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PaymentIcon />}
                                    onClick={() => {
                                        reset();
                                        onPayment?.(document);
                                    }}
                                >
                                    Novo Pagamento
                                </Button>
                            )}
                    </Typography>
                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <List disablePadding>
                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <MoneyIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Valor"
                                        secondary={`${invoiceAmount.invoice_data.invoice || 0}€`}
                                        primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                        secondaryTypographyProps={{ variant: 'h6' }}
                                    />
                                </ListItem>

                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <CardIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Método de Pagamento"
                                        secondary={getPaymentMethod()}
                                        primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                        secondaryTypographyProps={{ variant: 'body1' }}
                                    />
                                </ListItem>
                            </List>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <List disablePadding>
                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <PaymentIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Status do Pagamento"
                                        secondary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                                <Chip
                                                    icon={getStatusIcon()}
                                                    label={paymentStatus.label}
                                                    color={paymentStatus.color}
                                                    size="medium"
                                                />
                                            </Box>
                                        }
                                        primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                        secondaryTypographyProps={{ component: 'div' }}  // Add this line
                                    />
                                </ListItem>

                                {invoiceAmount.invoice_data.order_id && (
                                    <ListItem sx={{ px: 0, py: 0.75 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <ReceiptIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Referência de Pagamento"
                                            secondary={invoiceAmount.invoice_data.order_id}
                                            primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                            secondaryTypographyProps={{ variant: 'body1' }}
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>



            {/* {hasPaymentInfo && (
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<PaymentIcon />}
                        onClick={() => {
                            reset();
                            onPayment?.(document);
                        }}
                        sx={{ mr: 1 }}
                        >
                        Novo Pagamento
                    </Button>
                    <Button
                        variant="text"
                        onClick={() => reset()}
                        >
                        Alterar Método
                    </Button>
                </Box>
            )} */}

            {/* Detalhes específicos de acordo com o método de pagamento */}
            {hasPaymentInfo && (
                <>
                    {invoiceAmount.invoice_data.payment_method === 'MBWAY' && renderMBWayContent()}

                    {(invoiceAmount.invoice_data.payment_method === 'MULTIBANCO' ||
                        invoiceAmount.invoice_data.payment_method === 'REFERENCE') &&
                        renderMultibancoContent()}
                </>
            )}

            {/* Seção de pagamento - exibida apenas se não houver status de pagamento */}
            {!hasPaymentInfo && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
                        <AlertTitle>Pagamento Pendente</AlertTitle>
                        Este documento tem um valor a pagar de <strong>{invoiceAmount.invoice_data.invoice}€</strong>
                    </Alert>

                    {onPayment && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<PaymentIcon />}
                            onClick={() => onPayment(document)}
                            sx={{ mt: 2 }}
                        >
                            Efetuar Pagamento
                        </Button>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default PaymentsTab;