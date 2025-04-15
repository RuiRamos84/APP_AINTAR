import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stepper,
    Step,
    StepLabel,
    IconButton,
    CircularProgress
} from '@mui/material';
import {
    Close as CloseIcon,
    NavigateNext as NextIcon,
    NavigateBefore as BackIcon,
    Send as SendIcon
} from '@mui/icons-material';

// Componentes de passos
import IdentificationStep from './steps/IdentificationStep';
import AddressStep from './steps/AddressStep';
import DetailsStep from './steps/DetailsStep';
import ParametersStep from './steps/ParametersStep';
import AttachmentsStep from './steps/AttachmentsStep';
import PaymentStep from './steps/PaymentStep';
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

// Serviços
import { createDocument } from '../../../../services/documentService';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';

/**
 * Modal de criação de documentos com formulário por passos
 * @param {Object} props - Propriedades do componente
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Function} props.onClose - Função de callback para fechar o modal
 * @param {string} props.initialNipc - NIPC inicial (opcional)
 */
const CreateDocumentModal = ({ open, onClose, initialNipc }) => {
    const { metaData } = useMetaData();

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

            console.log("Sincronizando billingAddress com os dados da entidade:", addressData);
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

        // Adicionar informações de pagamento
        // submitFormData.append('payment_method', paymentMethod || '');
        // if (paymentMethod && paymentMethod !== 'gratuito') {
        //     submitFormData.append('payment_amount', paymentInfo.amount || '');
        //     submitFormData.append('payment_reference', paymentInfo.reference || '');
        //     submitFormData.append('payment_date', paymentInfo.date || '');
        //     if (paymentInfo.proof) {
        //         submitFormData.append('payment_proof', paymentInfo.proof);
        //     }
        // }

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
                // Modificar para redirecionar para a página de pagamento após criar o documento
                notifySuccess(`Pedido com o número: ${response.regnumber}, criado com sucesso!`);
                resetForm();

                // Redirecionar para a página de pagamento
                onClose(true, response.regnumber, true); // Adicionar terceiro parâmetro indicando redirecionamento para pagamento
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

    // Handler para fechar o modal
    const handleCloseRequest = () => {
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

    // Renderizar o conteúdo atual do passo
    const renderStepContent = () => {
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

            // case 5: // Pagamentos
            //     return (
            //         <PaymentStep
            //             paymentMethod={paymentMethod}
            //             handlePaymentMethodChange={handlePaymentMethodChange}
            //             paymentInfo={paymentInfo}
            //             handlePaymentChange={handlePaymentChange}
            //             handlePaymentProofUpload={handlePaymentProofUpload}
            //             errors={errors}
            //             loading={loading}
            //             lastDocument={lastDocument}
            //         />
            //     );

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
                            {activeStep === 6 ? 'Confirmar Pedido' : 'Novo Pedido'}
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
                            Passo {activeStep + 1} de {steps.length}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                            {steps[activeStep].label}
                        </Typography>
                    </Box>
                </Box>

                <DialogContent dividers sx={{ py: 3, flexGrow: 1 }}>
                    {loading && activeStep === 6 ? (
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
                    <Button
                        disabled={activeStep === 0 || loading}
                        onClick={handleBack}
                        startIcon={<BackIcon />}
                    >
                        Voltar
                    </Button>

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

            {/* Outros modais relacionados a entidades - Como EntityDetail e CreateEntity */}
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