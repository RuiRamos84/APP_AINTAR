import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress,
    Select, MenuItem, FormControl, InputLabel, Divider, List,
    Paper, Chip, Stack, Grid
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import {
    LocationCity as MunicipalityIcon,
    CloudUpload as UploadIcon,
    AttachFile as AttachIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';
import { canUsePaymentMethod, PAYMENT_METHODS } from '../services/paymentTypes';
import { useRouteConfig } from '../../../hooks/useRouteConfig';
import { useMetaData } from '../../../contexts/MetaDataContext';
import { FilePreviewItem, generateFilePreview } from '../../../pages/ModernDocuments/utils/fileUtils';
import { addDocumentAnnex } from '../../../services/documentService';

const MunicipalityPayment = ({ onSuccess, userInfo }) => {
    const { state, payManual } = useContext(PaymentContext);
    const { metaData } = useMetaData();
    const { hasPermission } = useRouteConfig();

    const [formData, setFormData] = useState({
        municipality: '',
        reference: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [attachmentError, setAttachmentError] = useState('');

    // ===== USAR GESTÃO CENTRALIZADA =====
    const hasAccess = hasPermission({
        requiredProfil: "2" // Municípios
    }) || hasPermission({
        requiredProfil: "0" // Admin
    });

    const acceptedFileTypes = [
        { type: 'PDF', icon: <PdfIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'error' },
        { type: 'Imagens', icon: <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'success' },
        { type: 'Documentos', icon: <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' }
    ];

    const getMunicipalityByEntity = (entityPk) => {
        if (entityPk === 1) {
            return 'AINTAR';
        }

        const associate = metaData?.associates?.find(assoc => assoc.pk === entityPk);
        return associate?.name || null;
    };

    const getAvailableMunicipalities = () => {
        const municipalities = ['AINTAR'];

        if (metaData?.associates) {
            metaData.associates.forEach(assoc => {
                municipalities.push(assoc.name);
            });
        }

        return municipalities;
    };

    // Auto-preenchimento baseado na entity do utilizador
    useEffect(() => {
        if (userInfo?.entity && userInfo?.profil !== '0') {
            const userMunicipality = getMunicipalityByEntity(userInfo.entity);
            if (userMunicipality) {
                setFormData(prev => ({ ...prev, municipality: userMunicipality }));
            }
        } else if (userInfo?.profil === '0') {
            setFormData(prev => ({ ...prev, municipality: '' }));
        }
    }, [userInfo?.entity, userInfo?.profil, metaData?.associates]);

    const onDropAttachments = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + attachments.length > 3) {
            setAttachmentError('Máximo 3 comprovativos por pagamento.');
            return;
        }

        const newFiles = await Promise.all(
            acceptedFiles.map(async (file) => {
                const preview = await generateFilePreview(file);
                return {
                    file,
                    preview,
                    description: `Comprovativo de pagamento - ${formData.municipality}`,
                };
            })
        );

        setAttachments(prev => [...prev, ...newFiles]);
        setAttachmentError('');
    }, [attachments.length, formData.municipality]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropAttachments,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxFiles: 3
    });

    const handleRemoveAttachment = (index) => {
        const updatedFiles = [...attachments];
        updatedFiles.splice(index, 1);
        setAttachments(updatedFiles);
    };

    const handleAttachmentDescriptionChange = (index, value) => {
        const updatedFiles = [...attachments];
        updatedFiles[index].description = value;
        setAttachments(updatedFiles);
    };

    const validateForm = () => {
        if (!formData.municipality) return 'Município obrigatório';
        if (!formData.reference.trim()) return 'Referência obrigatória';
        if (!formData.paymentDate) return 'Data obrigatória';

        for (let i = 0; i < attachments.length; i++) {
            if (!attachments[i].description.trim()) {
                return 'Todos os comprovativos devem ter uma descrição';
            }
        }

        return null;
    };

    const addAttachmentsToDocument = async (documentId) => {
        if (attachments.length === 0) return true;

        try {
            const formData = new FormData();
            formData.append('tb_document', documentId);

            attachments.forEach((fileItem) => {
                formData.append('files', fileItem.file);
                formData.append('descr', fileItem.description);
            });

            await addDocumentAnnex(formData);
            return true;
        } catch (error) {
            console.error('Erro ao anexar comprovativos:', error);
            return false;
        }
    };

    const handlePay = async () => {
        const validation = validateForm();
        if (validation) {
            setError(validation);
            return;
        }

        setError('');
        try {
            const result = await payManual('MUNICIPALITY', formData.reference.trim());

            if (attachments.length > 0) {
                const attachmentSuccess = await addAttachmentsToDocument(state.documentId);
                if (!attachmentSuccess) {
                    console.warn('Pagamento registrado mas erro ao anexar comprovativos');
                }
            }

            onSuccess?.(result);
        } catch (err) {
            setError(err.message);
        }
    };

    if (!hasAccess) {
        return (
            <Alert severity="warning" sx={{ m: 3 }}>
                Sem permissão para este método de pagamento.
            </Alert>
        );
    }

    const isAdmin = userInfo?.profil === '0';
    const canChangeMunicipality = isAdmin;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <MunicipalityIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6">Pagamento nos Municípios</Typography>
                <Typography variant="body2" color="text.secondary">
                    Registo de pagamento nos balcões municipais
                </Typography>
                <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 600 }}>
                    €{Number(state.amount || 0).toFixed(2)}
                </Typography>
            </Box>

            {/* Formulário em duas colunas */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Coluna 1 */}
                <Grid size={{ xs: 12, md: 6 }}>
                    {/* Campo município */}
                    {canChangeMunicipality ? (
                        <FormControl fullWidth required sx={{ mb: 2 }}>
                            <InputLabel>Município</InputLabel>
                            <Select
                                value={formData.municipality}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, municipality: e.target.value }));
                                }}
                                label="Município"
                            >
                                {getAvailableMunicipalities().map(municipality => (
                                    <MenuItem key={municipality} value={municipality}>
                                        {municipality}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                Como administrador, pode escolher qualquer município
                            </Typography>
                        </FormControl>
                    ) : (
                        <TextField
                            fullWidth
                            required
                            label="Município"
                            value={formData.municipality}
                            disabled
                            sx={{
                                mb: 2,
                                '& .MuiInputBase-input.Mui-disabled': {
                                    WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                }
                            }}
                            helperText={`Município correspondente ao utilizador autenticado`}
                        />
                    )}

                    {/* Data do pagamento */}
                    <TextField
                        fullWidth
                        required
                        type="date"
                        label="Data do pagamento"
                        value={formData.paymentDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        helperText="Data em que o pagamento foi efectuado"
                    />
                </Grid>

                {/* Coluna 2 */}
                <Grid size={{ xs: 12, md: 6 }}>
                    {/* Referência do pagamento */}
                    <TextField
                        fullWidth
                        required
                        label="Referência do pagamento"
                        value={formData.reference}
                        onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                        placeholder="Ex: Guia nº 12345"
                        sx={{ mb: 2 }}
                        helperText="Número do recibo ou referência oficial do pagamento"
                    />

                    {/* Espaço adicional */}
                    <Box sx={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #e0e0e0', borderRadius: 1, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary">
                            Espaço reservado para campos adicionais
                        </Typography>
                    </Box>
                </Grid>
            </Grid>

            {/* Secção de anexos */}
            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachIcon sx={{ mr: 1 }} />
                    Comprovativos (Opcional)
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Anexe comprovativos do pagamento (recibos, faturas, etc.) para agilizar a validação.
                </Typography>

                {/* Tipos aceitos */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                        Formatos aceitos:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
                        {acceptedFileTypes.map((type, index) => (
                            <Chip
                                key={index}
                                icon={type.icon}
                                label={type.type}
                                size="small"
                                color={type.color}
                                variant="outlined"
                            />
                        ))}
                    </Stack>
                </Box>

                {/* Dropzone */}
                {attachments.length < 3 && (
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: isDragActive ? `2px dashed #1976d2` : `2px dashed #e0e0e0`,
                            borderRadius: 1,
                            p: 2,
                            textAlign: 'center',
                            bgcolor: isDragActive ? 'rgba(25, 118, 210, 0.04)' : 'background.paper',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                            }
                        }}
                    >
                        <input {...getInputProps()} disabled={state.loading} />
                        <UploadIcon sx={{ fontSize: 24, mb: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" gutterBottom>
                            {isDragActive ? 'Solte aqui...' : 'Clique ou arraste comprovativos'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            PDF, imagens ou documentos (máx. 3)
                        </Typography>
                    </Box>
                )}

                {attachmentError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {attachmentError}
                    </Alert>
                )}

                {/* Lista de anexos */}
                {attachments.length > 0 && (
                    <Paper sx={{ mt: 2, p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Comprovativos ({attachments.length})
                        </Typography>
                        <List>
                            {attachments.map((fileItem, index) => (
                                <FilePreviewItem
                                    key={`${fileItem.file.name}-${index}`}
                                    file={fileItem.file}
                                    description={fileItem.description}
                                    onDescriptionChange={(value) => handleAttachmentDescriptionChange(index, value)}
                                    onRemove={() => handleRemoveAttachment(index)}
                                    disabled={state.loading}
                                    previewUrl={fileItem.preview}
                                />
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>

            {/* Erro */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Botão de submissão */}
            <Button
                fullWidth
                variant="contained"
                onClick={handlePay}
                disabled={state.loading || !formData.municipality || !formData.reference.trim()}
                startIcon={state.loading ? <CircularProgress size={20} /> : <MunicipalityIcon />}
                sx={{
                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #e5609a 0%, #e5d140 100%)'
                    }
                }}
            >
                {state.loading ? 'A registar...' : `Registar pagamento no ${formData.municipality}`}
            </Button>

            {/* Informação importante */}
            <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                    <strong>Importante:</strong><br />
                    • Pagamento registado em: <strong>{formData.municipality}</strong><br />
                    {attachments.length > 0 && (
                        <>• {attachments.length} comprovativo(s) será(ão) anexado(s)<br /></>
                    )}
                    • Necessita validação posterior<br />
                    • Certifique-se de que todos os dados estão corretos
                </Typography>
            </Alert>
        </Box>
    );
};

export default MunicipalityPayment;