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
    Stack
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    AttachFile as AttachFileIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const FileUploadControl = ({ files, setFiles, maxFiles = 5 }) => {
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
                        p: 2,
                        mb: 2,
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'grey.300',
                        bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover'
                        }
                    }}
                >
                    <input {...getInputProps()} />
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                        <UploadIcon color="action" />
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
                <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                    {files.map((fileItem, index) => (
                        <ListItem
                            key={index}
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                mb: 0.5
                            }}
                        >
                            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                {getFileIcon(fileItem.type)}
                            </Box>
                            <ListItemText
                                primary={fileItem.name}
                                secondary={formatFileSize(fileItem.size)}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <ListItemSecondaryAction>
                                <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => handleRemoveFile(index)}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            )}

            {files.length >= maxFiles && (
                <Chip
                    label={`Máximo de ${maxFiles} arquivos atingido`}
                    size="small"
                    color="warning"
                    sx={{ mt: 1 }}
                />
            )}
        </Box>
    );
};

export default FileUploadControl;
