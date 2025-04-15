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
            // Converter para formato 1/0 internamente
            if (value === true || value === 'true' || value === '1' || value === 1) {
                return '1';
            }
            return '0';
        }

        if (type === '1') { // Tipo numérico
            // Garantir que é número
            return value !== null && value !== undefined ? value : '';
        }

        // Outros tipos, manter o valor
        return value !== null && value !== undefined ? value : '';
    };

    // Efeito para atualizar o tipo de documento selecionado
    useEffect(() => {
        if (formData.tt_type && entityData?.pk) {
            // Encontrar o tipo selecionado nos metadados
            const selectedType = metaData?.types?.find(
                type => type.tt_doctype_code === formData.tt_type
            );

            if (selectedType) {
                const typeText = selectedType.tt_doctype_value;
                setSelectedTypeText(typeText);

                // Encontrar o contador correspondente para este tipo
                if (entityData.entityCountTypes && entityData.entityCountTypes.length > 0) {
                    const countType = entityData.entityCountTypes.find(
                        ct => ct.tt_type === typeText
                    );

                    setSelectedCountType(countType || null);

                    if (countType) {
                        notifyInfo(
                            `No ano corrente temos registo de ${countType.typecountyear} pedidos do tipo ${typeText} recebidos por parte desta entidade, e no total global ${countType.typecountall}.`
                        );
                    } else {
                        notifyWarning(
                            `Não temos registo de pedidos do tipo ${typeText} por esta entidade.`
                        );
                    }
                }
            }
        } else {
            setSelectedTypeText("");
            setSelectedCountType(null);
        }
    }, [formData.tt_type, entityData?.pk, metaData?.types, entityData?.entityCountTypes]);

    // Buscar parâmetros do tipo de documento quando o tipo mudar
    useEffect(() => {
        const fetchDocumentTypeParams = async () => {
            if (!formData.tt_type) {
                setDocTypeParams([]);
                setParamValues({});
                return;
            }

            try {
                console.log("Buscando parâmetros para o tipo:", formData.tt_type);

                // Verificar se temos param_doctype nos metadados
                const paramDocTypeMeta = metaData?.param_doctype || [];
                console.log("Metadados param_doctype disponíveis:", paramDocTypeMeta.length);

                // Filtrar diretamente pelo tipo do documento e oncreate=1
                const relevantParams = paramDocTypeMeta.filter(param => {
                    if (!param) return false;

                    const isRelevantType = param.tt_doctype &&
                        safeToString(param.tt_doctype) === safeToString(formData.tt_type);
                    const isOncreate = param.oncreate === 1;

                    return isRelevantType && isOncreate;
                });

                console.log("Parâmetros relevantes encontrados:", relevantParams.length);

                // Se não houver parâmetros relevantes, não precisamos continuar
                if (relevantParams.length === 0) {
                    setDocTypeParams([]);
                    setParamValues({});
                    return;
                }

                // Tentar obter parâmetros da API
                try {
                    const response = await getDocumentTypeParams(formData.tt_type);
                    console.log("Resposta da API de parâmetros:", response);

                    // Processar os parâmetros da API
                    if (response) {
                        // Mapear os parâmetros combinando dados da API e metadados
                        const combinedParams = relevantParams.map(metaParam => {
                            // Buscar dados básicos do parâmetro
                            const baseParam = metaData?.param?.find(p =>
                                p && metaParam && p.pk && metaParam.tb_param &&
                                safeToString(p.pk) === safeToString(metaParam.tb_param)
                            );

                            // Buscar dados da API para este parâmetro
                            const apiParam = Array.isArray(response)
                                ? response.find(p =>
                                    p && metaParam && p.tb_param && metaParam.tb_param &&
                                    safeToString(p.tb_param) === safeToString(metaParam.tb_param)
                                )
                                : null;

                            // Combinar todos os dados
                            return {
                                ...(baseParam || {}),
                                ...(apiParam || {}),
                                ...metaParam
                            };
                        });

                        const sortedParams = combinedParams.sort((a, b) => {
                            if (a.sort !== undefined && b.sort !== undefined) {
                                return a.sort - b.sort;
                            }
                            return 0;
                        });

                        console.log("Parâmetros finais:", sortedParams);
                        setDocTypeParams(sortedParams);

                        // Inicializar valores normalizados para cada tipo
                        const initialValues = {};
                        sortedParams.forEach(param => {
                            if (param && param.tb_param) {
                                // Normalizar o valor com base no tipo
                                const normalizedValue = normalizeValue(param.value || '', param.type);
                                initialValues[`param_${param.tb_param}`] = normalizedValue;
                                initialValues[`param_memo_${param.tb_param}`] = param.memo || '';
                            }
                        });

                        setParamValues(initialValues);
                    }
                } catch (apiError) {
                    console.error("Erro ao chamar a API de parâmetros:", apiError);
                    // Continuar com os parâmetros dos metadados mesmo sem a API

                    const sortedParams = relevantParams.sort((a, b) => {
                        if (a.sort !== undefined && b.sort !== undefined) {
                            return a.sort - b.sort;
                        }
                        return 0;
                    });

                    console.log("Usando apenas parâmetros dos metadados:", sortedParams);
                    setDocTypeParams(sortedParams);

                    // Inicializar valores com valores padrão normalizados
                    const initialValues = {};
                    sortedParams.forEach(param => {
                        if (param && param.tb_param) {
                            // Definir valor inicial padrão com base no tipo
                            let defaultValue = '';
                            if (param.type === '4') { // Tipo booleano
                                defaultValue = ''; // Padrão "Não"
                            }

                            initialValues[`param_${param.tb_param}`] = defaultValue;
                            initialValues[`param_memo_${param.tb_param}`] = '';
                        }
                    });

                    setParamValues(initialValues);
                }

            } catch (error) {
                console.error("Erro ao processar parâmetros:", error);
                notifyError("Erro ao carregar parâmetros adicionais");
                setDocTypeParams([]);
                setParamValues({});
            }
        };

        fetchDocumentTypeParams();
    }, [formData.tt_type, metaData?.param, metaData?.param_doctype]);

    // Handler para mudanças nos parâmetros
    const handleParamChange = (e) => {
        // Verificar se é uma atualização em massa
        if (e.target.name === 'bulk_update') {
            // Normalizar todos os valores na atualização em massa
            const newValues = { ...e.target.value };

            // Encontrar os tipos de cada parâmetro
            docTypeParams.forEach(param => {
                const paramKey = `param_${param.tb_param}`;
                if (newValues[paramKey] !== undefined) {
                    newValues[paramKey] = normalizeValue(newValues[paramKey], param.type);
                }
            });

            setParamValues(newValues);
            return;
        }

        // Atualização normal de um único parâmetro
        const { name, value } = e.target;

        // Se for um parâmetro (não memo), normalizar o valor
        if (name.startsWith('param_') && !name.startsWith('param_memo_')) {
            const paramId = name.replace('param_', '');
            const param = docTypeParams.find(p => String(p.tb_param) === String(paramId));

            if (param) {
                const normalizedValue = normalizeValue(value, param.type);

                setParamValues(prev => ({
                    ...prev,
                    [name]: normalizedValue
                }));
                return;
            }
        }

        // Caso padrão (memo ou parâmetro não encontrado)
        setParamValues(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Função para preparar os valores para envio ao backend
    const prepareParamValuesForSubmit = () => {
        const preparedValues = { ...paramValues };

        // Não precisamos fazer nada para os parâmetros tipo 4 (booleano)
        // pois já estamos armazenando como '0'/'1'

        return preparedValues;
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