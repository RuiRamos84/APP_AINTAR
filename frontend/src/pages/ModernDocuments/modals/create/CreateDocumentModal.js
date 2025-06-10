import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stepper, Step, StepLabel,
    IconButton, CircularProgress, Alert
} from '@mui/material';
import {
    Close as CloseIcon,
    NavigateNext as NextIcon,
    NavigateBefore as BackIcon,
    Send as SendIcon,
    Payment as PaymentIcon
} from '@mui/icons-material';

// Componentes de passos
import IdentificationStep from './steps/IdentificationStep';
import AddressStep from './steps/AddressStep';
import DetailsStep from './steps/DetailsStep';
import ParametersStep from './steps/ParametersStep';
import AttachmentsStep from './steps/AttachmentsStep';
import ConfirmationStep from './steps/ConfirmationStep';

// Modais relacionados a entidades
import EntityDetail from '../../../Entity/EntityDetail/EntityDetail';
import CreateEntity from '../../../Entity/CreateEntity/CreateEntity';

// Hooks personalizados
import { useDocumentForm } from './hooks/useDocumentForm';
import { useEntityData } from './hooks/useEntityData';
import { useDocumentParams } from './hooks/useDocumentParams';
import { useFileHandling } from './hooks/useFileHandling';
import { useMetaData } from '../../../../contexts/MetaDataContext';
import { useAuth } from '../../../../contexts/AuthContext';

// Serviços
import { createDocument } from '../../../../services/documentService';
import { notifySuccess, notifyError, notifyInfo } from '../../../../components/common/Toaster/ThemedToaster';
import paymentService from '../../../../features/Payment/services/paymentService';

// Provider para o módulo de pagamento
import { PaymentProvider } from '../../../../features/Payment/context/PaymentContext';
import PaymentModule from '../../../../features/Payment/components/PaymentModule';

/**
 * Modal de criação de documentos com formulário por passos
 */
const CreateDocumentModal = ({ open, onClose, initialNipc }) => {
    const { metaData } = useMetaData();
    const { user } = useAuth();

    // Estado para controlar o modo de pagamento
    const [paymentMode, setPaymentMode] = useState(false);
    const [createdDocumentInfo, setCreatedDocumentInfo] = useState(null);

    // Definição dos passos do stepper
    const steps = [
        { label: 'Identificação', description: 'Identificação fiscal e dados da entidade' },
        { label: 'Morada', description: 'Morada do pedido e de faturação' },
        { label: 'Detalhes', description: 'Tipo de pedido, associado e informações' },
        { label: 'Parâmetros', description: 'Parâmetros adicionais' },
        { label: 'Anexos', description: 'Adicione documentos relacionados ao pedido' },
        { label: 'Confirmação', description: 'Rever e confirmar os dados do pedido' },
        { label: 'Pagamento', description: 'Efetuar pagamento do pedido' }
    ];

    // Estados para diálogos
    const [confirmClose, setConfirmClose] = useState(false);

    // Inicialização dos hooks personalizados
    const documentForm = useDocumentForm(initialNipc, handleCloseAfterSuccess);
    const {
        formData, setFormData, activeStep, setActiveStep, errors, setErrors,
        loading, setLoading, isInternal, isInterProfile, handleChange, handleInternalSwitch,
        validateCurrentStep, resetForm
    } = documentForm;

    // Usando o hook useEntityData
    const entityDataHook = useEntityData(formData, setFormData);
    const {
        entityData, representativeData, isRepresentative, isDifferentAddress,
        billingAddress, setBillingAddress, shippingAddress, setShippingAddress,
        createEntityModalOpen, setCreateEntityModalOpen, newEntityNipc,
        isUpdateNeeded, setIsUpdateNeeded, entityToUpdate, entityDetailOpen, setEntityDetailOpen,
        entityCountTypes, previousDocuments, lastDocument, checkEntityData,
        handleRepresentativeToggle, handleDifferentAddressToggle, handleEntityUpdate,
        handleCreateEntitySuccess
    } = entityDataHook;

    const documentParams = useDocumentParams(formData, entityData, metaData);
    const {
        docTypeParams, paramValues, selectedCountType,
        selectedTypeText, handleParamChange
    } = documentParams;

    const fileHandling = useFileHandling(formData, setFormData);
    const {
        paymentMethod, setPaymentMethod, paymentInfo, setPaymentInfo,
        onAddFiles, onRemoveFile, onUpdateDescription,
        handlePaymentMethodChange, handlePaymentChange, handlePaymentProofUpload
    } = fileHandling;

    // Reset ao abrir modal
    useEffect(() => {
        if (open) {
            resetForm();
            setPaymentMode(false);
            setCreatedDocumentInfo(null);

            if (initialNipc) {
                setFormData(prev => ({ ...prev, nipc: initialNipc }));
                checkEntityData(initialNipc);
            }
        }
    }, [open, initialNipc]);

    // Função para validar o passo atual
    const validateStep = () => {
        const newErrors = validateCurrentStep(
            activeStep, formData, billingAddress, shippingAddress,
            isDifferentAddress, paymentMethod, paymentInfo, docTypeParams, paramValues
        );

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        // Sincronizar endereços quando entityData muda
        if (entityData && entityData.pk) {
            const addressData = {
                postal: entityData.postal || "",
                address: entityData.address || "",
                door: entityData.door || "",
                floor: entityData.floor || "",
                nut1: entityData.nut1 || "",
                nut2: entityData.nut2 || "",
                nut3: entityData.nut3 || "",
                nut4: entityData.nut4 || "",
            };

            setBillingAddress(addressData);

            if (!isDifferentAddress) {
                setShippingAddress({ ...addressData });
            }
        }
    }, [entityData]);

    // Navegar para o próximo passo
    const handleNext = () => {
        if (validateStep()) {
            setActiveStep(prev => prev + 1);
            // Scroll para o topo da modal
            const modalContent = document.querySelector('.MuiDialogContent-root');
            if (modalContent) {
                modalContent.scrollTop = 0;
            }
        } else {
            notifyError("Por favor, corrija os erros antes de continuar.");
        }
    };

    // Voltar ao passo anterior
    const handleBack = () => {
        if (paymentMode) {
            // Se estiver no modo pagamento, voltar à visão normal
            setPaymentMode(false);
            return;
        }

        setActiveStep(prev => prev - 1);
        // Scroll para o topo da modal
        const modalContent = document.querySelector('.MuiDialogContent-root');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    };

    // Função para preparar dados do formulário para envio
    function prepareFormData() {
        const submitFormData = new FormData();

        // Adicionar dados básicos do documento
        Object.entries(formData).forEach(([key, value]) => {
            if (key !== "files") {
                submitFormData.append(key, value);
            }
        });

        // Adicionar flag para endereço diferente
        submitFormData.append("isDifferentAddress", isDifferentAddress);

        // Adicionar dados de endereço de faturação
        Object.entries(billingAddress).forEach(([key, value]) => {
            // Adicionar sem prefixo para compatibilidade com o backend
            submitFormData.append(key, value);
            // Manter com prefixo para retrocompatibilidade
            submitFormData.append(`billing_${key}`, value);
        });

        // Adicionar dados de endereço de entrega se for diferente
        if (isDifferentAddress) {
            Object.entries(shippingAddress).forEach(([key, value]) => {
                submitFormData.append(`shipping_${key}`, value);
            });
        }

        // Adicionar parâmetros do tipo de documento
        Object.entries(paramValues).forEach(([key, value]) => {
            submitFormData.append(key, value || '');
        });

        // Adicionar arquivos e suas descrições
        formData.files.forEach((fileObj, index) => {
            submitFormData.append("files", fileObj.file);
            submitFormData.append(`descr${index}`, fileObj.description || "");
        });

        // Adicionar dados da entidade, se encontrada
        if (entityData) {
            submitFormData.append("ts_entity", entityData.pk);
        }

        // Adicionar dados do representante, se aplicável
        if (representativeData && isRepresentative) {
            submitFormData.append("tb_representative", representativeData.pk);
        }

        // Adicionar flag indicando que o documento está pendente de pagamento
        submitFormData.append('payment_status', 'PENDING');

        return submitFormData;
    }

    // Função para verificar se o pedido precisa de pagamento e obter os detalhes
    const checkInvoiceDetails = async (documentId) => {
        try {
            // Usar o serviço de pagamento para verificar a fatura
            const invoiceResult = await paymentService.getInvoiceAmount(documentId);
            console.log("Resultado da verificação de fatura:", invoiceResult);

            // Verificar se tem valor e formato esperado
            if (invoiceResult.success &&
                invoiceResult.invoice_data &&
                invoiceResult.invoice_data.invoice &&
                invoiceResult.invoice_data.invoice > 0) {

                return {
                    hasPayment: true,
                    amount: invoiceResult.invoice_data.invoice,
                    data: invoiceResult.invoice_data
                };
            }

            return { hasPayment: false };
        } catch (error) {
            console.error("Erro ao verificar detalhes da fatura:", error);
            return { hasPayment: false, error };
        }
    };

    // Submeter formulário
    const handleSubmit = async () => {
        if (!validateStep()) {
            notifyError("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        setLoading(true);

        try {
            const submitFormData = prepareFormData();
            const response = await createDocument(submitFormData);
            console.log("Resposta da criação do documento:", response);

            if (response && response.regnumber) {
                notifySuccess(`Pedido com o número: ${response.regnumber}, criado com sucesso!`);

                // Extrair informações importantes
                let documentId = response.pk || response.id || response.tb_document || response.order_id;
                const regnumber = response.regnumber;

                console.log("Documento criado - ID:", documentId, "Regnumber:", regnumber);

                // Se não temos ID, mas temos o número do documento, podemos usar a API que usa regnumber
                if (!documentId && regnumber) {
                    try {
                        // No Payments API, muitas vezes é possível usar o regnumber diretamente
                        const invoiceResult = await paymentService.getInvoiceByRegnumber(regnumber);
                        console.log("Resultado da verificação de fatura por regnumber:", invoiceResult);

                        if (invoiceResult.success &&
                            invoiceResult.invoice_data &&
                            invoiceResult.invoice_data.invoice &&
                            invoiceResult.invoice_data.invoice > 0) {

                            // Guardar informações do documento criado, usando order_id como ID se disponível
                            documentId = invoiceResult.invoice_data.order_id || response.order_id || regnumber;

                            setCreatedDocumentInfo({
                                pk: documentId,
                                regnumber: regnumber,
                                amount: invoiceResult.invoice_data.invoice,
                                entity: entityData?.name || "Cliente",
                                invoice: invoiceResult.invoice_data
                            });

                            // Ativar modo de pagamento
                            setPaymentMode(true);
                            setActiveStep(6); // Ir para o último passo (pagamento)
                            return;
                        }
                    } catch (invoiceError) {
                        console.error("Erro ao verificar fatura por regnumber:", invoiceError);
                    }
                }

                // Se temos ID, verificamos normalmente
                if (documentId) {
                    try {
                        // Usar o paymentService como é feito no DocumentModal
                        const invoiceResult = await paymentService.getInvoiceAmount(documentId);
                        console.log("Resultado da verificação de fatura por ID:", invoiceResult);

                        if (invoiceResult.success &&
                            invoiceResult.invoice_data &&
                            invoiceResult.invoice_data.invoice &&
                            invoiceResult.invoice_data.invoice > 0) {

                            // Guardar informações do documento criado
                            setCreatedDocumentInfo({
                                pk: documentId,
                                regnumber: regnumber,
                                amount: invoiceResult.invoice_data.invoice,
                                entity: entityData?.name || "Cliente",
                                invoice: invoiceResult.invoice_data
                            });

                            // Ativar modo de pagamento
                            setPaymentMode(true);
                            setActiveStep(6); // Ir para o último passo (pagamento)
                            return;
                        }
                    } catch (invoiceError) {
                        console.error("Erro ao verificar fatura por ID:", invoiceError);
                    }
                }

                // Se não tiver ID ou não conseguir verificar pagamento, tente uma última abordagem
                try {
                    // Verificar diretamente pela API de pagamentos usando o order_id da resposta
                    if (response.order_id) {
                        const invoiceResult = await paymentService.getInvoiceAmount(response.order_id);
                        console.log("Resultado da verificação de fatura por order_id:", invoiceResult);

                        if (invoiceResult.success &&
                            invoiceResult.invoice_data &&
                            invoiceResult.invoice_data.invoice &&
                            invoiceResult.invoice_data.invoice > 0) {

                            // Guardar informações do documento criado
                            setCreatedDocumentInfo({
                                pk: response.order_id,
                                regnumber: regnumber,
                                amount: invoiceResult.invoice_data.invoice,
                                entity: entityData?.name || "Cliente",
                                invoice: invoiceResult.invoice_data
                            });

                            // Ativar modo de pagamento
                            setPaymentMode(true);
                            setActiveStep(6); // Ir para o último passo (pagamento)
                            return;
                        }
                    }
                } catch (finalError) {
                    console.error("Erro na tentativa final de verificação:", finalError);
                }

                // Se chegou aqui, não precisa de pagamento ou não conseguimos verificar
                // Fecha o modal normalmente
                resetForm();
                onClose(true, regnumber, false);
            } else {
                throw new Error(response.error || "Erro desconhecido");
            }
        } catch (error) {
            console.error("Erro ao criar pedido:", error);
            notifyError("Erro ao criar pedido: " + (error.message || "Erro desconhecido"));
        } finally {
            setLoading(false);
        }
    };

    // Fechar o modal após sucesso
    function handleCloseAfterSuccess(success, regnumber, redirectToPayment = false) {
        onClose(success, regnumber, redirectToPayment);
    }

    // Handler para quando o pagamento é concluído
    const handlePaymentComplete = (paymentResult) => {
        console.log("Pagamento concluído:", paymentResult);
        notifySuccess(`Pagamento processado com sucesso!`);

        // Fechar o modal e indicar sucesso total
        resetForm();
        onClose(true, createdDocumentInfo.regnumber, false);
    };

    // Handler para fechar o modal
    const handleCloseRequest = () => {
        // Se estiver no modo pagamento, confirmar se realmente quer sair
        if (paymentMode) {
            setConfirmClose(true);
            return;
        }

        // Verificar se há dados para confirmar fechamento
        const hasData = formData.nipc ||
            formData.tt_type ||
            formData.ts_associate ||
            formData.memo ||
            formData.files.length > 0 ||
            entityData ||
            Object.values(billingAddress).some(value => value);

        if (hasData) {
            setConfirmClose(true);
        } else {
            resetForm();
            onClose(false);
        }
    };

    // Confirmar fechamento do modal
    const handleConfirmClose = () => {
        resetForm();
        setConfirmClose(false);
        onClose(false);
    };

    // Opção para pagar mais tarde
    const handlePayLater = () => {
        notifySuccess("Pode efetuar o pagamento mais tarde no detalhe do documento.");
        onClose(true, createdDocumentInfo.regnumber, false);
    };

    // Renderizar o conteúdo atual do passo
    const renderStepContent = () => {
        // Se estiver em modo de pagamento, mostrar o módulo de pagamento
        if (paymentMode && createdDocumentInfo) {
            return (
                <Box sx={{ py: 2 }}>
                    <Alert
                        severity="info"
                        sx={{ mb: 3 }}
                        icon={<PaymentIcon />}
                    >
                        Pedido <strong>#{createdDocumentInfo.regnumber}</strong> criado com sucesso.
                        Finalize o processo realizando o pagamento ou clique em "Pagar mais tarde" para concluir depois.
                    </Alert>

                    <PaymentProvider>
                        <PaymentModule
                            orderId={createdDocumentInfo.regnumber}
                            amount={createdDocumentInfo.amount}
                            onComplete={handlePaymentComplete}
                            onCancel={() => {/* Opcionalmente tratar cancelamento */ }}
                            userInfo={user ? { ...user } : null}
                        />
                    </PaymentProvider>
                </Box>
            );
        }

        // Renderização normal dos passos
        switch (activeStep) {
            case 0: // Identificação
                return (
                    <IdentificationStep
                        formData={formData}
                        handleChange={handleChange}
                        errors={errors}
                        entityData={entityData}
                        representativeData={representativeData}
                        setEntityData={entityDataHook.setEntityData}
                        setRepresentativeData={entityDataHook.setRepresentativeData}
                        isRepresentative={isRepresentative}
                        handleRepresentativeToggle={handleRepresentativeToggle}
                        isInternal={isInternal}
                        handleInternalSwitch={handleInternalSwitch}
                        isInterProfile={isInterProfile}
                    />
                );

            case 1: // Morada
                return (
                    <AddressStep
                        billingAddress={billingAddress}
                        setBillingAddress={setBillingAddress}
                        shippingAddress={shippingAddress}
                        setShippingAddress={setShippingAddress}
                        errors={errors}
                        isDifferentAddress={isDifferentAddress}
                        handleDifferentAddressToggle={handleDifferentAddressToggle}
                        isEntityFound={entityData !== null}
                        isInternal={isInternal}
                    />
                );

            case 2: // Detalhes
                return (
                    <DetailsStep
                        formData={formData}
                        handleChange={handleChange}
                        errors={errors}
                        metaData={metaData}
                        isInternal={isInternal}
                        handleInternalSwitch={handleInternalSwitch}
                        isInterProfile={isInterProfile}
                        selectedCountType={selectedCountType}
                        selectedTypeText={selectedTypeText}
                        previousDocuments={previousDocuments}
                    />
                );

            case 3: // Parâmetros
                return (
                    <ParametersStep
                        docTypeParams={docTypeParams}
                        paramValues={paramValues}
                        handleParamChange={handleParamChange}
                        errors={errors}
                        metaData={metaData}
                        lastDocument={lastDocument}
                    />
                );

            case 4: // Anexos
                return (
                    <AttachmentsStep
                        formData={formData}
                        handleChange={handleChange}
                        files={formData.files}
                        onAddFiles={onAddFiles}
                        onRemoveFile={onRemoveFile}
                        onUpdateDescription={onUpdateDescription}
                        errors={errors}
                        loading={loading}
                    />
                );

            case 5: // Confirmação
                return (
                    <ConfirmationStep
                        formData={formData}
                        entityData={entityData}
                        representativeData={representativeData}
                        billingAddress={billingAddress}
                        shippingAddress={shippingAddress}
                        isDifferentAddress={isDifferentAddress}
                        docTypeParams={docTypeParams}
                        paramValues={paramValues}
                        metaData={metaData}
                        errors={errors}
                        handleSubmit={handleSubmit}
                        loading={loading}
                    />
                );

            default:
                return null;
        }
    };

    // Determinar o título do modal baseado no estado atual
    const getModalTitle = () => {
        if (paymentMode) {
            return `Pagamento do Pedido #${createdDocumentInfo?.regnumber || ''}`;
        } else if (activeStep === 5) {
            return 'Confirmar Pedido';
        } else {
            return 'Novo Pedido';
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleCloseRequest}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: { xs: 0, sm: 2 }
                    }
                }}
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            {getModalTitle()}
                        </Typography>
                        <IconButton
                            onClick={handleCloseRequest}
                            size="small"
                            aria-label="fechar"
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                {!paymentMode && (
                    <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Stepper
                            activeStep={activeStep}
                            alternativeLabel
                            sx={{
                                display: { xs: 'none', sm: 'flex' }
                            }}
                        >
                            {steps.slice(0, 6).map((step) => (
                                <Step key={step.label}>
                                    <StepLabel>{step.label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        {/* Stepper móvel simplificado */}
                        <Box
                            sx={{
                                display: { xs: 'flex', sm: 'none' },
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 1
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Passo {activeStep + 1} de {steps.length - 1}
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {steps[activeStep].label}
                            </Typography>
                        </Box>
                    </Box>
                )}

                <DialogContent dividers sx={{ py: 3, flexGrow: 1 }}>
                    {loading && activeStep === 5 && !paymentMode ? (
                        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
                            <CircularProgress />
                            <Typography variant="body1" sx={{ mt: 2 }}>
                                Enviando pedido...
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {!paymentMode && (
                                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                    {steps[activeStep].description}
                                </Typography>
                            )}

                            <Box mt={2}>
                                {renderStepContent()}
                            </Box>
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    {!loading && (
                        <Button
                            disabled={activeStep === 0 && !paymentMode}
                            onClick={handleBack}
                            startIcon={<BackIcon />}
                        >
                            Voltar
                        </Button>
                    )}

                    <Box sx={{ flexGrow: 1 }} />

                    {paymentMode ? (
                        <Button
                            onClick={handlePayLater}
                        >
                            Pagar mais tarde
                        </Button>
                    ) : (
                        <Button
                            onClick={handleCloseRequest}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                    )}

                    {!paymentMode && activeStep === steps.length - 2 ? (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={loading || Object.keys(errors).length > 0}
                            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                        >
                            Submeter Pedido
                        </Button>
                    ) : !paymentMode && (
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={loading}
                            endIcon={<NextIcon />}
                        >
                            Próximo
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Modal de confirmação para fechar */}
            <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
                <DialogTitle>
                    {paymentMode ? 'Cancelar pagamento?' : 'Descartar alterações?'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {paymentMode
                            ? 'O pagamento ainda não foi concluído. Tem certeza que deseja sair?'
                            : 'Existem dados que não foram guardados. Tem certeza que deseja sair sem guardar o pedido?'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClose(false)}>Não</Button>
                    <Button onClick={handleConfirmClose} autoFocus color="error">
                        Sim
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Entity modals */}
            <Dialog open={isUpdateNeeded} onClose={() => setIsUpdateNeeded(false)}>
                <DialogTitle>Dados Incompletos</DialogTitle>
                <DialogContent>
                    <Typography>
                        Os dados desta entidade estão incompletos. É necessário atualizá-los
                        para prosseguir.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsUpdateNeeded(false)} color="primary">
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => setEntityDetailOpen(true)}
                        color="primary"
                        autoFocus
                    >
                        Atualizar Dados
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Outros modais relacionados a entidades */}
            {entityDetailOpen && entityToUpdate && (
                <EntityDetail
                    entity={entityToUpdate}
                    onSave={handleEntityUpdate}
                    onClose={() => setEntityDetailOpen(false)}
                    open={entityDetailOpen}
                />
            )}

            <CreateEntity
                open={createEntityModalOpen}
                onClose={() => setCreateEntityModalOpen(false)}
                onSave={handleCreateEntitySuccess}
                initialNipc={newEntityNipc}
            />
        </>
    );
};

export default CreateDocumentModal;