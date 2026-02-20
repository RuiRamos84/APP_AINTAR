import React, { useState, useCallback } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress,
    Paper, InputAdornment, Grid, Avatar, Fade, IconButton, Chip
} from '@mui/material';
import {
    AccountBalance as BankIcon, CloudUpload as UploadIcon,
    Delete as DeleteIcon, InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import paymentService from '../services/paymentService';
import { documentsService } from '@/features/documents/api/documentsService';

const BankTransferPayment = ({ onSuccess, documentId, amount }) => {
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        accountHolder: '',
        transferDate: new Date().toISOString().split('T')[0],
        transferReference: '',
        notes: ''
    });
    const [attachments, setAttachments] = useState([]);
    const [error, setError] = useState('');

    const { mutate: registerPayment, isLoading } = useMutation({
        mutationFn: async () => {
            const referenceInfo = `Transferência de ${formData.accountHolder} em ${new Date(formData.transferDate).toLocaleDateString('pt-PT')}${formData.transferReference ? `, Ref: ${formData.transferReference}` : ''}${formData.notes ? `, Obs: ${formData.notes}` : ''}`;

            const result = await paymentService.processManual(documentId, amount, 'BANK_TRANSFER', referenceInfo);

            if (attachments.length > 0 && result.success) {
                const fd = new FormData();
                fd.append('tb_document', documentId);
                attachments.forEach((item) => {
                    fd.append('files', item.file);
                    fd.append('descr', `Comprovativo transferência - ${formData.accountHolder}`);
                });
                try {
                    await documentsService.addAnnex(fd);
                } catch (e) {
                    console.warn('Pagamento registado, mas erro ao anexar comprovativos:', e);
                }
            }
            return result;
        },
        onSuccess: (result) => {
            onSuccess?.(result);
            queryClient.invalidateQueries({ queryKey: ['document', documentId] });
        },
        onError: (err) => setError(err.message || 'Ocorreu um erro ao registar o pagamento.'),
    });

    const handleChange = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        setError('');
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + attachments.length > 3) {
            setError('Máximo 3 comprovativos.');
            return;
        }
        const newFiles = acceptedFiles.map((file) => ({
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));
        setAttachments(prev => [...prev, ...newFiles]);
        setError('');
    }, [attachments.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        },
        maxFiles: 3
    });

    const handleRemove = (index) => {
        setAttachments(prev => {
            const updated = [...prev];
            if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const handlePay = () => {
        if (!formData.accountHolder.trim()) { setError('Nome do titular obrigatório'); return; }
        if (!formData.transferDate) { setError('Data obrigatória'); return; }
        if (attachments.length === 0) { setError('Comprovativo obrigatório'); return; }
        setError('');
        registerPayment();
    };

    return (
        <Fade in>
            <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar sx={{
                        width: 80, height: 80, mx: 'auto', mb: 2,
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                    }}>
                        <BankIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                        Transferência Bancária
                    </Typography>
                    <Paper sx={{
                        p: 2, mt: 2,
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white', borderRadius: 3
                    }}>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                            €{Number(amount || 0).toFixed(2)}
                        </Typography>
                    </Paper>
                </Box>

                {/* Dados para transferência */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Dados para transferência
                    </Typography>
                    <Grid container spacing={1}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2"><strong>IBAN:</strong> PT50 0033 0000 4570 8378 2190 5</Typography>
                            <Typography variant="body2"><strong>Titular:</strong> AINTAR</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2"><strong>Valor:</strong> €{Number(amount || 0).toFixed(2)}</Typography>
                            <Typography variant="body2"><strong>Referência:</strong> {documentId}</Typography>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Formulário */}
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Dados da transferência realizada
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth required
                            label="Titular da conta origem"
                            value={formData.accountHolder}
                            onChange={handleChange('accountHolder')}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><BankIcon fontSize="small" /></InputAdornment>
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                            fullWidth required type="date"
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
                            helperText="Referência ou nº da operação"
                        />
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            fullWidth label="Observações" multiline rows={2}
                            value={formData.notes}
                            onChange={handleChange('notes')}
                        />
                    </Grid>
                </Grid>

                {/* Upload de comprovativos */}
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Comprovativos (Obrigatório)
                </Typography>

                {attachments.length < 3 && (
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: isDragActive ? '2px dashed' : '2px dashed',
                            borderColor: isDragActive ? 'primary.main' : 'divider',
                            borderRadius: 2, p: 3, textAlign: 'center',
                            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                            cursor: 'pointer', mb: 2,
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                    >
                        <input {...getInputProps()} disabled={isLoading} />
                        <UploadIcon sx={{ fontSize: 32, mb: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                            {isDragActive ? 'Solte aqui...' : 'Clique ou arraste comprovativos'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            PDF ou imagens (máx. 3)
                        </Typography>
                    </Box>
                )}

                {attachments.length > 0 && (
                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {attachments.map((item, index) => (
                            <Chip
                                key={index}
                                icon={<FileIcon />}
                                label={item.file.name}
                                onDelete={() => handleRemove(index)}
                                variant="outlined"
                                sx={{ maxWidth: 250 }}
                            />
                        ))}
                    </Box>
                )}

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Button
                    fullWidth variant="contained" size="large"
                    onClick={handlePay}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <BankIcon />}
                    sx={{
                        py: 1.5,
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #3f9cfe 0%, #00e2fe 100%)' }
                    }}
                >
                    {isLoading ? 'A registar...' : 'Confirmar Transferência'}
                </Button>

                <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                    <Typography variant="body2">
                        <strong>Importante:</strong><br />
                        • Este registo confirma que a transferência foi realizada<br />
                        • Será necessária validação posterior<br />
                        {attachments.length > 0 && <>• {attachments.length} comprovativo(s) será(ão) anexado(s)<br /></>}
                        • Certifique-se de que os dados estão corretos
                    </Typography>
                </Alert>
            </Box>
        </Fade>
    );
};

export default BankTransferPayment;
