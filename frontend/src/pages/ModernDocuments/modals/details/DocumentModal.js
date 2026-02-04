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
    CheckCircle as CheckCircleIcon,
    Mail as MailIcon
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
import React, { useEffect, useState, useCallback, useMemo } from 'react';

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
import { useDocumentsContext } from '../../context/DocumentsContext';
import { useDocumentActions } from '../../context/DocumentActionsContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { notifySuccess, notifyError, notifyWarning, notifyInfo } from "../../../../components/common/Toaster/ThemedToaster.js";

// Serviços
import {
    getDocumentAnnex,
    getDocumentById,
    getDocumentStep,
    previewFile
} from '../../../../services/documentService';
import { generatePDF } from "../../../../components/Documents/DocumentPDF";
import { useDocumentEvents, DocumentEventManager, DOCUMENT_EVENTS } from '../../utils/documentEventSystem';

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
    document: initialDocument,
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
    const { handleViewOriginDetails } = useDocumentActions();
    const { } = useDocumentsContext();

    // Estado do documento - pode ser actualizado
    const [document, setDocument] = useState(initialDocument);
    const [tabValue, setTabValue] = useState(0);
    const [steps, setSteps] = useState([]);
    const [annexes, setAnnexes] = useState([]);
    const [loadingSteps, setLoadingSteps] = useState(false);
    const [loadingAnnexes, setLoadingAnnexes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [invoiceAmount, setInvoiceAmount] = useState(null);
    const { updateDocumentAfterStep } = useDocumentsContext();

    // Estados do preview e pagamento
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFileData, setPreviewFileData] = useState({ url: '', type: '', name: '' });
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const isPaid = ['SUCCESS', 'PAID'].includes(invoiceAmount?.invoice_data?.payment_status);

    // Estado para controlar se o documento foi transferido (evitar múltiplos refreshes)
    const [documentTransferred, setDocumentTransferred] = useState(false);

    // Verificar permissões dinâmicas
    const canManageDocument = useMemo(() => {
        if (!document || !user) return false;

        //Admin
        if (user.profil === "0" || user.profil === 0) return true;

        // AINTAR sempre pode
        if (user.profil === "1") return true;

        // Criador sempre pode
        if (document.creator === user.username) return true;

        // Pessoa atribuída pode (se documento não estiver concluído)
        const isAssigned = document.who_pk === user.pk;
        const isNotCompleted = !['CONCLUIDO', 'CONCLUÍDO'].includes(
            metaData?.what?.find(s => s.pk === document.what)?.step?.toUpperCase()
        );

        return isAssigned && isNotCompleted;
    }, [document, user, metaData]);


    // Função para refrescar dados do documento com melhor error handling
    const refreshDocument = useCallback(async () => {
        if (!document?.pk) return;

        // Se documento foi transferido, não tentar refrescar
        if (documentTransferred) {
            console.log('🚫 Não refrescando documento - já foi transferido');
            return null;
        }

        try {
            const response = await getDocumentById(document.pk);
            if (response?.document) {
                setDocument(response.document);
                return response.document;
            }
        } catch (error) {
            console.error('Erro ao actualizar documento:', error);

            // Se for erro 404, documento foi removido
            if (error.response?.status === 404) {
                console.warn(`Documento ${document.pk} não encontrado - fechando modal`);
                setDocumentTransferred(true); // Marcar como transferido para evitar futuros refreshes

                // Mostrar notificação e fechar modal
                notifyWarning('Documento não encontrado - removido da lista');
                setTimeout(() => onClose?.(), 500);

                return null;
            }

            // Para outros erros, apenas log sem fechar o modal
            if (error.response?.status >= 500) {
                notifyError('Erro do servidor ao atualizar documento');
            } else if (error.response?.status === 403) {
                notifyWarning('Sem permissão para aceder a este documento');
            }
        }
    }, [document?.pk, documentTransferred, onClose]);

    // Actualizar documento inicial quando props mudam
    useEffect(() => {
        setDocument(initialDocument);
        // Reset do estado de transferência quando modal abrir com novo documento
        setDocumentTransferred(false);
    }, [initialDocument]);

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
    }, [open, document?.pk]);

    // Sistema de eventos para actualização de documentos (com proteção contra múltiplos refreshes)
    useEffect(() => {
        const handleDocumentUpdate = async (event) => {
            if (event.detail && event.detail.documentId === document?.pk) {
                // Se documento já foi marcado como transferido, ignorar todos os updates
                if (documentTransferred) {
                    console.log('🚫 Ignorando document-updated - documento já foi transferido');
                    return;
                }

                // Se o documento foi transferido neste evento, não tentar refrescar
                if (event.detail.transferredDocument) {
                    console.log('✅ Documento transferido - fechando modal sem tentar refrescar');
                    setDocumentTransferred(true); // Marcar como transferido
                    notifySuccess('Documento transferido com sucesso!');
                    setTimeout(() => onClose?.(), 1500);
                    return;
                }

                // Para outros tipos de update, tentar atualizar documento apenas se não foi transferido
                if (!documentTransferred) {
                    const updatedDoc = await refreshDocument();
                    if (updatedDoc) {
                        await refreshData();
                    }
                }
            }
        };

        const handleDocumentTransferred = (event) => {
            if (event.detail && event.detail.documentId === document?.pk && !documentTransferred) {
                // console.log('📤 Documento transferido - fechando modal automaticamente');
                setDocumentTransferred(true); // Marcar como transferido para evitar futuros refreshes
                notifySuccess(event.detail.message || 'Documento transferido!');
                setTimeout(() => onClose?.(), 1500);
            }
        };

        window.addEventListener('document-updated', handleDocumentUpdate);
        window.addEventListener('document-transferred', handleDocumentTransferred);

        return () => {
            window.removeEventListener('document-updated', handleDocumentUpdate);
            window.removeEventListener('document-transferred', handleDocumentTransferred);
        };
    }, [document?.pk, documentTransferred, onClose]);

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

    // Polling durante pagamento
    // useEffect(() => {
    //     let pollInterval;

    //     if (paymentDialogOpen) {
    //         pollInterval = setInterval(() => {
    //             fetchInvoiceAmount();
    //         }, 3000);
    //     }

    //     return () => {
    //         if (pollInterval) clearInterval(pollInterval);
    //     };
    // }, [paymentDialogOpen]);

    // Funções de busca de dados
    const fetchSteps = useCallback(async () => {
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
    }, [document?.pk]);

    const fetchAnnexes = useCallback(async () => {
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
    }, [document?.pk]);

    // DocumentModal.js - substituir o hook por isto:

    useEffect(() => {
        if (!document?.pk) return;

        const handleEvent = async (event) => {
            if (event.detail.documentId !== document.pk) return;

            // console.log('📄 Evento recebido:', event.detail);

            switch (event.detail.type) {
                case 'step-added':
                    await fetchSteps();
                    setTabValue(1);
                    break;

                case 'annex-added':
                    await fetchAnnexes();
                    setTabValue(2);
                    break;
            }
        };

        // Escutar todos os eventos
        Object.values(DOCUMENT_EVENTS).forEach(eventType => {
            window.addEventListener(eventType, handleEvent);
        });

        return () => {
            Object.values(DOCUMENT_EVENTS).forEach(eventType => {
                window.removeEventListener(eventType, handleEvent);
            });
        };
    }, [document?.pk]); // Só depende do ID do documento

    // Sistema de actualização reactiva
    useDocumentEvents(document?.pk, useCallback(async (eventDetail) => {
        // console.log('📄 Evento recebido:', eventDetail);

        switch (eventDetail.type) {
            case 'step-added':
                // ACTUALIZAR O DOCUMENTO IMEDIATAMENTE
                await refreshDocument();
                await fetchSteps();
                setTabValue(1);
                break;

            case 'annex-added':
                await fetchAnnexes();
                setTabValue(2);
                break;
        }
    }, [refreshDocument, fetchSteps, fetchAnnexes]));

    const fetchInvoiceAmount = async () => {
        if (!document?.pk) return;

        try {
            const result = await paymentService.getInvoiceAmount(document.pk);
            const newInvoiceAmount = result.success ? result : null;

            // Comparar com estado anterior para forçar re-render
            setInvoiceAmount(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(newInvoiceAmount)) {
                    // console.log('💰 Invoice actualizada:', newInvoiceAmount);
                    return newInvoiceAmount;
                }
                return prev;
            });
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
        notifySuccess('Dados actualizados com sucesso');
    };

    // Verificação de permissões
    const canManagePayments = () => {
        if (!user) return false;

        // Admin sempre pode
        if (user.profil === "0" || user.profil === 0) return true;

        // Perfil 1 tem sempre permissão
        if (user.profil === "1" || user.profil === 1) return true;

        if (user.profil === "2" || user.profil === 2) return true;

        // Se o documento não tiver dados de fatura, não pode gerir pagamentos
        if (!invoiceAmount?.invoice_data) return false;

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

    // Handlers actualizados que emitem eventos
    const handleAddStepSuccess = useCallback(() => {
        DocumentEventManager.emit(DOCUMENT_EVENTS.STEP_ADDED, document.pk, {
            type: 'step-added'
        });
    }, [document?.pk]);

    const handleAddAnnexSuccess = useCallback(() => {
        DocumentEventManager.emit(DOCUMENT_EVENTS.ANNEX_ADDED, document.pk, {
            type: 'annex-added'
        });
    }, [document?.pk]);

    // Handlers
    const handleTabChange = (event, newValue) => {
        if (newValue === 4) { // Tab pagamentos
            fetchInvoiceAmount();
        }
        setTabValue(newValue);
    };

    const handleAddStepClick = () => {
        if (onAddStep) {
            onAddStep(document, handleAddStepSuccess);
        }
    };

    const handleAddAnnexClick = () => {
        if (onAddAnnex) {
            onAddAnnex(document, handleAddAnnexSuccess);
        }
    };

    const handleReplicateClick = () => {
        if (onReplicate) {
            onReplicate(document);
        }
    };

    const handleCreateEmissionClick = () => {
        // console.log('═══════════════════════════════════════════════');
        // console.log('🚀 [DocumentModal] CRIAR EMISSÃO - Dados do Documento:');
        // console.log('═══════════════════════════════════════════════');
        // console.log('📄 Documento completo:', document);
        // console.log('');
        // console.log('🔑 Campos principais:');
        // console.log('  - pk:', document?.pk);
        // console.log('  - regnumber:', document?.regnumber);
        // console.log('  - tt_type:', document?.tt_type);
        // console.log('');
        // console.log('👤 Dados de entidade:');
        // console.log('  - entity_name:', document?.entity_name);
        // console.log('  - name:', document?.name);
        // console.log('  - ts_entity:', document?.ts_entity);
        // console.log('  - ts_associate:', document?.ts_associate);
        // console.log('');
        // console.log('📍 Moradas:');
        // console.log('  - address:', document?.address);
        // console.log('  - morada:', document?.morada);
        // console.log('  - postal:', document?.postal);
        // console.log('  - codigo_postal:', document?.codigo_postal);
        // console.log('  - nut3:', document?.nut3);
        // console.log('  - nut4:', document?.nut4);
        // console.log('  - localidade:', document?.localidade);
        // console.log('');
        // console.log('💼 NIF/NIPC:');
        // console.log('  - entity_nipc:', document?.entity_nipc);
        // console.log('  - nipc:', document?.nipc);
        // console.log('  - nif:', document?.nif);
        // console.log('');
        // console.log('📧 Contactos:');
        // console.log('  - entity_email:', document?.entity_email);
        // console.log('  - email:', document?.email);
        // console.log('');
        // console.log('📝 Outros:');
        // console.log('  - obs:', document?.obs);
        // console.log('  - memo:', document?.memo);
        // console.log('  - submission:', document?.submission);
        // console.log('  - door:', document?.door);
        // console.log('═══════════════════════════════════════════════');

        if (props.onCreateEmission) {
            props.onCreateEmission(document);
        }
    };

    const handleOpenPreview = async (annex) => {
        try {
            if (!document?.regnumber) {
                notifyError('Número do documento não disponível');
                return;
            }

            const fileData = await previewFile(document.regnumber, annex.filename);

            setPreviewFileData({
                url: fileData.url,
                type: fileData.type,
                name: annex.filename || annex.descr || 'Documento'
            });
            setPreviewOpen(true);

        } catch (error) {
            console.error('Erro preview:', error);
            notifyError('Erro ao visualizar ficheiro');
        }
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
            notifyError('Erro ao iniciar pagamento');
        }
    };

    const handleViewOriginDocument = async (originId) => {
        if (!originId) return;

        try {
            setLoading(true);
            notifyInfo('A carregar documento de origem...');
            const response = await getDocumentById(originId);

            if (response?.document) {
                if (!response.document.pk || !response.document.regnumber) {
                    notifyError('Dados do documento de origem inválidos');
                    return;
                }

                handleViewOriginDetails(response.document);
                notifySuccess('Documento de origem carregado');
            } else {
                notifyError('Documento de origem não encontrado');
            }
        } catch (error) {
            console.error('Erro ao buscar documento de origem:', error);
            notifyError('Erro ao buscar documento de origem');
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
        if (!previewFileData?.url) return;

        const link = window.document.createElement("a");
        link.href = previewFileData.url;
        link.download = previewFileData.name;
        link.click();
    };

    const handleDownloadComprovativoLocal = async (document) => {
        try {
            notifyInfo('A gerar comprovativo...');
            await generatePDF(document, steps, annexes, metaData);
            notifySuccess('Comprovativo gerado com sucesso');
        } catch (error) {
            console.error('Erro ao gerar comprovativo:', error);
            notifyError('Erro ao gerar comprovativo');
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

    // Renderização das acções condicionais
    const renderActions = () => {
        const actions = [];
        const isCompleteDocument = document?.pk && document?.regnumber;
        const isOriginData = document?.origin_data === true;

        if (!isOriginData && isCompleteDocument) {
            const tabType = props.tabType || 'all';

            // Só mostrar botões se o utilizador pode gerir o documento
            if (canManageDocument && tabType === 'assigned') {
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

                // Botão de criar emissão (sempre disponível)
                actions.push(
                    <Button
                        key="create-emission"
                        variant="outlined"
                        startIcon={<MailIcon />}
                        onClick={handleCreateEmissionClick}
                        sx={{
                            color: 'primary.main',
                            borderColor: 'primary.main',
                            '&:hover': {
                                backgroundColor: 'primary.main',
                                color: 'white'
                            }
                        }}
                    >
                        Emissão
                    </Button>
                );
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
                disableEnforceFocus={false}
                disableAutoFocus={false}
                disableRestoreFocus={false}
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
                            <Grid size={{ xs: 12, sm: 6 }}>
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
                            <Grid size={{ xs: 12, sm: 6 }}>
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
                            <HistoryTab
                                steps={steps}
                                loadingSteps={loadingSteps}
                                metaData={metaData}
                                document={document}
                            />
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
                                invoiceData={invoiceAmount?.invoice_data}
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
                    fileUrl={previewFileData.url}
                    fileType={previewFileData.type}
                    fileName={previewFileData.name}
                    onDownload={handleDownloadPreview}
                />
            )}

            {paymentDialogOpen && (
                <PaymentDialog
                    open={paymentDialogOpen}
                    onClose={(success, result) => {
                        setPaymentDialogOpen(false);
                        if (success) {
                            notifySuccess('Pagamento processado!');
                            // REFRESH COMPLETO DOS DADOS
                            fetchInvoiceAmount();
                            refreshData();

                            // Forçar re-render das tabs
                            setTabValue(4); // Tab pagamentos
                        }
                    }}
                    documentId={paymentData?.documentId}
                    amount={paymentData?.amount}
                    paymentStatus={invoiceAmount?.invoice_data?.payment_status}
                />
            )}
        </>
    );
};

export default DocumentModal;