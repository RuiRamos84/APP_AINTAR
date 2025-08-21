import { useState, useEffect } from 'react';
import { notifyInfo, notifyWarning, notifyError } from '../../../../../components/common/Toaster/ThemedToaster';
import { getDocumentTypeParams } from '../../../../../services/documentService';

export const useDocumentParams = (formData, entityData, metaData) => {
    const [docTypeParams, setDocTypeParams] = useState([]);
    const [paramValues, setParamValues] = useState({});
    const [selectedCountType, setSelectedCountType] = useState(null);
    const [selectedTypeText, setSelectedTypeText] = useState("");

    // Função segura para converter para string
    const safeToString = (value) => {
        if (value === undefined || value === null) return "";
        return String(value);
    };

    // Função para normalizar valores booleanos
    const normalizeValue = (value, type) => {
        if (type === '4') { // Tipo booleano
            if (value === true || value === 'true' || value === '1' || value === 1) {
                return '1';
            }
            return '0';
        }

        if (type === '1') { // Tipo numérico
            return value !== null && value !== undefined ? value : '';
        }

        return value !== null && value !== undefined ? value : '';
    };

    // Efeito para atualizar o tipo de documento selecionado
    useEffect(() => {
        console.log('🔍 useDocumentParams DEBUG:', {
            'formData.tt_type': formData.tt_type,
            'entityData?.pk': entityData?.pk,
            'entityData?.entityCountTypes': entityData?.entityCountTypes?.length,
            'metaData?.types length': metaData?.types?.length
        });

        if (formData.tt_type && entityData?.pk) {
            const selectedType = metaData?.types?.find(
                type => type.tt_doctype_code === formData.tt_type
            );

            console.log('📋 Tipo encontrado:', selectedType);

            if (selectedType) {
                const typeText = selectedType.tt_doctype_value;
                setSelectedTypeText(typeText);

                console.log('🏢 entityCountTypes:', entityData.entityCountTypes);

                if (entityData.entityCountTypes && entityData.entityCountTypes.length > 0) {
                    const countType = entityData.entityCountTypes.find(
                        ct => ct.tt_type === typeText
                    );

                    console.log('📊 countType encontrado:', countType);
                    setSelectedCountType(countType || null);

                    if (countType) {
                        notifyInfo(
                            `No ano corrente: ${countType.typecountyear} pedidos do tipo ${typeText}. Total global: ${countType.typecountall}.`
                        );
                    }
                } else {
                    console.log('⚠️ Sem entityCountTypes disponível');
                    setSelectedCountType(null);
                }
            }
        } else {
            setSelectedTypeText("");
            setSelectedCountType(null);
        }
    }, [formData.tt_type, entityData?.pk, metaData?.types, entityData?.entityCountTypes]);

    // ✅ BUSCAR PARÂMETROS - FUNCIONALIDADE CRÍTICA EM FALTA
    useEffect(() => {
        const fetchDocumentTypeParams = async () => {
            if (!formData.tt_type) {
                setDocTypeParams([]);
                setParamValues({});
                return;
            }

            try {
                console.log("🔍 Buscando parâmetros para tipo:", formData.tt_type);

                // 1. Verificar se temos param_doctype nos metadados
                const paramDocTypeMeta = metaData?.param_doctype || [];
                console.log("📋 Metadados param_doctype:", paramDocTypeMeta.length);

                // 2. Filtrar parâmetros relevantes
                const relevantParams = paramDocTypeMeta.filter(param => {
                    if (!param) return false;

                    const isRelevantType = param.tt_doctype &&
                        safeToString(param.tt_doctype) === safeToString(formData.tt_type);
                    const isOncreate = param.oncreate === 1;

                    return isRelevantType && isOncreate;
                });

                console.log("✅ Parâmetros relevantes:", relevantParams.length);

                if (relevantParams.length === 0) {
                    setDocTypeParams([]);
                    setParamValues({});
                    return;
                }

                // 3. Tentar obter da API
                let apiParams = [];
                try {
                    const apiResponse = await getDocumentTypeParams(formData.tt_type);
                    apiParams = Array.isArray(apiResponse) ? apiResponse : [];
                    console.log("🌐 Parâmetros da API:", apiParams.length);
                } catch (apiError) {
                    console.warn("⚠️ API não disponível, usando só metadados:", apiError);
                }

                // 4. Combinar dados
                const combinedParams = relevantParams.map(metaParam => {
                    // Buscar dados base do parâmetro
                    const baseParam = metaData?.param?.find(p =>
                        p && metaParam && p.pk && metaParam.tb_param &&
                        safeToString(p.pk) === safeToString(metaParam.tb_param)
                    );

                    // Buscar dados da API
                    const apiParam = apiParams.find(p =>
                        p && metaParam && p.tb_param && metaParam.tb_param &&
                        safeToString(p.tb_param) === safeToString(metaParam.tb_param)
                    );

                    // Combinar tudo
                    return {
                        ...(baseParam || {}),
                        ...(apiParam || {}),
                        ...metaParam
                    };
                });

                // 5. Ordenar por 'sort'
                const sortedParams = combinedParams.sort((a, b) => {
                    if (a.sort !== undefined && b.sort !== undefined) {
                        return a.sort - b.sort;
                    }
                    return 0;
                });

                console.log("🎯 Parâmetros finais:", sortedParams);
                setDocTypeParams(sortedParams);

                // 6. Inicializar valores
                const initialValues = {};
                sortedParams.forEach(param => {
                    if (param && param.tb_param) {
                        const normalizedValue = normalizeValue(param.value || '', param.type);
                        initialValues[`param_${param.tb_param}`] = normalizedValue;
                        initialValues[`param_memo_${param.tb_param}`] = param.memo || '';
                    }
                });

                setParamValues(initialValues);

            } catch (error) {
                console.error("❌ Erro ao processar parâmetros:", error);
                notifyError("Erro ao carregar parâmetros adicionais");
                setDocTypeParams([]);
                setParamValues({});
            }
        };

        fetchDocumentTypeParams();
    }, [formData.tt_type, metaData?.param, metaData?.param_doctype]);

    // Handler para mudanças nos parâmetros
    const handleParamChange = (e) => {
        // Verificar se é atualização em massa
        if (e.target.name === 'bulk_update') {
            const newValues = { ...e.target.value };

            // Normalizar todos os valores
            docTypeParams.forEach(param => {
                const paramKey = `param_${param.tb_param}`;
                if (newValues[paramKey] !== undefined) {
                    newValues[paramKey] = normalizeValue(newValues[paramKey], param.type);
                }
            });

            setParamValues(newValues);
            return;
        }

        // Atualização normal
        const { name, value } = e.target;

        // Se for parâmetro (não memo), normalizar
        if (name.startsWith('param_') && !name.startsWith('param_memo_')) {
            const paramId = name.replace('param_', '');
            const param = docTypeParams.find(p => String(p.tb_param) === String(paramId));

            if (param) {
                const normalizedValue = normalizeValue(value, param.type);
                setParamValues(prev => ({ ...prev, [name]: normalizedValue }));
                return;
            }
        }

        // Caso padrão
        setParamValues(prev => ({ ...prev, [name]: value }));
    };

    // Função para preparar valores para envio
    const prepareParamValuesForSubmit = () => {
        return { ...paramValues };
    };

    return {
        docTypeParams,
        paramValues,
        setParamValues,
        selectedCountType,
        selectedTypeText,
        handleParamChange,
        prepareParamValuesForSubmit
    };
};