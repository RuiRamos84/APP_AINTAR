import { useState, useCallback } from 'react';
import {
    Box, Stack, Typography, Button, IconButton, Tooltip,
    CircularProgress, Dialog, DialogTitle, DialogContent,
    useTheme, alpha,
} from '@mui/material';
import {
    AttachFile as AttachFileIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    VideoFile as VideoIcon,
    Description as DescriptionIcon,
    ZoomIn as PreviewIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationService } from '../services/operationService';
import FileUploadControl from './FileUploadControl';
import notification from '@/core/services/notification';

const getFileIcon = (filename) => {
    const ext = (filename || '').split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return <ImageIcon fontSize="small" color="success" />;
    if (ext === 'pdf') return <PdfIcon fontSize="small" color="error" />;
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return <VideoIcon fontSize="small" color="secondary" />;
    return <DescriptionIcon fontSize="small" color="info" />;
};

const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename || '');
const isPdf = (filename) => /\.pdf$/i.test(filename || '');

const AnnexesSection = ({ operacaoPk, allowUpload = true, allowDelete = true }) => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [downloading, setDownloading] = useState(null);
    const [preview, setPreview] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['controlAnnexes', operacaoPk],
        queryFn: () => operationService.getControlAnnexes(operacaoPk),
        enabled: !!operacaoPk,
        staleTime: 0,
    });

    const annexes = data?.data || [];

    const deleteMutation = useMutation({
        mutationFn: (annexPk) => operationService.deleteOperationAnnex(annexPk),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['controlAnnexes', operacaoPk] });
            notification.success('Anexo eliminado');
        },
        onError: (err) => notification.error(err?.response?.data?.error || err?.message || 'Erro ao eliminar anexo'),
    });

    const handleUpload = async () => {
        if (!uploadFiles.length) return;
        setUploading(true);
        try {
            await operationService.addOperationAnnexes(operacaoPk, uploadFiles);
            queryClient.invalidateQueries({ queryKey: ['controlAnnexes', operacaoPk] });
            notification.success(`${uploadFiles.length} anexo(s) guardado(s)`);
            setUploadFiles([]);
            setShowUpload(false);
        } catch (err) {
            notification.error(err?.response?.data?.error || err?.message || 'Erro ao guardar anexos');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = useCallback(async (annex) => {
        setDownloading(annex.pk);
        try {
            const blob = await operationService.downloadControlAnnex(annex.pk);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = annex.descr || annex.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            notification.error(err?.response?.data?.error || err?.message || 'Erro ao descarregar ficheiro');
        } finally {
            setDownloading(null);
        }
    }, []);

    const handlePreview = useCallback(async (annex) => {
        setDownloading(annex.pk);
        try {
            const blob = await operationService.downloadControlAnnex(annex.pk);
            const url = window.URL.createObjectURL(blob);
            setPreview({ url, name: annex.descr || annex.filename, isPdf: isPdf(annex.filename) });
        } catch (err) {
            notification.error(err?.response?.data?.error || err?.message || 'Erro ao carregar pré-visualização');
        } finally {
            setDownloading(null);
        }
    }, []);

    const handleClosePreview = () => {
        if (preview?.url) window.URL.revokeObjectURL(preview.url);
        setPreview(null);
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Anexos {annexes.length > 0 && `(${annexes.length})`}
                    </Typography>
                </Stack>
                {allowUpload && (
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setShowUpload(v => !v)}
                        variant={showUpload ? 'contained' : 'outlined'}
                        sx={{ minWidth: 0, px: 1.5 }}
                    >
                        Adicionar
                    </Button>
                )}
            </Stack>

            {allowUpload && showUpload && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                    <FileUploadControl files={uploadFiles} setFiles={setUploadFiles} maxFiles={5} />
                    {uploadFiles.length > 0 && (
                        <Button
                            fullWidth
                            variant="contained"
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={handleUpload}
                            disabled={uploading}
                            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <AttachFileIcon />}
                        >
                            {uploading ? 'A enviar...' : `Guardar ${uploadFiles.length} ficheiro(s)`}
                        </Button>
                    )}
                </Box>
            )}

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                    <CircularProgress size={20} />
                </Box>
            ) : annexes.length === 0 ? (
                <Typography variant="caption" color="text.disabled" fontStyle="italic">
                    Sem anexos.
                </Typography>
            ) : (
                <Stack spacing={0.75}>
                    {annexes.map((annex) => {
                        const canPreview = isImage(annex.filename) || isPdf(annex.filename);
                        return (
                            <Box
                                key={annex.pk}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    p: 1, borderRadius: 1.5,
                                    border: `1px solid ${theme.palette.divider}`,
                                    bgcolor: 'background.paper',
                                }}
                            >
                                {getFileIcon(annex.filename)}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" noWrap title={annex.descr || annex.filename} fontWeight={500}>
                                        {annex.descr || annex.filename}
                                    </Typography>
                                    {annex.data && (
                                        <Typography variant="caption" color="text.disabled" display="block">
                                            {annex.data}
                                        </Typography>
                                    )}
                                </Box>
                                <Stack direction="row" spacing={0.25}>
                                    {canPreview && (
                                        <Tooltip title="Pré-visualizar">
                                            <IconButton size="small" onClick={() => handlePreview(annex)} disabled={downloading === annex.pk}>
                                                {downloading === annex.pk ? <CircularProgress size={14} /> : <PreviewIcon fontSize="small" />}
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Descarregar">
                                        <IconButton size="small" onClick={() => handleDownload(annex)} disabled={downloading === annex.pk}>
                                            {downloading === annex.pk && !canPreview ? <CircularProgress size={14} /> : <DownloadIcon fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                    {allowDelete && (
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(annex.pk)} disabled={deleteMutation.isPending}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            )}

            <Dialog open={!!preview} onClose={handleClosePreview} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                    <Typography variant="subtitle1" noWrap sx={{ maxWidth: '85%' }}>{preview?.name}</Typography>
                    <IconButton size="small" onClick={handleClosePreview}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                    {preview?.isPdf ? (
                        <iframe src={preview.url} title={preview.name} style={{ width: '100%', height: '70vh', border: 'none' }} />
                    ) : preview?.url ? (
                        <img src={preview.url} alt={preview.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 4 }} />
                    ) : null}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default AnnexesSection;
