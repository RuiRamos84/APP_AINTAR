import { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

// ─── helpers ─────────────────────────────────────────────────────────────────

const toISODate = (d: Date) => d.toISOString().split('T')[0];

const getDefaultDateRange = () => {
  const now = new Date();
  return {
    fromDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    toDate:   toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

export const DAYS_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const WEEKS   = ['W1', 'W2', 'W3', 'W4'] as const;

// ─── types ────────────────────────────────────────────────────────────────────

export interface OperacaoMeta {
  pk: number;
  tt_operacaoaccao?: string;
  tt_operacaodia?: string;
  tb_instalacao?: string;
  pk_operador1?: number;
  pk_operador2?: number;
  ts_operador1?: string;
  ts_operador2?: string;
  [key: string]: unknown;
}

export interface OperacaoExec {
  pk: number;
  tt_operacaoaccao?: string;
  tt_operacaoaccao_type?: string | number;
  tb_instalacao?: string;
  ts_operador1?: string;
  ts_operador2?: string;
  pk_operador1?: number;
  pk_operador2?: number;
  updt_time?: string | null;
  tt_operacaomodo?: number | null;
  tb_operacaometa?: number | null;
  operacao_meta?: number | null;
  control_tt_operacaocontrolo?: number | null;
  control_memo?: string | null;
  valuememo?: string | null;
  valuetext?: string | null;
  valuenumb?: number | null;
  data?: string | null;
  [key: string]: unknown;
}

export interface OperatorStat {
  pk: number;
  name: string;
  scheduledTasks: number;
  completedTasks: number;
  pendingTasks: number;
  punctualTasks: number;
  totalTasks: number;
  efficiency: number;
  scheduledCompleted: number;
  scheduledPending: number;
  punctualCompleted: number;
  punctualPending: number;
}

export interface SupervisorAnalytics {
  overview: {
    totalOperations: number;
    totalExecutions: number;
    completedTasks: number;
    pendingTasks: number;
    scheduledExecutions: number;
    punctualExecutions: number;
    activeOperators: number;
    unvalidatedCount: number;
    completionRate: number;
  };
}

export interface MetaOpcontrolo { pk: number; value?: string; name?: string; }
export interface MetaInstall { pk: number; nome?: string; name?: string; ts_entity?: string; }
export interface MetaAccao { pk: number; value?: string; name?: string; }

export interface SupervisorMetaData {
  opcontrolo?: MetaOpcontrolo[];
  who?: { pk: number; name: string }[];
  operadores?: { pk: number; name: string }[];
  etar?: MetaInstall[];
  ee?: MetaInstall[];
  operacaoaccao?: MetaAccao[];
  [key: string]: unknown;
}

export interface DirectTaskPayload {
  data: string;
  pk_instalacao: number;
  pk_operador: number;
  tt_operacaoaccao: number;
  memo?: string;
  clat?: number;
  clong?: number;
}

export interface PickedAnnexFile {
  uri: string;
  name: string;
  mimeType: string;
}

export interface PedidoRow {
  pk: number;
  regnumber?: string;
  tipo?: string;
  nut4?: string;
  nut3?: string;
  address?: string;
  ts_entity?: string;
  who?: number | null;
  submission?: string;
  limitdate?: string;
  restdays?: number | null;
  urgency?: boolean | number;
  [key: string]: unknown;
}

export interface PedidoGroup {
  name?: string;
  total?: number;
  data: PedidoRow[];
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export const useSupervisorData = () => {
  const queryClient = useQueryClient();

  const [dateRange, setDateRange]           = useState(getDefaultDateRange);
  const [weekFilter, setWeekFilter]         = useState<string>('all');
  const [dayFilter, setDayFilter]           = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [pedidosVisited, setPedidosVisited] = useState(false);
  const visitPedidos = useCallback(() => setPedidosVisited(true), []);

  // ── metaData ──
  const { data: metaData } = useQuery<SupervisorMetaData>({
    queryKey: ['metadata'],
    queryFn: async () => {
      const { data } = await apiClient.get('/metaData');
      return data?.data ?? data ?? {};
    },
    staleTime: 60 * 60 * 1000,
  });

  // ── metas ──
  const { data: rawMetas, isLoading: metasLoading, error: metasError } = useQuery<OperacaoMeta[]>({
    queryKey: ['operacaoMeta', 'supervisor'],
    queryFn: async () => {
      const { data } = await apiClient.get('/operacao_meta');
      return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 3,
  });

  // ── executions ──
  const { data: rawExecutions, isLoading: execLoading, error: execError } = useQuery<OperacaoExec[]>({
    queryKey: ['operacao', dateRange.fromDate, dateRange.toDate],
    queryFn: async () => {
      const { data } = await apiClient.get('/operacao', {
        params: { from_date: dateRange.fromDate, to_date: dateRange.toDate },
      });
      return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 3,
  });

  // ── pedidos (lazy: só carrega quando a tab Pedidos for visitada) ──
  const { data: rawPedidos, isLoading: pedidosLoading, error: pedidosError } = useQuery<Record<string, PedidoGroup>>({
    queryKey: ['pedidos'],
    queryFn: async () => {
      const { data } = await apiClient.get('/operations');
      return data ?? {};
    },
    enabled: pedidosVisited,
    staleTime: 1000 * 60 * 3,
  });

  const metas: OperacaoMeta[]      = rawMetas    ?? [];
  const executions: OperacaoExec[] = rawExecutions ?? [];

  // ── filtered metas ──
  const filteredMetas = useMemo(() => {
    let r = metas;
    if (weekFilter !== 'all') {
      r = r.filter(m => (m.tt_operacaodia || '').startsWith(weekFilter));
    }
    if (dayFilter !== 'all') {
      r = r.filter(m => {
        const dp = (m.tt_operacaodia || '').replace(/^W\d+\s+/, '').toLowerCase();
        return dp === dayFilter.toLowerCase();
      });
    }
    if (operatorFilter !== 'all') {
      const opPk = Number(operatorFilter);
      r = r.filter(m => Number(m.pk_operador1) === opPk || Number(m.pk_operador2) === opPk);
    }
    return r;
  }, [metas, weekFilter, dayFilter, operatorFilter]);

  // ── operations (enriched executions for Controlo tab) ──
  const operations = useMemo(() => executions.map(exec => ({
    ...exec,
    instalacao_nome: exec.tb_instalacao || '',
    acao_nome:       exec.tt_operacaoaccao || '',
    operador1_nome:  exec.ts_operador1 || '',
    operador2_nome:  exec.ts_operador2 || '',
    hasExecutions:   exec.updt_time != null,
    isPontual:       exec.tb_operacaometa == null && exec.operacao_meta == null,
  })), [executions]);

  // ── analytics ──
  const analytics = useMemo((): SupervisorAnalytics => {
    const completed  = executions.filter(e => e.updt_time != null);
    const pending    = executions.filter(e => e.updt_time == null);
    const scheduled  = executions.filter(e => e.tt_operacaomodo != null);
    const punctual   = executions.filter(e => e.tt_operacaomodo == null);
    const opSet      = new Set(executions.map(e => e.pk_operador1).filter(Boolean));
    const unvalidated = executions.filter(
      e => e.updt_time != null && (!e.control_tt_operacaocontrolo || e.control_tt_operacaocontrolo === 0),
    ).length;
    const rate = executions.length > 0
      ? Math.round((completed.length / executions.length) * 100)
      : 0;
    return {
      overview: {
        totalOperations:     filteredMetas.length,
        totalExecutions:     executions.length,
        completedTasks:      completed.length,
        pendingTasks:        pending.length,
        scheduledExecutions: scheduled.length,
        punctualExecutions:  punctual.length,
        activeOperators:     opSet.size,
        unvalidatedCount:    unvalidated,
        completionRate:      rate,
      },
    };
  }, [filteredMetas, executions]);

  // ── week/day distribution ──
  const weekDistribution = useMemo(() => {
    const dist: Record<string, number> = { W1: 0, W2: 0, W3: 0, W4: 0 };
    filteredMetas.forEach(m => {
      const match = (m.tt_operacaodia || '').match(/^(W\d)/);
      if (match && dist[match[1]] !== undefined) dist[match[1]]++;
    });
    return dist;
  }, [filteredMetas]);

  const dayDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    DAYS_PT.forEach(d => { dist[d] = 0; });
    filteredMetas.forEach(m => {
      const dp = (m.tt_operacaodia || '').replace(/^W\d+\s+/, '');
      if (dist[dp] !== undefined) dist[dp]++;
    });
    return dist;
  }, [filteredMetas]);

  // ── operator stats ──
  const operatorStats = useMemo((): OperatorStat[] => {
    const opMap: Record<number, {
      pk: number; name: string;
      scheduledCompleted: number; scheduledPending: number;
      punctualCompleted: number; punctualPending: number;
      scheduledTasks: number;
    }> = {};

    const ensure = (pk: number, name: string) => {
      if (!opMap[pk]) {
        opMap[pk] = { pk, name, scheduledCompleted: 0, scheduledPending: 0, punctualCompleted: 0, punctualPending: 0, scheduledTasks: 0 };
      }
    };

    filteredMetas.forEach(m => {
      ([
        [m.pk_operador1, m.ts_operador1],
        [m.pk_operador2, m.ts_operador2],
      ] as [unknown, unknown][]).forEach(([pk, name]) => {
        if (!pk) return;
        ensure(Number(pk), String(name || ''));
        opMap[Number(pk)].scheduledTasks++;
      });
    });

    executions.forEach(e => {
      const pk = Number(e.pk_operador1);
      if (!pk) return;
      ensure(pk, String(e.ts_operador1 || ''));
      const isPunctual = e.tt_operacaomodo == null;
      const isDone = e.updt_time != null;
      if (isPunctual) {
        if (isDone) opMap[pk].punctualCompleted++; else opMap[pk].punctualPending++;
      } else {
        if (isDone) opMap[pk].scheduledCompleted++; else opMap[pk].scheduledPending++;
      }
    });

    return Object.values(opMap)
      .filter(op =>
        op.scheduledTasks + op.scheduledCompleted + op.punctualCompleted +
        op.scheduledPending + op.punctualPending > 0
      )
      .map(op => {
        const completedTasks = op.scheduledCompleted + op.punctualCompleted;
        const pendingTasks   = op.scheduledPending + op.punctualPending;
        const totalTasks     = completedTasks + pendingTasks;
        return {
          ...op,
          completedTasks,
          pendingTasks,
          punctualTasks: op.punctualCompleted + op.punctualPending,
          totalTasks,
          efficiency: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      })
      .sort((a, b) => b.completedTasks - a.completedTasks || b.pendingTasks - a.pendingTasks);
  }, [filteredMetas, executions]);

  // ── recent activity ──
  const recentActivity = useMemo(() => {
    return [...executions]
      .filter(e => e.updt_time != null)
      .sort((a, b) => new Date(b.updt_time!).getTime() - new Date(a.updt_time!).getTime())
      .slice(0, 20);
  }, [executions]);

  // ── filter info ──
  const filterInfo = useMemo(() => ({
    totalInDatabase: metas.length,
    showing:         filteredMetas.length,
    totalExecutions: executions.length,
  }), [metas.length, filteredMetas.length, executions.length]);

  // ── invalidation helper ──
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['operacaoMeta', 'supervisor'] });
    queryClient.invalidateQueries({ queryKey: ['operacao', dateRange.fromDate, dateRange.toDate] });
  }, [queryClient, dateRange]);

  // ── mutations ──
  const validateExecution = useMutation({
    mutationFn: ({ pk, control_tt_operacaocontrolo, control_memo }: {
      pk: number;
      control_tt_operacaocontrolo: number;
      control_memo?: string;
    }) => {
      const fd = new FormData();
      fd.append('pk', String(pk));
      fd.append('control_tt_operacaocontrolo', String(control_tt_operacaocontrolo));
      if (control_memo?.trim()) fd.append('control_memo', control_memo.trim());
      return apiClient.post('/operation_control/update', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: invalidateAll,
  });

  const reassignOperacao = useMutation({
    mutationFn: ({ id, ts_operador1, ts_operador2 }: {
      id: number;
      ts_operador1: number;
      ts_operador2?: number;
    }) => apiClient.put(`/operacao/${id}`, {
      ts_operador1,
      ts_operador2: ts_operador2 ?? 0,
    }),
    onSuccess: invalidateAll,
  });

  // Registo rápido de operação (ETAR/EE/Rede/Caixa) — usado pelo diálogo
  // "Registar Execução" em Supervisão > Controlo de Tarefas
  const createDirect = useMutation({
    mutationFn: (payload: DirectTaskPayload) => apiClient.post('/operacao_direct', payload),
    onSuccess: invalidateAll,
  });

  const addOperationAnnexes = useCallback(async (operacaoPk: number, files: PickedAnnexFile[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as any));
    return apiClient.post(`/operation_control/${operacaoPk}/annexes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }, []);

  const refresh = useCallback(() => invalidateAll(), [invalidateAll]);

  return {
    analytics,
    operatorStats,
    recentActivity,
    metas,
    filteredMetas,
    executions,
    operations,
    weekDistribution,
    dayDistribution,
    metaData,

    weekFilter, setWeekFilter,
    dayFilter,  setDayFilter,
    operatorFilter, setOperatorFilter,
    availableWeeks: WEEKS,
    availableDays:  DAYS_PT,
    filterInfo,

    dateRange, setDateRange,

    isLoading: metasLoading || execLoading,
    hasError:  !!metasError || !!execError,
    error:     metasError || execError,

    pedidos: rawPedidos ?? {},
    pedidosLoading,
    pedidosError,
    visitPedidos,

    refresh,
    validateExecution,
    reassignOperacao,
    createDirect,
    addOperationAnnexes,
  };
};
