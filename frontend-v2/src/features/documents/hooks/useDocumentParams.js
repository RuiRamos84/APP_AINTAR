import { useState, useEffect, useMemo } from 'react';
import { useMetaData } from '@/core/hooks/useMetaData';

/**
 * Hook to manage dynamic document parameters based on document type.
 * Ports logic from legacy useDocumentParams.js
 */
export const useDocumentParams = (selectedType) => {
    const { data: metaData } = useMetaData();
    const [docTypeParams, setDocTypeParams] = useState([]);
    const [paramValues, setParamValues] = useState({});

    // Helper to normalize values based on type
    const normalizeValue = (value, type) => {
        // Type 4 is Boolean
        if (type === '4' || type === 4) {
            if (value === true || value === 'true' || value === '1' || value === 1) {
                return '1';
            }
            return '0';
        }
        return value !== null && value !== undefined ? value : '';
    };

    // Calculate parameters when type changes
    useEffect(() => {
        if (!selectedType || !metaData?.param_doctype || !metaData?.param) {
            setDocTypeParams([]);
            setParamValues({});
            return;
        }

        try {
            // Filter relevant parameters for this document type that are marked for creation (oncreate === 1)
            const relevantParamsLinks = metaData.param_doctype.filter(link => 
                link && 
                String(link.tt_doctype) === String(selectedType) && 
                link.oncreate === 1
            );

            if (relevantParamsLinks.length === 0) {
                setDocTypeParams([]);
                setParamValues({});
                return;
            }

            // Map to full parameter definitions and sort
            const combinedParams = relevantParamsLinks.map(link => {
                // Find base param definition matched by 'tb_param'
                const baseParam = metaData.param.find(p => 
                    p && String(p.pk) === String(link.tb_param)
                );

                return {
                    ...(baseParam || {}),
                    ...link, // Link properties overwrite base (like custom label if exists?)
                    link_pk: link.pk, // keep link pk reference
                    param_pk: link.tb_param
                };
            }).sort((a, b) => (a.sort || 0) - (b.sort || 0));

            setDocTypeParams(combinedParams);

            // Initialize values
            const initialValues = {};
            combinedParams.forEach(param => {
                const key = `param_${param.param_pk}`;
                // Default value is empty string or '0' for logic
                // Legacy logic didn't seem to pull defaults from metadata, defaulting to empty.
                initialValues[key] = normalizeValue('', param.type);
            });
            setParamValues(initialValues);

        } catch (error) {
            console.error("Error calculating document params:", error);
            setDocTypeParams([]);
        }

    }, [selectedType, metaData]);

    const handleParamChange = (paramId, value) => {
        const param = docTypeParams.find(p => String(p.param_pk) === String(paramId));
        if (!param) return;

        const normalized = normalizeValue(value, param.type);
        setParamValues(prev => ({
            ...prev,
            [`param_${paramId}`]: normalized
        }));
    };

    return {
        docTypeParams,
        paramValues,
        handleParamChange,
        setParamValues
    };
};
