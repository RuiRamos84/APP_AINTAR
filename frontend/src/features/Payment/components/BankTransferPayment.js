import React, { useState, useContext } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    CircularProgress,
    Paper,
    InputAdornment,
    FormControl,
    FormLabel,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    AttachFile as FileIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckIcon,
    AccountBalance as BankIcon
} from '@mui/icons-material';
import paymentService from '../services/paymentService';
import { addDocumentAnnex } from '../../../services/documentService';
import { PaymentContext } from '../context/PaymentContext';

const BankTransferPayment = ({ orderId, amount = 0, onSubmit, onSuccess, loading, error, userInfo, documentId }) => {
    console.log('[BankTransferPayment] Props recebidas:', { orderId, amount, documentId });

    const payment = useContext(PaymentContext);
    const numericAmount = Number(amount) || 0;

    const [formData, setFormData] = useState({
        accountHolder: '',
        iban: '',
        transferDate: new Date().toISOString().split('T')[0],
        transferReference: '',
        notes: ''
    });

    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatIBAN = (value) => {
        // Remove espaços e converte para maiúsculas
        const cleaned = value.replace(/\s/g, '').toUpperCase();
        // Adiciona espaços a cada 4 caracteres
        return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'iban') {
            setFormData(prev => ({ ...prev, [name]: formatIBAN(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFileError('');

        if (selectedFile) {
            // Validar tipo de arquivo
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!allowedTypes.includes(selectedFile.type)) {
                setFileError('Apenas ficheiros JPG, PNG ou PDF são permitidos');
                return;
            }

            // Validar tamanho (máx 5MB)
            if (selectedFile.size > 5 * 1024 * 1024) {
                setFileError('O ficheiro não pode exceder 5MB');
                return;
            }

            setFile(selectedFile);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setFileError('');
    };

    const validateForm = () => {
        if (!formData.accountHolder.trim()) {
            throw new Error('Nome do titular é obrigatório');
        }
        if (!formData.iban.trim() || formData.iban.replace(/\s/g, '').length < 15) {
            throw new Error('IBAN inválido');
        }
        if (!formData.transferDate) {
            throw new Error('Data da transferência é obrigatória');
        }
        if (!file) {
            throw new Error('Comprovativo de transferência é obrigatório');
        }
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            setFileError('');

            // Validar formulário
            validateForm();

            // 1. Registrar o pagamento manual
            const paymentResult = await paymentService.registerManualPayment(
                orderId,
                numericAmount,
                'BANK_TRANSFER',
                JSON.stringify(formData) // Converter formData para string JSON
            );

            console.log('[BankTransferPayment] Resultado do pagamento:', paymentResult);

            if (!paymentResult || (!paymentResult.success && !paymentResult.transaction_id)) {
                throw new Error(paymentResult?.error || 'Erro ao registrar pagamento');
            }

            // Atualizar o transactionId no contexto se existir
            const transactionId = paymentResult.transaction_id ||
                (paymentResult.data && paymentResult.data.transaction_id);

            if (transactionId) {
                await payment.updatePaymentData({
                    transactionId: transactionId,
                    status: 'PENDING_VALIDATION'
                });

                console.log('[BankTransferPayment] Transaction ID atualizado:', transactionId);
            }

            // 2. Fazer upload do comprovativo como anexo do documento
            if (file && documentId) {
                try {
                    const formDataUpload = new FormData();
                    formDataUpload.append('tb_document', documentId);
                    formDataUpload.append('files', file);
                    formDataUpload.append('descr', `Comprovativo de Transferência - ${formData.transferReference || 'Ref. ' + Date.now()}`);

                    await addDocumentAnnex(formDataUpload);
                } catch (uploadError) {
                    console.error('Erro no upload do comprovativo:', uploadError);
                    // Não falhar o processo completo por erro de upload
                }
            }

            // 3. Chamar callback de sucesso
            if (onSuccess) {
                await onSuccess(paymentResult);
            }

        } catch (err) {
            console.error('Erro ao processar transferência:', err);
            setFileError(err.message || 'Erro ao processar pagamento');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box>
            <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <BankIcon color="primary" fontSize="large" />
                    <Typography variant="h6">
                        Dados da Transferência Bancária
                    </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                    Realize a transferência para a conta indicada e anexe o comprovativo.
                </Typography>

                <Box sx={{ backgroundColor: '#e3f2fd', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        <strong>Dados para Transferência:</strong>
                    </Typography>
                    <Typography variant="body2">IBAN: PT50 0033 0000 4570 8378 2190 5</Typography>
                    <Typography variant="body2">Titular: AINTAR ASSOC MUN SIS INT AGUAS RESID</Typography>
                    <Typography variant="body2">Valor: €{numericAmount.toFixed(2)}</Typography>
                    <Typography variant="body2">Referência: {orderId}</Typography>
                </Box>
            </Paper>

            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <TextField
                    fullWidth
                    required
                    label="Nome do Titular da Conta Origem"
                    name="accountHolder"
                    value={formData.accountHolder}
                    onChange={handleInputChange}
                    margin="normal"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <BankIcon />
                            </InputAdornment>
                        ),
                    }}
                />

                <TextField
                    fullWidth
                    required
                    label="IBAN da Conta de Origem"
                    name="iban"
                    value={formData.iban}
                    onChange={handleInputChange}
                    margin="normal"
                    placeholder="PT50 0000 0000 0000 0000 0000 0"
                    helperText="IBAN da conta de onde foi feita a transferência"
                />

                <TextField
                    fullWidth
                    required
                    label="Data da Transferência"
                    name="transferDate"
                    type="date"
                    value={formData.transferDate}
                    onChange={handleInputChange}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    fullWidth
                    label="Referência da Transferência (Opcional)"
                    name="transferReference"
                    value={formData.transferReference}
                    onChange={handleInputChange}
                    margin="normal"
                    helperText="Número de referência fornecido pelo banco"
                />

                <TextField
                    fullWidth
                    label="Observações (Opcional)"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    margin="normal"
                    multiline
                    rows={2}
                />

                <Box mt={3}>
                    <FormControl fullWidth>
                        <FormLabel required sx={{ mb: 1 }}>
                            Comprovativo de Transferência
                        </FormLabel>

                        {!file ? (
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<UploadIcon />}
                                sx={{
                                    height: 80,
                                    border: '2px dashed #ccc',
                                    '&:hover': {
                                        border: '2px dashed #1976d2',
                                        backgroundColor: '#f5f5f5'
                                    }
                                }}
                            >
                                Selecionar Comprovativo
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                />
                            </Button>
                        ) : (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <List dense>
                                    <ListItem
                                        secondaryAction={
                                            <IconButton
                                                edge="end"
                                                onClick={handleRemoveFile}
                                                disabled={isSubmitting}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemIcon>
                                            <FileIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={file.name}
                                            secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                        />
                                        <Chip
                                            size="small"
                                            icon={<CheckIcon />}
                                            label="Pronto"
                                            color="success"
                                            variant="outlined"
                                        />
                                    </ListItem>
                                </List>
                            </Paper>
                        )}

                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            Formatos aceitos: JPG, PNG, PDF (máx. 5MB)
                        </Typography>
                    </FormControl>
                </Box>

                {(error || fileError) && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error || fileError}
                    </Alert>
                )}

                <Box mt={3} display="flex" gap={2}>
                    <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        type="submit"
                        disabled={loading || isSubmitting || !file}
                        startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckIcon />}
                    >
                        {isSubmitting ? 'A processar...' : 'Confirmar Pagamento'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default BankTransferPayment;