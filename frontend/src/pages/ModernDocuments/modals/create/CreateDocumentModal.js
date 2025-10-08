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

const CreateDocumentModal = ({ open, onClose, initialNipc }) => {
    const { metaData } = useMetaData();
    const { user } = useAuth();

    const steps = [
        { label: 'Identificação', description: 'Identificação fiscal e dados da entidade' },
        { label: 'Morada', description: 'Morada do pedido' },
        { label: 'Detalhes', description: 'Tipo de pedido, associado e informações' },
        { label: 'Parâmetros', description: 'Parâmetros específicos do tipo de documento' },
        { label: 'Anexos', description: 'Adicione documentos relacionados ao pedido' },
        { label: 'Confirmação', description: 'Rever e confirmar os dados do pedido' }
    ];

    // Estados para diálogos
    const [confirmClose, setConfirmClose] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [finalPaymentData, setFinalPaymentData] = useState(null);


    // Função para limpar representante quando torna interno
    const handleInternalSwitchCallback = (isInternal) => {
        if (isInternal) {
            entityDataHook.setRepresentativeData(null);
            entityDataHook.handleRepresentativeToggle({ target: { checked: false } });
        }
    };
    // Hooks principais
    const documentForm = useDocumentForm(initialNipc, handleCloseAfterSuccess, handleInternalSwitchCallback);
    const {
        formData, setFormData, activeStep, setActiveStep, errors, setErrors,
        loading, setLoading, isInternal, isInterProfile, handleChange, handleInternalSwitch,
        validateCurrentStep, resetForm
    } = documentForm;

    // Hook de entidades
    const entityDataHook = useEntityData(formData, setFormData);
    const {
        entityData, representativeData, setEntityData, setRepresentativeData,
        isRepresentative, isCustomRequestAddress, handleCustomAddressToggle,
        entityAddress, requestAddress, setRequestAddress,
        createEntityModalOpen, setCreateEntityModalOpen, newEntityNipc,
        isUpdateNeeded, setIsUpdateNeeded, entityToUpdate, entityDetailOpen, setEntityDetailOpen,
        entityCountTypes, previousDocuments, lastDocument, checkEntityData,
        handleRepresentativeToggle, handleEntityUpdate, handleCreateEntitySuccess
    } = entityDataHook;

    // Hook de parâmetros
    const documentParams = useDocumentParams(formData, entityData, metaData);
    const {
        docTypeParams, paramValues, selectedCountType,
        selectedTypeText, handleParamChange
    } = documentParams;

    // Hook de ficheiros
    const fileHandling = useFileHandling(formData, setFormData);
    const {
        paymentMethod, setPaymentMethod, paymentInfo, setPaymentInfo,
        onAddFiles, onRemoveFile, onUpdateDescription,
        handlePaymentMethodChange, handlePaymentChange, handlePaymentProofUpload
    } = fileHandling;

    // Reset completo
    useEffect(() => {
        if (open) {
            resetForm();
            entityDataHook.setEntityData(null);
            entityDataHook.setRepresentativeData(null);
            entityDataHook.clearCache(); // ✅ Limpar cache ao abrir modal

            if (initialNipc) {
                setFormData(prev => ({ ...prev, nipc: initialNipc }));
                checkEntityData(initialNipc);
            }
        }
    }, [open, initialNipc]);

    // Handler NIPC
    const handleNipcChange = async (event) => {
        const nipc = event.target.value;
        handleChange(event);

        if (nipc && nipc.length >= 9) {
            await entityDataHook.checkEntityData(nipc);
        }
    };

    // Validação avanço do passo 0
    const canAdvanceFromIdentification = () => {
        if (isInternal) return true;

        const nipcStr = String(formData.nipc || '');
        const hasNipc = nipcStr.length === 9;
        const hasEntity = !!entityDataHook.entityData;

        if (!hasNipc || !hasEntity) return false;

        const entityComplete = entityDataHook.validateEntityCompleteness(entityDataHook.entityData).isComplete;
        if (!entityComplete) return false;

        if (isRepresentative) {
            const repNipcStr = String(formData.tb_representative || '');
            const hasRepNipc = repNipcStr.length === 9;
            const hasRepData = !!entityDataHook.representativeData;

            if (!hasRepNipc || !hasRepData) return false;

            const repComplete = entityDataHook.validateEntityCompleteness(entityDataHook.representativeData).isComplete;
            if (!repComplete) return false;
        }

        return true;
    };

    const handleNext = () => {
        // Passo 0: validação específica
        if (activeStep === 0) {
            if (!canAdvanceFromIdentification()) {
                notifyError("Complete todos os dados obrigatórios antes de prosseguir.");
                return;
            }
            setActiveStep(prev => prev + 1);
            const modalContent = document.querySelector('.MuiDialogContent-root');
            if (modalContent) modalContent.scrollTop = 0;
            return;
        }

        // Outros passos: validação normal
        const newErrors = validateCurrentStep(
            activeStep,
            formData,
            requestAddress,
            requestAddress,
            false,
            paymentMethod,
            paymentInfo,
            docTypeParams,
            paramValues,
            entityData,
            representativeData,
            isRepresentative
        );

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            setActiveStep(prev => prev + 1);
            const modalContent = document.querySelector('.MuiDialogContent-root');
            if (modalContent) modalContent.scrollTop = 0;
        } else {
            notifyError("Corrija os erros antes de continuar.");
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
        const modalContent = document.querySelector('.MuiDialogContent-root');
        if (modalContent) modalContent.scrollTop = 0;
    };

    // ✅ CORRECÇÃO: Preparar dados com descrições correctas
    function prepareFormData() {
        const submitFormData = new FormData();

        // Dados base
        Object.entries(formData).forEach(([key, value]) => {
            if (key !== "files") {
                submitFormData.append(key, value);
            }
        });

        // Endereço do pedido
        Object.entries(requestAddress).forEach(([key, value]) => {
            submitFormData.append(key, value);
        });

        // Parâmetros
        Object.entries(paramValues).forEach(([key, value]) => {
            submitFormData.append(key, value || '');
        });

        // ✅ CRÍTICO: Ficheiros com descrições
        formData.files.forEach((fileObj, index) => {
            submitFormData.append("files", fileObj.file);
            const description = fileObj.description || '';
            submitFormData.append("descr", description); // ✅ Usar 'descr'
        });

        // Entidades
        if (entityData) {
            submitFormData.append("ts_entity", entityData.pk);
        }

        if (representativeData && isRepresentative) {
            submitFormData.append("tb_representative", representativeData.pk);
        }

        submitFormData.append('payment_status', 'PENDING');

        return submitFormData;
    }

    // Submit final
    const handleSubmit = async () => {
        setLoading(true);

        try {
            const submitFormData = prepareFormData();
            const response = await createDocument(submitFormData);

            if (response && response.regnumber) {
                notifySuccess(`Pedido ${response.regnumber} criado!`);

                const documentId = response.pk || response.order_id;
                const regnumber = response.regnumber;

                // Verificar pagamento
                if (documentId) {
                    try {
                        const invoiceResult = await paymentService.getInvoiceAmount(documentId);

                        if (invoiceResult.success &&
                            invoiceResult.invoice_data &&
                            invoiceResult.invoice_data.invoice > 0) {

                            setFinalPaymentData({
                                documentId: documentId,
                                amount: invoiceResult.invoice_data.invoice,
                                regnumber: regnumber
                            });

                            setPaymentDialogOpen(true);
                            setLoading(false);
                            return;
                        }
                    } catch (error) {
                        console.error("Erro verificação pagamento:", error);
                    }
                }

                // Sem pagamento
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

    function handleCloseAfterSuccess(success, regnumber, redirectToPayment = false) {
        onClose(success, regnumber, redirectToPayment);
    }

    // Fechar após pagamento
    const handlePaymentClose = (success, result) => {
        setPaymentDialogOpen(false);

        if (success) {
            notifySuccess('Pagamento processado!');
        } else {
            notifyInfo('Documento criado. Pagamento pendente.');
        }

        resetForm();
        clearEntityData();
        onClose(true, finalPaymentData?.regnumber, false);
        setFinalPaymentData(null);
    };

    const clearEntityData = () => {
        // Estados principais
        entityDataHook.setEntityData(null);
        entityDataHook.setRepresentativeData(null);

        // Endereços
        entityDataHook.setRequestAddress({
            postal: '', address: '', door: '', floor: '',
            nut1: '', nut2: '', nut3: '', nut4: ''
        });

        // Parâmetros
        documentParams.setParamValues({});

        // Estados UI
        entityDataHook.setIsUpdateNeeded(false);
        entityDataHook.setEntityDetailOpen(false);
        entityDataHook.setCreateEntityModalOpen(false);

        // ✅ Checkboxes via hook
        documentForm.resetForm(); // Já limpa isInternal
        entityDataHook.handleRepresentativeToggle({ target: { checked: false } });
        entityDataHook.handleCustomAddressToggle(false);
    };

    const handleCloseRequest = () => {
        const hasData = formData.nipc || formData.tt_type || formData.ts_associate ||
            formData.memo || formData.files.length > 0 || entityData ||
            Object.values(requestAddress).some(value => value);

        if (hasData) {
            setConfirmClose(true);
        } else {
            resetForm();
            onClose(false);
        }
    };

    const handleConfirmClose = () => {
        resetForm();
        clearEntityData();
        setConfirmClose(false);
        onClose(false);
    };

    // Render passos
    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <IdentificationStep
                        formData={formData}
                        handleChange={handleChange}
                        handleNipcChange={handleNipcChange}
                        errors={errors}
                        entityData={entityDataHook.entityData}
                        representativeData={entityDataHook.representativeData}
                        setEntityData={entityDataHook.setEntityData}
                        setRepresentativeData={entityDataHook.setRepresentativeData}
                        isRepresentative={isRepresentative}
                        handleRepresentativeToggle={handleRepresentativeToggle}
                        isInternal={isInternal}
                        handleInternalSwitch={handleInternalSwitch}
                        isInterProfile={isInterProfile}
                        entityDataHook={entityDataHook}
                    />
                );

            case 1:
                return (
                    <AddressStep
                        entityData={entityData}
                        entityAddress={entityAddress}
                        requestAddress={requestAddress}
                        setRequestAddress={setRequestAddress}
                        isCustomRequestAddress={isCustomRequestAddress}
                        handleCustomAddressToggle={handleCustomAddressToggle}
                        errors={errors}
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
                        selectedCountType={documentParams.selectedCountType}
                        selectedTypeText={documentParams.selectedTypeText}
                        previousDocuments={entityDataHook.previousDocuments}
                        entityData={entityData}
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
                        entityData={entityData}
                        formData={formData}
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
                        requestAddress={requestAddress}
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
                        <IconButton onClick={handleCloseRequest} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Stepper
                        activeStep={activeStep}
                        alternativeLabel
                        sx={{ display: { xs: 'none', sm: 'flex' } }}
                    >
                        {steps.map((step) => (
                            <Step key={step.label}>
                                <StepLabel>{step.label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
                                A enviar pedido...
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

                    <Button onClick={handleCloseRequest} disabled={loading}>
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
                            disabled={loading || (activeStep === 0 && !canAdvanceFromIdentification())}
                            endIcon={<NextIcon />}
                        >
                            Próximo
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Confirmação fechar */}
            <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
                <DialogTitle>Descartar alterações?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Dados não guardados. Sair sem guardar?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClose(false)}>Não</Button>
                    <Button onClick={handleConfirmClose} autoFocus color="error">Sim</Button>
                </DialogActions>
            </Dialog>

            {/* Pagamento */}
            {paymentDialogOpen && finalPaymentData && (
                <PaymentDialog
                    open={paymentDialogOpen}
                    onClose={handlePaymentClose}
                    documentId={finalPaymentData.documentId}
                    amount={finalPaymentData.amount}
                />
            )}

            {/* Modais entidade */}
            <Dialog open={isUpdateNeeded} onClose={() => setIsUpdateNeeded(false)}>
                <DialogTitle>Dados Incompletos</DialogTitle>
                <DialogContent>
                    <Typography>Entidade com campos incompletos. Actualizar?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsUpdateNeeded(false)}>Cancelar</Button>
                    <Button onClick={() => setEntityDetailOpen(true)} autoFocus>Actualizar</Button>
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