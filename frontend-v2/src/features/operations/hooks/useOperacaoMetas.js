import { useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { operationService } from '../services/operationService';
import { useMetaData } from '@/core/hooks/useMetaData';
import {
    getInstallationName, getOperationActionName,
    getOperationModeName, getOperationDayName, getUserNameByPk
} from '../utils/formatters';

const DAYS_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

/**
 * Hook para metas operacionais (tarefas programadas).
 * Inclui enriquecimento de nomes + distribuições por semana/dia + CRUD.
 */
export const useOperacaoMetas = () => {
    const queryClient = useQueryClient();
    const { data: metaData } = useMetaData();

    const { data: rawMetas, isLoading, error } = useQuery({
        queryKey: ['operacaoMeta'],
        queryFn: async () => {
            const response = await operationService.getOperacaoMeta();
            return response?.data || response || [];
        },
        staleTime: 1000 * 60 * 3,
    });

    const metas = useMemo(() => {
        if (!rawMetas || !metaData) return [];
        return (Array.isArray(rawMetas) ? rawMetas : []).map(meta => ({
            ...meta,
            instalacao_nome: meta.tb_instalacao || getInstallationName(meta.pk_instalacao, metaData),
            acao_nome: meta.tt_operacaoaccao || getOperationActionName(meta.pk_operacaoaccao, metaData),
            modo_nome: meta.tt_operacaomodo || getOperationModeName(meta.pk_operacaomodo, metaData),
            dia_nome: meta.tt_operacaodia || getOperationDayName(meta.pk_operacaodia, metaData),
            operador1_nome: meta.ts_operador1 || getUserNameByPk(meta.pk_operador1, metaData),
            operador2_nome: meta.ts_operador2 || getUserNameByPk(meta.pk_operador2, metaData),
        }));
    }, [rawMetas, metaData]);

    const weekDistribution = useMemo(() => {
        const dist = { W1: 0, W2: 0, W3: 0, W4: 0 };
        metas.forEach(m => {
            const match = (m.tt_operacaodia || '').match(/^(W\d)/);
            if (match && dist[match[1]] !== undefined) dist[match[1]]++;
        });
        return dist;
    }, [metas]);

    const dayDistribution = useMemo(() => {
        const dist = {};
        DAYS_PT.forEach(d => { dist[d] = 0; });
        metas.forEach(m => {
            const dayPart = (m.tt_operacaodia || '').replace(/^W\d+\s+/, '');
            if (dist[dayPart] !== undefined) dist[dayPart]++;
        });
        return dist;
    }, [metas]);

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });

    const createMeta = useMutation({
        mutationFn: (data) => operationService.createOperacaoMeta(data),
        onSuccess: invalidate,
    });

    const updateMeta = useMutation({
        mutationFn: ({ id, data }) => operationService.updateOperacaoMeta(id, data),
        onSuccess: invalidate,
    });

    const deleteMeta = useMutation({
        mutationFn: (id) => operationService.deleteOperacaoMeta(id),
        onSuccess: invalidate,
    });

    return {
        metas,
        isLoading,
        error,
        weekDistribution,
        dayDistribution,
        createMeta,
        updateMeta,
        deleteMeta,
    };
};
