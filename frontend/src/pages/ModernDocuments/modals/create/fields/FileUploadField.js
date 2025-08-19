import React, { useCallback, useEffect, useRef } from 'react';
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

/**
 * Componente de upload de arquivos com suporte a drag, drop e PASTE
 * ✅ MIGRADO: Sistema de colagem do modelo antigo
 */
const FileUploadField = ({
    files = [],
    onAddFiles,
    onRemoveFile,
    onUpdateDescription,
    error,
    disabled = false,
    maxFiles = 5,
    containerRef = null // Ref para o container pai (para eventos de paste)
}) => {
    const theme = useTheme();
    const fileInputRef = useRef(null);
    const dropzoneRef = useRef(null);

    // ✅ CRÍTICO: Sistema de colagem de ficheiros
    const handlePaste = useCallback((event) => {
        console.log("📎 Evento de colagem detectado:", event);

        const clipboardItems = event.clipboardData?.items;
        if (!clipboardItems) {
            console.log("📎 Sem itens na área de transferência");
            return;
        }

        const pastedFiles = [];

        // Processar todos os itens da área de transferência
        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            console.log("📎 Item encontrado:", {
                kind: item.kind,
                type: item.type
            });

            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) {
                    console.log("📎 Ficheiro extraído:", {
                        name: file.name,
                        type: file.type,
                        size: file.size
                    });
                    pastedFiles.push(file);
                }
            }
        }

        if (pastedFiles.length > 0) {
            console.log(`📎 ${pastedFiles.length} ficheiro(s) colado(s)`);

            // Prevenir a colagem padrão
            event.preventDefault();
            event.stopPropagation();

            // Verificar limite de ficheiros
            if (files.length + pastedFiles.length > maxFiles) {
                notifyError(`Máximo de ${maxFiles} ficheiros permitidos. Reduzindo para os primeiros ${maxFiles - files.length} ficheiros.`);
                const limitedFiles = pastedFiles.slice(0, maxFiles - files.length);
                onAddFiles(limitedFiles);
            } else {
                onAddFiles(pastedFiles);
                notifySuccess(`${pastedFiles.length} ficheiro(s) colado(s) com sucesso!`);
            }
        } else {
            console.log("📎 Nenhum ficheiro encontrado na área de transferência");
        }
    }, [files.length, maxFiles, onAddFiles]);

    // ✅ CRÍTICO: Adicionar listener de paste ao container
    useEffect(() => {
        const targetElement = containerRef?.current || dropzoneRef.current || document;

        if (targetElement) {
            console.log("📎 Adicionando listener de paste ao elemento:", targetElement.tagName || "document");
            targetElement.addEventListener('paste', handlePaste);

            return () => {
                console.log("📎 Removendo listener de paste");
                targetElement.removeEventListener('paste', handlePaste);
            };
        }
    }, [handlePaste, containerRef]);

    // Configuração do dropzone
    const onDrop = useCallback((acceptedFiles) => {
        if (files.length + acceptedFiles.length > maxFiles) {
            console.warn(`Máximo de ${maxFiles} arquivos excedido`);
            acceptedFiles = acceptedFiles.slice(0, maxFiles - files.length);
        }

        if (acceptedFiles.length > 0) {
            onAddFiles(acceptedFiles);
        }
    }, [files.length, maxFiles, onAddFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
        maxSize: 5 * 1024 * 1024, // 5MB limite por ficheiro
        disabled,
        maxFiles,
        onDropRejected: (rejectedFiles) => {
            const sizeErrors = rejectedFiles.filter(file => file.errors.some(e => e.code === 'file-too-large'));
            if (sizeErrors.length > 0) {
                notifyError("Alguns ficheiros são demasiado grandes. O tamanho máximo é 5MB.");
            }
        }
    });

    // Função para obter ícone baseado no tipo de arquivo
    const getFileIcon = (file) => {
        const fileObj = file.file ? file.file : file;
        const type = fileObj && fileObj.type ? fileObj.type.toLowerCase() : '';

        if (type.includes('pdf')) {
            return <PdfIcon fontSize="large" color="error" />;
        } else if (type.includes('image')) {
            return <ImageIcon fontSize="large" color="success" />;
        } else if (type.includes('excel') || type.includes('spreadsheet')) {
            return <TableIcon fontSize="large" color="primary" />;
        } else if (type.includes('word') || type.includes('document')) {
            return <DescriptionIcon fontSize="large" color="info" />;
        } else {
            if (fileObj && fileObj.name) {
                const extension = fileObj.name.split('.').pop().toLowerCase();
                if (['pdf'].includes(extension)) {
                    return <PdfIcon fontSize="large" color="error" />;
                } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                    return <ImageIcon fontSize="large" color="success" />;
                }
            }
            return <FileIcon fontSize="large" color="action" />;
        }
    };

    return (
        <Box ref={dropzoneRef}>
            {/* ✅ ALERT: Informação sobre sistema de colagem */}
            <Alert severity="info" sx={{ mb: 2 }} icon={<PasteIcon />}>
                <Typography variant="body2">
                    <strong>Dica:</strong> Pode arrastar, clicar para selecionar ou <strong>colar (Ctrl+V)</strong> ficheiros diretamente!
                </Typography>
            </Alert>

            {/* Área de upload */}
            <Box
                {...getRootProps()}
                sx={{
                    border: isDragActive
                        ? `2px dashed ${theme.palette.primary.main}`
                        : `2px dashed ${theme.palette.divider}`,
                    borderRadius: 1,
                    p: 3,
                    textAlign: 'center',
                    bgcolor: isDragActive
                        ? theme.palette.action.hover
                        : 'background.paper',
                    transition: 'all 0.2s',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.7 : 1,
                    '&:hover': !disabled ? {
                        bgcolor: theme.palette.action.hover,
                    } : {}
                }}
            >
                <input {...getInputProps()} ref={fileInputRef} />
                <UploadIcon
                    sx={{
                        fontSize: 40,
                        mb: 1,
                        color: isDragActive
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary
                    }}
                />

                <Typography variant="body1" gutterBottom>
                    {isDragActive
                        ? 'Solte os arquivos aqui...'
                        : 'Arraste, cole (Ctrl+V) ou clique para selecionar arquivos'
                    }
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Suporta PDF, imagens, documentos Word, Excel e emails
                    {maxFiles > 0 && ` (máx. ${maxFiles} arquivos)`}
                </Typography>

                {error && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                        {error}
                    </Typography>
                )}
            </Box>

            {/* Lista de arquivos */}
            {files.length > 0 && (
                <Box mt={3}>
                    <Typography variant="subtitle1" gutterBottom>
                        Arquivos anexados ({files.length}{maxFiles > 0 ? `/${maxFiles}` : ''})
                    </Typography>

                    <List>
                        {files.map((fileItem, index) => {
                            const fileObj = fileItem.file ? fileItem.file : fileItem;
                            return (
                                <ListItem
                                    key={`${fileObj.name || 'file'}-${index}`}
                                    component={Paper}
                                    variant="outlined"
                                    sx={{
                                        mb: 2,
                                        p: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        bgcolor: 'background.paper'
                                    }}
                                >
                                    <ListItemIcon>
                                        {getFileIcon(fileItem)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={fileObj.name}
                                        secondary={
                                            <Typography variant="caption" color="text.secondary">
                                                {fileObj.type || ''} • {(fileObj.size / 1024).toFixed(1)} KB
                                            </Typography>
                                        }
                                    />
                                    <Box width="60%" mx={2}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Descrição do arquivo"
                                            value={fileItem.description || ''}
                                            onChange={(e) => onUpdateDescription(index, e.target.value)}
                                            required
                                            disabled={disabled}
                                            error={!fileItem.description}
                                            helperText={!fileItem.description ? "Descrição obrigatória" : ""}
                                        />
                                    </Box>
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => onRemoveFile(index)}
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