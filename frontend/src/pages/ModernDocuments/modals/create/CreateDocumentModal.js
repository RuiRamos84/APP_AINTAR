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
 * Modal de criação completo com todas as funcionalidades migradas
 */
const CreateDocumentModal = ({ open, onClose, initialNipc }) => {
    const { metaData } = useMetaData();
    const { user } = useAuth();

    // Definição dos passos
    const steps = [
        { label: 'Identificação', description: 'Identificação fiscal e dados da entidade' },
        { label: 'Morada', description: 'Morada do pedido e de faturação' },
        { label: 'Detalhes', description: 'Tipo de pedido, associado e informações' },
        { label: 'Parâmetros', description: 'Parâmetros específicos do tipo de documento' },
        { label: 'Anexos', description: 'Adicione documentos relacionados ao pedido' },
        { label: 'Confirmação', description: 'Rever e confirmar os dados do pedido' }
    ];

    // Estados para diálogos
    const [confirmClose, setConfirmClose] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [finalPaymentData, setFinalPaymentData] = useState(null);
    // const [suggestEntityCreation, setSuggestEntityCreation] = useState(false);
    // const [pendingNipc, setPendingNipc] = useState('');

    // Hooks principais
    const documentForm = useDocumentForm(initialNipc, handleCloseAfterSuccess);
    const {
        formData, setFormData, activeStep, setActiveStep, errors, setErrors,
        loading, setLoading, isInternal, isInterProfile, handleChange, handleInternalSwitch,
        validateCurrentStep, resetForm
    } = documentForm;

    // Hook de entidades corrigido
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

    // Hook de parâmetros corrigido
    const documentParams = useDocumentParams(formData, entityData, metaData);
    const {
        docTypeParams, paramValues, selectedCountType,
        selectedTypeText, handleParamChange
    } = documentParams;

    // Hook de ficheiros com colagem
    const fileHandling = useFileHandling(formData, setFormData);
    const {
        paymentMethod, setPaymentMethod, paymentInfo, setPaymentInfo,
        onAddFiles, onRemoveFile, onUpdateDescription,
        handlePaymentMethodChange, handlePaymentChange, handlePaymentProofUpload
    } = fileHandling;

    // ✅ RESET COMPLETO
    useEffect(() => {
        if (open) {
            resetForm();
            entityDataHook.setEntityData(null);
            entityDataHook.setRepresentativeData(null);
            setBillingAddress({
                postal: "", address: "", door: "", floor: "",
                nut1: "", nut2: "", nut3: "", nut4: "",
            });
            setShippingAddress({
                postal: "", address: "", door: "", floor: "",
                nut1: "", nut2: "", nut3: "", nut4: "",
            });

            if (initialNipc) {
                setFormData(prev => ({ ...prev, nipc: initialNipc }));
                checkEntityData(initialNipc);
            }
        }
    }, [open, initialNipc]);

    // ✅ HANDLER NIPC CORRIGIDO
    const handleNipcChange = async (event) => {
        const nipc = event.target.value;
        handleChange(event);

        // ✅ O entityDataHook.checkEntityData já gere tudo internamente
        if (nipc && nipc.length >= 9) {
            await entityDataHook.checkEntityData(nipc);
        }
    };

    const isEntityDataComplete = () => {
        if (!entityData) return false;

        const requiredFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
        return requiredFields.every(field =>
            entityData[field] && entityData[field].toString().trim() !== ''
        );
    };

    // 2. Verificar se representante está completo (se aplicável)
    const isRepresentativeDataComplete = () => {
        if (!isRepresentative) return true; // Se não é representante, não precisa validar

        // ✅ CORRECÇÃO: Verificar se representante existe E está completo
        if (!representativeData) return false; // Representante não foi encontrado/criado

        const requiredFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
        return requiredFields.every(field =>
            representativeData[field] && representativeData[field].toString().trim() !== ''
        );
    };

    // 3. Determinar se pode avançar do passo 0 (Identificação)
    const canAdvanceFromIdentification = () => {
        if (isInternal) return true;

        // ✅ USAR APENAS dados do hook
        const currentEntityData = entityDataHook.entityData;
        const currentRepresentativeData = entityDataHook.representativeData;

        if (!currentEntityData || !entityDataHook.validateEntityCompleteness(currentEntityData).isComplete) {
            return false;
        }

        if (isRepresentative) {
            if (!formData.tb_representative || !currentRepresentativeData ||
                !entityDataHook.validateEntityCompleteness(currentRepresentativeData).isComplete) {
                return false;
            }
        }

        return true;
    };

    // ✅ VALIDAÇÃO CORRIGIDA
    const validateStep = () => {
        const newErrors = validateCurrentStep(
            activeStep,
            formData,
            billingAddress,
            shippingAddress,
            isDifferentAddress,
            paymentMethod,
            paymentInfo,
            docTypeParams,
            paramValues,
            entityData,           // ✅ Passar entityData
            representativeData,   // ✅ Passar representativeData  
            isRepresentative      // ✅ Passar flag isRepresentative
        );

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Sincronizar endereços
    useEffect(() => {
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

    const handleNext = () => {
        // ✅ Para passo 0, usar validação específica
        if (activeStep === 0) {
            if (!canAdvanceFromIdentification()) {
                // Mensagem de erro específica
                const currentEntityData = entityDataHook.entityData;
                const currentRepresentativeData = entityDataHook.representativeData;

                let errorMessage = "Dados incompletos:";

                if (!currentEntityData) {
                    errorMessage += "\n• Introduza um NIF válido para a entidade principal";
                } else if (!entityDataHook.validateEntityCompleteness(currentEntityData).isComplete) {
                    errorMessage += "\n• Complete os dados da entidade principal";
                }

                if (isRepresentative) {
                    if (!formData.tb_representative) {
                        errorMessage += "\n• Introduza o NIF do representante legal";
                    } else if (!currentRepresentativeData) {
                        errorMessage += "\n• Representante não encontrado";
                    } else if (!entityDataHook.validateEntityCompleteness(currentRepresentativeData).isComplete) {
                        errorMessage += "\n• Complete os dados do representante legal";
                    }
                }

                notifyError(errorMessage);
                return;
            }
        }

        // ✅ Para outros passos, usar validação com dados do hook
        const newErrors = validateCurrentStep(
            activeStep,
            formData,
            billingAddress,
            shippingAddress,
            isDifferentAddress,
            paymentMethod,
            paymentInfo,
            docTypeParams,
            paramValues,
            entityDataHook.entityData,        // ✅ Dados do hook
            entityDataHook.representativeData, // ✅ Dados do hook
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

    // ✅ PREPARAR DADOS COMPLETOS
    function prepareFormData() {
        const submitFormData = new FormData();

        // Dados base
        Object.entries(formData).forEach(([key, value]) => {
            if (key !== "files") {
                submitFormData.append(key, value);
            }
        });

        submitFormData.append("isDifferentAddress", isDifferentAddress);

        // Endereços
        Object.entries(billingAddress).forEach(([key, value]) => {
            submitFormData.append(key, value);
            submitFormData.append(`billing_${key}`, value);
        });

        if (isDifferentAddress) {
            Object.entries(shippingAddress).forEach(([key, value]) => {
                submitFormData.append(`shipping_${key}`, value);
            });
        }

        // ✅ PARÂMETROS
        Object.entries(paramValues).forEach(([key, value]) => {
            submitFormData.append(key, value || '');
        });

        // Ficheiros
        formData.files.forEach((fileObj, index) => {
            submitFormData.append("files", fileObj.file);
            submitFormData.append(`descr${index}`, fileObj.description || "");
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

    // ✅ CORREÇÃO: useEffect para debug
    useEffect(() => {
        console.log('🔄 Estado actualizado:', {
            entityData: entityDataHook.entityData?.name,
            representativeData: entityDataHook.representativeData?.name,
            isRepresentative,
            formData_nipc: formData.nipc,
            formData_representative: formData.tb_representative
        });
    }, [entityDataHook.entityData, entityDataHook.representativeData, isRepresentative, formData.nipc, formData.tb_representative]);

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
        entityDataHook.setEntityData(null);
        entityDataHook.setRepresentativeData(null);
        setBillingAddress({ postal: "", address: "", door: "", floor: "", nut1: "", nut2: "", nut3: "", nut4: "" });
        setShippingAddress({ postal: "", address: "", door: "", floor: "", nut1: "", nut2: "", nut3: "", nut4: "" });
    };

    // ✅ SUBMIT FINAL
    const handleSubmit = async () => {
        if (!validateStep()) {
            notifyError("Preencha todos os campos obrigatórios.");
            return;
        }

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

    const handleCloseRequest = () => {
        const hasData = formData.nipc || formData.tt_type || formData.ts_associate ||
            formData.memo || formData.files.length > 0 || entityData ||
            Object.values(billingAddress).some(value => value);

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

    // ✅ RENDER STEPS CORRIGIDO
    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                console.log('🔍 Debug antes render:', {
                    entityData_type: typeof entityDataHook.entityData,
                    entityData_value: entityDataHook.entityData,
                    hasPhone: entityDataHook.entityData?.phone
                });
                return (
                    <IdentificationStep
                        formData={formData}
                        handleChange={handleChange}
                        handleNipcChange={handleNipcChange}
                        errors={errors}
                        entityData={entityDataHook.entityData}           // ✅ Só hook
                        representativeData={entityDataHook.representativeData} // ✅ Só hook
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
                        billingAddress={billingAddress}
                        setBillingAddress={setBillingAddress}
                        shippingAddress={shippingAddress}
                        setShippingAddress={setShippingAddress}
                        errors={errors}
                        isDifferentAddress={isDifferentAddress}
                        handleDifferentAddressToggle={handleDifferentAddressToggle}
                        isEntityFound={entityData !== null}
                        isInternal={isInternal}
                        entityData={entityData}
                        setEntityDetailOpen={setEntityDetailOpen}
                        setEntityToUpdate={entityDataHook.setEntityToUpdate}
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
                        // ✅ ADICIONAR estas props que estavam em falta:
                        selectedCountType={documentParams.selectedCountType}
                        selectedTypeText={documentParams.selectedTypeText}
                        previousDocuments={entityDataHook.previousDocuments}
                        // ✅ Adicionar entityData para debug
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

            {/* Sugestão criar entidade */}
            {/* <Dialog open={suggestEntityCreation} onClose={handleRejectCreateEntity}>
                <DialogTitle>Entidade não encontrada</DialogTitle>
                <DialogContent>
                    <Typography>
                        Não foram encontrados dados para o NIF {pendingNipc}.
                        Criar nova entidade?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRejectCreateEntity}>
                        Continuar sem criar
                    </Button>
                    <Button onClick={handleConfirmCreateEntity} variant="contained" autoFocus>
                        Criar entidade
                    </Button>
                </DialogActions>
            </Dialog> */}

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
                    entity={entityToUpdate}  // ✅ Já correcto
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