import { useState, useEffect, useRef, useMemo } from 'react';
import { useMetaData } from '@/core/hooks/useMetaData';
import { documentsService } from '../api/documentsService';

/**
 * Hook to manage dynamic document parameters and entity statistics.
 * Ported from legacy ModernDocuments/modals/create/hooks/useDocumentParams.js
 *
 * @param {number|string} selectedTypeCode - The tt_doctype_code of the selected document type
 * @param {object|null} entityData - The selected entity data
 */
export const useDocumentParams = (selectedTypeCode, entityData) => {
    const { data: metaData } = useMetaData();
    const [docTypeParams, setDocTypeParams] = useState([]);
    const [paramValues, setParamValues] = useState({});

    // Entity Statistics State
    const [entityCountTypes, setEntityCountTypes] = useState([]);
    const [selectedCountType, setSelectedCountType] = useState(null);
    const [selectedTypeText, setSelectedTypeText] = useState('');
    const [loadingCounts, setLoadingCounts] = useState(false);

    // Prevent duplicate notifications
    const lastNotifiedType = useRef(null);

    // Boolean param names fallback (legacy parity)
    const BOOLEAN_PARAM_NAMES = [
        'Gratuito',
        'Urgência',
        'Existência de saneamento até 20 m',
        'Existência de sanemanto até 20 m',
        'Existência de rede de água',
        'Existe pavimento',
        'Existe rede de águas',
        'Existe rede de esgotos',
        'Existe rede de telecomunicações',
        'Existe rede de gás',
        'Existe rede elétrica',
        'Necessita licenciamento',
        'Obra em zona protegida'
    ];

    const isBooleanByName = (name) => {
        if (!name) return false;
        return BOOLEAN_PARAM_NAMES.some(bp => name.toLowerCase().includes(bp.toLowerCase()));
    };

    // Normalize values
    const normalizeValue = (value, type, name) => {
        if (value === null || value === undefined || value === '') {
            return '';
        }
        if (String(type) === '4' || isBooleanByName(name)) {
            if (value === true || value === 'true' || value === '1' || value === 1) return '1';
            if (value === false || value === 'false' || value === '0' || value === 0) return '0';
            return '';
        }
        return value;
    };

    // Safe toString helper
    const safeToString = (value) => {
        if (value === undefined || value === null) return '';
        return String(value);
    };

    // selectedTypeCode já vem diretamente do form (tt_doctype_code)

    // Resolve selectedTypeCode → type name (for statistics matching)
    const selectedTypeName = useMemo(() => {
        if (!selectedTypeCode || !metaData?.types) return '';
        const typeEntry = metaData.types.find(t =>
            safeToString(t.tt_doctype_code) === safeToString(selectedTypeCode)
        );
        return typeEntry?.tt_doctype_value || '';
    }, [selectedTypeCode, metaData?.types]);

    // ===== ENTITY COUNT TYPES (STATISTICS) =====
    useEffect(() => {
        const fetchEntityCountTypes = async () => {
            if (!entityData?.pk) {
                setEntityCountTypes([]);
                setSelectedCountType(null);
                return;
            }

            setLoadingCounts(true);
            try {
                const response = await documentsService.fetchEntityDocumentTypes(entityData.pk);
                // API returns { data: [{ count_types: [...] }] }
                const data = response?.data?.[0] || response?.[0];
                const countTypes = data?.count_types || [];
                setEntityCountTypes(Array.isArray(countTypes) ? countTypes : []);
            } catch (error) {
                console.error('[useDocumentParams] Erro ao buscar contagens:', error);
                setEntityCountTypes([]);
            } finally {
                setLoadingCounts(false);
            }
        };

        fetchEntityCountTypes();
    }, [entityData?.pk]);

    // Match entity count to selected type
    useEffect(() => {
        if (!selectedTypeName || entityCountTypes.length === 0) {
            setSelectedCountType(null);
            setSelectedTypeText(selectedTypeName);
            return;
        }

        setSelectedTypeText(selectedTypeName);
        const countType = entityCountTypes.find(ct => ct.tt_type === selectedTypeName);
        setSelectedCountType(countType || null);
    }, [selectedTypeName, entityCountTypes]);

    // ===== DOCUMENT TYPE PARAMETERS =====
    useEffect(() => {
        if (!selectedTypeCode || !metaData?.param_doctype || !metaData?.param) {
            setDocTypeParams([]);
            setParamValues({});
            return;
        }

        try {
            // Filter params for this document type code, marked for creation
            const relevantParamsLinks = metaData.param_doctype.filter(param => {
                if (!param) return false;
                const isRelevantType = safeToString(param.tt_doctype) === safeToString(selectedTypeCode);
                const isOncreate = param.oncreate == 1 || param.oncreate === true;
                return isRelevantType && isOncreate;
            });

            if (relevantParamsLinks.length === 0) {
                setDocTypeParams([]);
                setParamValues({});
                return;
            }

            // Combine with base param definitions
            const combinedParams = relevantParamsLinks.map(metaParam => {
                const baseParam = metaData.param.find(p =>
                    p && metaParam && p.pk && metaParam.tb_param &&
                    safeToString(p.pk) === safeToString(metaParam.tb_param)
                );

                return {
                    ...(baseParam || {}),
                    ...metaParam,
                    link_pk: metaParam.pk,
                    param_pk: metaParam.tb_param
                };
            });

            // Sort by 'sort' field
            const sortedParams = combinedParams.sort((a, b) => {
                if (a.sort !== undefined && b.sort !== undefined) return a.sort - b.sort;
                return 0;
            });

            setDocTypeParams(sortedParams);

            // Initialize values
            const initialValues = {};
            sortedParams.forEach(param => {
                if (param?.tb_param) {
                    const normalized = normalizeValue(param.value || '', param.type, param.name);
                    initialValues[`param_${param.tb_param}`] = normalized;
                    initialValues[`param_memo_${param.tb_param}`] = param.memo || '';
                }
            });
            setParamValues(initialValues);

        } catch (error) {
            console.error('[useDocumentParams] Erro ao processar parâmetros:', error);
            setDocTypeParams([]);
            setParamValues({});
        }
    }, [selectedTypeCode, metaData?.param, metaData?.param_doctype]);

    // Handler for param changes
    const handleParamChange = (paramId, value) => {
        const param = docTypeParams.find(p => safeToString(p.param_pk) === safeToString(paramId));
        if (!param) return;

        const normalized = normalizeValue(value, param.type, param.name);
        setParamValues(prev => ({
            ...prev,
            [`param_${paramId}`]: normalized
        }));
    };

    return {
        // Params
        docTypeParams,
        paramValues,
        handleParamChange,
        setParamValues,
        // Statistics
        entityCountTypes,
        selectedCountType,
        selectedTypeText,
        loadingCounts,
    };
};
