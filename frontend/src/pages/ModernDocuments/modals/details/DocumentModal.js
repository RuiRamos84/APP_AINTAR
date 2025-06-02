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

// Componentes das tabs
import paymentService from '../../../../features/Payment/services/paymentService';
import paymentIntegration from '../../../../features/Payment/utils/paymentIntegration';
import PaymentDialog from '../../../../features/Payment/modals/PaymentDialog';
import AttachmentsTab from './tabs/AttachmentsTab';
import DetailsTab from './tabs/DetailsTab';
import HistoryTab from './tabs/HistoryTab';
import ParametersTab from './tabs/ParametersTab';
import PaymentsTab from './tabs/PaymentsTab ';
import DocumentPreview from './DocumentPreview';

// Contextos e hooks
import HistoryIcon from '@mui/icons-material/History';
import { useDocumentsContext } from '../../../ModernDocuments/context/DocumentsContext';
import { useDocumentActions } from '../../context/DocumentActionsContext';
import { useAuth } from '../../../../contexts/AuthContext';

// Serviços
import {
    getDocumentAnnex,
    getDocumentById,
    getDocumentStep
} from '../../../../services/documentService';
import { generatePDF } from "../../../../components/Documents/DocumentPDF";

// Componente TabPanel
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
    const { user } = useAuth();
    const { handleViewOriginDetails, showNotification } = useDocumentActions();
    const { showNotification: showGlobalNotification } = useDocumentsContext();

    // Estados principais
    const [tabValue, setTabValue] = useState(0);
    const [steps, setSteps] = useState([]);
    const [annexes, setAnnexes] = useState([]);
    const [loadingSteps, setLoadingSteps] = useState(false);
    const [loadingAnnexes, setLoadingAnnexes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [invoiceAmount, setInvoiceAmount] = useState(null);

    // Estados do preview e pagamento
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState({ url: '', type: '', name: '' });
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const isPaid = ['SUCCESS', 'PAID'].includes(invoiceAmount?.invoice_data?.payment_status);

    // Carregamento inicial dos dados
    useEffect(() => {
        const fetchDocumentDetails = async () => {
            if (open && document) {
                await Promise.all([
                    fetchSteps(),
                    fetchAnnexes(),
                    fetchInvoiceAmount()
                ]);
            }
        };
        fetchDocumentDetails();
    }, [open, document]);

    // Sistema de eventos para actualização de documentos
    useEffect(() => {
        const handleDocumentUpdate = (event) => {
            if (event.detail && event.detail.documentId === document?.pk) {
                refreshData();
            }
        };

        window.addEventListener('document-updated', handleDocumentUpdate);
        return () => {
            window.removeEventListener('document-updated', handleDocumentUpdate);
        };
    }, [document?.pk]);

    // Ajuste automático de tabs quando muda o estado do pagamento
    useEffect(() => {
        const hasPaymentTab = invoiceAmount &&
            invoiceAmount.invoice_data &&
            invoiceAmount.invoice_data.payment_status &&
            invoiceAmount.invoice_data.payment_method &&
            canManagePayments();

        const maxTabIndex = hasPaymentTab ? 4 : 3;
        if (tabValue > maxTabIndex) {
            setTabValue(0);
        }
    }, [invoiceAmount, tabValue]);

    // Reset do estado quando o documento muda
    useEffect(() => {
        if (document && open) {
            setTabValue(0);
            setSteps([]);
            setAnnexes([]);
            fetchSteps();
            fetchAnnexes();
        }
    }, [document?.pk]);

    // Funções de busca de dados
    const fetchSteps = async () => {
        setLoadingSteps(true);
        try {
            if (document && document.pk) {
                const response = await getDocumentStep(document.pk);
                setSteps(Array.isArray(response) ? response : []);
            } else {
                setSteps([]);
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            setSteps([]);
        } finally {
            setLoadingSteps(false);
        }
    };

    const fetchAnnexes = async () => {
        setLoadingAnnexes(true);
        try {
            if (document && document.pk) {
                const response = await getDocumentAnnex(document.pk);
                setAnnexes(Array.isArray(response) ? response : []);
            } else {
                setAnnexes([]);
            }
        } catch (error) {
            console.error('Erro ao buscar anexos:', error);
            setAnnexes([]);
        } finally {
            setLoadingAnnexes(false);
        }
    };

    const fetchInvoiceAmount = async () => {
        if (!document?.pk) return;

        try {
            const result = await paymentService.getInvoiceAmount(document.pk);
            setInvoiceAmount(result.success ? result : null);
        } catch (error) {
            console.error('Erro fatura:', error);
            setInvoiceAmount(null);
        }
    };

    const refreshData = async () => {
        await Promise.all([
            fetchSteps(),
            fetchAnnexes()
        ]);
        showGlobalNotification('Dados actualizados com sucesso', 'success');
    };

    // Verificação de permissões
    const canManagePayments = () => {
        if (!user) return false;

        // Perfil 1 tem sempre permissão
        if (user.profil === "1" || user.profil === 1) return true;

        // Criador do documento tem permissão
        if (document?.creator === user.username) return true;

        return false;
    };

    const getPaymentState = () => {
        if (!invoiceAmount?.invoice_data || !canManagePayments()) {
            return 'hidden';
        }

        const { payment_status, invoice } = invoiceAmount.invoice_data;

        if (['SUCCESS', 'PAID'].includes(payment_status)) {
            return 'paid';
        }

        if (invoice && !payment_status) {
            return 'pending';
        }

        return 'hidden';
    };

    // Funções auxiliares
    const getFilePath = (regnumber, filename) => {
        const baseUrl = process.env.REACT_APP_API_BASE_URL || window.REACT_APP_API_BASE_URL;
        if (!baseUrl) {
            console.error("API_BASE_URL não está definido no ambiente");
            return "";
        }
        return `${baseUrl}/files/${regnumber}/${filename}`;
    };

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

    const getStatusName = () => {
        if (!metaData?.what || document?.what === undefined) return 'Desconhecido';
        const status = metaData.what.find(s => s.pk === document.what);
        return status ? status.step : 'Desconhecido';
    };

    // Handlers
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleAddStepClick = () => {
        if (onAddStep) {
            onAddStep(document);
        }
    };

    const handleAddAnnexClick = () => {
        if (onAddAnnex) {
            onAddAnnex(document);
        }
    };

    const handleReplicateClick = () => {
        if (onReplicate) {
            onReplicate(document);
        }
    };

    const handleOpenPreview = (annex) => {
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
            const result = await paymentService.getInvoiceAmount(doc.pk);
            if (!result.success) throw new Error(result.error);

            setPaymentData({
                documentId: doc.pk,
                amount: result.invoice_data.invoice
            });
            setPaymentDialogOpen(true);
        } catch (error) {
            showGlobalNotification('Erro ao iniciar pagamento', 'error');
        }
    };

    const handleViewOriginDocument = async (originId) => {
        if (!originId) return;

        try {
            setLoading(true);
            showGlobalNotification('A carregar documento de origem...', 'info');
            const response = await getDocumentById(originId);

            if (response?.document) {
                if (!response.document.pk || !response.document.regnumber) {
                    showGlobalNotification('Dados do documento de origem inválidos', 'error');
                    return;
                }

                handleViewOriginDetails(response.document);
                showGlobalNotification('Documento de origem carregado', 'success');
            } else {
                showGlobalNotification('Documento de origem não encontrado', 'error');
            }
        } catch (error) {
            console.error('Erro ao buscar documento de origem:', error);
            showGlobalNotification('Erro ao buscar documento de origem', 'error');
        } finally {
            setLoading(false);
        }
    };

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
                throw new Error("Erro ao baixar o ficheiro");
            })
            .then((blob) => {
                const fileUrl = window.URL.createObjectURL(blob);
                const link = window.document.createElement("a");
                link.href = fileUrl;
                link.download = annex.filename;
                link.click();

                setTimeout(() => {
                    window.URL.revokeObjectURL(fileUrl);
                }, 100);
            })
            .catch((error) => {
                console.error("Erro ao baixar o ficheiro:", error);
                alert("Erro ao baixar o ficheiro. Por favor, tente novamente.");
            });
    };

    const handleDownloadPreview = () => {
        if (!previewFile) return;

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
                throw new Error("Erro ao baixar o ficheiro");
            })
            .then((blob) => {
                const fileUrl = window.URL.createObjectURL(blob);
                const link = window.document.createElement("a");
                link.href = fileUrl;
                link.download = previewFile.name;
                link.click();

                setTimeout(() => {
                    window.URL.revokeObjectURL(fileUrl);
                }, 100);
            })
            .catch((error) => {
                console.error("Erro ao baixar o ficheiro:", error);
                alert("Erro ao baixar o ficheiro. Por favor, tente novamente.");
            });
    };

    const handleDownloadComprovativoLocal = async (document) => {
        try {
            showGlobalNotification('A gerar comprovativo...', 'info');
            await generatePDF(document, steps, annexes, metaData);
            showGlobalNotification('Comprovativo gerado com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao gerar comprovativo:', error);
            showGlobalNotification('Erro ao gerar comprovativo', 'error');
        }
    };

    // Renderização das tabs
    const renderTabs = () => {
        const hasPaymentTab = invoiceAmount &&
            invoiceAmount.invoice_data &&
            invoiceAmount.invoice_data.payment_status &&
            invoiceAmount.invoice_data.payment_method &&
            canManagePayments();

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
                <Tab icon={<DocumentIcon fontSize="small" />} label="Informações" iconPosition="start" />
                <Tab icon={<TimelineIcon fontSize="small" />} label="Histórico" iconPosition="start" />
                <Tab icon={<AttachmentIcon fontSize="small" />} label={`Anexos ${annexes.length > 0 ? `(${annexes.length})` : ''}`} iconPosition="start" />
                <Tab icon={<SettingsIcon fontSize="small" />} label="Parâmetros" iconPosition="start" />
                {hasPaymentTab && (
                    <Tab icon={<PaymentIcon fontSize="small" />} label="Pagamentos" iconPosition="start" />
                )}
            </Tabs>
        );
    };

    // Renderização das acções
    const renderActions = () => {
        const actions = [];
        const isCompleteDocument = document?.pk && document?.regnumber;
        const isOriginData = document.origin_data === true;

        if (!isOriginData && isCompleteDocument) {
            const tabType = props.tabType || 'all';

            // Botões específicos da tab "Para tratamento"
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

            // Gestão de pagamentos
            if (canManagePayments() && invoiceAmount?.invoice_data) {
                const { payment_status, invoice } = invoiceAmount.invoice_data;

                if (['SUCCESS', 'PAID'].includes(payment_status)) {
                    actions.push(
                        <Chip
                            key="payment-done"
                            icon={<CheckCircleIcon />}
                            label="Pagamento efectuado"
                            color="success"
                            variant="outlined"
                            sx={{ mr: 1, height: 36 }}
                        />
                    );
                } else if (invoice && !payment_status) {
                    actions.push(
                        <Button
                            key="payment"
                            variant="contained"
                            color="success"
                            startIcon={<PaymentIcon />}
                            onClick={() => handlePaymentClick(document)}
                            sx={{ mr: 1 }}
                        >
                            Pagar {invoice}€
                        </Button>
                    );
                }
            }

            // Botão de comprovativo
            if ((tabType === 'created' || user?.profil === "1" || user?.profil === 1) && onDownloadComprovativo) {
                actions.push(
                    <Button
                        key="download"
                        variant="contained"
                        color="primary"
                        startIcon={<CloudDownloadIcon />}
                        onClick={() => handleDownloadComprovativoLocal(document)}
                    >
                        Obter Detalhes
                    </Button>
                );
            }
        }

        return actions;
    };

    if (!document) {
        return null;
    }

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
                        ml: isOriginDocument ? { xs: 1, sm: 3, md: 6 } : 0,
                        mt: isOriginDocument ? { xs: 1, sm: 2, md: 4 } : 0,
                        border: isOriginDocument ? `2px solid ${theme.palette.primary.main}` : 'none',
                        ...style
                    }
                }}
            >
                <DialogTitle id="document-details-title" sx={{ pb: 1, position: 'relative' }}>
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
                    <TabPanel value={tabValue} index={0}>
                        <DetailsTab
                            document={document}
                            metaData={metaData}
                            onClose={onClose}
                            onUpdateDocument={props.onUpdateDocument}
                            onViewOriginDocument={handleViewOriginDocument}
                        />
                    </TabPanel>

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

                    {invoiceAmount && invoiceAmount.invoice_data && invoiceAmount.invoice_data.payment_status && canManagePayments() && (
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
                                    canManagePayments={canManagePayments()}
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
                        if (success) {
                            showGlobalNotification('Pagamento processado!', 'success');
                            refreshData();
                        }
                    }}
                    documentId={paymentData?.documentId}
                    amount={paymentData?.amount}
            />
            )}
        </>
    );
};

export default DocumentModal;