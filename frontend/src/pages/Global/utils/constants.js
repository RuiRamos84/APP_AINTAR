// frontend/src/pages/Global/utils/constants.js

export const AREAS = {
    ETAR: {
        id: 1,
        name: 'ETAR',
        endpoint: 'etar',
        icon: 'WaterDropIcon',
        entityType: 'etar'
    },
    EE: {
        id: 2,
        name: 'EEAR',
        endpoint: 'ee',
        icon: 'OpacityIcon',
        entityType: 'ee'
    },
    REDE: {
        id: 3,
        name: 'Rede',
        endpoint: 'rede',
        icon: 'LinearScaleIcon',
        entityType: null
    },
    RAMAIS: {
        id: 4,
        name: 'Ramais',
        endpoint: 'ramais',
        icon: 'AccountTreeIcon',
        entityType: null
    },
    MANUTENCAO: {
        id: 5,
        name: 'Manutenção',
        endpoint: 'manutencao',
        icon: 'BuildIcon',
        entityType: null
    },
    EQUIPAMENTO: {
        id: 6,
        name: 'Equipamento Básico',
        endpoint: 'equip',
        icon: 'HandymanIcon',
        entityType: null
    }
};

export const RECORD_CONFIGS = {
    volume: {
        endpoint: 'volumes',
        title: 'Registos de Volume',
        columns: [
            { id: 'data', label: 'Data', field: 'data' },
            { id: 'tipo', label: 'Tipo', field: 'tt_readspot' },
            { id: 'valor', label: 'Volume (m³)', field: 'valor' },
            { id: 'cliente', label: 'Cliente', field: 'ts_client' }
        ],
        fields: [
            { name: 'date', label: 'Data', type: 'datetime-local', required: true, size: 4 },
            { name: 'spot', label: 'Tipo', type: 'select', required: true, size: 4, metaKey: 'spot' },
            { name: 'value', label: 'Volume (m³)', type: 'number', required: true, size: 4 }
        ]
    },
    water_volume: {
        endpoint: 'water_volumes',
        title: 'Registos de Volume de Água',
        columns: [
            { id: 'data', label: 'Data', field: 'data' },
            { id: 'valor', label: 'Leitura (m³)', field: 'valor' },
            { id: 'consumo', label: 'Consumo (m³)', field: 'volumeConsumido' },
            { id: 'cliente', label: 'Registado por', field: 'ts_client' }
        ],
        fields: [
            { name: 'date', label: 'Data da Leitura', type: 'datetime-local', required: true, size: 6 },
            { name: 'value', label: 'Leitura (m³)', type: 'number', required: true, size: 6 }
        ]
    },
    energy: {
        endpoint: 'energy',
        title: 'Registos de Energia',
        columns: [
            { id: 'data', label: 'Data', field: 'data' },
            { id: 'vazio', label: 'Consumo Vazio', field: 'valor_vazio' },
            { id: 'ponta', label: 'Consumo Ponta', field: 'valor_ponta' },
            { id: 'cheia', label: 'Consumo Cheia', field: 'valor_cheia' },
            { id: 'cliente', label: 'Cliente', field: 'ts_client' }
        ],
        fields: [
            { name: 'date', label: 'Data', type: 'datetime-local', required: true, size: 3 },
            { name: 'vazio', label: 'Consumo Vazio', type: 'number', required: true, size: 3 },
            { name: 'ponta', label: 'Consumo Ponta', type: 'number', required: true, size: 3 },
            { name: 'cheia', label: 'Consumo Cheia', type: 'number', required: true, size: 3 }
        ]
    },
    expense: {
        endpoint: 'expenses',
        title: 'Registos de Despesas',
        columns: [
            { id: 'data', label: 'Data', field: 'data' },
            { id: 'destino', label: 'Destino', field: 'tt_expensedest' },
            { id: 'valor', label: 'Valor (€)', field: 'valor' },
            { id: 'descricao', label: 'Descrição', field: 'memo' },
            { id: 'associado', label: 'Associado', field: 'ts_associate' }
        ],
        fields: [
            { name: 'date', label: 'Data', type: 'datetime-local', required: true, size: 2 },
            { name: 'expenseDest', label: 'Tipo', type: 'select', required: true, size: 2, metaKey: 'expense' },
            { name: 'value', label: 'Valor (€)', type: 'number', required: true, size: 2 },
            { name: 'memo', label: 'Descrição', type: 'text', required: true, size: 3 },
            { name: 'associate', label: 'Associado', type: 'select', required: false, size: 3, metaKey: 'associates' }
        ]
    }
};

export const REQUEST_CONFIGS = {
    etar_desmatacao: { title: 'Desmatação - ETAR', endpoint: '/etar/desmatacao' },
    etar_retirada_lamas: { title: 'Retirada de Lamas - ETAR', endpoint: '/etar/retirada_lamas' },
    etar_reparacao: { title: 'Reparação - ETAR', endpoint: '/etar/reparacao' },
    etar_vedacao: { title: 'Vedação - ETAR', endpoint: '/etar/vedacao' },
    etar_qualidade_ambiental: { title: 'Qualidade Ambiental - ETAR', endpoint: '/etar/qualidade_ambiental' },

    ee_desmatacao: { title: 'Desmatação - EE', endpoint: '/ee/desmatacao' },
    ee_retirada_lamas: { title: 'Retirada de Lamas - EE', endpoint: '/ee/retirada_lamas' },
    ee_reparacao: { title: 'Reparação - EE', endpoint: '/ee/reparacao' },
    ee_vedacao: { title: 'Vedação - EE', endpoint: '/ee/vedacao' },
    ee_qualidade_ambiental: { title: 'Qualidade Ambiental - EE', endpoint: '/ee/qualidade_ambiental' },

    rede_desobstrucao: { title: 'Desobstrução - Rede', endpoint: '/rede/desobstrucao' },
    rede_reparacao_colapso: { title: 'Reparação/Colapso - Rede', endpoint: '/rede/reparacao_colapso' },

    caixa_desobstrucao: { title: 'Desobstrução - Caixas', endpoint: '/caixas/desobstrucao' },
    caixa_reparacao: { title: 'Reparação - Caixas', endpoint: '/caixas/reparacao' },
    caixa_reparacao_tampa: { title: 'Reparação Tampas - Caixas', endpoint: '/caixas/reparacao_tampa' },

    ramal_desobstrucao: { title: 'Desobstrução - Ramais', endpoint: '/ramais/desobstrucao' },
    ramal_reparacao: { title: 'Reparação - Ramais', endpoint: '/ramais/reparacao' },

    requisicao_interna: { title: 'Requisição Interna', endpoint: '/requisicao_interna' }
};

export const GRID_BREAKPOINTS = {
    xs: 12,
    sm: 6,
    md: 4,
    lg: 3,
    xl: 2
};