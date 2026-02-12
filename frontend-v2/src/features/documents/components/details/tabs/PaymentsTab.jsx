import React, { useState, useEffect } from 'react';
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
import paymentService from '../../../../../features/payments/services/paymentService';
import PaymentDialog from '../../../../../features/payments/components/modals/PaymentDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const PaymentsTab = ({ document }) => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

    // Fetch Invoice Amount
    const { data: invoiceAmount, isLoading } = useQuery({
        queryKey: ['invoiceAmount', document?.pk],
        queryFn: () => paymentService.getInvoiceAmount(document.pk),
        enabled: !!document?.pk
    });
    
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

    const getStatusIcon = () => {
        switch (paymentStatus.status) {
            case 'success': return <DoneIcon />;
            case 'pending': return <PendingIcon />;
            case 'failed': return <ErrorIcon />;
            default: return <InfoIcon />;
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/D';
        try {
            return new Date(dateString).toLocaleString('pt-PT', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return dateString; }
    };

    // Extrair dados de pagamento da referência (que pode ser um JSON string da SIBS)
    useEffect(() => {
        if (!hasInvoiceData || !invoiceAmount.invoice_data.payment_reference) {
            return;
        }

        const paymentRef = invoiceAmount.invoice_data.payment_reference;

        // Se já é um objecto (não é string), usar directamente
        if (typeof paymentRef === 'object' && paymentRef !== null) {
            setPaymentDetails(paymentRef);
            return;
        }

        // Se é uma string JSON, fazer parse
        if (typeof paymentRef === 'string' && paymentRef.startsWith('{')) {
            try {
                const parsedRef = JSON.parse(paymentRef);
                setPaymentDetails(parsedRef);
            } catch (error) {
                console.error("Erro ao fazer parse do JSON de pagamento:", error);
                setPaymentDetails({ reference: paymentRef });
            }
            return;
        }

        // Se é uma string simples (referência directa), usar como está
        setPaymentDetails({
            paymentReference: {
                reference: paymentRef,
                entity: '52791'
            }
        });
    }, [hasInvoiceData, invoiceAmount]);

    const getPaymentMethod = () => {
        if (!hasInvoiceData || !invoiceAmount.invoice_data.payment_method) return 'N/D';
        const method = invoiceAmount.invoice_data.payment_method.toUpperCase();
        switch (method) {
            case 'MBWAY': return 'MB WAY';
            case 'CARD': return 'Cartão de Crédito/Débito';
            case 'MULTIBANCO': case 'REFERENCE': return 'Referência Multibanco';
            default: return method;
        }
    };

    const renderMultibancoContent = () => {
        // Extrair dados da estrutura SIBS (paymentReference é um objeto aninhado)
        const paymentRef = paymentDetails?.paymentReference || {};

        // Tentar múltiplas fontes para a entidade
        const entity = paymentRef?.entity ||
            paymentRef?.paymentEntity ||
            paymentDetails?.entity ||
            '52791';

        // Tentar múltiplas fontes para a referência (número de 9 dígitos)
        const reference = paymentRef?.reference ||
            paymentDetails?.reference ||
            'N/D';

        // Tentar múltiplas fontes para a data de expiração
        const rawExpiryDate = paymentRef?.expireDate ||
            paymentDetails?.expiry_date ||
            paymentDetails?.expiryDate;
        const expiryDate = rawExpiryDate ? formatDateTime(rawExpiryDate) : 'N/D';

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Detalhes da Referência Multibanco</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 150, 136, 0.08)' : 'rgba(0, 150, 136, 0.05)' }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                             <Box display="flex" alignItems="center">
                                <BankIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">Entidade</Typography>
                                    <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>{entity}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                             <Box display="flex" alignItems="center">
                                <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">Referência</Typography>
                                    <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>{reference}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                             <Box display="flex" alignItems="center">
                                <CalendarIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">Válida até</Typography>
                                    <Typography variant="body1">{expiryDate}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        );
    };

    const renderMBWayContent = () => {
        const phoneNumber = paymentDetails?.token?.value || paymentDetails?.reference || "Não disponível";
        return (
             <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Detalhes do Pagamento MB WAY</Typography>
                 <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Box display="flex" alignItems="center">
                                <PhoneIcon color="primary" sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary">Número de Telefone</Typography>
                                    <Typography variant="body1">{phoneNumber}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
             </Box>
        );
    };

    if (isLoading) return <Skeleton variant="rectangular" height={200} />;

    if (!invoiceAmount || !invoiceAmount.invoice_data) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Alert severity="info">Não foram encontrados dados de fatura para este documento.</Alert>
            </Box>
        );
    }

    if (!invoiceAmount.invoice_data.invoice && !invoiceAmount.invoice_data.amount) {
         return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Alert severity="info" title="Informação">Este documento não possui valor a pagar.</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                        <MoneyIcon sx={{ mr: 1 }} color="primary" /> Resumo do Pagamento
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <List disablePadding>
                                <ListItem sx={{ px: 0, py: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}><MoneyIcon fontSize="small" color="action" /></ListItemIcon>
                                    <ListItemText primary="Valor" secondary={`${invoiceAmount.invoice_data.invoice || invoiceAmount.invoice_data.amount || 0}€`} />
                                </ListItem>
                                <ListItem sx={{ px: 0, py: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}><CardIcon fontSize="small" color="action" /></ListItemIcon>
                                    <ListItemText primary="Método" secondary={getPaymentMethod()} />
                                </ListItem>
                            </List>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <List disablePadding>
                                <ListItem sx={{ px: 0, py: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}><PaymentIcon fontSize="small" color="action" /></ListItemIcon>
                                    <ListItemText
                                        primary="Status"
                                        secondary={
                                            <Chip component="span" icon={getStatusIcon()} label={paymentStatus.label} color={paymentStatus.color} size="small" />
                                        }
                                        secondaryTypographyProps={{ component: 'div' }}
                                    />
                                </ListItem>
                                {invoiceAmount.invoice_data.order_id && (
                                    <ListItem sx={{ px: 0, py: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}><ReceiptIcon fontSize="small" color="action" /></ListItemIcon>
                                        <ListItemText primary="Ref. Interna" secondary={invoiceAmount.invoice_data.order_id} />
                                    </ListItem>
                                )}
                            </List>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {hasPaymentInfo && (
                <>
                    {invoiceAmount.invoice_data.payment_method === 'MBWAY' && renderMBWayContent()}
                    {(invoiceAmount.invoice_data.payment_method === 'MULTIBANCO' || invoiceAmount.invoice_data.payment_method === 'REFERENCE') && renderMultibancoContent()}
                </>
            )}

             {paymentStatus.status !== 'success' && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    {!hasPaymentInfo && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <AlertTitle>Pagamento Pendente</AlertTitle>
                            Valor a pagar: <strong>{invoiceAmount.invoice_data.invoice}€</strong>
                        </Alert>
                    )}
                    {paymentStatus.status === 'failed' && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <AlertTitle>Pagamento Falhado</AlertTitle>
                            O pagamento anterior falhou. Pode iniciar um novo pagamento.
                        </Alert>
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PaymentIcon />}
                        onClick={() => setPaymentDialogOpen(true)}
                    >
                        {paymentStatus.status === 'failed' ? 'Tentar Novamente' : 'Efetuar Pagamento'}
                    </Button>
                </Box>
             )}

            <PaymentDialog
                open={paymentDialogOpen}
                onClose={() => {
                    setPaymentDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['invoiceAmount', document?.pk] });
                }}
                documentId={document?.pk}
                amount={invoiceAmount?.invoice_data?.invoice || invoiceAmount?.invoice_data?.amount}
                regnumber={document?.regnumber}
            />
        </Box>
    );
};

export default PaymentsTab;
