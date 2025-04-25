import React, { useCallback } from 'react';
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
    useTheme
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    InsertDriveFile as FileIcon,
    TableChart as TableIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import { notifyError } from "../../../../../components/common/Toaster/ThemedToaster";

/**
 * Componente de upload de arquivos com suporte a drag and drop
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.files - Lista de arquivos atuais
 * @param {Function} props.onAddFiles - Callback ao adicionar arquivos
 * @param {Function} props.onRemoveFile - Callback ao remover um arquivo
 * @param {Function} props.onUpdateDescription - Callback ao atualizar descrição
 * @param {string} props.error - Mensagem de erro
 * @param {boolean} props.disabled - Se o campo está desabilitado
 * @param {number} props.maxFiles - Número máximo de arquivos permitidos
 */
const FileUploadField = ({
    files = [],
    onAddFiles,
    onRemoveFile,
    onUpdateDescription,
    error,
    disabled = false,
    maxFiles = 5
}) => {
    const theme = useTheme();

    // Configuração do dropzone
    const onDrop = useCallback((acceptedFiles) => {
        if (files.length + acceptedFiles.length > maxFiles) {
            console.warn(`Máximo de ${maxFiles} arquivos excedido`);
            // Truncar para o máximo de arquivos permitidos
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
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
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
        // Verificar se estamos a receber um objeto com propriedade 'file' ou o próprio ficheiro
        const fileObj = file.file ? file.file : file;

        // Verificar se tipo existe antes de chamar toLowerCase
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
            // Tentar identificar pelo nome se tipo não estiver disponível
            if (fileObj && fileObj.name) {
                const extension = fileObj.name.split('.').pop().toLowerCase();
                if (['pdf'].includes(extension)) {
                    return <PdfIcon fontSize="large" color="error" />;
                } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                    return <ImageIcon fontSize="large" color="success" />;
                }
                // Adicionar mais extensões conforme necessário
            }
            return <FileIcon fontSize="large" color="action" />;
        }
    };

    return (
        <Box>
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
                <input {...getInputProps()} />
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
                        : 'Arraste e solte arquivos aqui, ou clique para selecionar'
                    }
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Suporta PDF, imagens, documentos Word e Excel
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