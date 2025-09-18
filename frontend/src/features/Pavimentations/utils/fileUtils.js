// src/features/Pavimentations/utils/fileUtils.js

import React from 'react';
import {
    Box,
    Typography,
    IconButton,
    Avatar,
    Chip,
    TextField,
    Card,
    CardContent,
    Stack
} from '@mui/material';
import {
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as DocIcon,
    TableChart as ExcelIcon,
    Email as EmailIcon,
    InsertDriveFile as FileIcon,
    Delete as DeleteIcon,
    Visibility as PreviewIcon
} from '@mui/icons-material';

/**
 * Gerar preview do ficheiro
 */
export const generateFilePreview = async (file) => {
    return new Promise((resolve) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        } else {
            resolve(null);
        }
    });
};

/**
 * Obter ícone por tipo de ficheiro
 */
export const getFileIcon = (file) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.includes('pdf')) return <PdfIcon color="error" />;
    if (type.includes('image')) return <ImageIcon color="success" />;
    if (type.includes('word') || name.includes('.doc')) return <DocIcon color="info" />;
    if (type.includes('sheet') || name.includes('.xls')) return <ExcelIcon color="primary" />;
    if (type.includes('email') || name.includes('.eml') || name.includes('.msg')) return <EmailIcon color="info" />;

    return <FileIcon color="action" />;
};

/**
 * Formatar tamanho do ficheiro
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Componente para item de preview de ficheiro - versão Card
 */
export const FilePreviewItem = ({
    file,
    description,
    onDescriptionChange,
    onRemove,
    disabled = false,
    previewUrl = null,
    showPreview = true
}) => {
    const isImage = file.type.startsWith('image/');

    return (
        <Card
            variant="outlined"
            sx={{
                mb: 2,
                '&:hover': {
                    boxShadow: 2
                }
            }}
        >
            <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {/* Avatar/Preview */}
                    <Box sx={{ flexShrink: 0 }}>
                        {isImage && previewUrl && showPreview ? (
                            <Avatar
                                src={previewUrl}
                                variant="rounded"
                                sx={{ width: 48, height: 48 }}
                            >
                                <ImageIcon />
                            </Avatar>
                        ) : (
                            <Avatar
                                variant="rounded"
                                sx={{
                                    width: 48,
                                    height: 48,
                                    bgcolor: 'grey.100',
                                    color: 'text.secondary'
                                }}
                            >
                                {getFileIcon(file)}
                            </Avatar>
                        )}
                    </Box>

                    {/* Conteúdo */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap gutterBottom>
                            {file.name}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Chip
                                label={formatFileSize(file.size)}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                            <Chip
                                label={file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                        </Stack>

                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Descrição do ficheiro (obrigatória)"
                            value={description}
                            onChange={(e) => onDescriptionChange(e.target.value)}
                            disabled={disabled}
                            required
                            error={!description.trim()}
                            helperText={!description.trim() ? 'Descrição obrigatória' : ''}
                        />
                    </Box>

                    {/* Acções */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {isImage && previewUrl && (
                            <IconButton
                                size="small"
                                onClick={() => window.open(previewUrl, '_blank')}
                                disabled={disabled}
                                title="Pré-visualizar"
                            >
                                <PreviewIcon fontSize="small" />
                            </IconButton>
                        )}
                        <IconButton
                            size="small"
                            color="error"
                            onClick={onRemove}
                            disabled={disabled}
                            title="Remover ficheiro"
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

/**
 * Validar ficheiro
 */
export const validateFile = (file, maxSize = 10 * 1024 * 1024) => {
    const errors = [];

    // Tamanho
    if (file.size > maxSize) {
        errors.push(`Ficheiro muito grande (máx: ${formatFileSize(maxSize)})`);
    }

    // Tipos permitidos
    const allowedTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'message/rfc822',
        'application/vnd.ms-outlook'
    ];

    if (!allowedTypes.includes(file.type)) {
        errors.push('Tipo de ficheiro não permitido');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Processar lista de ficheiros
 */
export const processFiles = async (fileList, existingFiles = []) => {
    const maxFiles = 5;
    const maxTotal = maxFiles - existingFiles.length;

    if (fileList.length > maxTotal) {
        throw new Error(`Máximo ${maxFiles} ficheiros no total`);
    }

    const processedFiles = [];

    for (const file of fileList) {
        const validation = validateFile(file);

        if (!validation.isValid) {
            throw new Error(`${file.name}: ${validation.errors.join(', ')}`);
        }

        const preview = await generateFilePreview(file);

        processedFiles.push({
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview,
            description: '',
            name: file.name,
            size: file.size,
            type: file.type
        });
    }

    return processedFiles;
};

export default {
    generateFilePreview,
    getFileIcon,
    formatFileSize,
    FilePreviewItem,
    validateFile,
    processFiles
};