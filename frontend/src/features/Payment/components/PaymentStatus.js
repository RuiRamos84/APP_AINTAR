import {
    Error as ErrorIcon,
    PhoneAndroid as MBWayIcon,
    AccountBalance as MultibancoIcon,
    Euro as CashIcon,
    Payments as BankTransferIcon,
    Schedule as PendingIcon,
    Refresh as RefreshIcon,
    CheckCircle as SuccessIcon,
    HourglassTop as ValidationIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useState, useContext } from 'react';
import { PaymentContext } from '../context/PaymentContext';
import {
    PAYMENT_METHODS,
    PAYMENT_METHOD_LABELS,
    PAYMENT_STATUS,
    PAYMENT_STATUS_COLORS,
    PAYMENT_STATUS_LABELS,
    statusMapping,
} from '../services/paymentTypes';

/**
 * Componente para exibir o status do pagamento
 * @param {Object} props - Propriedades do componente
 * @param {string} props.method - Método de pagamento
 * @param {string} props.status - Status atual do pagamento
 * @param {Function} props.onCheckStatus - Função para verificar o status atual
 * @param {Function} props.onRestart - Função para reiniciar o pagamento
 * @param {boolean} props.loading - Indica se está carregando
 * @param {string} props.error - Mensagem de erro, se houver
 */
const PaymentStatus = ({
    method,
    status,
    onCheckStatus,
    onRestart,
    loading: externalLoading,
    error: externalError
}) => {
    const theme = useTheme();
    const payment = useContext(PaymentContext);

    // Estado para controlar atualização automática
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [localError, setLocalError] = useState('');

    const loading = externalLoading || payment.state.loading;
    const error = externalError || payment.state.error || localError;

    // Gerenciar contador regressivo
    useEffect(() => {
        let timerId;

        if (autoRefresh && timeLeft > 0) {
            timerId = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
        } else if (autoRefresh && timeLeft === 0) {
            handleCheckStatus();
            setTimeLeft(30);
        }

        return () => clearTimeout(timerId);
    }, [autoRefresh, timeLeft]);

    // Inicia verificação automática para MBWay
    useEffect(() => {
        if (method === PAYMENT_METHODS.MBWAY && status === PAYMENT_STATUS.PENDING) {
            setAutoRefresh(true);
        } else {
            setAutoRefresh(false);
        }

        return () => setAutoRefresh(false);
    }, [method, status]);

    useEffect(() => {
        // Verificar o estado a cada renderização
        console.log("RENDERIZAÇÃO: Estado do pagamento:", payment.state);

        // Limpar mensagem de erro se tiver um ID de transação
        if (payment.state.transactionId && localError === "Não é possível verificar o status: ID de transação não disponível") {
            console.log("Limpando erro localError pois transactionId existe:", payment.state.transactionId);
            setLocalError("");
        }
    }, [payment.state.transactionId, localError]);

    // Função para verificar status com validação
    const handleCheckStatus = () => {
        // Limpar erro antigo
        setLocalError('');

        // Log do estado para depuração
        console.log("Estado do pagamento:", payment.state);
        console.log("Transaction ID no estado:", payment.state.transactionId);

        // Se já tem ID no estado, usar diretamente
        if (payment.state.transactionId) {
            console.log("Usando transaction ID do estado:", payment.state.transactionId);
            if (onCheckStatus) {
                onCheckStatus(payment.state.transactionId, payment.state.orderId);
            } else {
                payment.checkStatus(payment.state.transactionId, payment.state.orderId);
            }
            return;
        }

        // Tentativa de encontrar ID em outros lugares
        let transactionId = null;

        // Verificar no paymentResult
        const paymentResult = payment.state.paymentResult;

        if (paymentResult) {
            // Tentar formatos conhecidos
            if (paymentResult.transaction_id) {
                transactionId = paymentResult.transaction_id;
                console.log("ID encontrado em transaction_id:", transactionId);
            }
            else if (paymentResult.mbway_response) {
                // MBWAY retorna em formato diferente
                const mbwayResponse = paymentResult.mbway_response;
                if (mbwayResponse.transactionID) {
                    transactionId = mbwayResponse.transactionID;
                    console.log("ID encontrado em mbway_response.transactionID:", transactionId);
                }
            }
        }

        if (transactionId) {
            console.log("Usando transaction ID encontrado:", transactionId);

            // Atualizar o estado para futuras verificações
            payment.updatePaymentData({ transactionId });

            // Chamar a função de verificação
            if (onCheckStatus) {
                onCheckStatus(transactionId);
            } else {
                payment.checkStatus(transactionId, payment.state.orderId);
            }
        } else {
            console.error("Nenhum ID de transação encontrado");
            setLocalError("Não é possível verificar o status: ID de transação não disponível");
        }
    };

    const handleRestartPayment = () => {
        // Limpar erro local
        setLocalError('');
        // Resetar o pagamento, mantendo apenas os detalhes do pedido
        payment.resetPayment();
        // Se tiver callback para voltar à etapa de seleção de método
        if (onRestart) {
            onRestart();
        }
    };

    // Definir ícone baseado no status
    const getStatusIcon = () => {
        // Mapear status conhecidos com case diferente
        const statusMapping = {
            'Pending': PAYMENT_STATUS.PENDING,
            'Paid': PAYMENT_STATUS.PAID,
            'Failed': PAYMENT_STATUS.FAILED,
            'Declined': PAYMENT_STATUS.DECLINED,
            'Expired': PAYMENT_STATUS.EXPIRED,
            'Cancelled': PAYMENT_STATUS.CANCELLED,
            'Processing': PAYMENT_STATUS.PROCESSING,
            'PENDING_VALIDATION': PAYMENT_STATUS.PENDING_VALIDATION
        };

        // Tentar usar o mapeamento se o status tiver case diferente
        const mappedStatus = statusMapping[status] || status;

        switch (mappedStatus) {
            case PAYMENT_STATUS.PAID:
                return <SuccessIcon color="success" sx={{ fontSize: 64 }} />;
            case PAYMENT_STATUS.FAILED:
            case PAYMENT_STATUS.DECLINED:
            case PAYMENT_STATUS.CANCELLED:
            case PAYMENT_STATUS.EXPIRED:
                return <ErrorIcon color="error" sx={{ fontSize: 64 }} />;
            case PAYMENT_STATUS.PENDING:
                return <PendingIcon color="warning" sx={{ fontSize: 64 }} />;
            case PAYMENT_STATUS.PROCESSING:
                return <PendingIcon color="warning" sx={{ fontSize: 64 }} />;
            case PAYMENT_STATUS.PENDING_VALIDATION:
                return <ValidationIcon color="info" sx={{ fontSize: 64 }} />;
            default:
                console.warn(`Ícone para status desconhecido: ${status} - usando ícone padrão`);
                return <RefreshIcon color="primary" sx={{ fontSize: 64 }} />;
        }
    };

    // Obter ícone do método de pagamento
    const getMethodIcon = () => {
        switch (method) {
            case PAYMENT_METHODS.MBWAY:
                return <MBWayIcon color="primary" />;
            case PAYMENT_METHODS.MULTIBANCO:
                return <MultibancoIcon color="primary" />;
            case PAYMENT_METHODS.CASH:
                return <CashIcon color="primary" />;
            case PAYMENT_METHODS.BANK_TRANSFER:
                return <BankTransferIcon color="primary" />;
            default:
                return null;
        }
    };

    // Funções auxiliares para obter detalhes dos métodos de pagamento
    const getMBWayDetails = () => {
        const phoneNumber = payment.state.paymentData?.phoneNumber || '';  // SAFE ACCESS
        const formattedPhone = phoneNumber.replace('351#', '');

        return {
            phoneNumber: formattedPhone
        };
    };

    const getMultibancoDetails = () => {
        const paymentData = payment.state.paymentData || {};
        const paymentResult = payment.state.paymentResult || {};
        const multibancoResponse = paymentResult.multibanco_response || {};

        return {
            entity: paymentData.entity || multibancoResponse.entity || '',
            reference: paymentData.reference || multibancoResponse.reference || '',
            amount: paymentData.amount || multibancoResponse.amount?.value || payment.state.amount,
            expiryDate: paymentData.expiryDate || multibancoResponse.expiryDate
        };
    };

    const getCashDetails = () => {
        const paymentData = payment.state.paymentData || {};
        return {
            referenceInfo: paymentData.referenceInfo || ''
        };
    };

    const getBankTransferDetails = () => {
        const paymentData = payment.state.paymentData || {};
        return {
            transferReference: paymentData.transferReference || '',
            transferDate: paymentData.transferDate || ''
        };
    };

    const getStatusColorSafe = (status, theme) => {
        if (!status) {
            console.warn(`Status de pagamento não definido - usando cor padrão`);
            return theme.palette.grey[500];
        }

        // Mapear status conhecidos com case diferente
        const statusMapping = {
            'Pending': PAYMENT_STATUS.PENDING,
            'Paid': PAYMENT_STATUS.PAID,
            'Failed': PAYMENT_STATUS.FAILED,
            'Declined': PAYMENT_STATUS.DECLINED,
            'Expired': PAYMENT_STATUS.EXPIRED,
            'Cancelled': PAYMENT_STATUS.CANCELLED,
            'Processing': PAYMENT_STATUS.PROCESSING,
            'PENDING_VALIDATION': PAYMENT_STATUS.PENDING_VALIDATION
        };

        // Tentar usar o mapeamento de case primeiro
        if (statusMapping[status] && PAYMENT_STATUS_COLORS[statusMapping[status]]) {
            try {
                const mappedStatus = statusMapping[status];
                const colorPath = PAYMENT_STATUS_COLORS[mappedStatus].split('.');
                return theme.palette[colorPath[0]][colorPath[1]];
            } catch (error) {
                console.error(`Erro ao processar cor mapeada para status ${status}:`, error);
            }
        }

        // Tentar usar status diretamente
        if (PAYMENT_STATUS_COLORS[status]) {
            try {
                const colorPath = PAYMENT_STATUS_COLORS[status].split('.');
                return theme.palette[colorPath[0]][colorPath[1]];
            } catch (error) {
                console.error(`Erro ao processar cor para status ${status}:`, error);
            }
        }

        // Fallback para cor padrão
        console.warn(`Status de pagamento desconhecido: ${status} - usando cor padrão`);
        return theme.palette.grey[500];
    };

    // Renderizar detalhes específicos para cada método
    const renderMethodDetails = () => {
        switch (method) {
            case PAYMENT_METHODS.MBWAY:
                const mbwayDetails = getMBWayDetails();
                return (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Número de telefone
                        </Typography>
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                            {mbwayDetails?.phoneNumber || 'N/A'}
                        </Typography>

                        {status === PAYMENT_STATUS.PENDING && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Verifique o seu telemóvel e aprove o pagamento na aplicação MB WAY.
                            </Alert>
                        )}
                    </Box>
                );

            case PAYMENT_METHODS.MULTIBANCO:
                const multibancoDetails = getMultibancoDetails();
                return (
                    <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Entidade
                                </Typography>
                                <Typography variant="body1" fontWeight="medium" fontFamily="monospace">
                                    {multibancoDetails?.entity || 'N/A'}
                                </Typography>
                            </Grid>

                            <Grid item xs={12} sm={8}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Referência
                                </Typography>
                                <Typography variant="body1" fontWeight="medium" fontFamily="monospace" letterSpacing={1}>
                                    {multibancoDetails?.reference || 'N/A'}
                                </Typography>
                            </Grid>

                            <Grid item xs={12}>
                                {status === PAYMENT_STATUS.PENDING && (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        Efetue o pagamento através de Multibanco ou homebanking utilizando os
                                        dados acima. Depois de pagar, clique em "Verificar Status" para atualizar.
                                    </Alert>
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                );

            case PAYMENT_METHODS.CASH:
                const cashDetails = getCashDetails();
                return (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Referência
                        </Typography>
                        <Typography variant="body1">
                            {cashDetails?.referenceInfo || 'N/A'}
                        </Typography>

                        {status === PAYMENT_STATUS.PENDING_VALIDATION && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                O pagamento em dinheiro foi registrado e aguarda validação por um administrador.
                            </Alert>
                        )}
                    </Box>
                );

            case PAYMENT_METHODS.BANK_TRANSFER:
                const bankTransferDetails = getBankTransferDetails();
                return (
                    <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Referência da Transferência
                                </Typography>
                                <Typography variant="body1">
                                    {bankTransferDetails?.transferReference || 'N/A'}
                                </Typography>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Data da Transferência
                                </Typography>
                                <Typography variant="body1">
                                    {bankTransferDetails?.transferDate || 'N/A'}
                                </Typography>
                            </Grid>

                            <Grid item xs={12}>
                                {status === PAYMENT_STATUS.PENDING_VALIDATION && (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        A transferência bancária foi registrada e aguarda validação por um administrador.
                                    </Alert>
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                );

            default:
                return null;
        }
    };

    // Obter título com base no status
    const getStatusTitle = () => {
        if (status === PAYMENT_STATUS.PAID)
            return 'Pagamento Concluído';
        if (status === PAYMENT_STATUS.PENDING)
            return 'Aguardar Pagamento';
        if (status === PAYMENT_STATUS.DECLINED)
            return 'Pagamento Recusado';
        if (status === PAYMENT_STATUS.CANCELLED)
            return 'Pagamento Cancelado';
        if (status === PAYMENT_STATUS.REFUNDED)
            return 'Pagamento Reembolsado';
        if (status === PAYMENT_STATUS.EXPIRED)
            return 'Pagamento Expirado';
        if (status === PAYMENT_STATUS.PENDING_VALIDATION)
            return 'Aguardando Validação';

        return 'Pagamento não concluído';
    };

    // Obter cor do chip com base no status
    const getChipColor = () => {
        if (status === PAYMENT_STATUS.PAID)
            return 'success';
        if (status === PAYMENT_STATUS.PENDING || status === PAYMENT_STATUS.EXPIRED)
            return 'warning';
        if (status === PAYMENT_STATUS.DECLINED || status === PAYMENT_STATUS.CANCELLED || status === PAYMENT_STATUS.FAILED)
            return 'error';
        if (status === PAYMENT_STATUS.PENDING_VALIDATION || status === PAYMENT_STATUS.REFUNDED)
            return 'info';

        return 'default';
    };

    return (
        <Box>
            <Paper
                elevation={0}
                variant="outlined"
                sx={{
                    p: 3,
                    mb: 3,
                    borderColor: getStatusColorSafe(status, theme),
                    borderWidth: 1,
                    borderRadius: 2,
                    textAlign: 'center'
                }}
            >
                <Box sx={{ mb: 2 }}>
                    {getStatusIcon()}
                </Box>

                <Typography variant="h5" gutterBottom>
                    {getStatusTitle()}
                </Typography>

                <Chip
                    label={PAYMENT_STATUS_LABELS[status] || `${status}`}
                    color={getChipColor()}
                    sx={{ mb: 3 }}
                />

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Método de pagamento
                    </Typography>
                    <Chip
                        icon={getMethodIcon()}
                        label={PAYMENT_METHOD_LABELS[method] || method}
                        variant="outlined"
                        color="primary"
                    />
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Valor
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                        {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(payment.state.amount)}
                    </Typography>
                </Box>

                {/* Detalhes específicos do método */}
                {renderMethodDetails()}

                {/* Botão de atualização */}
                {status !== PAYMENT_STATUS.PAID && status !== PAYMENT_STATUS.PENDING_VALIDATION && (
                    <Box sx={{ mt: 3 }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleCheckStatus}
                            disabled={loading || autoRefresh}
                            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                            sx={{ mr: 1 }}
                        >
                            {loading
                                ? 'A verificar...'
                                : autoRefresh
                                    ? `Verificação automática em ${timeLeft}s`
                                    : 'Verificar Status'}
                        </Button>

                        {status === PAYMENT_STATUS.DECLINED && (
                            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                                O pagamento foi recusado. Isso pode ocorrer por vários motivos:
                                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                    <li>Recusa na aplicação MB WAY</li>
                                    <li>Tempo limite excedido para aprovação</li>
                                    <li>Problemas com a conta ou saldo</li>
                                </ul>
                                Utilize o botão "Tentar Novamente" para iniciar um novo pagamento.
                            </Alert>
                        )}
                        {/* Botão para reiniciar o pagamento (apenas para status de erro) */}
                        {(status === PAYMENT_STATUS.DECLINED ||
                            status === PAYMENT_STATUS.FAILED ||
                            status === PAYMENT_STATUS.EXPIRED ||
                            status === PAYMENT_STATUS.CANCELLED) && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleRestartPayment}
                                    disabled={loading}
                                    sx={{ mr: 1 }}
                                >
                                    Tentar Novamente
                                </Button>
                            )}

                        {(method === PAYMENT_METHODS.MBWAY || method === PAYMENT_METHODS.MULTIBANCO) &&
                            status === PAYMENT_STATUS.PENDING &&
                            !autoRefresh && (
                                <Button
                                    variant="text"
                                    onClick={() => {
                                        setAutoRefresh(true);
                                        setTimeLeft(30);
                                    }}
                                >
                                    Ativar verificação automática
                                </Button>
                            )}
                    </Box>
                )}

                {/* Mensagem para pagamentos pendentes de validação */}
                {status === PAYMENT_STATUS.PENDING_VALIDATION && (
                    <Alert severity="info" sx={{ mt: 3 }}>
                        Este pagamento foi registrado e aguarda validação por um administrador.
                        Você será notificado quando o pagamento for validado.
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </Paper>

            {status === PAYMENT_STATUS.PAID && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Pagamento processado com sucesso! Obrigado pela sua compra.
                </Alert>
            )}

            {status === PAYMENT_STATUS.PENDING_VALIDATION && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Pagamento registrado com sucesso! Aguardando validação pelo administrador.
                </Alert>
            )}
        </Box>
    );
};

export default PaymentStatus;