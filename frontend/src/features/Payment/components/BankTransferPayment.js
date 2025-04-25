import { AccountBalance as BankIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Grid,
    Paper,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import React, { useContext, useState, useEffect } from 'react';
import { PaymentContext } from '../context/PaymentContext';
import { PAYMENT_METHODS } from '../services/paymentTypes';

/**
 * Componente para pagamento por transferência bancária
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onSubmit - Função chamada após submissão bem-sucedida
 * @param {boolean} props.loading - Indica se está processando o pagamento
 * @param {string} props.error - Mensagem de erro, se houver
 * @param {Object} props.userInfo - Informações do usuário atual
 */
const BankTransferPayment = ({ onSubmit, loading: externalLoading, error: externalError, userInfo }) => {
    const theme = useTheme();
    const payment = useContext(PaymentContext);

    // Estado local
    const [transferReference, setTransferReference] = useState('');
    const [transferDate, setTransferDate] = useState('');
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);
    const [copied, setCopied] = useState({ iban: false, accountName: false });
    const [authorized, setAuthorized] = useState(false);
    const loading = externalLoading || payment.state.loading;
    const error = externalError || payment.state.error || localError;

    // Verificar se o usuário tem permissão para este método de pagamento
    useEffect(() => {
        const hasPermission = userInfo && ['0', '1', '2'].includes(userInfo.profil);
        setAuthorized(hasPermission);

        if (!hasPermission) {
            setLocalError('Você não tem permissão para usar este método de pagamento.');
        }
    }, [userInfo]);

    // Informações bancárias da empresa (substituir pelos valores reais)
    const bankInfo = {
        iban: 'PT50000000000000000000000',
        accountName: 'Nome da Empresa',
        bankName: 'Nome do Banco'
    };

    // Garantir que o método de pagamento está definido como BANK_TRANSFER
    useEffect(() => {
        if (payment.state.selectedMethod !== PAYMENT_METHODS.BANK_TRANSFER) {
            console.log("Selecionando método de pagamento por transferência bancária");
            payment.selectPaymentMethod(PAYMENT_METHODS.BANK_TRANSFER);
        }
    }, []);

    // Copiar para a área de transferência
    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text).then(
            () => {
                setCopied({ ...copied, [field]: true });
                setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
            },
            (err) => console.error('Não foi possível copiar: ', err)
        );
    };

    // Submeter pagamento por transferência bancária
    const handlePay = async () => {
        if (!authorized) {
            setLocalError('Sem permissão para usar este método de pagamento.');
            return;
        }

        console.log("Iniciando registro de pagamento por transferência bancária");

        if (!transferReference.trim()) {
            setLocalError('Por favor, forneça a referência da transferência');
            return;
        }

        if (!transferDate.trim()) {
            setLocalError('Por favor, forneça a data da transferência');
            return;
        }

        setLocalError('');

        try {
            // Construir informações de referência
            const referenceInfo = JSON.stringify({
                transferReference: transferReference,
                transferDate: transferDate,
                bankInfo: {
                    iban: bankInfo.iban,
                    accountName: bankInfo.accountName,
                    bankName: bankInfo.bankName
                }
            });

            // Atualizar dados de pagamento
            payment.updatePaymentData({
                referenceInfo: referenceInfo,
                transferReference: transferReference,
                transferDate: transferDate
            });

            console.log("Registrando pagamento por transferência:", {
                orderId: payment.state.orderId,
                amount: payment.state.amount,
                referenceInfo: referenceInfo
            });

            // Processar pagamento manual
            const result = await payment.registerManualPayment(
                payment.state.orderId,
                payment.state.amount,
                PAYMENT_METHODS.BANK_TRANSFER,
                referenceInfo
            );

            console.log("Resultado do registro:", result);

            if (result && result.success) {
                let transactionId = null;

                if (result.data && result.data.transaction_id) {
                    transactionId = result.data.transaction_id;
                }

                if (transactionId) {
                    payment.updatePaymentData({ transactionId });
                }

                console.log("Pagamento por transferência registrado com sucesso");
                setSuccess(true);

                if (onSubmit) onSubmit();
            } else {
                const errorMsg = (result && result.error) || 'Erro ao registrar pagamento por transferência';
                console.error("Erro no registro de pagamento:", errorMsg);

                // Mensagem mais amigável para o usuário
                if (errorMsg.includes("'str' object has no attribute 'profile'") ||
                    errorMsg.includes("permission") ||
                    errorMsg.includes("permissão")) {
                    setLocalError("Não foi possível processar o pagamento: problema com permissões de usuário. Por favor, contacte o suporte.");
                } else {
                    setLocalError(errorMsg);
                }
            }
        } catch (err) {
            console.error('Erro ao processar o pagamento:', err);
            // Mensagem mais amigável
            const errorMessage = err.message || 'Erro desconhecido';
            if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
                setLocalError('Erro no servidor ao processar o pagamento. Por favor, tente novamente ou contacte o suporte.');
            } else {
                setLocalError('Erro ao processar o pagamento: ' + errorMessage);
            }
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Pagamento por Transferência Bancária
            </Typography>

            <Typography variant="body2" paragraph>
                Realize uma transferência bancária e registre os dados da operação. Este pagamento necessitará de validação posterior.
            </Typography>

            {(error || localError) && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error || localError}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Pagamento por transferência registrado com sucesso. Aguardando validação.
                </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                    Dados Bancários
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                bgcolor: theme.palette.grey[100],
                                p: 1.5,
                                borderRadius: 1,
                                mb: 1
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    IBAN
                                </Typography>
                                <Typography variant="body1" fontFamily="monospace" fontWeight="medium">
                                    {bankInfo.iban}
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                onClick={() => copyToClipboard(bankInfo.iban, 'iban')}
                                startIcon={<CopyIcon />}
                                color={copied.iban ? 'success' : 'primary'}
                            >
                                {copied.iban ? 'Copiado' : 'Copiar'}
                            </Button>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Banco
                        </Typography>
                        <Typography variant="body1">
                            {bankInfo.bankName}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <Typography variant="subtitle2" color="text.secondary">
                                Nome da Conta
                            </Typography>
                            <Button
                                size="small"
                                onClick={() => copyToClipboard(bankInfo.accountName, 'accountName')}
                                startIcon={<CopyIcon />}
                                color={copied.accountName ? 'success' : 'primary'}
                            >
                                {copied.accountName ? 'Copiado' : 'Copiar'}
                            </Button>
                        </Box>
                        <Typography variant="body1">
                            {bankInfo.accountName}
                        </Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                    Dados da Transferência
                </Typography>

                <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                        fullWidth
                        label="Referência da Transferência"
                        variant="outlined"
                        value={transferReference}
                        onChange={(e) => setTransferReference(e.target.value)}
                        disabled={loading || success || !authorized}
                        error={!!localError && !transferReference.trim()}
                        helperText={(!transferReference.trim() && localError) ? "Campo obrigatório" : "Ex: Número da operação ou comprovativo"}
                    />

                    <TextField
                        fullWidth
                        label="Data da Transferência"
                        variant="outlined"
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        disabled={loading || success || !authorized}
                        error={!!localError && !transferDate.trim()}
                        helperText={(!transferDate.trim() && localError) ? "Campo obrigatório" : ""}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handlePay}
                            disabled={loading || success || !transferReference.trim() || !transferDate.trim() || !authorized}
                            startIcon={loading ? <CircularProgress size={20} /> : <BankIcon />}
                            sx={{ minWidth: 200 }}
                        >
                            {loading ? 'A processar...' : 'Registrar Transferência'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ mt: 4, p: 2, bgcolor: theme.palette.info.light + '20', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom color="info.main">
                    Como funciona:
                </Typography>
                <Typography variant="body2">
                    1. Realize a transferência bancária para a conta indicada acima<br />
                    2. Anote o número de referência da operação (disponível no comprovativo de transferência)<br />
                    3. Preencha o formulário com os dados da transferência<br />
                    4. O pagamento será validado após confirmação da transferência<br />
                    5. Guarde o comprovativo de transferência
                </Typography>
            </Box>
        </Box>
    );
};

export default BankTransferPayment;