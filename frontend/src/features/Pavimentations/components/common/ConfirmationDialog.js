import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    Button,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    useTheme,
    useMediaQuery,
    Stack,
    List,
    Collapse
} from '@mui/material';
import {
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    CloudUpload as UploadIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Description as DescriptionIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    TableChart as TableIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { FilePreviewItem, generateFilePreview, processFiles } from '../../utils/fileUtils';

/**
 * Dialog de confirmação com suporte a anexos (estilo AddStepModal)
 */
const ConfirmationDialog = ({
    open,
    title,
    message,
    details,
    severity = 'warning',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    confirmColor = 'primary',
    onConfirm,
    onCancel,
    loading = false,
    disabled = false,
    showIcon = true,
    maxWidth = 'sm',
    fullWidth = true,
    // Props para anexos
    allowAttachments = false,
    attachmentLabel = 'Anexar comprovativo',
    attachmentRequired = false,
    ...dialogProps
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Estados para anexos
    const [files, setFiles] = useState([]);
    const [attachmentExpanded, setAttachmentExpanded] = useState(false);
    const [fileErrors, setFileErrors] = useState('');

    // Tipos de ficheiro aceites
    const fileTypes = [
        { type: 'PDF', icon: <PdfIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'error' },
        { type: 'Imagens', icon: <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'success' },
        { type: 'Word', icon: <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' },
        { type: 'Excel', icon: <TableIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'primary' },
        { type: 'Email', icon: <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' }
    ];

    // Reset quando fecha/abre
    useEffect(() => {
        if (!open) {
            setFiles([]);
            setAttachmentExpanded(false);
            setFileErrors('');
        }
    }, [open]);
    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + files.length > 5) {
            setFileErrors('Máximo 5 ficheiros');
            return;
        }

        const newFiles = await Promise.all(
            acceptedFiles.map(async (file) => {
                const preview = await generateFilePreview(file);
                return { file, preview, description: '' };
            })
        );

        setFiles(prev => [...prev, ...newFiles]);
        setFileErrors('');
    }, [files.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'message/rfc822': ['.eml'],
            'application/vnd.ms-outlook': ['.msg']
        },
        maxFiles: 5,
        multiple: true
    });

    /**
     * Remover ficheiro
     */
    const handleFileRemove = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    /**
     * Alterar descrição do ficheiro
     */
    const handleFileDescriptionChange = (index, value) => {
        setFiles(prev => {
            const updated = [...prev];
            updated[index].description = value;
            return updated;
        });
    };

    /**
     * Validar se pode confirmar
     */
    const canConfirm = () => {
        if (attachmentRequired && allowAttachments && files.length === 0) {
            return false;
        }

        // Verificar se todos os ficheiros têm descrição
        if (files.length > 0) {
            const hasEmptyDescription = files.some(f => !f.description.trim());
            if (hasEmptyDescription) return false;
        }

        return !disabled && !loading;
    };

    /**
     * Obter ícone baseado na severidade
     */
    const getIcon = () => {
        const iconProps = {
            sx: {
                fontSize: 32,
                color: `${severity}.main`,
                mb: 1
            }
        };

        switch (severity) {
            case 'success':
                return <SuccessIcon {...iconProps} />;
            case 'error':
                return <ErrorIcon {...iconProps} />;
            case 'info':
                return <InfoIcon {...iconProps} />;
            case 'warning':
            default:
                return <WarningIcon {...iconProps} />;
        }
    };

    /**
     * Obter cor do botão de confirmação
     */
    const getConfirmButtonColor = () => {
        if (confirmColor !== 'primary') return confirmColor;

        switch (severity) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'success':
                return 'success';
            default:
                return 'primary';
        }
    };

    /**
     * Manipular confirmação
     */
    const handleConfirm = () => {
        if (onConfirm && canConfirm()) {
            onConfirm(files);
        }
    };

    /**
     * Manipular cancelamento
     */
    const handleCancel = () => {
        if (onCancel && !loading) {
            onCancel();
        }
    };

    /**
     * Renderizar seção de anexos (estilo AddStepModal)
     */
    const renderAttachmentSection = () => {
        if (!allowAttachments) return null;

        return (
            <Box sx={{ mt: 2 }}>
                <Button
                    startIcon={attachmentExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => setAttachmentExpanded(!attachmentExpanded)}
                    sx={{ mb: 1 }}
                >
                    {attachmentLabel}
                    {attachmentRequired && <Typography component="span" color="error"> *</Typography>}
                    {files.length > 0 && (
                        <Chip
                            label={files.length}
                            size="small"
                            sx={{ ml: 1 }}
                        />
                    )}
                </Button>

                <Collapse in={attachmentExpanded}>
                    <Box sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        p: 2,
                        backgroundColor: alpha(theme.palette.grey[50], 0.5)
                    }}>
                        {/* Tipos aceites */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontSize="0.875rem" color="text.secondary" gutterBottom>
                                Formatos aceites:
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                {fileTypes.map((type, index) => (
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
                        {files.length < 5 ? (
                            <Box
                                {...getRootProps()}
                                sx={{
                                    border: isDragActive
                                        ? `2px dashed #1976d2`
                                        : `2px dashed #e0e0e0`,
                                    borderRadius: 1,
                                    p: 3,
                                    textAlign: 'center',
                                    bgcolor: isDragActive
                                        ? 'rgba(25, 118, 210, 0.04)'
                                        : 'background.paper',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                                    }
                                }}
                            >
                                <input {...getInputProps()} disabled={loading} />
                                <UploadIcon
                                    sx={{
                                        fontSize: 40,
                                        mb: 1,
                                        color: isDragActive
                                            ? '#1976d2'
                                            : 'text.secondary'
                                    }}
                                />

                                <Typography variant="body1" gutterBottom>
                                    {isDragActive
                                        ? 'Largue os ficheiros aqui...'
                                        : 'Arraste, largue, cole ou clique'
                                    }
                                </Typography>

                                <Typography variant="body2" color="text.secondary">
                                    PDF, imagens, documentos Office e emails
                                </Typography>

                                {fileErrors && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                        {fileErrors}
                                    </Typography>
                                )}
                            </Box>
                        ) : (
                            <Typography variant="subtitle1" color="error" textAlign="center" mt={2}>
                                Número máximo de anexos atingido.
                            </Typography>
                        )}

                        {/* Lista de ficheiros */}
                        {files.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Ficheiros ({files.length})
                                </Typography>
                                <List>
                                    {files.map((fileItem, index) => (
                                        <FilePreviewItem
                                            key={`${fileItem.file.name}-${index}`}
                                            file={fileItem.file}
                                            description={fileItem.description}
                                            onDescriptionChange={(value) => handleFileDescriptionChange(index, value)}
                                            onRemove={() => handleFileRemove(index)}
                                            disabled={loading}
                                            previewUrl={fileItem.preview}
                                        />
                                    ))}
                                </List>
                            </Box>
                        )}

                        {/* Alerta se obrigatório */}
                        {attachmentRequired && files.length === 0 && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                É obrigatório anexar pelo menos um ficheiro
                            </Alert>
                        )}

                        {/* Alerta descrições obrigatórias */}
                        {files.length > 0 && files.some(f => !f.description.trim()) && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                Todos os ficheiros precisam de descrição
                            </Alert>
                        )}
                    </Box>
                </Collapse>
            </Box>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 2,
                    minHeight: isMobile ? '100vh' : 'auto'
                }
            }}
            {...dialogProps}
        >
            {/* Cabeçalho */}
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexDirection: isMobile ? 'column' : 'row',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    {showIcon && getIcon()}
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="div">
                            {title}
                        </Typography>
                        <Chip
                            label={severity === 'warning' ? 'Ação Irreversível' : 'Confirmação'}
                            size="small"
                            color={severity}
                            variant="outlined"
                            sx={{ mt: 1 }}
                        />
                    </Box>
                </Box>
            </DialogTitle>

            {/* Conteúdo */}
            <DialogContent sx={{ pt: 1 }}>
                {/* Mensagem principal */}
                <DialogContentText component="div" sx={{ mb: 2 }}>
                    <Typography variant="body1" color="text.primary" paragraph>
                        {message}
                    </Typography>

                    {details && (
                        <Typography variant="body2" color="text.secondary">
                            {details}
                        </Typography>
                    )}
                </DialogContentText>

                {/* Alerta visual para ações críticas */}
                {(severity === 'error' || severity === 'warning') && (
                    <Alert severity={severity} sx={{ mb: 2 }} icon={false}>
                        <Typography variant="body2">
                            {severity === 'error'
                                ? 'Esta ação pode ter consequências permanentes.'
                                : 'Esta ação não pode ser desfeita. Certifique-se antes de continuar.'
                            }
                        </Typography>
                    </Alert>
                )}

                {/* Seção de anexos */}
                {renderAttachmentSection()}
            </DialogContent>

            {/* Ações */}
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Box sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: isMobile ? 'column-reverse' : 'row',
                    width: isMobile ? '100%' : 'auto'
                }}>
                    <Button
                        onClick={handleCancel}
                        disabled={loading}
                        size={isMobile ? 'large' : 'medium'}
                        fullWidth={isMobile}
                        sx={{ minWidth: isMobile ? 'auto' : 100 }}
                    >
                        {cancelLabel}
                    </Button>

                    <Button
                        onClick={handleConfirm}
                        disabled={!canConfirm()}
                        color={getConfirmButtonColor()}
                        variant="contained"
                        size={isMobile ? 'large' : 'medium'}
                        fullWidth={isMobile}
                        startIcon={loading && (
                            <CircularProgress size={16} color="inherit" />
                        )}
                        sx={{
                            minWidth: isMobile ? 'auto' : 120,
                            position: 'relative'
                        }}
                    >
                        {loading ? 'Processando...' : confirmLabel}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;