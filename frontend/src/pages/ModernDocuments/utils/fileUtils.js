import React from 'react';
import {
    Box,
    Typography,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    TextField,
    Chip,
    useTheme
} from '@mui/material';
import {
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    InsertDriveFile as FileIcon,
    TableChart as TableIcon,
    Email as EmailIcon,
    Code as CodeIcon,
    AudioFile as AudioIcon,
    VideoFile as VideoIcon,
    Archive as ArchiveIcon,
    TextSnippet as TextIcon,
    Description as DescriptionIcon,
    Delete as DeleteIcon,
    Slideshow as SlideshowIcon
} from '@mui/icons-material';
import * as pdfjsLib from "pdfjs-dist/webpack";

/**
 * Obtém o componente de ícone adequado para o tipo de arquivo
 * @param {string} filename - Nome do arquivo
 * @param {string} fileType - Tipo MIME do arquivo
 * @returns {JSX.Element} - Componente de ícone React
 */
export const getFileIcon = (filename, fileType) => {
    // Verificar tipo MIME
    const type = fileType ? fileType.toLowerCase() : '';

    // Verificar extensão do arquivo
    const extension = filename ? filename.split('.').pop().toLowerCase() : '';

    // Formatos de email
    if (['msg', 'eml', 'oft', 'ost', 'pst'].includes(extension)) {
        return <EmailIcon fontSize="large" color="info" />;
    }
    // PDF
    else if (type.includes('pdf') || extension === 'pdf') {
        return <PdfIcon fontSize="large" color="error" />;
    }
    // Imagens
    else if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
        return <ImageIcon fontSize="large" color="success" />;
    }
    // Planilhas
    else if (type.includes('excel') || type.includes('spreadsheet') ||
        ['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
        return <TableIcon fontSize="large" color="primary" />;
    }
    // Documentos de texto
    else if (type.includes('word') || type.includes('document') ||
        ['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
        return <DescriptionIcon fontSize="large" color="info" />;
    }
    // Apresentações
    else if (type.includes('powerpoint') || type.includes('presentation') ||
        ['ppt', 'pptx', 'odp'].includes(extension)) {
        return <SlideshowIcon fontSize="large" color="warning" />;
    }
    // Código fonte
    else if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'html', 'css', 'xml', 'json'].includes(extension)) {
        return <CodeIcon fontSize="large" color="secondary" />;
    }
    // Áudio
    else if (type.includes('audio') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
        return <AudioIcon fontSize="large" color="primary" />;
    }
    // Vídeo
    else if (type.includes('video') || ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(extension)) {
        return <VideoIcon fontSize="large" color="primary" />;
    }
    // Arquivos compactados
    else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        return <ArchiveIcon fontSize="large" color="warning" />;
    }
    // Arquivos de texto
    else if (['txt', 'md'].includes(extension)) {
        return <TextIcon fontSize="large" color="default" />;
    }
    // Tipo genérico para outros arquivos
    else {
        return <FileIcon fontSize="large" color="action" />;
    }
};

/**
 * Retorna o nome do ícone a ser usado (string em vez de componente)
 * @param {string} fileType - Tipo MIME do arquivo
 * @returns {string} - Nome do ícone Material UI
 */
export const getFileIconName = (fileType) => {
    if (!fileType) return 'InsertDriveFile'; // Ícone padrão

    const type = fileType.toLowerCase();

    if (type.includes('pdf')) {
        return 'PictureAsPdf';
    } else if (type.startsWith('image/')) {
        return 'Image';
    } else if (type.includes('excel') || type.includes('spreadsheet') ||
        type.includes('sheet') || type.includes('csv')) {
        return 'TableChart';
    } else if (type.includes('word') || type.includes('wordprocessing') ||
        type.includes('document')) {
        return 'Description';
    } else if (type.includes('powerpoint') || type.includes('presentation')) {
        return 'Slideshow';
    } else if (type.includes('text/')) {
        return 'TextSnippet';
    } else if (type.includes('zip') || type.includes('compressed') ||
        type.includes('rar') || type.includes('7z')) {
        return 'Archive';
    } else if (type.includes('audio')) {
        return 'AudioFile';
    } else if (type.includes('video')) {
        return 'VideoFile';
    }

    return 'InsertDriveFile'; // Ícone padrão para outros tipos
};

/**
 * Componente para mostrar tipo de arquivo em formato amigável
 * @param {Object} props - Propriedades do componente
 * @returns {JSX.Element} - Componente React
 */
export const FileTypeChip = ({ filename, fileType }) => {
    // Verificar tipo MIME
    const type = fileType ? fileType.toLowerCase() : '';

    // Verificar extensão do arquivo
    const extension = filename ? filename.split('.').pop().toLowerCase() : '';

    let displayText = '';
    let color = 'default';

    // Formatos de email
    if (['msg', 'eml'].includes(extension)) {
        displayText = 'EMAIL';
        color = 'info';
    }
    // Outros formatos de email
    else if (['oft', 'ost', 'pst'].includes(extension)) {
        displayText = 'OUTLOOK';
        color = 'info';
    }
    // PDF
    else if (type.includes('pdf') || extension === 'pdf') {
        displayText = 'PDF';
        color = 'error';
    }
    // Imagens
    else if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'success';
    }
    // Planilhas
    else if (type.includes('excel') || type.includes('spreadsheet') ||
        ['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'primary';
    }
    // Documentos de texto
    else if (type.includes('word') || type.includes('document') ||
        ['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'info';
    }
    // Apresentações
    else if (type.includes('powerpoint') || type.includes('presentation') ||
        ['ppt', 'pptx', 'odp'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'warning';
    }
    // Outros tipos
    else if (extension) {
        displayText = extension.toUpperCase();
    }
    else {
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

/**
 * Gera thumbnail para arquivos PDF
 * @param {File} file - Arquivo PDF
 * @returns {Promise<string>} - URL de dados da miniatura
 */
export const generatePDFThumbnail = async (file) => {
    try {
        // Configurar worker para PDF.js se ainda não configurado
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }

        const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = window.document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        return canvas.toDataURL();
    } catch (error) {
        console.error("Erro ao gerar thumbnail do PDF:", error);
        return "url/to/generic/file/icon.png";
    }
};

/**
 * Gera preview para qualquer tipo de arquivo
 * @param {File} file - Arquivo para gerar preview
 * @returns {Promise<string>} - URL da preview
 */
export const generateFilePreview = async (file) => {
    if (!file) {
        throw new Error('Arquivo não fornecido');
    }

    if (file.type === "application/pdf") {
        return await generatePDFThumbnail(file);
    } else if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
    } else {
        // Retornar um ícone genérico para outros tipos
        return "url/to/generic/file/icon.png";
    }
};

/**
 * Formata o tamanho do arquivo para exibição
 * @param {number} sizeInBytes - Tamanho em bytes
 * @param {number} decimalPlaces - Casas decimais a exibir
 * @returns {string} - Tamanho formatado com unidade
 */
export const formatFileSize = (sizeInBytes, decimalPlaces = 2) => {
    if (!sizeInBytes) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(decimalPlaces)} ${units[unitIndex]}`;
};

/**
 * Componente para visualização de arquivos com descrição
 * @param {Object} props - Propriedades do componente
 * @returns {JSX.Element} - Componente React
 */
export const FilePreviewItem = ({ file, description, onDescriptionChange, onRemove, disabled, previewUrl }) => {
    const theme = useTheme();

    return (
        <ListItem
            sx={{
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                bgcolor: 'background.paper',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                p: 2
            }}
        >
            <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                {previewUrl && previewUrl !== "url/to/generic/file/icon.png" ? (
                    <img
                        src={previewUrl}
                        alt="preview"
                        style={{ width: 80, height: 80, objectFit: 'contain' }}
                    />
                ) : (
                    getFileIcon(file.name, file.type)
                )}
            </ListItemIcon>

            <ListItemText
                primary={
                    <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                        <Typography variant="body1" fontWeight="medium">
                            {file.name}
                        </Typography>
                        <FileTypeChip filename={file.name} fileType={file.type} />
                    </Box>
                }
                secondary={
                    <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                    </Typography>
                }
                sx={{ flex: '0 0 auto', mr: 2, mb: { xs: 2, md: 0 } }}
            />

            <Box flexGrow={1} width={{ xs: '100%', md: 'auto' }}>
                <TextField
                    fullWidth
                    size="small"
                    label="Descrição do arquivo"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    required
                    disabled={disabled}
                />
            </Box>

            <ListItemSecondaryAction>
                <IconButton
                    edge="end"
                    onClick={onRemove}
                    disabled={disabled}
                    color="error"
                >
                    <DeleteIcon />
                </IconButton>
            </ListItemSecondaryAction>
        </ListItem>
    );
};

export const downloadFile = async (regnumber, filename, displayName = null) => {
    const baseUrl = process.env.REACT_APP_API_BASE_URL || window.REACT_APP_API_BASE_URL;
    const token = JSON.parse(localStorage.getItem("user"))?.access_token;

    if (!baseUrl || !token) {
        throw new Error("Configuração inválida");
    }

    const response = await fetch(`${baseUrl}/files/${regnumber}/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = displayName || filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const previewFile = async (regnumber, filename) => {
    const baseUrl = process.env.REACT_APP_API_BASE_URL || window.REACT_APP_API_BASE_URL;
    const token = JSON.parse(localStorage.getItem("user"))?.access_token;

    const response = await fetch(`${baseUrl}/files/${regnumber}/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
    }

    const blob = await response.blob();
    return {
        url: window.URL.createObjectURL(blob),
        type: blob.type,
        size: blob.size
    };
};