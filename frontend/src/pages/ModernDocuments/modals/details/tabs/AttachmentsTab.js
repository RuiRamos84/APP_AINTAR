import React, { useState, useEffect } from 'react';
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
    Chip,
    Divider,
    CircularProgress,
    Tab,
    Tabs,
    Link
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
    Close as CloseIcon,
    Email as EmailIcon,
    AttachFile as AttachmentIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
    Subject as SubjectIcon
} from '@mui/icons-material';

// Componente para renderizar o ícone do tipo de arquivo
const FileTypeIcon = ({ filename }) => {
    // Obtemos a extensão do arquivo
    const extension = filename ? filename.split('.').pop().toLowerCase() : '';

    // Formatos de email
    if (['msg', 'eml', 'oft', 'ost', 'pst'].includes(extension)) {
        return <EmailIcon color="info" />;
    }
    // PDF
    else if (extension === 'pdf') {
        return <PdfIcon color="error" />;
    }
    // Imagens
    else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
        return <ImageIcon color="success" />;
    }
    // Planilhas
    else if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
        return <TableIcon color="primary" />;
    }
    // Documentos de texto
    else if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
        return <DescriptionIcon color="info" />;
    }
    // Código fonte
    else if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'html', 'css', 'xml', 'json'].includes(extension)) {
        return <CodeIcon color="secondary" />;
    }
    // Áudio
    else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
        return <AudioIcon color="primary" />;
    }
    // Vídeo
    else if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(extension)) {
        return <VideoIcon color="primary" />;
    }
    // Arquivos compactados
    else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        return <ArchiveIcon color="warning" />;
    }
    // Arquivos de texto
    else if (['txt', 'md'].includes(extension)) {
        return <TextIcon color="default" />;
    }
    // Tipo genérico para outros arquivos
    else {
        return <FileIcon color="action" />;
    }
};

// Componente para mostrar tipo de arquivo em formato amigável
const FileTypeLabel = ({ filename }) => {
    // Obtemos a extensão do arquivo
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
    else if (extension === 'pdf') {
        displayText = 'PDF';
        color = 'error';
    }
    // Imagens
    else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'success';
    }
    // Planilhas
    else if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'primary';
    }
    // Documentos de texto
    else if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
        displayText = extension.toUpperCase();
        color = 'info';
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

// Componente de visualização de email
const EmailViewer = ({ emailData, loading, error }) => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    // Se tivermos dados de exemplo (para demonstração)
    const demoEmailData = {
        subject: emailData?.subject || "Assunto do Email",
        from: emailData?.from || "remetente@exemplo.com",
        to: emailData?.to || "destinatario@exemplo.com",
        cc: emailData?.cc || "copia@exemplo.com",
        date: emailData?.date || "25/03/2025 14:30",
        attachments: emailData?.attachments || [
            { name: "documento.pdf", size: "245 KB", type: "application/pdf" },
            { name: "imagem.jpg", size: "1.2 MB", type: "image/jpeg" }
        ],
        body: emailData?.body || "<p>Este é o corpo do email com formatação <b>HTML</b>.</p><p>Você pode ver conteúdo em <span style='color: blue;'>várias</span> <span style='color: red;'>cores</span> e formatos.</p>"
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%" p={3}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" p={3}>
                <Typography color="error" gutterBottom>
                    Erro ao carregar o email
                </Typography>
                <Typography variant="body2">
                    {error}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab label="Email" />
                    <Tab label="Anexos" disabled={!demoEmailData.attachments?.length} />
                    <Tab label="Código" />
                </Tabs>
            </Box>

            {/* Visualização do Email */}
            {activeTab === 0 && (
                <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
                    <Box sx={{
                        mb: 3,
                        pb: 2,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                    }}>
                        <Box display="flex" alignItems="center">
                            <SubjectIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="h6">{demoEmailData.subject}</Typography>
                        </Box>

                        <Box display="flex" alignItems="center">
                            <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                            <Typography variant="body2"><strong>De:</strong> {demoEmailData.from}</Typography>
                        </Box>

                        <Box display="flex" alignItems="center">
                            <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                            <Typography variant="body2"><strong>Para:</strong> {demoEmailData.to}</Typography>
                        </Box>

                        {demoEmailData.cc && (
                            <Box display="flex" alignItems="center">
                                <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                                <Typography variant="body2"><strong>CC:</strong> {demoEmailData.cc}</Typography>
                            </Box>
                        )}

                        <Box display="flex" alignItems="center">
                            <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                            <Typography variant="body2"><strong>Data:</strong> {demoEmailData.date}</Typography>
                        </Box>

                        {demoEmailData.attachments?.length > 0 && (
                            <Box display="flex" alignItems="center">
                                <AttachmentIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                                <Typography variant="body2">
                                    <strong>Anexos:</strong> {demoEmailData.attachments.length} arquivo(s)
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 1,
                            bgcolor: 'background.default'
                        }}
                        dangerouslySetInnerHTML={{ __html: demoEmailData.body }}
                    />
                </Box>
            )}

            {/* Anexos do Email */}
            {activeTab === 1 && (
                <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>Anexos do Email</Typography>

                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nome</TableCell>
                                    <TableCell>Tipo</TableCell>
                                    <TableCell>Tamanho</TableCell>
                                    <TableCell align="right">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {demoEmailData.attachments.map((attachment, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center">
                                                <FileTypeIcon filename={attachment.name} />
                                                <Typography variant="body2" sx={{ ml: 1 }}>
                                                    {attachment.name}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <FileTypeLabel filename={attachment.name} />
                                        </TableCell>
                                        <TableCell>{attachment.size}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Visualizar" arrow>
                                                <IconButton size="small">
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Baixar" arrow>
                                                <IconButton size="small">
                                                    <CloudDownloadIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* Código fonte do Email */}
            {activeTab === 2 && (
                <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>Código Fonte</Typography>

                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            bgcolor: 'background.default',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.875rem',
                            overflow: 'auto'
                        }}
                    >
                        {`From: ${demoEmailData.from}
To: ${demoEmailData.to}
${demoEmailData.cc ? `CC: ${demoEmailData.cc}\n` : ''}Subject: ${demoEmailData.subject}
Date: ${demoEmailData.date}
X-Mailer: Outlook

MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/html; charset="UTF-8"

${demoEmailData.body}

${demoEmailData.attachments?.map(att => `--boundary123
Content-Type: ${att.type}; name="${att.name}"
Content-Disposition: attachment; filename="${att.name}"
Content-Transfer-Encoding: base64

[Conteúdo do arquivo ${att.name} em base64]`).join('\n\n') || ''}
--boundary123--`}
                    </Paper>
                </Box>
            )}
        </Box>
    );
};

// Componente de visualização de documento
const DocumentPreview = ({ fileUrl, fileName, onClose, onDownload }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [emailData, setEmailData] = useState(null);

    const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
    const isPdf = extension === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension);
    const isEmail = ['msg', 'eml', 'oft'].includes(extension);

    useEffect(() => {
        // Simulação de carregamento de dados de email
        if (isEmail) {
            setLoading(true);

            // Simular um delay para carregamento
            const timer = setTimeout(() => {
                setEmailData({
                    subject: "Re: Documentação do Projeto",
                    from: "carlos.santos@empresa.com",
                    to: "maria.silva@empresa.com",
                    cc: "joao.pereira@empresa.com",
                    date: "25/03/2025 14:30",
                    attachments: [
                        { name: "relatorio_final.pdf", size: "1.5 MB", type: "application/pdf" },
                        { name: "cronograma.xlsx", size: "420 KB", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
                    ],
                    body: `
                        <div style="font-family: Arial, sans-serif; padding: 10px;">
                            <p>Olá Maria,</p>
                            
                            <p>Conforme solicitado, segue em anexo o relatório final do projeto e o cronograma atualizado para o próximo trimestre.</p>
                            
                            <p>Os principais pontos a destacar são:</p>
                            
                            <ul>
                                <li>Conclusão da fase de implementação prevista para 15/04/2025</li>
                                <li>Necessidade de agendar reunião com stakeholders</li>
                                <li>Orçamento aprovado para aquisição de novos equipamentos</li>
                            </ul>
                            
                            <p>Podemos discutir mais detalhes na reunião de amanhã.</p>
                            
                            <p>Atenciosamente,<br>
                            <b>Carlos Santos</b><br>
                            Gerente de Projetos<br>
                            Tel: (11) 98765-4321</p>
                        </div>
                    `
                });
                setLoading(false);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [isEmail]);

    return (
        <Box
            sx={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: '80%',
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 2,
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center">
                    <FileTypeIcon filename={fileName} />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                        {fileName || 'Visualização do Documento'}
                    </Typography>
                </Box>
                <Box>
                    <IconButton onClick={onDownload} size="small" color="primary">
                        <CloudDownloadIcon />
                    </IconButton>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            <Divider sx={{ mb: 1 }} />

            <Box sx={{ flexGrow: 1, overflow: 'hidden', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                {isEmail ? (
                    <EmailViewer
                        emailData={emailData}
                        loading={loading}
                        error={error}
                    />
                ) : isPdf ? (
                    <iframe
                        src={`${fileUrl}#toolbar=0`}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        title="PDF Preview"
                    />
                ) : isImage ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <img
                            src={fileUrl}
                            alt="Document Preview"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                    </Box>
                ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <Typography>
                            Este tipo de arquivo não pode ser visualizado diretamente. Por favor, faça o download.
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

const AttachmentsTab = ({
    annexes = [],
    loadingAnnexes = false,
    document, // Necessário para construir o caminho do arquivo
    onOpenPreview,
    onDownloadFile
}) => {
    const [previewFile, setPreviewFile] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Gerar caminho do arquivo (baseado no código do DocumentDetailsModal.js)
    const getFilePath = (regnumber, filename) => {
        const baseUrl = process.env.REACT_APP_API_BASE_URL || window.REACT_APP_API_BASE_URL;
        if (!baseUrl) {
            console.error("API_BASE_URL não está definido no ambiente");
            return "";
        }
        return `${baseUrl}/files/${regnumber}/${filename}`;
    };

    // Manipulador para abrir visualização
    const handleOpenPreview = (annex) => {
        if (onOpenPreview) {
            // Usar o manipulador passado por props se disponível
            onOpenPreview(annex);
        } else {
            // Implementação local
            setPreviewFile({
                ...annex,
                url: getFilePath(document?.regnumber, annex.filename)
            });
            setPreviewOpen(true);
        }
    };

    // Manipulador para fechar visualização
    const handleClosePreview = () => {
        setPreviewFile(null);
        setPreviewOpen(false);
    };

    // Manipulador para download
    const handleDownloadFile = (annex) => {
        console.log('🔍 Documento:', document);
        console.log('🔍 Regnumber:', document?.regnumber);
        console.log('🔍 Filename:', annex.filename);

        const url = getFilePath(document?.regnumber, annex.filename);
        console.log('🔍 URL gerada:', url);

        fetch(url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("user")
                    ? JSON.parse(localStorage.getItem("user")).access_token
                    : ""
                    }`,
            },
        })
            .then((response) => {
                console.log('🔍 Response status:', response.status);
                console.log('🔍 Content-Type:', response.headers.get('content-type'));

                if (response.ok) {
                    return response.blob();
                }
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            })
            .then((blob) => {
                const fileUrl = window.URL.createObjectURL(blob);

                if (typeof window.document !== "undefined" && "createElement" in window.document) {
                    const link = window.document.createElement("a");
                    link.href = fileUrl;
                    link.download = annex.filename;
                    link.click();
                } else {
                    window.open(fileUrl, "_blank");
                }

                setTimeout(() => {
                    window.URL.revokeObjectURL(fileUrl);
                }, 100);
            })
            .catch((error) => {
                console.error("🔍 Erro completo:", error);
                console.error("🔍 Detalhes do anexo:", annex);
                alert("Erro ao baixar o ficheiro. Por favor, tente novamente.");
            });
     };

    // Função para truncar texto longo
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
                            <TableCell>Nome do Arquivo</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Data</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {annexes.map((annex) => (
                            <TableRow
                                key={annex.pk}
                                sx={{
                                    '&:hover': {
                                        bgcolor: 'background.default'
                                    }
                                }}
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
                                    <Tooltip title="Baixar anexo" arrow TransitionComponent={Zoom}>
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

            {/* Modal de visualização de documento */}
            {previewOpen && previewFile && (
                <Modal open={previewOpen} onClose={handleClosePreview}>
                    <DocumentPreview
                        fileUrl={previewFile.url}
                        fileName={previewFile.filename}
                        onClose={handleClosePreview}
                        onDownload={() => handleDownloadFile(previewFile)}
                    />
                </Modal>
            )}
        </>
    );
};

export default AttachmentsTab;