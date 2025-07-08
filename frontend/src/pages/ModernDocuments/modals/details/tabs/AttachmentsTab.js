import React, { useState } from 'react';
import {
    Box,
    Typography,
    Skeleton,
    Paper,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    IconButton,
    Tooltip,
    Zoom,
    Modal,
    Chip
} from '@mui/material';
import {
    CloudDownload as CloudDownloadIcon,
    Visibility as VisibilityIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    InsertDriveFile as FileIcon,
    TableChart as TableIcon,
    Description as DescriptionIcon,
    Code as CodeIcon,
    AudioFile as AudioIcon,
    VideoFile as VideoIcon,
    Archive as ArchiveIcon,
    TextSnippet as TextIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import DocumentPreview from '../DocumentPreview';
import { downloadFile, previewFile } from '../../../../../services/documentService';

// Ícone por tipo de ficheiro
const FileTypeIcon = ({ filename }) => {
    const extension = filename ? filename.split('.').pop().toLowerCase() : '';

    if (['msg', 'eml', 'oft', 'ost', 'pst'].includes(extension)) {
        return <EmailIcon color="info" />;
    }
    if (extension === 'pdf') {
        return <PdfIcon color="error" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
        return <ImageIcon color="success" />;
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
        return <TableIcon color="primary" />;
    }
    if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
        return <DescriptionIcon color="info" />;
    }
    if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'html', 'css', 'xml', 'json'].includes(extension)) {
        return <CodeIcon color="secondary" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
        return <AudioIcon color="primary" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(extension)) {
        return <VideoIcon color="primary" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        return <ArchiveIcon color="warning" />;
    }
    if (['txt', 'md'].includes(extension)) {
        return <TextIcon color="default" />;
    }

    return <FileIcon color="action" />;
};

// Etiqueta de tipo
const FileTypeLabel = ({ filename }) => {
    const extension = filename ? filename.split('.').pop().toLowerCase() : '';

    let displayText = '';
    let color = 'default';

    if (['msg', 'eml'].includes(extension)) {
        displayText = 'EMAIL';
        color = 'info';
    } else if (['oft', 'ost', 'pst'].includes(extension)) {
        displayText = 'OUTLOOK';
        color = 'info';
    } else if (extension === 'pdf') {
        displayText = 'PDF';
        color = 'error';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'success';
    } else if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'primary';
    } else if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'info';
    } else if (extension) {
        displayText = extension.toUpperCase();
    } else {
        displayText = 'Documento';
    }

    return (
        <Chip
            label={displayText}
            size="small"
            color={color}
            variant="outlined"
        />
    );
};

const AttachmentsTab = ({
    annexes = [],
    loadingAnnexes = false,
    document,
    onOpenPreview,
    onDownloadFile
}) => {
    const [previewFile, setPreviewFile] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const handleOpenPreview = async (annex) => {
        if (onOpenPreview) {
            onOpenPreview(annex);
        }
    };

    const handleDownloadFile = async (annex) => {
        try {
            if (!document?.regnumber) {
                throw new Error("Número do documento não disponível");
            }

            await downloadFile(document.regnumber, annex.filename, annex.descr || annex.filename);

        } catch (error) {
            console.error('Erro download:', error);
            alert(`Erro ao transferir: ${error.message}`);
        }
    };

    const truncateText = (text, maxLength = 50) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return `${text.substring(0, maxLength)}...`;
    };

    if (loadingAnnexes) {
        return (
            <Box display="flex" flexDirection="column" gap={2} py={2}>
                <Skeleton variant="rectangular" width="100%" height={60} />
                <Skeleton variant="rectangular" width="100%" height={80} />
                <Skeleton variant="rectangular" width="100%" height={80} />
                <Skeleton variant="rectangular" width="100%" height={80} />
            </Box>
        );
    }

    if (annexes.length === 0) {
        return (
            <Box textAlign="center" py={3}>
                <Typography variant="body1" color="text.secondary">
                    Sem anexos disponíveis
                </Typography>
            </Box>
        );
    }

    return (
        <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                <Table sx={{ minWidth: 650 }} size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome do Ficheiro</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Data</TableCell>
                            <TableCell align="right">Acções</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {annexes.map((annex) => (
                            <TableRow
                                key={annex.pk}
                                sx={{ '&:hover': { bgcolor: 'background.default' } }}
                            >
                                <TableCell component="th" scope="row">
                                    <Box display="flex" alignItems="center">
                                        <FileTypeIcon filename={annex.filename} />
                                        <Typography variant="body2" sx={{ ml: 1 }}>
                                            {truncateText(annex.filename, 40)}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    {truncateText(annex.descr, 40) || 'Sem descrição'}
                                </TableCell>
                                <TableCell>
                                    <FileTypeLabel filename={annex.filename} />
                                </TableCell>
                                <TableCell>
                                    {annex.data || 'N/A'}
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Visualizar anexo" arrow TransitionComponent={Zoom}>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleOpenPreview(annex)}
                                        >
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Transferir anexo" arrow TransitionComponent={Zoom}>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleDownloadFile(annex)}
                                        >
                                            <CloudDownloadIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {previewOpen && previewFile && (
                <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
                    <DocumentPreview
                        fileUrl={previewFile.url}
                        fileName={previewFile.filename}
                        onClose={() => setPreviewOpen(false)}
                        onDownload={() => handleDownloadFile(previewFile)}
                        docData={document}
                    />
                </Modal>
            )}
        </>
    );
};

export default AttachmentsTab;