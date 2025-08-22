import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    useTheme,
    Alert
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    InsertDriveFile as FileIcon,
    TableChart as TableIcon,
    Description as DescriptionIcon,
    ContentPaste as PasteIcon
} from '@mui/icons-material';
import { notifyError, notifySuccess } from "../../../../../components/common/Toaster/ThemedToaster";

const FileUploadField = ({
    files = [],
    onAddFiles,
    onRemoveFile,
    onUpdateDescription,
    error,
    disabled = false,
    maxFiles = 5,
    containerRef = null
}) => {
    const theme = useTheme();
    const dropzoneRef = useRef(null);

    // Estado local para gerir ficheiros (como no AddAnnexModal)
    const [localFiles, setLocalFiles] = useState([]);

    // Sincronizar com props
    useEffect(() => {
        setLocalFiles(files);
    }, [files]);

    // Gerar preview
    const generateFilePreview = async (file) => {
        if (file.type === "application/pdf") {
            return "/icons/pdf-icon.png";
        } else if (file.type.startsWith("image/")) {
            return URL.createObjectURL(file);
        }
        return "/icons/file-icon.png";
    };

    // Drop handler
    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + localFiles.length > maxFiles) {
            notifyError(`Máximo ${maxFiles} ficheiros`);
            return;
        }

        const newFiles = await Promise.all(
            acceptedFiles.map(async (file) => ({
                file,
                preview: await generateFilePreview(file),
                description: ''
            }))
        );

        const updatedFiles = [...localFiles, ...newFiles];
        setLocalFiles(updatedFiles);
        onAddFiles(acceptedFiles);
    }, [localFiles, maxFiles, onAddFiles]);

    const {
        getRootProps,
        getInputProps,
        isDragActive,
        open
    } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'message/rfc822': ['.eml'],
            'application/vnd.ms-outlook': ['.msg'],
            'text/plain': ['.txt']
        },
        maxSize: 5 * 1024 * 1024,
        disabled,
        maxFiles,
        noClick: false
    });

    // Sistema colagem
    const handlePaste = useCallback((event) => {
        const clipboardItems = event.clipboardData?.items;
        if (!clipboardItems) return;

        const pastedFiles = [];
        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) pastedFiles.push(file);
            }
        }

        if (pastedFiles.length > 0) {
            event.preventDefault();
            onDrop(pastedFiles);
            notifySuccess(`${pastedFiles.length} ficheiro(s) colado(s)`);
        }
    }, [onDrop]);

    useEffect(() => {
        const target = containerRef?.current || dropzoneRef.current || document;
        if (target) {
            target.addEventListener('paste', handlePaste);
            return () => target.removeEventListener('paste', handlePaste);
        }
    }, [handlePaste, containerRef]);

    // Gestão ficheiros (igual ao AddAnnexModal)
    const handleRemoveFile = (index) => {
        const updatedFiles = [...localFiles];
        updatedFiles.splice(index, 1);
        setLocalFiles(updatedFiles);
        onRemoveFile(index);
    };

    const handleDescriptionChange = (index, value) => {
        const updatedFiles = [...localFiles];
        updatedFiles[index] = {
            ...updatedFiles[index],
            description: value
        };
        setLocalFiles(updatedFiles);
        onUpdateDescription(index, value);
    };

    // Ícones
    const getFileIcon = (file) => {
        const type = file.file?.type || file.type || '';
        if (type.includes('pdf')) return <PdfIcon fontSize="large" color="error" />;
        if (type.includes('image')) return <ImageIcon fontSize="large" color="success" />;
        if (type.includes('excel') || type.includes('spreadsheet')) return <TableIcon fontSize="large" color="primary" />;
        if (type.includes('word') || type.includes('document')) return <DescriptionIcon fontSize="large" color="info" />;
        return <FileIcon fontSize="large" color="action" />;
    };

    return (
        <Box ref={dropzoneRef}>
            <Alert severity="info" sx={{ mb: 2 }} icon={<PasteIcon />}>
                <Typography variant="body2">
                    <strong>Dica:</strong> Pode clicar, arrastar ou colar (Ctrl+V) ficheiros
                </Typography>
            </Alert>

            <Box
                {...getRootProps()}
                sx={{
                    border: isDragActive ? `2px dashed ${theme.palette.primary.main}` : `2px dashed ${theme.palette.divider}`,
                    borderRadius: 1,
                    p: 3,
                    textAlign: 'center',
                    bgcolor: isDragActive ? theme.palette.action.hover : 'background.paper',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.7 : 1,
                    '&:hover': !disabled ? {
                        bgcolor: theme.palette.action.hover,
                        borderColor: theme.palette.primary.main,
                    } : {}
                }}
            >
                <input {...getInputProps()} />

                <UploadIcon sx={{
                    fontSize: 48,
                    mb: 1,
                    color: isDragActive ? theme.palette.primary.main : theme.palette.text.secondary
                }} />

                <Typography variant="h6" gutterBottom>
                    {isDragActive ? 'Solte os ficheiros aqui...' : 'Clique, arraste ou cole ficheiros'}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    PDF, imagens, Word, Excel e emails (máx. {maxFiles})
                </Typography>

                {error && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                        {error}
                    </Typography>
                )}
            </Box>

            {localFiles.length > 0 && (
                <Box mt={3}>
                    <Typography variant="subtitle1" gutterBottom>
                        Ficheiros anexados ({localFiles.length}/{maxFiles})
                    </Typography>

                    <List>
                        {localFiles.map((fileItem, index) => {
                            const fileObj = fileItem.file || fileItem;
                            return (
                                <ListItem
                                    key={`${fileObj.name}-${index}`}
                                    component={Paper}
                                    variant="outlined"
                                    sx={{ mb: 2, p: 2, display: 'flex', alignItems: 'center' }}
                                >
                                    <ListItemIcon>
                                        {getFileIcon(fileItem)}
                                    </ListItemIcon>

                                    <ListItemText
                                        primary={fileObj.name}
                                        secondary={`${fileObj.type || ''} • ${(fileObj.size / 1024).toFixed(1)} KB`}
                                    />

                                    <Box width="60%" mx={2}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label={`Descrição para ${fileObj.name}`}
                                            placeholder="Descreva o conteúdo..."
                                            value={fileItem.description || ''}
                                            onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                            required
                                            disabled={disabled}
                                            error={!fileItem.description?.trim()}
                                            helperText={!fileItem.description?.trim() ? "Obrigatório" : `${(fileItem.description || '').length}/200`}
                                            inputProps={{ maxLength: 200 }}
                                        />
                                    </Box>

                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleRemoveFile(index)}
                                            disabled={disabled}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            );
                        })}
                    </List>
                </Box>
            )}
        </Box>
    );
};

export default FileUploadField;