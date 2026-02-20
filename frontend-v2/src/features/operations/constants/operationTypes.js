/**
 * Operation Action Types
 * Centralized definition for operation types
 */

export const OPERATION_TYPES = {
    NUMBER: 1,
    TEXT: 2,
    REFERENCE: 3,
    BOOLEAN: 4,
    ANALYSIS: 5
};

export const OPERATION_TYPE_CONFIG = {
    [OPERATION_TYPES.NUMBER]: {
        id: 1,
        name: 'Numérico',
        description: 'Valor numérico',
        inputType: 'number',
        label: 'Valor Numérico',
        placeholder: 'Ex: 42.5',
        displayLabel: 'Valor registado:',
        modalTitle: 'Inserir Valor Numérico'
    },
    [OPERATION_TYPES.TEXT]: {
        id: 2,
        name: 'Texto',
        description: 'Texto livre / Observações',
        inputType: 'text',
        label: 'Observações',
        placeholder: 'Insira as observações da operação...',
        displayLabel: 'Observações:',
        modalTitle: 'Adicionar Observações',
        multiline: true,
        rows: 4
    },
    [OPERATION_TYPES.REFERENCE]: {
        id: 3,
        name: 'Referência',
        description: 'Seleção de referência',
        inputType: 'select',
        label: 'Selecione uma opção',
        displayLabel: 'Seleção:',
        modalTitle: 'Inserir Referência',
        refFields: {
            obj: 'tt_operacaoaccao_refobj',
            pk: 'tt_operacaoaccao_refpk',
            value: 'tt_operacaoaccao_refvalue'
        }
    },
    [OPERATION_TYPES.BOOLEAN]: {
        id: 4,
        name: 'Boolean',
        description: 'Sim/Não (checkbox)',
        inputType: 'checkbox',
        label: 'Operação concluída com sucesso',
        displayLabel: 'Estado:',
        modalTitle: 'Confirmar Conclusão',
        valueMapping: {
            true: '1',
            false: '0',
            checked: '✓ Confirmado',
            unchecked: '✗ Não confirmado'
        }
    },
    [OPERATION_TYPES.ANALYSIS]: {
        id: 5,
        name: 'Análise',
        description: 'Recolha de análises',
        inputType: 'complex',
        label: 'Registar Análise',
        displayLabel: 'Resultado:',
        modalTitle: 'Registar Análise',
        analysisFields: {
            param: 'tt_analiseparam',
            point: 'tt_analiseponto',
            form: 'tt_analiseforma',
            id: 'id_analise',
            result: 'resultado'
        },
        laboratoryKeyword: 'laborat',
        labCollectionLabel: 'Recolha realizada',
        localMeasurementLabel: 'Valores registados:'
    }
};

export const getOperationTypeConfig = (typeId) => {
    return OPERATION_TYPE_CONFIG[typeId] || null;
};

export const getModalTitle = (typeId) => {
    const config = OPERATION_TYPE_CONFIG[typeId];
    return config?.modalTitle || 'Concluir Tarefa';
};

export const isLaboratoryParameter = (analiseForma) => {
    if (!analiseForma) return false;
    const keyword = OPERATION_TYPE_CONFIG[OPERATION_TYPES.ANALYSIS]?.laboratoryKeyword || 'laborat';
    return analiseForma.toLowerCase().includes(keyword);
};

export const formatBooleanValue = (value) => {
    const config = OPERATION_TYPE_CONFIG[OPERATION_TYPES.BOOLEAN];
    return value === '1' ? config.valueMapping.checked : config.valueMapping.unchecked;
};

export default OPERATION_TYPE_CONFIG;
