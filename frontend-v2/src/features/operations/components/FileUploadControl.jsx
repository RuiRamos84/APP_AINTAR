import React, { useCallback, useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Paper,
    Chip,
    Stack,
    Card,
    useTheme,
    alpha
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const FileUploadControl = ({ files, setFiles, maxFiles = 5 }) => {
    const theme = useTheme();
    const [error, setError] = useState('');

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length + files.length > maxFiles) {
            setError(`Pode adicionar no máximo ${maxFiles} arquivos`);
            return;
        }

        const newFiles = acceptedFiles.map(file => ({
            file,
            name: file.name,
            size: file.size,
            type: file.type
        }));

        setFiles(prev => [...prev, ...newFiles]);
        setError('');
    }, [files.length, maxFiles, setFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: maxFiles - files.length,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        }
    });

    const handleRemoveFile = (index) => {
        const updatedFiles = [...files];
        updatedFiles.splice(index, 1);
        setFiles(updatedFiles);
        setError('');
    };

    const getFileIcon = (type) => {
        if (type.includes('pdf')) return <PdfIcon fontSize="small" color="error" />;
        if (type.includes('image')) return <ImageIcon fontSize="small" color="success" />;
        return <DescriptionIcon fontSize="small" color="info" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Anexos:</strong> (opcional, até {maxFiles} arquivos)
            </Typography>

            {/* Dropzone */}
            {files.length < maxFiles && (
                <Paper
                    {...getRootProps()}
                    sx={{
                        p: 3,
                        mb: 2,
                        border: '2px dashed',
                        borderColor: isDragActive ? theme.palette.primary.main : theme.palette.divider,
                        borderRadius: 2,
                        bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center',
                        '&:hover': {
                            borderColor: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.02)
                        }
                    }}
                >
                    <input {...getInputProps()} />
                    <Stack spacing={1} alignItems="center" justifyContent="center">
                        <UploadIcon color="primary" sx={{ fontSize: 32, opacity: 0.7 }} />
                        <Typography variant="body2" color="text.secondary">
                            {isDragActive ? 'Solte os arquivos aqui...' : 'Arraste arquivos ou clique para selecionar'}
                        </Typography>
                    </Stack>
                </Paper>
            )}

            {/* Error message */}
            {error && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                    {error}
                </Typography>
            )}

            {/* Files list */}
            {files.length > 0 && (
                <Stack spacing={1}>
                    {files.map((fileItem, index) => (
                        <Card
                            key={index}
                            variant="outlined"
                            sx={{
                                p: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                bgcolor: alpha(theme.palette.background.paper, 0.6)
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                                <Box sx={{ 
                                    p: 0.5, 
                                    borderRadius: 1, 
                                    bgcolor: alpha(theme.palette.divider, 0.1),
                                    display: 'flex'
                                }}>
                                    {getFileIcon(fileItem.type)}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" noWrap>
                                        {fileItem.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(fileItem.size)}
                                    </Typography>
                                </Box>
                            </Box>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFile(index);
                                }}
                                sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.error.main } }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Card>
                    ))}
                </Stack>
            )}

            {files.length >= maxFiles && (
                <Chip
                    label={`Máximo de ${maxFiles} arquivos atingido`}
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ mt: 1 }}
                />
            )}
        </Box>
    );
};

export default FileUploadControl;
