// frontend/src/features/Pavimentations/constants/tableColumns.js

import { DataHelpers } from './pavimentationTypes';

/**
 * Configuração das colunas da tabela de pavimentações
 */
export const TABLE_COLUMNS = [
    {
        id: 'regnumber',
        label: 'Número',
        minWidth: 120,
        sortable: true,
        searchable: true,
        align: 'left',
        render: (value) => value || '-'
    },
    {
        id: 'ts_entity',
        label: 'Entidade',
        minWidth: 200,
        sortable: true,
        searchable: true,
        align: 'left',
        render: (value) => value || '-'
    },
    {
        id: 'nut4',
        label: 'Localidade',
        minWidth: 150,
        sortable: true,
        searchable: true,
        align: 'left',
        render: (value) => value || '-'
    },
    {
        id: 'comprimento_total',
        label: 'Comprimento',
        minWidth: 120,
        sortable: true,
        searchable: false,
        align: 'right',
        render: (value, row) => {
            // Calcular total se não existir
            if (!value) {
                const calculated = DataHelpers.calculateTotals(row);
                value = calculated.comprimento_total;
            }
            return DataHelpers.formatMeasurement(value, 'm');
        }
    },
    {
        id: 'area_total',
        label: 'Área',
        minWidth: 120,
        sortable: true,
        searchable: false,
        align: 'right',
        render: (value, row) => {
            // Calcular total se não existir
            if (!value) {
                const calculated = DataHelpers.calculateTotals(row);
                value = calculated.area_total;
            }
            return DataHelpers.formatMeasurement(value, 'm²');
        }
    },
    {
        id: 'submission',
        label: 'Data',
        minWidth: 140,
        sortable: true,
        searchable: false,
        align: 'center',
        render: (value) => {
            if (!value) return '-';

            // Formato esperado: "2025-02-27 às 11:29"
            if (value.includes(' às ')) {
                return value;
            }

            // Fallback para outros formatos
            try {
                const date = new Date(value);
                return date.toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            } catch {
                return value;
            }
        }
    }
];

/**
 * Colunas para detalhes expandidos
 */
export const DETAIL_COLUMNS = [
    {
        id: 'address_info',
        label: 'Morada Completa',
        render: (row) => {
            const parts = [
                row.address,
                row.door && `Porta ${row.door}`,
                row.floor && `Andar ${row.floor}`,
                row.postal,
                row.nut4
            ].filter(Boolean);

            return parts.join(', ') || '-';
        }
    },
    {
        id: 'location_info',
        label: 'Localização',
        render: (row) => {
            const parts = [
                row.nut3,
                row.nut2
            ].filter(Boolean);

            return parts.join(', ') || '-';
        }
    },
    {
        id: 'contact_info',
        label: 'Contacto',
        render: (row) => row.phone || '-'
    },
    {
        id: 'memo',
        label: 'Observações',
        render: (row) => row.memo || '-'
    }
];

/**
 * Configuração das colunas de tipos de pavimentação para detalhes
 */
export const PAVIMENTATION_TYPE_COLUMNS = [
    {
        id: 'type',
        label: 'Tipo',
        minWidth: 120
    },
    {
        id: 'comprimento',
        label: 'Comprimento',
        minWidth: 120,
        align: 'right'
    },
    {
        id: 'area',
        label: 'Área',
        minWidth: 120,
        align: 'right'
    }
];

/**
 * Mapeamento de colunas específicas por status
 */
export const STATUS_SPECIFIC_COLUMNS = {
    pending: {
        dateLabel: 'Submissão',
        dateField: 'submission',
        showActions: true
    },
    executed: {
        dateLabel: 'Execução',
        dateField: 'execution_date',
        fallbackDateField: 'submission',
        showActions: true
    },
    completed: {
        dateLabel: 'Conclusão',
        dateField: 'completion_date',
        fallbackDateField: 'submission',
        showActions: false
    }
};

/**
 * Utilitários para trabalhar com colunas
 */
export const ColumnUtils = {
    /**
     * Obter configuração de coluna por ID
     */
    getColumnConfig: (columnId) => {
        return TABLE_COLUMNS.find(col => col.id === columnId);
    },

    /**
     * Obter colunas ordenáveis
     */
    getSortableColumns: () => {
        return TABLE_COLUMNS.filter(col => col.sortable);
    },

    /**
     * Obter colunas pesquisáveis
     */
    getSearchableColumns: () => {
        return TABLE_COLUMNS.filter(col => col.searchable);
    },

    /**
     * Renderizar valor de célula
     */
    renderCellValue: (columnId, value, row) => {
        const column = ColumnUtils.getColumnConfig(columnId);
        if (column && column.render) {
            return column.render(value, row);
        }
        return value || '-';
    },

    /**
     * Obter configuração de coluna de data por status
     */
    getDateColumnConfig: (status) => {
        const config = STATUS_SPECIFIC_COLUMNS[status];
        if (!config) return null;

        return {
            ...TABLE_COLUMNS.find(col => col.id === 'submission'),
            id: config.dateField,
            label: config.dateLabel,
            render: (value, row) => {
                // Usar campo principal ou fallback
                const dateValue = row[config.dateField] || row[config.fallbackDateField];

                if (!dateValue) return '-';

                // Aplicar renderização padrão de data
                const dateColumn = TABLE_COLUMNS.find(col => col.id === 'submission');
                return dateColumn.render(dateValue);
            }
        };
    },

    /**
     * Verificar se deve mostrar coluna de ações
     */
    shouldShowActions: (status) => {
        const config = STATUS_SPECIFIC_COLUMNS[status];
        return config?.showActions || false;
    }
};

/**
 * Configuração para agrupamento de dados
 */
export const GROUPING_CONFIG = {
    /**
     * Função para agrupar dados
     */
    groupData: (data, groupByField) => {
        if (!groupByField || !Array.isArray(data)) {
            return { '': data };
        }

        const groups = {};

        data.forEach(item => {
            let groupKey;

            // Tratamentos especiais para diferentes campos
            switch (groupByField) {
                case 'submission_month':
                    groupKey = DataHelpers.getSubmissionMonth(item.submission);
                    break;
                default:
                    groupKey = item[groupByField] || 'Sem valor';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });

        return groups;
    },

    /**
     * Ordenar chaves de grupo
     */
    sortGroupKeys: (keys, groupByField) => {
        if (groupByField === 'submission_month') {
            // Ordenação especial para meses (mais recentes primeiro)
            return keys.sort((a, b) => b.localeCompare(a));
        }

        // Ordenação alfabética padrão
        return keys.sort();
    },

    /**
     * Formatar nome do grupo para exibição
     */
    formatGroupName: (groupKey, groupByField) => {
        const fieldLabels = {
            nut4: 'Localidade',
            nut3: 'Freguesia',
            nut2: 'Concelho',
            ts_entity: 'Entidade',
            submission_month: 'Mês'
        };

        const fieldLabel = fieldLabels[groupByField] || 'Grupo';
        return `${fieldLabel}: ${groupKey}`;
    }
};

export default {
    TABLE_COLUMNS,
    DETAIL_COLUMNS,
    PAVIMENTATION_TYPE_COLUMNS,
    STATUS_SPECIFIC_COLUMNS,
    ColumnUtils,
    GROUPING_CONFIG
};