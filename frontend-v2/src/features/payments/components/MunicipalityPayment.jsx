import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress,
    Select, MenuItem, FormControl, InputLabel, Divider,
    Paper, Chip, Grid, Avatar, Fade
} from '@mui/material';
import {
    LocationCity as MunicipalityIcon, CloudUpload as UploadIcon,
    AttachFile as AttachIcon, InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import useMetaData from '@/core/hooks/useMetaData';
import { useAuth } from '@/core/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import paymentService from '../services/paymentService';
import { documentsService } from '@/features/documents/api/documentsService';

const MunicipalityPayment = ({ onSuccess, documentId, amount }) => {
    const { data: metaData } = useMetaData();
    const { hasPermission } = usePermissionContext();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        municipality: '',
        reference: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [attachmentError, setAttachmentError] = useState('');

    const hasAccess = user?.profil === '2' || hasPermission(740); // payments.municipality

    const { mutate: registerPayment, isLoading } = useMutation({
        mutationFn: async () => {
            const referenceInfo = `Pagamento no ${formData.municipality} em ${new Date(formData.paymentDate).toLocaleDateString('pt-PT')}. Ref: ${formData.reference.trim()}`;

            const result = await paymentService.processManual(documentId, amount, 'MUNICIPALITY', referenceInfo);

            if (attachments.length > 0 && result.success) {
                const fd = new FormData();
                fd.append('tb_document', documentId);
                attachments.forEach((item) => {
                    fd.append('files', item.file);
                    fd.append('descr', `Comprovativo de pagamento - ${formData.municipality}`);
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

    const getAvailableMunicipalities = () => {
        const municipalities = ['AINTAR'];
        if (metaData?.associates) {
            metaData.associates.forEach(assoc => municipalities.push(assoc.name));
        }
        return municipalities;
    };

    // Auto-preenchimento baseado na entity do utilizador
    useEffect(() => {
        if (user?.entity && user?.profil !== '0') {
            if (user.entity === 1) {
                setFormData(prev => ({ ...prev, municipality: 'AINTAR' }));
            } else {
                const associate = metaData?.associates?.find(a => a.pk === user.entity);
                if (associate) {
                    setFormData(prev => ({ ...prev, municipality: associate.name }));
                }
            }
        }
    }, [user?.entity, user?.profil, metaData?.associates]);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + attachments.length > 3) {
            setAttachmentError('Máximo 3 comprovativos por pagamento.');
            return;
        }
        const newFiles = acceptedFiles.map((file) => ({
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));
        setAttachments(prev => [...prev, ...newFiles]);
        setAttachmentError('');
    }, [attachments.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
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
        if (!formData.municipality) { setError('Município obrigatório'); return; }
        if (!formData.reference.trim()) { setError('Referência obrigatória'); return; }
        if (!formData.paymentDate) { setError('Data obrigatória'); return; }
        setError('');
        registerPayment();
    };

    if (!hasAccess) {
        return (
            <Alert severity="warning" sx={{ m: 3 }}>
                Sem permissão para este método de pagamento.
            </Alert>
        );
    }

    const isAdmin = user?.profil === '0';

    return (
        <Fade in>
            <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar sx={{
                        width: 80, height: 80, mx: 'auto', mb: 2,
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                    }}>
                        <MunicipalityIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                        Pagamento nos Municípios
                    </Typography>
                    <Paper sx={{
                        p: 2, mt: 2,
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        color: 'white', borderRadius: 3
                    }}>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                            €{Number(amount || 0).toFixed(2)}
                        </Typography>
                    </Paper>
                </Box>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        {isAdmin ? (
                            <FormControl fullWidth required sx={{ mb: 2 }}>
                                <InputLabel>Município</InputLabel>
                                <Select
                                    value={formData.municipality}
                                    onChange={(e) => setFormData(prev => ({ ...prev, municipality: e.target.value }))}
                                    label="Município"
                                >
                                    {getAvailableMunicipalities().map(m => (
                                        <MenuItem key={m} value={m}>{m}</MenuItem>
                                    ))}
                                </Select>
                                <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                    Como administrador, pode escolher qualquer município
                                </Typography>
                            </FormControl>
                        ) : (
                            <TextField
                                fullWidth required label="Município"
                                value={formData.municipality} disabled
                                sx={{ mb: 2 }}
                                helperText="Município correspondente ao utilizador autenticado"
                            />
                        )}

                        <TextField
                            fullWidth required type="date"
                            label="Data do pagamento"
                            value={formData.paymentDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            helperText="Data em que o pagamento foi efectuado"
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth required
                            label="Referência do pagamento"
                            value={formData.reference}
                            onChange={(e) => { setFormData(prev => ({ ...prev, reference: e.target.value })); setError(''); }}
                            placeholder="Ex: Guia nº 12345"
                            sx={{ mb: 2 }}
                            helperText="Número do recibo ou referência oficial"
                        />
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                        <AttachIcon sx={{ mr: 1 }} /> Comprovativos (Opcional)
                    </Typography>

                    {attachments.length < 3 && (
                        <Box
                            {...getRootProps()}
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragActive ? 'primary.main' : 'divider',
                                borderRadius: 2, p: 3, textAlign: 'center',
                                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                                cursor: 'pointer', transition: 'all 0.2s',
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            <input {...getInputProps()} disabled={isLoading} />
                            <UploadIcon sx={{ fontSize: 32, mb: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                                {isDragActive ? 'Solte aqui...' : 'Clique ou arraste comprovativos'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                PDF, imagens ou documentos (máx. 3)
                            </Typography>
                        </Box>
                    )}

                    {attachmentError && <Alert severity="error" sx={{ mt: 1 }}>{attachmentError}</Alert>}

                    {attachments.length > 0 && (
                        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Button
                    fullWidth variant="contained" size="large"
                    onClick={handlePay}
                    disabled={isLoading || !formData.municipality || !formData.reference.trim()}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <MunicipalityIcon />}
                    sx={{
                        py: 1.5,
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #e5609a 0%, #e5d140 100%)' }
                    }}
                >
                    {isLoading ? 'A registar...' : `Registar Pagamento`}
                </Button>

                <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                    <Typography variant="body2">
                        <strong>Importante:</strong><br />
                        • Pagamento registado em: <strong>{formData.municipality || '...'}</strong><br />
                        {attachments.length > 0 && <>• {attachments.length} comprovativo(s) será(ão) anexado(s)<br /></>}
                        • Necessita validação posterior
                    </Typography>
                </Alert>
            </Box>
        </Fade>
    );
};

export default MunicipalityPayment;
