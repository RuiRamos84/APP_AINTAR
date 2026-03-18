import React, { useState, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Stack, Grid, Chip, Card,
    FormControl, InputLabel, Select, MenuItem,
    TextField, Button, IconButton, CircularProgress,
    alpha, useTheme
} from '@mui/material';
import {
    Close as CloseIcon,
    CheckCircle, Cancel, Warning,
    Download as DownloadIcon,
    ZoomIn as PreviewIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as DescriptionIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import notification from '@/core/services/notification/notificationService';
import { operationService } from '../services/operationService';
import FileUploadControl from './FileUploadControl';

// pk=1: Incumprimento ligeiro | pk=2: Incumprimento grave | pk=3: Incumprimento muito grave | pk=10: Conforme
const CONTROL_COLOR_MAP = { 1: 'info', 2: 'warning', 3: 'error', 10: 'success' };
const CONTROL_ICON_MAP = {
    1: <Warning fontSize="small" />,
    2: <Warning fontSize="small" />,
    3: <Cancel fontSize="small" />,
    10: <CheckCircle fontSize="small" />,
};

const getFileIcon = (filename) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) return <ImageIcon fontSize="small" color="success" />;
    if (/\.pdf$/i.test(filename)) return <PdfIcon fontSize="small" color="error" />;
    return <DescriptionIcon fontSize="small" color="info" />;
};

const formatDateTime = (val) => {
    if (!val) return '—';
    try {
        return new Intl.DateTimeFormat('pt-PT', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(val));
    } catch {
        return val;
    }
};

/**
 * Diálogo partilhado de validação / controlo operacional.
 * Usado em OperatorMonitoring e pode ser reutilizado noutras páginas.
 *
 * @param {object}   execution    - Registo de execução (operacao) a validar
 * @param {object}   metaData     - Metadados (metaData.opcontrolo = opções de classificação)
 * @param {boolean}  open
 * @param {function} onClose
 * @param {function} onSubmit     - Recebe FormData com: pk, control_tt_operacaocontrolo, control_memo, files[]
 * @param {boolean}  isSubmitting
 */
const ControlValidationDialog = ({ open, onClose, execution, metaData, onSubmit, isSubmitting }) => {
    const theme = useTheme();
    const [classification, setClassification] = useState('');
    const [memo, setMemo] = useState('');
    const [files, setFiles] = useState([]);
    const [downloading, setDownloading] = useState(null);
    const [filePreview, setFilePreview] = useState(null);

    const classificationOptions = metaData?.opcontrolo || [];

    // Reset ao abrir
    React.useEffect(() => {
        if (open) {
            setClassification('');
            setMemo('');
            setFiles([]);
            setFilePreview(null);
        }
    }, [open]);

    // Anexos existentes
    const { data: annexesData, isLoading: loadingAnnexes } = useQuery({
        queryKey: ['controlAnnexes', execution?.pk],
        queryFn: () => operationService.getControlAnnexes(execution.pk),
        enabled: open && !!execution?.pk,
        staleTime: 0,
    });

    const existingAnnexes = annexesData?.data?.data || annexesData?.data || [];

    const fetchBlob = useCallback(async (annexPk) => {
        return await operationService.downloadControlAnnex(annexPk);
    }, []);

    const handleDownload = useCallback(async (annex) => {
        setDownloading(annex.pk);
        try {
            const blob = await fetchBlob(annex.pk);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = annex.descr || annex.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            notification.error('Erro ao descarregar ficheiro');
        } finally {
            setDownloading(null);
        }
    }, [fetchBlob]);

    const handlePreview = useCallback(async (annex) => {
        setDownloading(annex.pk);
        try {
            const blob = await fetchBlob(annex.pk);
            const url = window.URL.createObjectURL(blob);
            setFilePreview({ url, name: annex.descr || annex.filename, isPdf: /\.pdf$/i.test(annex.filename) });
        } catch {
            notification.error('Erro ao carregar pré-visualização');
        } finally {
            setDownloading(null);
        }
    }, [fetchBlob]);

    const handleClosePreview = () => {
        if (filePreview?.url) window.URL.revokeObjectURL(filePreview.url);
        setFilePreview(null);
    };

    const handleSubmit = () => {
        if (!classification) return;
        const formData = new FormData();
        formData.append('pk', execution.pk);
        formData.append('control_tt_operacaocontrolo', classification);
        if (memo.trim()) formData.append('control_memo', memo.trim());
        files.forEach((f) => formData.append('files', f.file));
        onSubmit(formData);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3 } } }}
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">Validar Execução</Typography>
                        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3}>
                        {/* Info da Execução */}
                        {execution && (
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                <Grid container spacing={2}>
                                    <Grid size={12}>
                                        <Typography variant="caption" color="text.secondary">Tarefa</Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {execution.acao_nome || execution.tt_operacaoaccao || `#${execution.pk}`}
                                        </Typography>
                                    </Grid>
                                    {execution.instalacao_nome && (
                                        <Grid size={6}>
                                            <Typography variant="caption" color="text.secondary">Instalação</Typography>
                                            <Typography variant="body2" fontWeight={600}>{execution.instalacao_nome}</Typography>
                                        </Grid>
                                    )}
                                    {execution.operador_nome && (
                                        <Grid size={6}>
                                            <Typography variant="caption" color="text.secondary">Executado por</Typography>
                                            <Typography variant="body2" fontWeight={600}>{execution.operador_nome}</Typography>
                                        </Grid>
                                    )}
                                    {execution.updt_time && (
                                        <Grid size={6}>
                                            <Typography variant="caption" color="text.secondary">Data de conclusão</Typography>
                                            <Typography variant="body2" fontWeight={600}>{formatDateTime(execution.updt_time)}</Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        )}

                        {/* Classificação */}
                        <FormControl fullWidth required>
                            <InputLabel>Classificação</InputLabel>
                            <Select
                                value={classification}
                                onChange={(e) => setClassification(e.target.value)}
                                label="Classificação"
                                displayEmpty
                            >
                                <MenuItem value="" disabled><em>Selecione uma classificação</em></MenuItem>
                                {classificationOptions.map(opt => (
                                    <MenuItem key={opt.pk} value={opt.pk}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Box sx={{ color: `${CONTROL_COLOR_MAP[opt.pk] || 'default'}.main`, display: 'flex' }}>
                                                {CONTROL_ICON_MAP[opt.pk] || <Warning fontSize="small" />}
                                            </Box>
                                            <span>{opt.value}</span>
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Observações */}
                        <TextField
                            label="Observações"
                            multiline
                            rows={3}
                            fullWidth
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="Adicione observações sobre a validação..."
                        />

                        {/* Anexos existentes */}
                        {loadingAnnexes && (
                            <Box display="flex" justifyContent="center" py={1}>
                                <CircularProgress size={20} />
                            </Box>
                        )}
                        {!loadingAnnexes && existingAnnexes.length > 0 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    Ficheiros já anexados ({existingAnnexes.length})
                                </Typography>
                                <Stack spacing={1}>
                                    {existingAnnexes.map((annex) => {
                                        const displayName = annex.descr || annex.filename;
                                        const canPreview = /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(annex.filename);
                                        const busy = downloading === annex.pk;
                                        return (
                                            <Card key={annex.pk} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                {getFileIcon(annex.filename)}
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" noWrap title={displayName}>{displayName}</Typography>
                                                    {annex.data && (
                                                        <Typography variant="caption" color="text.secondary">{annex.data}</Typography>
                                                    )}
                                                </Box>
                                                <Stack direction="row" spacing={0.5}>
                                                    {canPreview && (
                                                        <IconButton
                                                            size="small"
                                                            title="Pré-visualizar"
                                                            onClick={() => handlePreview(annex)}
                                                            disabled={busy}
                                                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                        >
                                                            {busy ? <CircularProgress size={16} /> : <PreviewIcon fontSize="small" />}
                                                        </IconButton>
                                                    )}
                                                    <IconButton
                                                        size="small"
                                                        title="Descarregar"
                                                        onClick={() => handleDownload(annex)}
                                                        disabled={busy}
                                                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                    >
                                                        {busy && !canPreview ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                                                    </IconButton>
                                                </Stack>
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        )}

                        {/* Upload novos ficheiros */}
                        <FileUploadControl files={files} setFiles={setFiles} />
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!classification || isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                        {isSubmitting ? 'A guardar...' : 'Guardar Validação'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de pré-visualização */}
            <Dialog
                open={!!filePreview}
                onClose={handleClosePreview}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 2 } } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                    <Typography variant="subtitle1" noWrap sx={{ maxWidth: '80%' }}>{filePreview?.name}</Typography>
                    <IconButton size="small" onClick={handleClosePreview}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                    {filePreview?.isPdf ? (
                        <iframe src={filePreview.url} title={filePreview.name} style={{ width: '100%', height: '70vh', border: 'none' }} />
                    ) : filePreview?.url ? (
                        <img src={filePreview.url} alt={filePreview?.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 4 }} />
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ControlValidationDialog;
