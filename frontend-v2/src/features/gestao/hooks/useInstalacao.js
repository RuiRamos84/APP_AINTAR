import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import {
  getInstalacaoVolumes, createInstalacaoVolume,
  getInstalacaoWaterVolumes, createInstalacaoWaterVolume,
  getInstalacaoEnergy, createInstalacaoEnergy,
  getInstalacaoExpenses, createInstalacaoExpense,
  getETARIncumprimentos, createETARIncumprimento,
  getETARDetails, getEEDetails,
  updateETARDetails, updateEEDetails,
} from '../services/etarEeService';

const normalize = (arr, key = 'pk') =>
  (arr || []).map((r, i) => ({ ...r, id: r[key] ?? i }));

/**
 * Hook unificado para gerir dados de uma instalação (ETAR ou EE).
 * @param {number|null} pk - PK da instalação selecionada
 * @param {'etar'|'ee'} type - Tipo de instalação
 */
export const useInstalacao = (pk, type = 'etar') => {
  const qc = useQueryClient();
  const on = !!pk;

  // ── Queries ────────────────────────────────────────────────────────────────

  const volumesQ = useQuery({
    queryKey: [type, 'volumes', pk],
    queryFn: () => getInstalacaoVolumes(pk),
    enabled: on,
    select: (d) => normalize(d?.volumes),
    staleTime: 5 * 60 * 1000,
  });

  const waterQ = useQuery({
    queryKey: [type, 'water', pk],
    queryFn: () => getInstalacaoWaterVolumes(pk),
    enabled: on,
    select: (d) => normalize(d?.water_volumes),
    staleTime: 5 * 60 * 1000,
  });

  const energyQ = useQuery({
    queryKey: [type, 'energy', pk],
    queryFn: () => getInstalacaoEnergy(pk),
    enabled: on,
    select: (d) => normalize(d?.energy),
    staleTime: 5 * 60 * 1000,
  });

  const expensesQ = useQuery({
    queryKey: [type, 'expenses', pk],
    queryFn: () => getInstalacaoExpenses(pk),
    enabled: on,
    select: (d) => normalize(d?.expenses),
    staleTime: 5 * 60 * 1000,
  });

  const incumpQ = useQuery({
    queryKey: ['etar', 'incumprimentos', pk],
    queryFn: () => getETARIncumprimentos(pk),
    enabled: on && type === 'etar',
    select: (d) => normalize(d?.incumprimentos),
    staleTime: 5 * 60 * 1000,
  });

  const detailsQ = useQuery({
    queryKey: [type, 'details', pk],
    queryFn: () => type === 'etar' ? getETARDetails(pk) : getEEDetails(pk),
    enabled: on,
    select: (d) => d?.details || {},
    staleTime: 5 * 60 * 1000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const volumeMut = useMutation({
    mutationFn: createInstalacaoVolume,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [type, 'volumes', pk] });
      notification.success('Volume registado com sucesso!');
    },
    onError: (e) => notification.error(`Erro: ${e.message}`),
  });

  const waterMut = useMutation({
    mutationFn: createInstalacaoWaterVolume,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [type, 'water', pk] });
      notification.success('Volume de água registado com sucesso!');
    },
    onError: (e) => notification.error(`Erro: ${e.message}`),
  });

  const energyMut = useMutation({
    mutationFn: createInstalacaoEnergy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [type, 'energy', pk] });
      notification.success('Energia registada com sucesso!');
    },
    onError: (e) => notification.error(`Erro: ${e.message}`),
  });

  const expenseMut = useMutation({
    mutationFn: createInstalacaoExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [type, 'expenses', pk] });
      notification.success('Despesa registada com sucesso!');
    },
    onError: (e) => notification.error(`Erro: ${e.message}`),
  });

  const incumpMut = useMutation({
    mutationFn: createETARIncumprimento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etar', 'incumprimentos', pk] });
      notification.success('Incumprimento registado com sucesso!');
    },
    onError: (e) => notification.error(`Erro: ${e.message}`),
  });

  const detailsMut = useMutation({
    mutationFn: ({ pk: pkArg, data }) =>
      type === 'etar' ? updateETARDetails(pkArg, data) : updateEEDetails(pkArg, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [type, 'details', pk] });
      notification.success('Características atualizadas com sucesso!');
    },
    onError: (e) => notification.error(`Erro ao atualizar: ${e.message}`),
  });

  return {
    volumes:          volumesQ.data || [],
    waterVolumes:     waterQ.data   || [],
    energy:           energyQ.data  || [],
    expenses:         expensesQ.data || [],
    incumprimentos:   incumpQ.data  || [],

    isLoadingVolumes:  volumesQ.isLoading,
    isLoadingWater:    waterQ.isLoading,
    isLoadingEnergy:   energyQ.isLoading,
    isLoadingExpenses: expensesQ.isLoading,
    isLoadingIncump:   incumpQ.isLoading,

    addVolume:        volumeMut.mutateAsync,
    isAddingVolume:   volumeMut.isPending,
    addWaterVolume:   waterMut.mutateAsync,
    isAddingWater:    waterMut.isPending,
    addEnergy:        energyMut.mutateAsync,
    isAddingEnergy:   energyMut.isPending,
    addExpense:       expenseMut.mutateAsync,
    isAddingExpense:  expenseMut.isPending,
    addIncumprimento: incumpMut.mutateAsync,
    isAddingIncump:   incumpMut.isPending,

    details:           detailsQ.data || {},
    isLoadingDetails:  detailsQ.isLoading,
    updateDetails:     detailsMut.mutateAsync,
    isUpdatingDetails: detailsMut.isPending,
  };
};
