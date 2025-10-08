/**
 * Tipos de Ação de Operação
 *
 * Centralização das definições dos tipos de operação para manutenção consistente
 * em todo o sistema.
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
        // Campo que indica qual view consultar: tt_operacaoaccao_refobj
        // Retorna pk e value, guarda pk em valuetext
        refFields: {
            obj: 'tt_operacaoaccao_refobj',  // View a consultar
            pk: 'tt_operacaoaccao_refpk',    // Campo PK
            value: 'tt_operacaoaccao_refvalue' // Campo Value (para display)
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
        description: 'Recolha de análises (pode incluir medições locais ou apenas recolha para laboratório)',
        inputType: 'complex',
        label: 'Registar Análise',
        displayLabel: 'Resultado:',
        modalTitle: 'Registar Análise',
        // Informação adicional das análises vem de:
        // SELECT tt_analiseparam, tt_analiseponto, tt_analiseforma, pk as id_analise, resultado
        // FROM vbl_instalacao_analise
        // WHERE tb_operacao = <pk_operacao>
        // ORDER BY data, tb_instalacao, tt_analiseponto, tt_analiseparam
        analysisFields: {
            param: 'tt_analiseparam',    // Parâmetro de análise (PK)
            point: 'tt_analiseponto',    // Ponto de análise (PK)
            form: 'tt_analiseforma',     // Forma de análise (ex: "Laboratorial", "Amostragem Pontual")
            id: 'id_analise',            // PK da análise individual
            result: 'resultado'          // Campo onde guardar o resultado
        },
        // Lógica especial:
        // - Se forma contém "laborat" -> campo desabilitado (só recolha)
        // - Se resultado já existe -> campo desabilitado
        // - valuetext pode conter:
        //   - Valores separados por vírgula (ex: "12.6, 7.5") se tem medições locais
        //   - "1" se é só recolha de laboratório (boolean)
        laboratoryKeyword: 'laborat',
        labCollectionLabel: 'Recolha realizada',
        localMeasurementLabel: 'Valores registados:'
    }
};

/**
 * Helper: Obter configuração de um tipo
 */
export const getOperationTypeConfig = (typeId) => {
    return OPERATION_TYPE_CONFIG[typeId] || null;
};

/**
 * Helper: Obter label de display para um tipo
 */
export const getDisplayLabel = (typeId) => {
    const config = getOperationTypeConfig(typeId);
    return config?.displayLabel || 'Resposta:';
};

/**
 * Helper: Obter título do modal para um tipo
 */
export const getModalTitle = (typeId) => {
    const config = getOperationTypeConfig(typeId);
    return config?.modalTitle || 'Concluir Tarefa';
};

/**
 * Helper: Verificar se é tipo de análise
 */
export const isAnalysisType = (typeId) => {
    return typeId === OPERATION_TYPES.ANALYSIS;
};

/**
 * Helper: Verificar se é tipo boolean
 */
export const isBooleanType = (typeId) => {
    return typeId === OPERATION_TYPES.BOOLEAN;
};

/**
 * Helper: Verificar se é tipo de referência
 */
export const isReferenceType = (typeId) => {
    return typeId === OPERATION_TYPES.REFERENCE;
};

/**
 * Helper: Formatar valor de boolean para display
 */
export const formatBooleanValue = (value) => {
    const config = OPERATION_TYPE_CONFIG[OPERATION_TYPES.BOOLEAN];
    return value === '1' ? config.valueMapping.checked : config.valueMapping.unchecked;
};

/**
 * Helper: Verificar se parâmetro de análise é de laboratório
 */
export const isLaboratoryParameter = (forma) => {
    if (!forma) return false;
    const config = OPERATION_TYPE_CONFIG[OPERATION_TYPES.ANALYSIS];
    return forma.toLowerCase().includes(config.laboratoryKeyword);
};

export default OPERATION_TYPE_CONFIG;
