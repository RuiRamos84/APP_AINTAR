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

    // Validação do passo atual - CORRIGIDA
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
        entityData = null // ✅ Parâmetro adicional
    ) => {
        const newErrors = {};

        switch (activeStep) {
            case 0: // Identificação
                if (!isInternal) {
                    if (!formData.nipc || formData.nipc.length !== 9) {
                        newErrors.nipc = 'NIPC válido é obrigatório';
                    }

                    if (formData.tb_representative && formData.tb_representative.length !== 9) {
                        newErrors.tb_representative = 'NIF do representante é obrigatório';
                    }
                }
                break;

            case 1: // Morada
                if (!isInternal) {
                    // ✅ Verificar se entidade tem dados completos PRIMEIRO
                    if (entityData) {
                        const requiredEntityFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
                        const missingEntityFields = requiredEntityFields.filter(field =>
                            !entityData[field] || entityData[field].toString().trim() === ''
                        );

                        if (missingEntityFields.length > 0) {
                            newErrors.entity_incomplete = 'Complete os dados da entidade antes de prosseguir';
                            break; // Parar validação aqui
                        }
                    }

                    // Validar morada de faturação
                    if (!billingAddress.postal) {
                        newErrors.postal = 'Código postal é obrigatório';
                    }
                    if (!billingAddress.address) {
                        newErrors.address = 'Morada é obrigatória';
                    }
                    if (!billingAddress.nut4) {
                        newErrors.nut4 = 'Localidade é obrigatória';
                    }
                    if (!billingAddress.nut3) {
                        newErrors.nut3 = 'Freguesia é obrigatória';
                    }
                    if (!billingAddress.nut2) {
                        newErrors.nut2 = 'Concelho é obrigatório';
                    }
                    if (!billingAddress.nut1) {
                        newErrors.nut1 = 'Distrito é obrigatório';
                    }

                    // Se usa morada diferente, validar também
                    if (isDifferentAddress) {
                        if (!shippingAddress.postal) {
                            newErrors.shipping_postal = 'Código postal é obrigatório';
                        }
                        if (!shippingAddress.address) {
                            newErrors.shipping_address = 'Morada é obrigatória';
                        }
                        if (!shippingAddress.nut4) {
                            newErrors.shipping_nut4 = 'Localidade é obrigatória';
                        }
                        if (!shippingAddress.nut3) {
                            newErrors.shipping_nut3 = 'Freguesia é obrigatória';
                        }
                        if (!shippingAddress.nut2) {
                            newErrors.shipping_nut2 = 'Concelho é obrigatório';
                        }
                        if (!shippingAddress.nut1) {
                            newErrors.shipping_nut1 = 'Distrito é obrigatório';
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
                // Validar parâmetros obrigatórios
                if (docTypeParams && docTypeParams.length > 0) {
                    docTypeParams.forEach(param => {
                        if (param.mandatory === 1 && !paramValues[`param_${param.tb_param}`]) {
                            newErrors[`param_${param.tb_param}`] = `${param.name} é obrigatório`;
                        }
                    });
                }
                break;

            case 4: // Anexos
                // Verificar se o pedido tem descrição ou pelo menos um arquivo
                if (!formData.memo && formData.files.length === 0) {
                    newErrors.memo = 'Preencha as observações ou anexe pelo menos um arquivo';
                    newErrors.files = 'Preencha as observações ou anexe pelo menos um arquivo';
                }

                // Verificar se todos os arquivos têm descrição
                formData.files.forEach((file, index) => {
                    if (!file.description.trim()) {
                        newErrors[`file_${index}`] = 'Descrição obrigatória';
                    }
                });
                break;

            case 5: // Confirmação - apenas validação geral
                // Verificação final, que agrupa todas as validações anteriores
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