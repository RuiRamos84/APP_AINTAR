// frontend/src/features/Pavimentations/constants/pavimentationTypes.js

import {
    HourglassEmpty as PendingIcon,
    Build as ExecutedIcon,
    CheckCircle as CompletedIcon,
    PlayArrow as ExecuteIcon,
    Payment as PaymentIcon
} from '@mui/icons-material';

/**
 * Estados das pavimentações com suas configurações
 */
export const PAVIMENTATION_STATUS = {
    PENDING: {
        id: 'pending',
        key: 'PENDING',
        label: 'Pendente',
        pluralLabel: 'Pendentes',
        color: 'warning',
        icon: PendingIcon,
        view: 'vbr_document_pav01',
        endpoint: '/document_ramais',
        description: 'Aguarda execução da pavimentação',
        canExecuteActions: true,
        availableActions: ['execute']
    },
    EXECUTED: {
        id: 'executed',
        key: 'EXECUTED',
        label: 'Executada',
        pluralLabel: 'Executadas',
        color: 'info',
        icon: ExecutedIcon,
        view: 'vbr_document_pav02',
        endpoint: '/document_ramais_executed',
        description: 'Pavimentação executada, aguarda pagamento',
        canExecuteActions: true,
        availableActions: ['pay']
    },
    COMPLETED: {
        id: 'completed',
        key: 'COMPLETED',
        label: 'Concluída',
        pluralLabel: 'Concluídas',
        color: 'success',
        icon: CompletedIcon,
        view: 'vbr_document_pav03',
        endpoint: '/document_ramais_concluded',
        description: 'Pavimentação paga e concluída',
        canExecuteActions: false,
        availableActions: []
    }
};

/**
 * Ações disponíveis nas pavimentações
 */
export const PAVIMENTATION_ACTIONS = {
    EXECUTE: {
        id: 'execute',
        key: 'EXECUTE',
        label: 'Executar',
        icon: ExecuteIcon,
        color: 'primary',
        variant: 'contained',
        endpoint: '/document_pavenext',
        confirmTitle: 'Executar Pavimentação',
        confirmMessage: 'Tem certeza que deseja marcar esta pavimentação como executada?',
        confirmDetails: 'Esta ação irá mover a pavimentação para a lista de "Executadas (Aguardam Pagamento)".',
        successMessage: 'Pavimentação marcada como executada com sucesso',
        errorMessage: 'Erro ao marcar pavimentação como executada',
        fromStatus: 'pending',
        toStatus: 'executed',
        requiresConfirmation: true
    },
    PAY: {
        id: 'pay',
        key: 'PAY',
        label: 'Marcar como Paga',
        shortLabel: 'Pagar',
        icon: PaymentIcon,
        color: 'success',
        variant: 'contained',
        endpoint: '/document_pavpaid',
        confirmTitle: 'Marcar como Paga',
        confirmMessage: 'Tem certeza que deseja marcar esta pavimentação como paga?',
        confirmDetails: 'Esta ação irá mover a pavimentação para a lista de "Concluídas e Pagas".',
        successMessage: 'Pavimentação marcada como paga com sucesso',
        errorMessage: 'Erro ao marcar pavimentação como paga',
        fromStatus: 'executed',
        toStatus: 'completed',
        requiresConfirmation: true
    }
};

/**
 * Tipos de pavimentação
 */
export const PAVIMENTATION_TYPES = {
    BETUMINOSO: {
        id: 'betuminoso',
        label: 'Betuminoso',
        fields: ['comprimento_bet', 'area_bet'],
        color: '#2E7D32'
    },
    PARALELOS: {
        id: 'paralelos',
        label: 'Paralelos',
        fields: ['comprimento_gra', 'area_gra'],
        color: '#1976D2'
    },
    PAVE: {
        id: 'pave',
        label: 'Pavê',
        fields: ['comprimento_pav', 'area_pav'],
        color: '#7B1FA2'
    }
};

/**
 * Configurações de filtros e agrupamentos
 */
export const FILTER_OPTIONS = {
    SEARCH_FIELDS: [
        'regnumber',
        'ts_entity',
        'nut4',
        'nut3',
        'nut2',
        'address',
        'phone',
        'memo'
    ],
    GROUP_BY_OPTIONS: [
        { value: '', label: 'Sem agrupamento' },
        { value: 'nut4', label: 'Por Localidade' },
        { value: 'nut3', label: 'Por Freguesia' },
        { value: 'nut2', label: 'Por Concelho' },
        { value: 'ts_entity', label: 'Por Entidade' },
        { value: 'submission_month', label: 'Por Mês de Submissão' }
    ],
    SORT_OPTIONS: [
        { value: 'regnumber', label: 'Número do Pedido' },
        { value: 'ts_entity', label: 'Entidade' },
        { value: 'nut4', label: 'Localidade' },
        { value: 'submission', label: 'Data de Submissão' },
        { value: 'comprimento_total', label: 'Comprimento Total' },
        { value: 'area_total', label: 'Área Total' }
    ]
};

/**
 * Configurações de exportação
 */
export const EXPORT_CONFIG = {
    FILENAME_PREFIX: 'pavimentacoes',
    SHEET_NAME: 'Pavimentações',
    HEADERS: {
        regnumber: 'Número do Pedido',
        ts_entity: 'Entidade',
        nut4: 'Localidade',
        nut3: 'Freguesia',
        nut2: 'Concelho',
        address: 'Morada',
        door: 'Porta',
        floor: 'Andar',
        postal: 'Código Postal',
        phone: 'Contacto',
        memo: 'Observações',
        comprimento_total: 'Comprimento Total (m)',
        area_total: 'Área Total (m²)',
        comprimento_bet: 'Comprimento Betuminoso (m)',
        area_bet: 'Área Betuminoso (m²)',
        comprimento_gra: 'Comprimento Paralelos (m)',
        area_gra: 'Área Paralelos (m²)',
        comprimento_pav: 'Comprimento Pavê (m)',
        area_pav: 'Área Pavê (m²)',
        submission: 'Data de Submissão',
        execution_date: 'Data de Execução',
        completion_date: 'Data de Conclusão',
        status: 'Status'
    }
};

/**
 * Utilitários para trabalhar com status
 */
export const StatusUtils = {
    /**
     * Obter configuração de status por ID
     */
    getStatusConfig: (statusId) => {
        return Object.values(PAVIMENTATION_STATUS).find(
            status => status.id === statusId || status.key === statusId
        );
    },

    /**
     * Obter configuração de ação por ID
     */
    getActionConfig: (actionId) => {
        return Object.values(PAVIMENTATION_ACTIONS).find(
            action => action.id === actionId || action.key === actionId
        );
    },

    /**
     * Verificar se status permite ações
     */
    canExecuteActions: (statusId) => {
        const config = StatusUtils.getStatusConfig(statusId);
        return config?.canExecuteActions || false;
    },

    /**
     * Obter ações disponíveis para um status
     */
    getAvailableActions: (statusId) => {
        const config = StatusUtils.getStatusConfig(statusId);
        return config?.availableActions || [];
    },

    /**
     * Obter próximo status após ação
     */
    getNextStatus: (currentStatus, actionId) => {
        const actionConfig = StatusUtils.getActionConfig(actionId);
        if (actionConfig && actionConfig.fromStatus === currentStatus) {
            return actionConfig.toStatus;
        }
        return null;
    }
};

/**
 * Helpers para formatação de dados
 */
export const DataHelpers = {
    /**
     * Calcular totais de comprimento e área
     */
    calculateTotals: (item) => {
        const comprimento_total = (
            parseFloat(item.comprimento_bet || 0) +
            parseFloat(item.comprimento_gra || 0) +
            parseFloat(item.comprimento_pav || 0)
        ).toFixed(2);

        const area_total = (
            parseFloat(item.area_bet || 0) +
            parseFloat(item.area_gra || 0) +
            parseFloat(item.area_pav || 0)
        ).toFixed(2);

        return {
            ...item,
            comprimento_total: parseFloat(comprimento_total),
            area_total: parseFloat(area_total)
        };
    },

    /**
     * Extrair mês/ano de uma data
     */
    getSubmissionMonth: (dateString) => {
        if (!dateString) return 'Sem data';

        try {
            const datePart = dateString.includes(' às ')
                ? dateString.split(' às ')[0]
                : dateString;

            const [year, month] = datePart.split('-');
            const monthNames = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];

            return `${monthNames[parseInt(month) - 1]} de ${year}`;
        } catch (error) {
            return 'Data inválida';
        }
    },

    /**
     * Validar se um valor numérico é válido
     */
    isValidNumber: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    },

    /**
     * Formatar valor monetário (se aplicável)
     */
    formatCurrency: (value) => {
        if (!value || isNaN(value)) return '€0,00';
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    },

    /**
     * Formatar medidas (metros, metros quadrados)
     */
    formatMeasurement: (value, unit = 'm') => {
        if (!DataHelpers.isValidNumber(value)) return '-';
        return `${parseFloat(value).toFixed(2)}${unit}`;
    }
};

export default {
    PAVIMENTATION_STATUS,
    PAVIMENTATION_ACTIONS,
    PAVIMENTATION_TYPES,
    FILTER_OPTIONS,
    EXPORT_CONFIG,
    StatusUtils,
    DataHelpers
};