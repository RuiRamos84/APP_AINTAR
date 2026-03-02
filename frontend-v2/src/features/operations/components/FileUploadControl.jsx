import React, { useCallback, useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Paper,
    Chip,
    Stack,
    Card,
    useTheme,
    alpha,
    Dialog,
    DialogContent,
    DialogTitle,
    CircularProgress,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as DescriptionIcon,
    VideoFile as VideoIcon,
    ZoomIn as PreviewIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';

const isImage = (type) => type?.startsWith('image/');
const isPdf = (type) => type === 'application/pdf';
const isVideo = (type) => type?.startsWith('video/');

const getFileIcon = (type) => {
    if (isImage(type)) return <ImageIcon fontSize="small" color="success" />;
    if (isPdf(type)) return <PdfIcon fontSize="small" color="error" />;
    if (isVideo(type)) return <VideoIcon fontSize="small" color="secondary" />;
    return <DescriptionIcon fontSize="small" color="info" />;
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Cria preview URL para o ficheiro e liberta-o quando desmontado
const useObjectUrl = (file) => {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
    return url;
};

const FilePreviewItem = ({ fileItem, index, onRemove, onPreview }) => {
    const theme = useTheme();
    const previewUrl = useObjectUrl(
        (isImage(fileItem.type) || isVideo(fileItem.type)) ? fileItem.file : null
    );

    const canPreview = isImage(fileItem.type) || isPdf(fileItem.type) || isVideo(fileItem.type);

    return (
        <Card
            variant="outlined"
            sx={{
                p: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: alpha(theme.palette.background.paper, 0.6)
            }}
        >
            {/* Thumbnail ou ícone */}
            <Box
                sx={{
                    width: 40, height: 40, borderRadius: 1, flexShrink: 0,
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: alpha(theme.palette.divider, 0.1),
                    cursor: previewUrl ? 'pointer' : 'default',
                }}
                onClick={() => previewUrl && onPreview({
                    url: previewUrl,
                    name: fileItem.name,
                    type: fileItem.type,
                    isVideo: isVideo(fileItem.type),
                })}
            >
                {isImage(fileItem.type) && previewUrl ? (
                    <img src={previewUrl} alt={fileItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : isVideo(fileItem.type) && previewUrl ? (
                    <video src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                ) : (
                    getFileIcon(fileItem.type)
                )}
            </Box>

            {/* Nome e tamanho */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap title={fileItem.name}>{fileItem.name}</Typography>
                <Typography variant="caption" color="text.secondary">{formatFileSize(fileItem.size)}</Typography>
            </Box>

            {/* Ações */}
            <Stack direction="row" spacing={0.5}>
                {canPreview && (
                    <IconButton
                        size="small"
                        title="Pré-visualizar"
                        onClick={() => {
                            const url = isPdf(fileItem.type)
                                ? URL.createObjectURL(fileItem.file)
                                : previewUrl;
                            onPreview({
                                url,
                                name: fileItem.name,
                                type: fileItem.type,
                                isPdf: isPdf(fileItem.type),
                                isVideo: isVideo(fileItem.type),
                            });
                        }}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                    >
                        <PreviewIcon fontSize="small" />
                    </IconButton>
                )}
                <IconButton
                    size="small"
                    title="Remover"
                    onClick={() => onRemove(index)}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Stack>
        </Card>
    );
};

const FileUploadControl = ({ files, setFiles, maxFiles = 5 }) => {
    const theme = useTheme();
    const [error, setError] = useState('');
    const [compressing, setCompressing] = useState(false);
    const [preview, setPreview] = useState(null); // { url, name, type, isPdf, isVideo }

    const compressImage = async (file) => {
        if (!isImage(file.type)) return file;
        try {
            return await imageCompression(file, {
                maxSizeMB: 2,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: file.type,
            });
        } catch {
            return file;
        }
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + files.length > maxFiles) {
            setError(`Pode adicionar no máximo ${maxFiles} ficheiros`);
            return;
        }

        // Validar tamanho de vídeos (máx 200MB)
        const oversized = acceptedFiles.find(
            f => isVideo(f.type) && f.size > 200 * 1024 * 1024
        );
        if (oversized) {
            setError(`O vídeo "${oversized.name}" excede o limite de 200 MB.`);
            return;
        }

        setCompressing(true);
        try {
            const processed = await Promise.all(
                acceptedFiles.map(async (file) => {
                    const compressed = await compressImage(file);
                    return { file: compressed, name: compressed.name, size: compressed.size, type: compressed.type };
                })
            );
            setFiles(prev => [...prev, ...processed]);
            setError('');
        } finally {
            setCompressing(false);
        }
    }, [files.length, maxFiles, setFiles]); // eslint-disable-line react-hooks/exhaustive-deps

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: maxFiles - files.length,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'video/mp4': ['.mp4'],
            'video/webm': ['.webm'],
            'video/quicktime': ['.mov'],
            'video/x-msvideo': ['.avi'],
            'video/x-matroska': ['.mkv'],
        }
    });

    const handleRemove = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setError('');
    };

    const handleClosePreview = () => {
        if (preview?.isPdf && preview?.url) URL.revokeObjectURL(preview.url);
        setPreview(null);
    };

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Anexos:</strong> (opcional, até {maxFiles} ficheiros — imagens, PDF, Word, Excel, vídeo)
            </Typography>

            {/* Dropzone */}
            {files.length < maxFiles && (
                <Paper
                    {...getRootProps()}
                    sx={{
                        p: 3, mb: 2,
                        border: '2px dashed',
                        borderColor: isDragActive ? theme.palette.primary.main : theme.palette.divider,
                        borderRadius: 2,
                        bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        cursor: compressing ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center',
                        '&:hover': {
                            borderColor: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.02)
                        }
                    }}
                >
                    <input {...getInputProps()} />
                    <Stack spacing={1} alignItems="center">
                        {compressing ? (
                            <>
                                <CircularProgress size={28} />
                                <Typography variant="body2" color="text.secondary">
                                    A comprimir imagem...
                                </Typography>
                            </>
                        ) : (
                            <>
                                <UploadIcon color="primary" sx={{ fontSize: 32, opacity: 0.7 }} />
                                <Typography variant="body2" color="text.secondary">
                                    {isDragActive ? 'Solte os ficheiros aqui...' : 'Arraste ficheiros ou clique para selecionar'}
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    Imagens (comprimidas), PDF, Word, Excel, Vídeo (máx. 200 MB)
                                </Typography>
                            </>
                        )}
                    </Stack>
                </Paper>
            )}

            {error && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                    {error}
                </Typography>
            )}

            {/* Lista de ficheiros */}
            {files.length > 0 && (
                <Stack spacing={1}>
                    {files.map((fileItem, index) => (
                        <FilePreviewItem
                            key={index}
                            fileItem={fileItem}
                            index={index}
                            onRemove={handleRemove}
                            onPreview={setPreview}
                        />
                    ))}
                </Stack>
            )}

            {files.length >= maxFiles && (
                <Chip
                    label={`Máximo de ${maxFiles} ficheiros atingido`}
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ mt: 1 }}
                />
            )}

            {/* Modal de pré-visualização */}
            <Dialog
                open={!!preview}
                onClose={handleClosePreview}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 2 } } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                    <Typography variant="subtitle1" component="div" noWrap sx={{ maxWidth: '80%' }} title={preview?.name}>
                        {preview?.name}
                    </Typography>
                    <IconButton size="small" onClick={handleClosePreview}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                    {preview?.isPdf ? (
                        <iframe
                            src={preview.url}
                            title={preview.name}
                            style={{ width: '100%', height: '70vh', border: 'none' }}
                        />
                    ) : preview?.isVideo ? (
                        <video
                            src={preview.url}
                            controls
                            autoPlay
                            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 4 }}
                        />
                    ) : preview?.url ? (
                        <img
                            src={preview.url}
                            alt={preview?.name}
                            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 4 }}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default FileUploadControl;
