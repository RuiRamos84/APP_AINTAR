import {
    Assignment as AssignmentIcon,
    Attachment as AttachmentIcon,
    Close as CloseIcon,
    CloudDownload as CloudDownloadIcon,
    Description as DocumentIcon,
    FileCopy as FileCopyIcon,
    Payment as PaymentIcon,
    Send as SendIcon,
    Settings as SettingsIcon,
    Timeline as TimelineIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fade,
    Grid,
    IconButton,
    Paper,
    Stack,
    Tab,
    Tabs,
    Typography,
    useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

// Tabs do modal
import PaymentDialog from '../../../../features/Payment/modals/PaymentDialog';
import AttachmentsTab from './tabs/AttachmentsTab';
import DetailsTab from './tabs/DetailsTab';
import HistoryTab from './tabs/HistoryTab';
import ParametersTab from './tabs/ParametersTab';
import PaymentsTab from './tabs/PaymentsTab ';

// Componente de preview
import DocumentPreview from './DocumentPreview';

import HistoryIcon from '@mui/icons-material/History';
import { useDocumentsContext } from '../../../ModernDocuments/context/DocumentsContext';
import { useDocumentActions } from '../../context/DocumentActionsContext';

// Serviços e utilitários
import {
    getDocumentAnnex,
    getDocumentById,
    getDocumentStep
} from '../../../../services/documentService';

import { generatePDF } from "../../../../components/Documents/DocumentPDF";

// Interface TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`document-tabpanel-${index}`}
            aria-labelledby={`document-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: { xs: 1, sm: 2 } }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const DocumentModal = ({
    open,
    onClose,
    document,
    metaData,
    onAddStep,
    onAddAnnex,
    onReplicate,
    onDownloadComprovativo,
    modalKey = 'default',
    style,
    ...props
}) => {
    const theme = useTheme();

    // Estados
    const [tabValue, setTabValue] = useState(0);
    const [steps, setSteps] = useState([]);
    const [annexes, setAnnexes] = useState([]);
    const [loadingSteps, setLoadingSteps] = useState(false);
    const [loadingAnnexes, setLoadingAnnexes] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const { handleViewOriginDetails, showNotification } = useDocumentActions();
    const { showNotification: showGlobalNotification } = useDocumentsContext();
    const [invoiceAmount, setInvoiceAmount] = useState(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [previewFile, setPreviewFile] = useState({
        url: '',
        type: '',
        name: ''
    });

    // Estados para controlar modais filhos
    const [stepModalOpen, setStepModalOpen] = useState(false);
    const [annexModalOpen, setAnnexModalOpen] = useState(false);
    const [replicateModalOpen, setReplicateModalOpen] = useState(false);

    useEffect(() => {
        if (document) {
            // console.log('[DEBUG] Modal renderizado com documento:', document);
            // console.log('[DEBUG] É documento de origem?', document._isOriginDocument);
            // console.log('[DEBUG] modalKey:', modalKey);
        }
    }, [document, modalKey]);

    // Quando o modal abrir, carregar histórico e anexos
    useEffect(() => {
        const fetchDocumentDetails = async () => {
            if (open && document) {
                await Promise.all([
                    fetchSteps(),
                    fetchAnnexes()
                ]);
            }
        };

        fetchDocumentDetails();
    }, [open, document]);

    // Chame esta função quando o modal abrir junto com os outros dados
    useEffect(() => {
        const fetchDocumentDetails = async () => {
            if (open && document) {
                await Promise.all([
                    fetchSteps(),
                    fetchAnnexes(),
                    fetchInvoiceAmount() // Adicionado
                ]);
            }
        };

        fetchDocumentDetails();
    }, [open, document]);

    // Função para obter o caminho do arquivo
    const getFilePath = (regnumber, filename) => {
        const baseUrl = process.env.REACT_APP_API_BASE_URL || window.REACT_APP_API_BASE_URL;
        if (!baseUrl) {
            console.error("API_BASE_URL não está definido no ambiente");
            return "";
        }
        return `${baseUrl}/files/${regnumber}/${filename}`;
    };

    // Buscar histórico de passos
    const fetchSteps = async () => {
        setLoadingSteps(true);
        try {
            // Verificar se temos um documento completo com pk
            if (document && document.pk) {
                const response = await getDocumentStep(document.pk);
                setSteps(Array.isArray(response) ? response : []);
            } else {
                // Documento sem pk (documento de origem)
                setSteps([]);
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            setSteps([]);
        } finally {
            setLoadingSteps(false);
        }
    };

    // Buscar anexos
    const fetchAnnexes = async () => {
        setLoadingAnnexes(true);
        try {
            // Verificar se temos um documento completo com pk
            if (document && document.pk) {
                const response = await getDocumentAnnex(document.pk);
                setAnnexes(Array.isArray(response) ? response : []);
            } else {
                // Documento sem pk (documento de origem)
                setAnnexes([]);
            }
        } catch (error) {
            console.error('Erro ao buscar anexos:', error);
            setAnnexes([]);
        } finally {
            setLoadingAnnexes(false);
        }
    };

    // Adicione esta função no componente para carregar o valor
    const fetchInvoiceAmount = async () => {
        if (!document || !document.pk) return;

        try {
            const paymentService = (await import('../../../../features/Payment/services/paymentService')).default;
            const result = await paymentService.getInvoiceAmount(document.pk);

            if (result.success) {
                setInvoiceAmount(result);  // Agora armazenamos o objeto completo
                // console.log("Dados completos da fatura:", result);
            } else {
                setInvoiceAmount(null);
            }
        } catch (error) {
            console.error('Erro ao buscar valor da fatura:', error);
            setInvoiceAmount(null);
        }
    };

    // Manipulador de mudança de tab
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Abrir preview do anexo
    const handleOpenPreview = (annex) => {
        // Construir URL do arquivo usando o número de registro do documento e nome do arquivo
        const fileUrl = getFilePath(document.regnumber, annex.filename);

        setPreviewFile({
            url: fileUrl,
            type: annex.ftype || 'application/octet-stream',
            name: annex.filename || annex.descr || 'Documento'
        });
        setPreviewOpen(true);
    };

    const handlePaymentClick = async (doc) => {
        try {
            // Importar o utilitário de integração de pagamentos
            const paymentIntegration = (await import('../../../../features/Payment/utils/paymentIntegration')).default;

            // Iniciar o processo de pagamento
            const result = await paymentIntegration.initiateDocumentPayment(
                doc,
                // Callback de sucesso - abre o modal de pagamento
                (paymentData) => {
                    setPaymentData(paymentData);
                    setPaymentDialogOpen(true);
                },
                // Callback de erro - já tratado pelo utilitário
                null,
                // Função para exibir notificações
                showGlobalNotification
            );
        } catch (error) {
            console.error('Erro ao iniciar pagamento:', error);
            showGlobalNotification('Erro ao iniciar processo de pagamento', 'error');
        }
    };

    // Função para verificar se deve mostrar o botão de pagamento
    const shouldShowPaymentButton = () => {
        // Se não temos dados de fatura, não mostrar o botão
        if (!invoiceAmount || invoiceAmount.invoice_data == null) return false;

        const invoiceData = invoiceAmount.invoice_data;

        // Se o valor da fatura existe
        if (invoiceData.invoice) {
            // Verificar se NÃO tem informações de pagamento completas
            // Se não tiver payment_status, payment_method ou payment_reference preenchidos, 
            // mostra o botão de pagamento
            if (!invoiceData.payment_status || !invoiceData.payment_method || !invoiceData.payment_reference) {
                return true;
            }
        }

        // Em outros casos, não mostrar o botão
        return false;
    };

    // Atualizar dados após operações em modais filhos
    const refreshData = async () => {
        await Promise.all([
            fetchSteps(),
            fetchAnnexes()
        ]);
        showGlobalNotification('Dados atualizados com sucesso', 'success');
    };

    // Handlers para modais filhos com monitoramento de estado
    // Esta função será usada para verificar periodicamente se os dados precisam ser atualizados
    const [needsRefresh, setNeedsRefresh] = useState(false);

    // Substituir polling por sistema de eventos
    useEffect(() => {
        // Criar um listener para eventos de atualização de documento
        const handleDocumentUpdate = (event) => {
            // console.log("[DEBUG] Evento recebido:", event.detail);
            if (event.detail && event.detail.documentId === document?.pk) {
                // console.log("[DEBUG] Atualizando documento:", document?.pk);
                refreshData();
            } else {
                console.log("[DEBUG] Ignorando evento para documento:" ,
                event.detail?.documentId, "vs atual:", document?.pk);
            }
        };

        // Registrar o listener
        window.addEventListener('document-updated', handleDocumentUpdate);

        // Limpar o listener quando o componente for desmontado
        return () => {
            window.removeEventListener('document-updated', handleDocumentUpdate);
        };
    }, [document?.pk]);

    useEffect(() => {
        // Quando o invoice amount mudar, pode mudar o layout das tabs
        const hasPaymentTab = invoiceAmount &&
            invoiceAmount.invoice_data &&
            invoiceAmount.invoice_data.payment_status &&
            invoiceAmount.invoice_data.payment_method;

        // Número máximo de abas disponíveis (0-indexed)
        const maxTabIndex = hasPaymentTab ? 4 : 3;

        // Se estivermos em uma aba que não existe, voltar para a primeira
        if (tabValue > maxTabIndex) {
            setTabValue(0);
        }
    }, [invoiceAmount, tabValue]);

    const handleAddStepClick = () => {
        if (onAddStep) {
            // Chamar função para abrir o modal sem fechar o pai
            onAddStep(document);
            // O polling automático cuidará da atualização
        }
    };

    const handleAddAnnexClick = () => {
        if (onAddAnnex) {
            // Chamar função para abrir o modal sem fechar o pai
            onAddAnnex(document);
            // O polling automático cuidará da atualização
        }
    };

    const handleReplicateClick = () => {
        if (onReplicate) {
            // Chamar função para abrir o modal sem fechar o pai
            onReplicate(document);
            // O polling automático cuidará da atualização
        }
    };

    // Obter cor do status
    const getStatusColor = () => {
        const statusMap = {
            0: theme.palette.success.main,
            1: theme.palette.warning.main,
            2: theme.palette.primary.main,
            3: theme.palette.error.main,
            4: theme.palette.info.main
        };
        return document?.what !== undefined ? (statusMap[document.what] || theme.palette.grey[500]) : theme.palette.grey[500];
    };

    // Obter nome do status
    const getStatusName = () => {
        if (!metaData?.what || document?.what === undefined) return 'Desconhecido';
        const status = metaData.what.find(s => s.pk === document.what);
        return status ? status.step : 'Desconhecido';
    };

    // Verificar se o documento tem todos os campos necessários
    const isCompleteDocument = document?.pk && document?.regnumber;

    // Função para visualizar documento de origem
    const handleViewOriginDocument = async (originId) => {
        if (!originId) return;

        try {
            setLoading(true);
            showGlobalNotification('Carregando documento de origem...', 'info');
            const response = await getDocumentById(originId);

            // console.log('[DEBUG] Resposta da API:', response);

            if (response?.document) {
                // Verificar se o documento recebido é válido
                if (!response.document.pk || !response.document.regnumber) {
                    console.error('[DEBUG] Documento inválido recebido:', response.document);
                    showGlobalNotification('Dados do documento de origem inválidos', 'error');
                    setLoading(false);
                    return;
                }

                const originDocument = response.document;
                // console.log('[DEBUG] Documento de origem encontrado:', originDocument);

                // Usar o handler do contexto para abrir o documento de origem em um novo modal
                handleViewOriginDetails(originDocument);

                setLoading(false);
                showGlobalNotification('Documento de origem carregado', 'success');
                return;
            }

            showGlobalNotification('Documento de origem não encontrado', 'error');
        } catch (error) {
            console.error('[DEBUG] Erro ao buscar documento de origem:', error);
            showGlobalNotification('Erro ao buscar documento de origem', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Download de um arquivo
    const handleDownloadFile = (annex) => {
        const url = getFilePath(document.regnumber, annex.filename);

        fetch(url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("user")
                    ? JSON.parse(localStorage.getItem("user")).access_token
                    : ""
                    }`,
            },
        })
            .then((response) => {
                if (response.ok) {
                    return response.blob();
                }
                throw new Error("Erro ao baixar o arquivo");
            })
            .then((blob) => {
                const fileUrl = window.URL.createObjectURL(blob);

                // Verificar se o ambiente suporta download de arquivos
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
                console.error("Erro ao baixar o arquivo:", error);
                alert("Erro ao baixar o arquivo. Por favor, tente novamente.");
            });
    };

    useEffect(() => {
        // Se o documento mudar enquanto o modal estiver aberto
        if (document && open) {
            // console.log('[DEBUG] Documento alterado no modal:', document);

            // Resetar estado do modal
            setTabValue(0);
            setSteps([]);
            setAnnexes([]);

            // Buscar novos dados
            fetchSteps();
            fetchAnnexes();
        }
    }, [document?.pk]);

    // Download do arquivo em preview
    const handleDownloadPreview = () => {
        if (!previewFile) return;

        // Extrair o nome do arquivo da URL
        const filename = previewFile.name;

        fetch(previewFile.url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("user")
                    ? JSON.parse(localStorage.getItem("user")).access_token
                    : ""
                    }`,
            },
        })
            .then((response) => {
                if (response.ok) {
                    return response.blob();
                }
                throw new Error("Erro ao baixar o arquivo");
            })
            .then((blob) => {
                const fileUrl = window.URL.createObjectURL(blob);
                const link = window.document.createElement("a");
                link.href = fileUrl;
                link.download = filename;
                link.click();

                setTimeout(() => {
                    window.URL.revokeObjectURL(fileUrl);
                }, 100);
            })
            .catch((error) => {
                console.error("Erro ao baixar o arquivo:", error);
                alert("Erro ao baixar o arquivo. Por favor, tente novamente.");
            });
    };

    // 1. Função auxiliar para calcular o índice correto de cada aba
    const getTabIndex = (baseIndex) => {
        // Verificar se a aba de Pagamentos está presente
        const hasPaymentTab = invoiceAmount &&
            invoiceAmount.invoice_data &&
            invoiceAmount.invoice_data.payment_status &&
            invoiceAmount.invoice_data.payment_method;

        // Se a aba de pagamentos não estiver presente e o índice for maior que 2 (a posição da aba de pagamentos),
        // então diminuímos 1 do índice
        if (!hasPaymentTab && baseIndex > 2) {
            return baseIndex - 1;
        }

        return baseIndex;
    };

    const updateCurrentDocument = (newDocument) => {
        // Resetar estados
        setTabValue(0);
        setSteps([]);
        setAnnexes([]);

        // Atualizar o documento no componente pai
        if (props.onUpdateDocument) {
            props.onUpdateDocument(newDocument);
        }
    };

    // Renderizar tabs
    const renderTabs = () => {
        // Verificar se pagamento existe ou está completo
        const hasPayment = invoiceAmount &&
            invoiceAmount.invoice_data &&
            invoiceAmount.invoice_data.payment_status &&
            invoiceAmount.invoice_data.payment_method;

        return (
            <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                aria-label="document details tabs"
                sx={{
                    '& .MuiTab-root': {
                        minHeight: 48,
                        py: 1
                    }
                }}
            >
                <Tab
                    icon={<DocumentIcon fontSize="small" />}
                    label="Informações"
                    iconPosition="start"
                    id="document-tab-0"
                    aria-controls="document-tabpanel-0"
                />
                <Tab
                    icon={<TimelineIcon fontSize="small" />}
                    label="Histórico"
                    iconPosition="start"
                    id="document-tab-1"
                    aria-controls="document-tabpanel-1"
                />
                <Tab
                    icon={<AttachmentIcon fontSize="small" />}
                    label={`Anexos ${annexes.length > 0 ? `(${annexes.length})` : ''}`}
                    iconPosition="start"
                    id="document-tab-2"
                    aria-controls="document-tabpanel-2"
                />

                <Tab
                    icon={<SettingsIcon fontSize="small" />}
                    label="Parâmetros"
                    iconPosition="start"
                    id="document-tab-3"
                    aria-controls="document-tabpanel-3"
                />

                {/* Exibir a aba Pagamentos apenas quando houver pagamento */}
                {hasPayment && (
                    <Tab
                        icon={<PaymentIcon fontSize="small" />}
                        label="Pagamentos"
                        iconPosition="start"
                        id="document-tab-4"
                        aria-controls="document-tabpanel-4"
                    />
                )}
            </Tabs>
        );
    };

    // Renderizar ações do documento
    const renderActions = () => {
        const actions = [];

        // Verificar se o documento é de origem (não mostrar botões para documentos de origem)
        const isOriginData = document.origin_data === true;

        // Verificar se é um documento completo
        const isCompleteDocument = document?.pk && document?.regnumber;

        // Obter a tab atual de onde o modal foi aberto
        const tabType = props.tabType || 'all'; // 'all', 'assigned' ou 'created'

        // Botões só visíveis para documentos completos e não de origem
        if (!isOriginData && isCompleteDocument) {
            // Botões para adicionar passo, anexo e replicar só aparecem na tab "Para tratamento"
            if (tabType === 'assigned') {
                if (onAddStep) {
                    actions.push(
                        <Button
                            key="add-step"
                            variant="outlined"
                            startIcon={<SendIcon />}
                            onClick={handleAddStepClick}
                        >
                            Adicionar Passo
                        </Button>
                    );
                }

                if (onAddAnnex) {
                    actions.push(
                        <Button
                            key="add-annex"
                            variant="outlined"
                            startIcon={<AttachmentIcon />}
                            onClick={handleAddAnnexClick}
                        >
                            Adicionar Anexo
                        </Button>
                    );
                }

                if (onReplicate) {
                    actions.push(
                        <Button
                            key="replicate"
                            variant="outlined"
                            startIcon={<FileCopyIcon />}
                            onClick={handleReplicateClick}
                        >
                            Replicar
                        </Button>
                    );
                }
            }

            // Botão de comprovativo só aparece na tab "Criados por mim"
            if (tabType === 'created') {
                // Renderizar o botão de pagamento somente se houver fatura para pagar
                if (shouldShowPaymentButton()) {
                    actions.push(
                        <Button
                            key="payment"
                            variant="contained"
                            color="success"
                            startIcon={<PaymentIcon />}
                            onClick={() => handlePaymentClick(document)}
                            sx={{ mr: 1 }}
                        >
                            Pagar {invoiceAmount?.invoice_data?.invoice}€
                        </Button>
                    );
                } else if (invoiceAmount?.invoice_data?.payment_status === "Success" ||
                    invoiceAmount?.invoice_data?.payment_status === "SUCCESS") {
                    // Se o pagamento já foi efetuado com sucesso, mostrar um indicador
                    actions.push(
                        <Chip
                            icon={<CheckCircleIcon />}
                            label="Pagamento efetuado"
                            color="success"
                            variant="outlined"
                            sx={{ mr: 1, height: 36 }}
                        />
                    );
                }

                actions.push(
                    <Button
                        key="download"
                        variant="contained"
                        color="primary"
                        startIcon={<CloudDownloadIcon />}
                        onClick={() => handleDownloadComprovativoLocal(document)}
                    >
                        Baixar Comprovativo
                    </Button>
                );
            }
        }

        return actions;
    };

    // Função local para geração do PDF
    const handleDownloadComprovativoLocal = async (document) => {
        try {
            showGlobalNotification('Gerando comprovativo...', 'info');

            // Buscar dados necessários para o PDF
            const stepsData = steps;
            const anexosData = annexes;

            // Gerar o PDF usando o utility DocumentPDF
            await generatePDF(document, stepsData, anexosData, metaData);

            showGlobalNotification('Comprovativo gerado com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao gerar comprovativo:', error);
            showGlobalNotification('Erro ao gerar comprovativo', 'error');
        }
    };

    if (!document) {
        return null;
    }

    // Calcular deslocamento para modal em cascata
    const isOriginDocument = document._isOriginDocument === true;

    return (
        <>
            <Dialog
                key={`modal_${document?.pk || 'unknown'}_${modalKey}_${document?._isOriginDocument ? 'origin' : 'normal'}`}
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                scroll="paper"
                aria-labelledby="document-details-title"
                TransitionComponent={Fade}
                transitionDuration={300}
                PaperProps={{
                    sx: {
                        borderRadius: { xs: 0, sm: 1 },
                        height: { xs: '100%', sm: 'auto' },
                        maxHeight: { xs: '100%', sm: '90vh' },
                        // Aplicar deslocamento se for um documento de origem
                        ml: isOriginDocument ? { xs: 1, sm: 3, md: 6 } : 0,
                        mt: isOriginDocument ? { xs: 1, sm: 2, md: 4 } : 0,
                        // Borda destacada para documento de origem
                        border: isOriginDocument ? `2px solid ${theme.palette.primary.main}` : 'none',
                        // Aplicar estilo personalizado se fornecido
                        ...style
                    }
                }}
            >
                <DialogTitle id="document-details-title" sx={{ pb: 1, position: 'relative' }}>
                    {/* Botão de fechar no canto superior direito, fora do Paper */}
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                        size="small"
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: theme.palette.grey[500],
                            zIndex: 1,
                            '&:hover': {
                                color: theme.palette.primary.main
                            }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>

                    {/* Paper com informações do documento */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            mb: 3,
                            bgcolor: alpha(getStatusColor(), 0.05),
                            borderLeft: `4px solid ${getStatusColor()}`
                        }}
                    >
                        <Grid container alignItems="center" spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <AssignmentIcon color="primary" />
                                    <Typography variant="h5" component="h2">
                                        {document.regnumber || document.origin || 'Documento de Origem'}
                                        {isOriginDocument && (
                                            <Chip
                                                size="small"
                                                label="Documento de Origem"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ ml: 1, fontSize: '0.7rem' }}
                                            />
                                        )}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                    {document.submission ? `Criado em: ${document.submission}` :
                                        (document.creator ? `Criado por: ${document.creator}` : '')}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                                    flexWrap="wrap"
                                    sx={{ gap: 1 }}
                                >
                                    {/* Documento de origem, se disponível */}
                                    {document.origin && (
                                        <Chip
                                            icon={<HistoryIcon fontSize="small" />}
                                            label={`Origem: ${document.origin}`}
                                            variant="outlined"
                                            color="primary"
                                            sx={{
                                                cursor: 'pointer',
                                                height: 32,
                                                minWidth: 120,
                                                justifyContent: "center",
                                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                                            }}
                                            onClick={() => handleViewOriginDocument(document.origin)}
                                        />
                                    )}

                                    {/* Status do documento */}
                                    {document.what !== undefined ? (
                                        <Chip
                                            label={getStatusName()}
                                            color={document.what === 3 ? "error" : "primary"}
                                            sx={{
                                                bgcolor: alpha(getStatusColor(), 0.1),
                                                color: getStatusColor(),
                                                borderColor: getStatusColor(),
                                                fontWeight: 'medium',
                                                px: 1,
                                                height: 32,
                                                minWidth: 120,
                                                justifyContent: "center"
                                            }}
                                            variant="outlined"
                                        />
                                    ) : (
                                        <Chip
                                            label="Documento de Referência"
                                            color="secondary"
                                            sx={{
                                                fontWeight: 'medium',
                                                px: 1,
                                                height: 32,
                                                minWidth: 120,
                                                justifyContent: "center"
                                            }}
                                            variant="outlined"
                                        />
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>
                </DialogTitle>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                    {renderTabs()}
                </Box>

                <DialogContent dividers>
                    {/* Tab de Informações - sempre índice 0 */}
                    <TabPanel value={tabValue} index={0}>
                        <DetailsTab
                            document={document}
                            metaData={metaData}
                            onClose={onClose}
                            onUpdateDocument={updateCurrentDocument}
                            onViewOriginDocument={handleViewOriginDocument}
                        />
                    </TabPanel>

                    {/* Tab de Histórico - sempre índice 1 */}
                    <TabPanel value={tabValue} index={1}>
                        {document.origin_data ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body1" color="text.secondary">
                                    Histórico não disponível para documento de origem
                                </Typography>
                            </Box>
                        ) : (
                            <HistoryTab steps={steps} loadingSteps={loadingSteps} metaData={metaData} />
                        )}
                    </TabPanel>

                    {/* Tab de Anexos - sempre índice 2 */}
                    <TabPanel value={tabValue} index={2}>
                        {document.origin_data ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body1" color="text.secondary">
                                    Anexos não disponíveis para documento de origem
                                </Typography>
                            </Box>
                        ) : (
                            <AttachmentsTab
                                annexes={annexes}
                                loadingAnnexes={loadingAnnexes}
                                metaData={metaData}
                                document={document}
                                onOpenPreview={handleOpenPreview}
                                onDownloadFile={handleDownloadFile}
                            />
                        )}
                    </TabPanel>

                    {/* Aba de Parâmetros - agora sempre será índice 3 */}
                    <TabPanel value={tabValue} index={3}>
                        {document.origin_data ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body1" color="text.secondary">
                                    Parâmetros não disponíveis para documento de origem
                                </Typography>
                            </Box>
                        ) : (
                            <ParametersTab
                                document={document}
                                metaData={metaData}
                                isAssignedToMe={props.tabType === 'assigned'}
                            />
                        )}
                    </TabPanel>

                    {/* Aba de Pagamentos - índice 4, apenas quando existir */}
                    {invoiceAmount && invoiceAmount.invoice_data && invoiceAmount.invoice_data.payment_status && (
                        <TabPanel value={tabValue} index={4}>
                            {document.origin_data ? (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body1" color="text.secondary">
                                        Pagamentos não disponíveis para documento de origem
                                    </Typography>
                                </Box>
                            ) : (
                                <PaymentsTab
                                    document={document}
                                    invoiceAmount={invoiceAmount}
                                    loading={!invoiceAmount}
                                    onPayment={handlePaymentClick}
                                />
                            )}
                        </TabPanel>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        width="100%"
                        justifyContent="space-between"
                    >
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            width={{ xs: '100%', sm: 'auto' }}
                        >
                            {renderActions()}
                        </Stack>

                        <Button
                            onClick={onClose}
                            color="primary"
                            sx={{ mt: { xs: 2, sm: 0 } }}
                        >
                            Fechar
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            {previewOpen && (
                <DocumentPreview
                    open={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    fileUrl={previewFile.url}
                    fileType={previewFile.type}
                    fileName={previewFile.name}
                    onDownload={handleDownloadPreview}
                />
            )}
            {paymentDialogOpen && (
                <PaymentDialog
                    open={paymentDialogOpen}
                    onClose={(success, result) => {
                        setPaymentDialogOpen(false);

                        // Importar o utilitário de integração de pagamentos
                        import('../../../../features/Payment/utils/paymentIntegration')
                            .then(module => {
                                const paymentIntegration = module.default;

                                // Processar resultado do pagamento
                                paymentIntegration.processPaymentResult(
                                    { success, result },
                                    document,
                                    null,
                                    showGlobalNotification,
                                    refreshData
                                );
                            })
                            .catch(error => {
                                console.error('Erro ao processar resultado do pagamento:', error);
                                if (success) {
                                    showGlobalNotification('Pagamento processado com sucesso!', 'success');
                                    refreshData();
                                }
                            });
                    }}
                    paymentData={paymentData}
                />
            )}
        </>
    );
};

export default DocumentModal;