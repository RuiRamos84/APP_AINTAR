import React, { useState, useCallback, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    Grid,
    Chip,
    CircularProgress,
    Alert,
    List,
    Stack,
    Divider,
    Dialog as ConfirmDialog,
    DialogContentText
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import {
    Close as CloseIcon,
    CloudUpload as UploadIcon,
    Add as AddIcon,
    Description as DescriptionIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    TableChart as TableIcon,
    Email as EmailIcon
} from '@mui/icons-material';

import { addDocumentAnnex } from '../../../services/documentService';
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster.js";

// Componentes e funções auxiliares
import { FilePreviewItem, generateFilePreview } from '../utils/fileUtils';

const AddAnnexModal = ({ open, onClose, document }) => {
    // Estados
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmClose, setConfirmClose] = useState(false);

    // Lista de tipos de arquivos permitidos para exibição
    const fileTypes = [
        { type: 'PDF', icon: <PdfIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'error' },
        { type: 'Imagens', icon: <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'success' },
        { type: 'Word', icon: <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' },
        { type: 'Excel', icon: <TableIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'primary' },
        { type: 'Email', icon: <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' }
    ];

    // Reset quando o modal abre
    useEffect(() => {
        if (open) {
            setFiles([]);
            setError('');
        }
    }, [open]);

    // Configuração do dropzone
    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + files.length > 5) {
            setError('Você pode adicionar no máximo 5 arquivos por vez.');
            return;
        }

        const newFiles = await Promise.all(
            acceptedFiles.map(async (file) => {
                const preview = await generateFilePreview(file);
                return {
                    file,
                    preview,
                    description: '',
                };
            })
        );

        setFiles(prev => [...prev, ...newFiles]);
        setError('');
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
            'application/vnd.ms-outlook': ['.msg'],
            'application/vnd.ms-officetheme': ['.oft']
        }
    });

    // Suporte ao colar arquivos
    const onPaste = useCallback((event) => {
        const clipboardItems = event.clipboardData.items;
        const pastedFiles = [];
        for (const item of clipboardItems) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                pastedFiles.push(file);
            }
        }
        if (pastedFiles.length > 0) {
            event.preventDefault();
            onDrop(pastedFiles);
        }
    }, [onDrop]);

    // Gerenciamento de arquivos
    const handleRemoveFile = (index) => {
        const updatedFiles = [...files];
        updatedFiles.splice(index, 1);
        setFiles(updatedFiles);
    };

    const handleDescriptionChange = (index, value) => {
        const updatedFiles = [...files];
        updatedFiles[index].description = value;
        setFiles(updatedFiles);
    };

    // Validação do formulário
    const validateForm = () => {
        if (files.length === 0) {
            setError('Adicione pelo menos um arquivo');
            return false;
        }

        for (let i = 0; i < files.length; i++) {
            if (!files[i].description.trim()) {
                setError('Todos os arquivos devem ter uma descrição');
                return false;
            }
        }

        return true;
    };

    // Envio do formulário
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        if (!document || !document.pk) {
            setError('Erro: ID do documento não disponível');
            return;
        }

        setLoading(true);

        try {
            // Criar um FormData para enviar
            const formData = new FormData();
            formData.append('tb_document', document.pk);

            // Adicionar arquivos
            files.forEach((fileItem) => {
                formData.append('files', fileItem.file);
                formData.append('descr', fileItem.description);
            });

            const response = await addDocumentAnnex(formData);

            if (response) {
                // Disparar evento para atualizar o modal principal
                window.dispatchEvent(new CustomEvent('document-updated', {
                    detail: {
                        documentId: document.pk,
                        type: 'annex-added'
                    }
                }));
                notifySuccess("Anexos adicionados com sucesso");
                onClose(true);
            } else {
                throw new Error('Erro ao adicionar anexos');
            }
        } catch (error) {
            console.error('Erro ao adicionar anexos:', error);
            notifyError("Erro ao adicionar anexos ao documento");
            setError('Erro ao adicionar anexos ao documento.');
        } finally {
            setLoading(false);
        }
    };

    // Manipulação de fechamento
    const handleModalClose = () => {
        if (files.length > 0) {
            setConfirmClose(true);
        } else {
            onClose(false);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleModalClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                            <DescriptionIcon sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                Adicionar Anexos ao Pedido: {document?.regnumber}
                            </Typography>
                        </Box>
                        <IconButton
                            edge="end"
                            color="inherit"
                            onClick={handleModalClose}
                            aria-label="close"
                            disabled={loading}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent dividers onPaste={onPaste}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Adicione anexos ao documento. Cada anexo deve ter uma descrição.
                                Máximo de 5 arquivos por upload.
                            </Alert>
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Formatos aceitos:
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
                                            ? 'Solte os arquivos aqui...'
                                            : 'Arraste e solte arquivos aqui, cole ou clique para selecionar'
                                        }
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        Suporta PDF, imagens, documentos Office e emails
                                    </Typography>
                                </Box>
                            ) : (
                                <Typography
                                    variant="subtitle1"
                                    color="error"
                                    textAlign="center"
                                    mt={2}
                                >
                                    Está a submeter o número máximo de anexos por movimento.
                                </Typography>
                            )}

                            {error && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {error}
                                </Alert>
                            )}
                        </Grid>

                        {files.length > 0 && (
                            <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />

                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Arquivos selecionados ({files.length})
                                    </Typography>

                                    <List>
                                        {files.map((fileItem, index) => (
                                            <FilePreviewItem
                                                key={`${fileItem.file.name}-${index}`}
                                                file={fileItem.file}
                                                description={fileItem.description}
                                                onDescriptionChange={(value) => handleDescriptionChange(index, value)}
                                                onRemove={() => handleRemoveFile(index)}
                                                disabled={loading}
                                                previewUrl={fileItem.preview}
                                            />
                                        ))}
                                    </List>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={handleModalClose}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={loading || files.length === 0}
                        startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                        {loading ? 'Enviando...' : 'Adicionar Anexos'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo de confirmação de fechamento */}
            <ConfirmDialog
                open={confirmClose}
                onClose={() => setConfirmClose(false)}
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
            >
                <DialogTitle id="confirm-dialog-title">
                    Descartar Alterações?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="confirm-dialog-description">
                        Existem alterações não guardadas. Deseja realmente sair sem guardar?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClose(false)} color="primary">
                        Não
                    </Button>
                    <Button onClick={() => { setConfirmClose(false); onClose(false); }} color="primary" autoFocus>
                        Sim
                    </Button>
                </DialogActions>
            </ConfirmDialog>
        </>
    );
};

export default AddAnnexModal;