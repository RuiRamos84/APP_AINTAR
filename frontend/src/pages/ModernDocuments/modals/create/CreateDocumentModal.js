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

// Modal de pagamento
import PaymentDialog from '../../../../features/Payment/modals/PaymentDialog';

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

/**
 * Modal de criação de documentos com formulário por passos e pagamentos
 */
const CreateDocumentModal = ({ open, onClose, initialNipc }) => {
    const { metaData } = useMetaData();
    const { user } = useAuth();

    // Definição dos passos do stepper
    const steps = [
        { label: 'Identificação', description: 'Identificação fiscal e dados da entidade' },
        { label: 'Morada', description: 'Morada do pedido e de faturação' },
        { label: 'Detalhes', description: 'Tipo de pedido, associado e informações' },
        { label: 'Parâmetros', description: 'Parâmetros adicionais' },
        { label: 'Anexos', description: 'Adicione documentos relacionados ao pedido' },
        { label: 'Confirmação', description: 'Rever e confirmar os dados do pedido' }
    ];

    // Estados para diálogos
    const [confirmClose, setConfirmClose] = useState(false);

    // Estados para pagamento
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [finalPaymentData, setFinalPaymentData] = useState(null);

    // Estados para sugestão de criação de entidade
    const [suggestEntityCreation, setSuggestEntityCreation] = useState(false);
    const [pendingNipc, setPendingNipc] = useState('');

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
            // Limpar dados da entidade
            entityDataHook.setEntityData(null);
            entityDataHook.setRepresentativeData(null);
            setBillingAddress({
                postal: "",
                address: "",
                door: "",
                floor: "",
                nut1: "",
                nut2: "",
                nut3: "",
                nut4: "",
            });
            setShippingAddress({
                postal: "",
                address: "",
                door: "",
                floor: "",
                nut1: "",
                nut2: "",
                nut3: "",
                nut4: "",
            });

            if (initialNipc) {
                setFormData(prev => ({ ...prev, nipc: initialNipc }));
                checkEntityData(initialNipc);
            }
        }
    }, [open, initialNipc]);

    // Handler personalizado para mudança do NIPC
    const handleNipcChange = async (event) => {
        const nipc = event.target.value;
        handleChange(event);

        if (nipc && nipc.length >= 9) {
            const entityResult = await checkEntityData(nipc);

            // Se não encontrou dados da entidade, sugerir criação
            if (!entityResult || !entityData) {
                setPendingNipc(nipc);
                setSuggestEntityCreation(true);
            }
        }
    };

    // Handler para confirmar criação de nova entidade
    const handleConfirmCreateEntity = () => {
        setSuggestEntityCreation(false);
        entityDataHook.setNewEntityNipc(pendingNipc);
        setCreateEntityModalOpen(true);
        setPendingNipc('');
    };

    // Handler para rejeitar criação de entidade
    const handleRejectCreateEntity = () => {
        setSuggestEntityCreation(false);
        setPendingNipc('');
        // Mantém o NIPC no formulário mas sem dados da entidade
    };
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
        setActiveStep(prev => prev - 1);
        const modalContent = document.querySelector('.MuiDialogContent-root');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    };

    // Função para preparar dados do formulário para envio
    function prepareFormData() {
        const submitFormData = new FormData();

        Object.entries(formData).forEach(([key, value]) => {
            if (key !== "files") {
                submitFormData.append(key, value);
            }
        });

        submitFormData.append("isDifferentAddress", isDifferentAddress);

        Object.entries(billingAddress).forEach(([key, value]) => {
            submitFormData.append(key, value);
            submitFormData.append(`billing_${key}`, value);
        });

        if (isDifferentAddress) {
            Object.entries(shippingAddress).forEach(([key, value]) => {
                submitFormData.append(`shipping_${key}`, value);
            });
        }

        Object.entries(paramValues).forEach(([key, value]) => {
            submitFormData.append(key, value || '');
        });

        formData.files.forEach((fileObj, index) => {
            submitFormData.append("files", fileObj.file);
            submitFormData.append(`descr${index}`, fileObj.description || "");
        });

        if (entityData) {
            submitFormData.append("ts_entity", entityData.pk);
        }

        if (representativeData && isRepresentative) {
            submitFormData.append("tb_representative", representativeData.pk);
        }

        submitFormData.append('payment_status', 'PENDING');

        return submitFormData;
    }

    // Handler para fechar após pagamento
    const handlePaymentClose = (success, result) => {
        setPaymentDialogOpen(false);

        if (success) {
            notifySuccess('Pagamento processado com sucesso!');
        } else {
            notifyInfo('Documento criado. Pagamento pode ser efectuado posteriormente.');
        }

        // Limpar todos os dados e fechar modal
        resetForm();
        clearEntityData();
        onClose(true, finalPaymentData?.regnumber, false);
        setFinalPaymentData(null);
    };

    // Função para limpar dados da entidade
    const clearEntityData = () => {
        entityDataHook.setEntityData(null);
        entityDataHook.setRepresentativeData(null);
        setBillingAddress({
            postal: "",
            address: "",
            door: "",
            floor: "",
            nut1: "",
            nut2: "",
            nut3: "",
            nut4: "",
        });
        setShippingAddress({
            postal: "",
            address: "",
            door: "",
            floor: "",
            nut1: "",
            nut2: "",
            nut3: "",
            nut4: "",
        });
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

            if (response && response.regnumber) {
                notifySuccess(`Pedido ${response.regnumber} criado com sucesso!`);

                const documentId = response.pk || response.order_id;
                const regnumber = response.regnumber;

                // Verificar se precisa pagamento
                if (documentId) {
                    try {
                        const invoiceResult = await paymentService.getInvoiceAmount(documentId);

                        if (invoiceResult.success &&
                            invoiceResult.invoice_data &&
                            invoiceResult.invoice_data.invoice > 0) {

                            // Preparar dados para pagamento
                            setFinalPaymentData({
                                documentId: documentId,
                                amount: invoiceResult.invoice_data.invoice,
                                regnumber: regnumber
                            });

                            // Abrir modal de pagamento
                            setPaymentDialogOpen(true);
                            setLoading(false);
                            return;
                        }
                    } catch (error) {
                        console.error("Erro verificação pagamento:", error);
                    }
                }

                // Sem pagamento - fechar normal
                resetForm();
                clearEntityData();
                onClose(true, regnumber, false);
            } else {
                throw new Error(response.error || "Erro desconhecido");
            }
        } catch (error) {
            notifyError("Erro ao criar pedido: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Fechar o modal após sucesso
    function handleCloseAfterSuccess(success, regnumber, redirectToPayment = false) {
        onClose(success, regnumber, redirectToPayment);
    }

    // Handler para fechar o modal
    const handleCloseRequest = () => {
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
        clearEntityData();
        setConfirmClose(false);
        onClose(false);
    };

    // Renderizar o conteúdo atual do passo
    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <IdentificationStep
                        formData={formData}
                        handleChange={handleChange}
                        handleNipcChange={handleNipcChange}
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

            case 1:
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

            case 2:
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

            case 3:
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

            case 4:
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

            case 5:
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
                            {activeStep === 5 ? 'Confirmar Pedido' : 'Novo Pedido'}
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

                <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Stepper
                        activeStep={activeStep}
                        alternativeLabel
                        sx={{
                            display: { xs: 'none', sm: 'flex' }
                        }}
                    >
                        {steps.map((step) => (
                            <Step key={step.label}>
                                <StepLabel>{step.label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <Box
                        sx={{
                            display: { xs: 'flex', sm: 'none' },
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 1
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Passo {activeStep + 1} de {steps.length}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                            {steps[activeStep].label}
                        </Typography>
                    </Box>
                </Box>

                <DialogContent dividers sx={{ py: 3, flexGrow: 1 }}>
                    {loading && activeStep === 5 ? (
                        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
                            <CircularProgress />
                            <Typography variant="body1" sx={{ mt: 2 }}>
                                Enviando pedido...
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                {steps[activeStep].description}
                            </Typography>

                            <Box mt={2}>
                                {renderStepContent()}
                            </Box>
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    {!loading && (
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            startIcon={<BackIcon />}
                        >
                            Voltar
                        </Button>
                    )}

                    <Box sx={{ flexGrow: 1 }} />

                    <Button
                        onClick={handleCloseRequest}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>

                    {activeStep === steps.length - 1 ? (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={loading || Object.keys(errors).length > 0}
                            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                        >
                            Submeter Pedido
                        </Button>
                    ) : (
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

            {/* Modal de sugestão para criar entidade */}
            <Dialog open={suggestEntityCreation} onClose={handleRejectCreateEntity}>
                <DialogTitle>Entidade não encontrada</DialogTitle>
                <DialogContent>
                    <Typography>
                        Não foram encontrados dados para o NIF {pendingNipc}.
                        Deseja criar uma nova entidade com este NIF?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRejectCreateEntity}>
                        Continuar sem criar
                    </Button>
                    <Button
                        onClick={handleConfirmCreateEntity}
                        variant="contained"
                        color="primary"
                        autoFocus
                    >
                        Criar nova entidade
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de confirmação para fechar */}
            <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
                <DialogTitle>Descartar alterações?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Existem dados que não foram guardados. Tem certeza que deseja sair sem guardar o pedido?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClose(false)}>Não</Button>
                    <Button onClick={handleConfirmClose} autoFocus color="error">
                        Sim
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de pagamento */}
            {paymentDialogOpen && finalPaymentData && (
                <PaymentDialog
                    open={paymentDialogOpen}
                    onClose={handlePaymentClose}
                    documentId={finalPaymentData.documentId}
                    amount={finalPaymentData.amount}
                />
            )}

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