// services/mockOperationsService.js
// Serviço temporário com dados mock para teste da interface adaptativa

const mockOperationsData = {
    'vbl_operacao$self': {
        name: 'Minhas Tarefas de Hoje',
        data: [
            {
                pk: 1,
                tt_operacaoaccao: 'Inspeção de rotina ETAR',
                tb_instalacao: 'ETAR Viseu',
                tt_operacaomodo: 'Manutenção preventiva',
                ts_operador1: 'João Silva',
                ts_operador2: null,
                completed: false,
                urgency: '0',
                phone: '912345678',
                data: new Date().toISOString().split('T')[0]
            },
            {
                pk: 2,
                tt_operacaoaccao: 'Limpeza de filtros',
                tb_instalacao: 'EE Mangualde',
                tt_operacaomodo: 'Manutenção corretiva',
                ts_operador1: 'João Silva',
                ts_operador2: null,
                completed: false,
                urgency: '1',
                phone: '913456789',
                data: new Date().toISOString().split('T')[0]
            },
            {
                pk: 3,
                tt_operacaoaccao: 'Verificação de bombas',
                tb_instalacao: 'ETAR Tondela',
                tt_operacaomodo: 'Inspeção',
                ts_operador1: 'João Silva',
                ts_operador2: 'Maria Santos',
                completed: true,
                urgency: '0',
                phone: '914567890',
                data: new Date().toISOString().split('T')[0]
            }
        ]
    },
    'vbl_operacaometa': {
        name: 'Metas de Operação',
        data: [
            {
                pk: 1,
                tt_operacaomodo: 'Manutenção preventiva',
                tb_instalacao: 'ETAR Viseu',
                tt_operacaodia: 'Segunda-feira',
                tt_operacaoaccao: 'Inspeção de rotina',
                ts_operador1: 'João Silva',
                ts_operador2: null
            },
            {
                pk: 2,
                tt_operacaomodo: 'Manutenção corretiva',
                tb_instalacao: 'EE Mangualde',
                tt_operacaodia: 'Terça-feira',
                tt_operacaoaccao: 'Limpeza de filtros',
                ts_operador1: 'Maria Santos',
                ts_operador2: null
            },
            {
                pk: 3,
                tt_operacaomodo: 'Inspeção',
                tb_instalacao: 'ETAR Tondela',
                tt_operacaodia: 'Quarta-feira',
                tt_operacaoaccao: 'Verificação de bombas',
                ts_operador1: 'Carlos Oliveira',
                ts_operador2: 'Ana Costa'
            }
        ]
    }
};

const mockAssociates = [
    { pk: 1, name: 'Águas do Centro' },
    { pk: 2, name: 'Águas do Norte' },
    { pk: 3, name: 'Águas do Sul' }
];

export const fetchOperationsData = async () => {
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simular erro ocasional (5% das vezes)
    if (Math.random() < 0.05) {
        throw new Error('Erro simulado de rede');
    }

    return mockOperationsData;
};

export const fetchAssociates = async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAssociates;
};

export const completeOperation = async (operationId, note) => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simular sucesso
    console.log(`Operação ${operationId} concluída com nota: ${note}`);
    return { success: true, message: 'Operação concluída com sucesso' };
};

export const mockApi = {
    getOperacaoMeta: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { data: mockOperationsData['vbl_operacaometa'].data };
    },

    getOperacaoSelf: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { data: mockOperationsData['vbl_operacao$self'].data };
    },

    createOperacaoMeta: async (data) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        const newMeta = {
            pk: Date.now(), // ID temporário
            ...data
        };
        mockOperationsData['vbl_operacaometa'].data.push(newMeta);
        return { data: newMeta };
    },

    updateOperacaoMeta: async (id, data) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        const index = mockOperationsData['vbl_operacaometa'].data.findIndex(m => m.pk === id);
        if (index !== -1) {
            mockOperationsData['vbl_operacaometa'].data[index] = { ...mockOperationsData['vbl_operacaometa'].data[index], ...data };
        }
        return { data: mockOperationsData['vbl_operacaometa'].data[index] };
    },

    deleteOperacaoMeta: async (id) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const index = mockOperationsData['vbl_operacaometa'].data.findIndex(m => m.pk === id);
        if (index !== -1) {
            mockOperationsData['vbl_operacaometa'].data.splice(index, 1);
        }
        return { success: true };
    }
};