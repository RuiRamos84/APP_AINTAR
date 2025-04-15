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
    Zoom
} from '@mui/material';
import {
    Close as CloseIcon,
    CloudDownload as DownloadIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Fullscreen as FullscreenIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import api from '../../../../services/api';

const FilePreview = ({
    open,
    onClose,
    fileUrl,
    fileType,
    fileName,
    onDownload
}) => {
    const theme = useTheme();
    const [fileContent, setFileContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(1);
    const contentRef = useRef(null);

    useEffect(() => {
        if (open && fileUrl) {
            fetchFile();
        }

        return () => {
            if (fileContent) {
                URL.revokeObjectURL(fileContent);
            }
        };
    }, [open, fileUrl]);

    const fetchFile = async () => {
        if (!fileUrl) return;

        setLoading(true);
        setError(null);

        try {
            // Se for uma URL completa, use a API para buscar o arquivo
            if (fileUrl.startsWith('http') || fileUrl.startsWith('/api/')) {
                const response = await api.get(fileUrl, {
                    responseType: fileType === "pdf" ? "blob" : "arraybuffer",
                    headers: {
                        Authorization: `Bearer ${JSON.parse(localStorage.getItem("user")).access_token
                            }`,
                    },
                });

                const fileBlob = new Blob([response.data], {
                    type: response.headers['content-type'] || fileType
                });

                const fileURL = URL.createObjectURL(fileBlob);
                setFileContent(fileURL);
            }
            // Se for um objeto URL local ou base64, use diretamente
            else {
                setFileContent(fileUrl);
            }
        } catch (error) {
            console.error('Erro ao buscar o arquivo:', error);

            if (error.response && error.response.status === 404) {
                setError('Arquivo não encontrado.');
            } else {
                setError('Erro ao buscar o arquivo. Por favor, tente novamente.');
            }
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

    const getFileIcon = () => {
        if (fileType?.includes('pdf')) {
            return <PdfIcon fontSize="large" color="error" />;
        } else if (fileType?.startsWith('image/')) {
            return <ImageIcon fontSize="large" color="primary" />;
        }
        return null;
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

        if (!fileContent) {
            return null;
        }

        return (
            <Box
                ref={contentRef}
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    transform: `scale(${zoom})`,
                    transition: 'transform 0.2s ease'
                }}
            >
                {fileType?.includes('pdf') ? (
                    <iframe
                        src={fileContent}
                        title="Visualizador de Documento"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                ) : (
                    <img
                        src={fileContent}
                        alt="Visualizador de Documento"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                        }}
                    />
                )}
            </Box>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    height: { xs: '90vh', sm: '80vh' },
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${theme.palette.divider}`,
                pb: 1
            }}>
                <Box display="flex" alignItems="center">
                    {getFileIcon()}
                    <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                        {fileName || 'Visualizador de Documento'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 1
                }}
            >
                {renderContent()}
            </DialogContent>

            <DialogActions
                sx={{
                    justifyContent: 'space-between',
                    borderTop: `1px solid ${theme.palette.divider}`,
                    p: 1
                }}
            >
                <Box>
                    <Tooltip title="Diminuir zoom" arrow TransitionComponent={Zoom}>
                        <IconButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
                            <ZoomOutIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Resetar zoom" arrow TransitionComponent={Zoom}>
                        <IconButton onClick={handleResetZoom} disabled={zoom === 1}>
                            <FullscreenIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Aumentar zoom" arrow TransitionComponent={Zoom}>
                        <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
                            <ZoomInIcon />
                        </IconButton>
                    </Tooltip>

                    <Box component="span" sx={{ mx: 1, color: 'text.secondary' }}>
                        {Math.round(zoom * 100)}%
                    </Box>
                </Box>

                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<DownloadIcon />}
                    onClick={onDownload}
                    disabled={!fileContent}
                >
                    Descarregar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FilePreview;