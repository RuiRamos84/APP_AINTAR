import { useState, useEffect } from 'react';
import { useMetaData } from '../../../../../contexts/MetaDataContext';
import { notifyError } from '../../../../../components/common/Toaster/ThemedToaster';

/**
 * Hook para gerenciar o formulário de documento
 * @param {string} initialNipc - NIPC inicial caso fornecido
 * @param {Function} onClose - Função de callback para fechar o modal após submissão bem-sucedida
 * @returns {Object} Estados e funções para gerenciar o formulário
 */
export const useDocumentForm = (initialNipc, onClose) => {
    const { metaData } = useMetaData();

    // Estados para o formulário
    const [formData, setFormData] = useState({
        nipc: initialNipc || '',
        tt_type: '',
        ts_associate: '',
        tb_representative: '',
        tt_presentation: '',
        memo: '',
        files: []
    });

    const [activeStep, setActiveStep] = useState(0);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [isInternal, setIsInternal] = useState(false);
    const [isInterProfile, setIsInterProfile] = useState(false);

    // Verificar perfil do usuário (interno/externo)
    useEffect(() => {
        const userProfile = JSON.parse(localStorage.getItem("user"));
        if (userProfile && (userProfile.profil === "1" || userProfile.profil === 1 || userProfile.profil === "0" || userProfile.profil === 0 )) {
            setIsInterProfile(true);
        } else {
            setIsInterProfile(false);
        }
    }, []);

    // Handler para mudanças no formulário
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: "" }));
    };

    // Manipulador para pedidos internos
    const handleInternalSwitch = (e) => {
        setIsInternal(e.target.checked);
        setFormData(prev => ({
            ...prev,
            tt_type: ""
        }));
    };

    // ✅ Validação do passo atual - CORRIGIDA para separar entidade e representante
    const validateCurrentStep = (
        activeStep,
        formData,
        billingAddress,
        shippingAddress,
        isDifferentAddress,
        paymentMethod,
        paymentInfo,
        docTypeParams,
        paramValues,
        entityData = null,
        representativeData = null,
        isRepresentative = false
    ) => {
        const newErrors = {};

        // ✅ Função auxiliar para validar completude de entidade
        const validateEntityCompleteness = (entity) => {
            if (!entity) return false;
            const requiredFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
            return requiredFields.every(field =>
                entity[field] && entity[field].toString().trim() !== ''
            );
        };

        switch (activeStep) {
            case 0: // Identificação
                if (!isInternal) {
                    // ✅ 1. Validar NIF da entidade principal
                    if (!formData.nipc || formData.nipc.length !== 9) {
                        newErrors.nipc = 'NIPC da entidade principal é obrigatório';
                        break;
                    }

                    // ✅ 2. Validar completude da entidade principal
                    if (!validateEntityCompleteness(entityData)) {
                        newErrors.entity_incomplete = 'Complete os dados da entidade principal antes de prosseguir';
                        break;
                    }

                    // ✅ 3. Se é representante, validar NIF e completude
                    if (isRepresentative) {
                        if (!formData.tb_representative || formData.tb_representative.length !== 9) {
                            newErrors.tb_representative = 'NIF do representante é obrigatório quando seleccionado';
                            break;
                        }

                        if (!validateEntityCompleteness(representativeData)) {
                            newErrors.representative_incomplete = 'Complete os dados do representante antes de prosseguir';
                            break;
                        }
                    }
                }
                break;

            case 1: // Morada
                if (!isInternal) {
                    // ✅ Verificar novamente se entidade principal está completa
                    if (!validateEntityCompleteness(entityData)) {
                        newErrors.entity_incomplete = 'Complete os dados da entidade antes de definir moradas';
                        break;
                    }

                    // ✅ Validar morada de faturação (baseada na entidade principal)
                    const requiredAddressFields = ['postal', 'address', 'nut4', 'nut3', 'nut2', 'nut1'];
                    const missingBillingFields = requiredAddressFields.filter(field => !billingAddress[field]);

                    if (missingBillingFields.length > 0) {
                        missingBillingFields.forEach(field => {
                            const fieldNames = {
                                postal: 'Código postal',
                                address: 'Morada',
                                nut4: 'Localidade',
                                nut3: 'Freguesia',
                                nut2: 'Concelho',
                                nut1: 'Distrito'
                            };
                            newErrors[field] = `${fieldNames[field]} é obrigatório`;
                        });
                    }

                    // ✅ Se usa morada diferente, validar também
                    if (isDifferentAddress) {
                        const missingShippingFields = requiredAddressFields.filter(field => !shippingAddress[field]);
                        if (missingShippingFields.length > 0) {
                            missingShippingFields.forEach(field => {
                                const fieldNames = {
                                    postal: 'Código postal',
                                    address: 'Morada',
                                    nut4: 'Localidade',
                                    nut3: 'Freguesia',
                                    nut2: 'Concelho',
                                    nut1: 'Distrito'
                                };
                                newErrors[`shipping_${field}`] = `${fieldNames[field]} (correspondência) é obrigatório`;
                            });
                        }
                    }
                }
                break;

            case 2: // Detalhes
                if (!formData.tt_type) {
                    newErrors.tt_type = 'Tipo de documento é obrigatório';
                }
                if (!isInternal && !formData.ts_associate) {
                    newErrors.ts_associate = 'Associado é obrigatório';
                }
                if (!formData.tt_presentation) {
                    newErrors.tt_presentation = 'Forma de apresentação é obrigatória';
                }
                break;

            case 3: // Parâmetros
                if (docTypeParams && docTypeParams.length > 0) {
                    docTypeParams.forEach(param => {
                        if (param.mandatory === 1 && !paramValues[`param_${param.tb_param}`]) {
                            newErrors[`param_${param.tb_param}`] = `${param.name} é obrigatório`;
                        }
                    });
                }
                break;

            case 4: // Anexos
                if (!formData.memo && formData.files.length === 0) {
                    newErrors.memo = 'Preencha as observações ou anexe pelo menos um arquivo';
                    newErrors.files = 'Preencha as observações ou anexe pelo menos um arquivo';
                }

                formData.files.forEach((file, index) => {
                    if (!file.description.trim()) {
                        newErrors[`file_${index}`] = 'Descrição obrigatória';
                    }
                });
                break;

            case 5: // Confirmação
                // Validação final - pode incluir verificações adicionais
                break;

            default:
                break;
        }

        return newErrors;
    };

    // Reset do formulário
    const resetForm = () => {
        setFormData({
            nipc: initialNipc || '',
            tt_type: '',
            ts_associate: '',
            tb_representative: '',
            tt_presentation: '',
            memo: '',
            files: []
        });
        setActiveStep(0);
        setErrors({});
        setLoading(false);
        setIsInternal(false);
    };

    return {
        formData,
        setFormData,
        activeStep,
        setActiveStep,
        errors,
        setErrors,
        loading,
        setLoading,
        isInternal,
        isInterProfile,
        handleChange,
        handleInternalSwitch,
        validateCurrentStep,
        resetForm
    };
};