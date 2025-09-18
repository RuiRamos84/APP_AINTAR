import React, { useState, useCallback } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    CircularProgress,
    Paper,
    InputAdornment,
    Grid
} from '@mui/material';
import { AccountBalance as BankIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { generateFilePreview } from '../../../pages/ModernDocuments/utils/fileUtils';
import { addDocumentAnnex } from '../../../services/documentService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import paymentService from '../services/paymentService';

const BankTransferPayment = ({ onSuccess, documentId, amount }) => {
    const queryClient = useQueryClient();

    // Estados do formulário
    const [formData, setFormData] = useState({
        accountHolder: '',
        transferDate: new Date().toISOString().split('T')[0],
        transferReference: '',
        notes: ''
    });

    const [attachments, setAttachments] = useState([]);
    const [error, setError] = useState('');

    const { mutate: registerPayment, isLoading } = useMutation({
        mutationFn: async (paymentData) => {
            // 1. Registar o pagamento
            const result = await paymentService.processManual(
                paymentData.documentId,
                paymentData.amount,
                'BANK_TRANSFER',
                paymentData.reference
            );

            // 2. Anexar ficheiros se o registo for bem-sucedido
            if (paymentData.attachments.length > 0 && result.success) {
                await addAttachmentsToDocument(paymentData.documentId, paymentData.attachments);
            }
            return result;
        },
        onSuccess: (result) => {
            onSuccess?.(result);
            queryClient.invalidateQueries({ queryKey: ['document', documentId] });
        },
        onError: (err) => setError(err.message || 'Ocorreu um erro ao registar o pagamento.'),
    });

    // Handler para mudanças no formulário
    const handleChange = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    // Upload de comprovativos
    const onDropAttachments = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + attachments.length > 3) {
            setError('Máximo 3 comprovativos.');
            return;
        }

        const newFiles = await Promise.all(
            acceptedFiles.map(async (file) => {
                const preview = await generateFilePreview(file);
                return {
                    file,
                    preview,
                    description: `Comprovativo transferência - ${formData.accountHolder}`,
                };
            })
        );

        setAttachments(prev => [...prev, ...newFiles]);
        setError('');
    }, [attachments.length, formData.accountHolder]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropAttachments,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        },
        maxFiles: 3
    });

    // Remoção de anexos
    const handleRemoveAttachment = (index) => {
        const updatedFiles = [...attachments];
        updatedFiles.splice(index, 1);
        setAttachments(updatedFiles);
    };

    // Anexar comprovativos ao documento
    const addAttachmentsToDocument = async (documentId) => {
        if (attachments.length === 0) return true;

        try {
            const formDataAttachments = new FormData();
            formDataAttachments.append('tb_document', documentId);

            attachments.forEach((fileItem) => {
                formDataAttachments.append('files', fileItem.file);
                formDataAttachments.append('descr', fileItem.description);
            });

            await addDocumentAnnex(formDataAttachments);
            console.log('✅ Comprovativos anexados');
            return true;
        } catch (error) {
            console.error('❌ Erro anexar comprovativos:', error);
            return false;
        }
    };

    // Submissão do pagamento
    const handlePay = () => {
        if (!formData.accountHolder.trim()) {
            setError('Nome do titular obrigatório');
            return;
        }
        if (!formData.transferDate) {
            setError('Data obrigatória');
            return;
        }
        if (attachments.length === 0) {
            setError('Comprovativo obrigatório');
            return;
        }

        setError('');

        const referenceInfo = `Transferência de ${formData.accountHolder} em ${new Date(formData.transferDate).toLocaleDateString('pt-PT')}${formData.transferReference ? `, Ref: ${formData.transferReference}` : ''}${formData.notes ? `, Obs: ${formData.notes}` : ''}`;

        registerPayment({
            documentId,
            amount,
            reference: referenceInfo,
            attachments
        });
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <BankIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6" gutterBottom>
                    Transferência Bancária
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                    €{Number(amount || 0).toFixed(2)}
                </Typography>
            </Box>

            {/* Dados para transferência */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'white' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    🏛️ Dados para transferência:
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                            <strong>IBAN:</strong> PT50 0033 0000 4570 8378 2190 5
                        </Typography>
                        <Typography variant="body2">
                            <strong>Titular:</strong> AINTAR
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                            <strong>Valor:</strong> €{Number(amount || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Referência:</strong> {documentId}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Formulário */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                📝 Dados da transferência realizada:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth
                        required
                        label="Titular da conta origem"
                        value={formData.accountHolder}
                        onChange={handleChange('accountHolder')}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><BankIcon /></InputAdornment>
                        }}
                        helperText="Nome do titular que fez a transferência"
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth
                        required
                        type="date"
                        label="Data da transferência"
                        value={formData.transferDate}
                        onChange={handleChange('transferDate')}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth
                        label="Referência da transferência"
                        value={formData.transferReference}
                        onChange={handleChange('transferReference')}
                        helperText="Referência ou número da operação"
                    />
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <TextField
                        fullWidth
                        label="Observações"
                        multiline
                        rows={2}
                        value={formData.notes}
                        onChange={handleChange('notes')}
                        helperText="Informações adicionais"
                    />
                </Grid>
            </Grid>

            {/* Upload de comprovativos */}
            <Typography variant="subtitle2" gutterBottom>
                📎 Comprovativos (Obrigatório)
            </Typography>

            {attachments.length < 3 && (
                <Box
                    {...getRootProps()}
                    sx={{
                        border: isDragActive ? `2px dashed #1976d2` : `2px dashed #e0e0e0`,
                        borderRadius: 1,
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDragActive ? 'rgba(25, 118, 210, 0.04)' : 'background.paper',
                        cursor: 'pointer',
                        mb: 2,
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                >
                    <input {...getInputProps()} disabled={isLoading} />
                    <UploadIcon sx={{ fontSize: 24, mb: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                        {isDragActive ? 'Solte aqui...' : 'Clique ou arraste comprovativos'}
                    </Typography>
                </Box>
            )}

            {attachments.length > 0 && (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Comprovativos ({attachments.length})
                    </Typography>
                    <Grid container spacing={2}>
                        {attachments.map((fileItem, index) => (
                            <Grid size={{ xs: 12, md: 6 }} key={index}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 2,
                                    p: 2,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1
                                }}>
                                    <Box sx={{ flexShrink: 0 }}>
                                        {fileItem.preview && fileItem.preview !== "url/to/generic/file/icon.png" ? (
                                            <img
                                                src={fileItem.preview}
                                                alt="preview"
                                                style={{ width: 60, height: 60, objectFit: 'contain' }}
                                            />
                                        ) : (
                                            <Box sx={{
                                                width: 60,
                                                height: 60,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'grey.200',
                                                borderRadius: 1
                                            }}>
                                                📄
                                            </Box>
                                        )}
                                    </Box>

                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight="medium" noWrap>
                                            {fileItem.file.name}
                                        </Typography>
                                    </Box>

                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 40,
                                        height: 60
                                    }}>
                                        <Button
                                            size="small"
                                            onClick={() => handleRemoveAttachment(index)}
                                            sx={{
                                                minWidth: 32,
                                                height: 32,
                                                color: '#d32f2f'
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M3 6h18v2H3V6zm2 3h14l-1 14H6L5 9zm5-6h4v1H10V3z" />
                                            </svg>
                                        </Button>
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Button
                fullWidth
                variant="contained"
                onClick={handlePay}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <BankIcon />}
                sx={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #3f9cfe 0%, #00e2fe 100%)'
                    }
                }}
            >
                {isLoading ? 'A registar...' : 'Confirmar Transferência'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                    <strong>Importante:</strong><br />
                    • Este registo confirma que a transferência foi realizada<br />
                    • Será necessária validação posterior<br />
                    {attachments.length > 0 && `• ${attachments.length} comprovativo(s) será(ão) anexado(s)<br />`}
                    • Certifique-se de que os dados estão corretos
                </Typography>
            </Alert>
        </Box>
    );
};

export default BankTransferPayment;