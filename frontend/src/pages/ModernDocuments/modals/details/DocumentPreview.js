import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    Typography,
    CircularProgress,
    useTheme,
    Tooltip,
    Divider,
    Alert,
    Snackbar
} from '@mui/material';
import {
    Close as CloseIcon,
    CloudDownload as DownloadIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Fullscreen as FullscreenIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    InsertDriveFile as FileIcon,
    Email as EmailIcon,
    Description as DescriptionIcon,
    Code as CodeIcon,
    AudioFile as AudioIcon,
    VideoFile as VideoIcon,
    TableChart as TableIcon,
    Archive as ArchiveIcon,
    TextSnippet as TextIcon,
    Info as InfoIcon,
    OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { downloadFile, previewFile } from '../../../../services/documentService'; // Ajuste o caminho conforme necessário

const DocumentPreview = ({
    open,
    onClose,
    fileUrl,
    fileType,
    fileName,
    onDownload,
    docData
}) => {
    const theme = useTheme();
    const [fileContent, setFileContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    const contentRef = useRef(null);

    // Detecção de dispositivo Android
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent);
    const useNativePdfViewer = isAndroid && isPdf;

    const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
    const isPdf = extension === 'pdf' || (fileType && fileType.includes('pdf'));
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension) || (fileType && fileType.includes('image'));
    const isEmail = ['msg', 'eml', 'oft', 'ost', 'pst'].includes(extension) || (fileType && fileType.includes('message'));
    const isSpreadsheet = ['xls', 'xlsx', 'csv', 'ods'].includes(extension) || (fileType && (fileType.includes('excel') || fileType.includes('spreadsheet')));
    const isDocument = ['doc', 'docx', 'odt', 'rtf'].includes(extension) || (fileType && (fileType.includes('word') || fileType.includes('document')));
    const isCode = ['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'html', 'css', 'xml', 'json'].includes(extension);
    const isAudio = ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension) || (fileType && fileType.includes('audio'));
    const isVideo = ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(extension) || (fileType && fileType.includes('video'));
    const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension);
    const isText = ['txt', 'md'].includes(extension) || (fileType && fileType.includes('text'));

    useEffect(() => {
        if (open && fileUrl && !isEmail) {
            fetchFile();
        } else if (open && isEmail) {
            setLoading(false);
        }

        return () => {
            if (fileContent && typeof fileContent === 'string' && fileContent.startsWith('blob:')) {
                URL.revokeObjectURL(fileContent);
            }
        };
    }, [open, fileUrl, isEmail]);

    const showNotification = (message, severity = 'info') => {
        setNotification({
            open: true,
            message,
            severity
        });
    };

    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };

    const fetchFile = async () => {
        if (!fileUrl) return;

        setLoading(true);
        setError(null);

        try {
            // Usar fileUrl directamente (já vem do AttachmentsTab corrigido)
            setFileContent(fileUrl);
        } catch (error) {
            console.error('Erro:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleZoomIn = () => {
        setZoom(prevZoom => Math.min(prevZoom + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom(prevZoom => Math.max(prevZoom - 0.25, 0.5));
    };

    const handleResetZoom = () => {
        setZoom(1);
    };

    const getFilePath = (regnumber, filename) => {
        const baseUrl = process.env.REACT_APP_API_BASE_URL || window.REACT_APP_API_BASE_URL;
        if (!baseUrl) {
            console.error("API_BASE_URL não está definido no ambiente");
            return "";
        }
        return `${baseUrl}/files/${regnumber}/${filename}`;
    };

    const handleDownload = () => {
        if (typeof onDownload === 'function') {
            onDownload();
            return;
        }

        // Fallback simples
        if (fileContent) {
            const a = document.createElement('a');
            a.href = fileContent;
            a.download = fileName || 'download';
            a.click();
        }
    };

    const openInBrowser = () => {
        if (fileContent) {
            window.open(fileContent, '_blank');
        }
    };

    const getFileIcon = () => {
        if (isPdf) {
            return <PdfIcon fontSize="large" color="error" />;
        } else if (isImage) {
            return <ImageIcon fontSize="large" color="success" />;
        } else if (isEmail) {
            return <EmailIcon fontSize="large" color="info" />;
        } else if (isSpreadsheet) {
            return <TableIcon fontSize="large" color="primary" />;
        } else if (isDocument) {
            return <DescriptionIcon fontSize="large" color="info" />;
        } else if (isCode) {
            return <CodeIcon fontSize="large" color="secondary" />;
        } else if (isAudio) {
            return <AudioIcon fontSize="large" color="primary" />;
        } else if (isVideo) {
            return <VideoIcon fontSize="large" color="primary" />;
        } else if (isArchive) {
            return <ArchiveIcon fontSize="large" color="warning" />;
        } else if (isText) {
            return <TextIcon fontSize="large" color="default" />;
        } else {
            return <FileIcon fontSize="large" color="action" />;
        }
    };

    const EmailViewer = () => {
        return (
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100%"
                p={3}
                maxWidth="600px"
                mx="auto"
            >
                <EmailIcon color="info" sx={{ fontSize: 80, mb: 3 }} />

                <Typography variant="h5" gutterBottom textAlign="center">
                    Arquivo de Email do Outlook ({extension.toUpperCase()})
                </Typography>

                <Typography
                    variant="body1"
                    color="textSecondary"
                    sx={{ mb: 4, textAlign: 'center' }}
                >
                    Este tipo de arquivo não pode ser visualizado diretamente no navegador porque
                    contém dados complexos em formato proprietário da Microsoft.
                </Typography>

                <Alert
                    severity="info"
                    variant="outlined"
                    sx={{ mb: 4, width: '100%' }}
                    icon={<InfoIcon />}
                >
                    <Typography variant="subtitle2" gutterBottom>
                        Para visualizar este email:
                    </Typography>
                    <Typography variant="body2" component="div">
                        <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            <li>Faça o download do arquivo</li>
                            <li>Abra-o com o Microsoft Outlook ou outro cliente de email compatível</li>
                        </ol>
                    </Typography>
                </Alert>

                <Box display="flex" gap={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownload}
                        size="large"
                    >
                        Baixar Arquivo
                    </Button>

                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<OpenInNewIcon />}
                        onClick={onClose}
                        size="large"
                    >
                        Fechar
                    </Button>
                </Box>

                <Typography variant="caption" color="textSecondary" sx={{ mt: 4, opacity: 0.7 }}>
                    Nome do arquivo: {fileName}
                </Typography>
            </Box>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="400px"
                >
                    <CircularProgress color="primary" />
                </Box>
            );
        }

        if (error) {
            return (
                <Box
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="400px"
                >
                    {getFileIcon()}
                    <Typography variant="h6" color="error" sx={{ mt: 2 }}>
                        {error}
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={fetchFile}
                        sx={{ mt: 2 }}
                    >
                        Tentar Novamente
                    </Button>
                </Box>
            );
        }

        // Visualizador de Email
        if (isEmail) {
            return <EmailViewer />;
        }

        // Visualizador alternativo para PDF em dispositivos Android
        if (isPdf && fileContent && isAndroid) {
            return (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    p={3}
                >
                    <PdfIcon fontSize="large" color="error" sx={{ fontSize: 80, mb: 3 }} />
                    <Typography variant="h6" gutterBottom>
                        {fileName || "Documento PDF"}
                    </Typography>
                    <Typography
                        variant="body1"
                        color="textSecondary"
                        sx={{ mb: 4, textAlign: 'center' }}
                    >
                        Os PDFs podem ter problemas de visualização em alguns dispositivos Android.
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<OpenInNewIcon />}
                            onClick={openInBrowser}
                        >
                            Abrir no Navegador
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownload}
                        >
                            Baixar PDF
                        </Button>
                    </Box>
                </Box>
            );
        }

        // Visualizador de PDF padrão para outros dispositivos
        if (isPdf && fileContent && !isAndroid) {
            return (
                <Box
                    ref={contentRef}
                    sx={{
                        width: '100%',
                        height: '100%',
                        overflow: 'auto',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center top'
                    }}
                >
                    <iframe
                        src={`${fileContent}#toolbar=0`}
                        title="Visualização de PDF"
                        style={{ width: '100%', height: '100%', border: 'none', minHeight: '400px' }}
                    />
                </Box>
            );
        }

        // Visualizador de Imagem
        if (isImage && fileContent) {
            return (
                <Box
                    ref={contentRef}
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'auto'
                    }}
                >
                    <img
                        src={fileContent}
                        alt={fileName || "Visualização de imagem"}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            transform: isAndroid ? 'none' : `scale(${zoom})`
                        }}
                    />
                </Box>
            );
        }

        // Visualizador de texto/código
        if ((isText || isCode) && fileContent) {
            return (
                <Box
                    ref={contentRef}
                    sx={{
                        width: '100%',
                        height: '100%',
                        overflow: 'auto',
                        padding: 2,
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        backgroundColor: theme.palette.background.default,
                        fontSize: `${14 * zoom}px`
                    }}
                >
                    <Typography component="pre">
                        {fileContent ? "Conteúdo do arquivo de texto ou código" : "Não foi possível carregar o conteúdo"}
                    </Typography>
                </Box>
            );
        }

        // Visualizador de Áudio
        if (isAudio && fileContent) {
            return (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    p={3}
                >
                    <AudioIcon fontSize="large" color="primary" sx={{ mb: 3, fontSize: 60 }} />
                    <Typography variant="h6" gutterBottom>
                        {fileName || "Arquivo de Áudio"}
                    </Typography>
                    <audio
                        controls
                        src={fileContent}
                        style={{ width: '100%', maxWidth: '500px', marginTop: '20px' }}
                    >
                        Seu navegador não suporta o elemento de áudio.
                    </audio>
                </Box>
            );
        }

        // Visualizador de Vídeo
        if (isVideo && fileContent) {
            return (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    height="100%"
                    p={3}
                >
                    <Typography variant="h6" gutterBottom>
                        {fileName || "Arquivo de Vídeo"}
                    </Typography>
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                        <video
                            controls
                            src={fileContent}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        >
                            Seu navegador não suporta o elemento de vídeo.
                        </video>
                    </Box>
                </Box>
            );
        }

        // Visualizador para outros tipos de arquivo
        return (
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100%"
                p={3}
            >
                {getFileIcon()}
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    {fileName || "Documento"}
                </Typography>
                <Typography align="center" color="textSecondary" sx={{ mb: 3 }}>
                    Este tipo de arquivo não pode ser visualizado diretamente.
                    <br />Clique no botão abaixo para baixar.
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                >
                    Baixar Arquivo
                </Button>
            </Box>
        );
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        height: '90vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2
                }}>
                    <Box display="flex" alignItems="center">
                        {getFileIcon()}
                        <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                            {fileName || 'Visualizador de Documento'}
                        </Typography>
                    </Box>
                    <Box>
                        {(isPdf || isImage) && !loading && !error && !isAndroid && (
                            <>
                                <Tooltip title="Diminuir zoom">
                                    <span>
                                        <IconButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
                                            <ZoomOutIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Resetar zoom">
                                    <span>
                                        <IconButton onClick={handleResetZoom} disabled={zoom === 1}>
                                            <FullscreenIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Aumentar zoom">
                                    <span>
                                        <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
                                            <ZoomInIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        )}
                        <Tooltip title="Baixar arquivo">
                            <IconButton onClick={handleDownload} color="primary">
                                <DownloadIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Fechar">
                            <IconButton onClick={onClose}>
                                <CloseIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </DialogTitle>

                <Divider />

                <DialogContent sx={{
                    p: 0,
                    flexGrow: 1,
                    overflow: 'hidden'
                }}>
                    {renderContent()}
                </DialogContent>
            </Dialog>

            <Snackbar
                open={notification.open}
                autoHideDuration={5000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default DocumentPreview;