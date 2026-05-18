import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orcamentoService } from '../api/orcamentoService';

const unwrap = (data) => Array.isArray(data) ? data : (data?.data ?? []);

export const ORCAMENTO_KEYS = {
    anos:       ()    => ['orcamento', 'anos'],
    detalhe:    (ano) => ['orcamento', 'detalhe', ano],
    summary:    (ano) => ['orcamento', 'summary', ano],
    subclasses: ()    => ['orcamento', 'subclasses'],
    tipos:      ()    => ['orcamento', 'tipos'],
    classes:    ()    => ['orcamento', 'classes'],
};

const LOOKUP_STALE = 5 * 60 * 1000; // 5 min — lookups mudam raramente
const DATA_STALE   = 2 * 60 * 1000; // 2 min — dotações mudam com mais frequência

// ── Queries ──────────────────────────────────────────────────────────────────

export function useOrcamentoAnos() {
    return useQuery({
        queryKey: ORCAMENTO_KEYS.anos(),
        queryFn:  async () => {
            const data = await orcamentoService.getAnos();
            return [...unwrap(data)].sort((a, b) => b - a);
        },
        staleTime: LOOKUP_STALE,
    });
}

export function useOrcamentoDetalhe(ano) {
    return useQuery({
        queryKey: ORCAMENTO_KEYS.detalhe(ano),
        queryFn:  async () => {
            const data = await orcamentoService.getDetalhe(ano);
            return unwrap(data);
        },
        enabled:   Boolean(ano),
        staleTime: DATA_STALE,
    });
}

export function useOrcamentoSummary(ano) {
    return useQuery({
        queryKey: ORCAMENTO_KEYS.summary(ano),
        queryFn:  async () => {
            const data = await orcamentoService.getSummary(ano);
            return unwrap(data);
        },
        enabled:   Boolean(ano),
        staleTime: DATA_STALE,
    });
}

export function useOrcamentoSubclasses() {
    return useQuery({
        queryKey: ORCAMENTO_KEYS.subclasses(),
        queryFn:  async () => {
            const data = await orcamentoService.getSubclasses();
            return unwrap(data).map(r => ({ ...r, tipo_pks: r.tipo_pks ?? [] }));
        },
        staleTime: LOOKUP_STALE,
    });
}

export function useOrcamentoTipos() {
    return useQuery({
        queryKey: ORCAMENTO_KEYS.tipos(),
        queryFn:  async () => {
            const data = await orcamentoService.getTipos();
            return unwrap(data);
        },
        staleTime: LOOKUP_STALE,
    });
}

export function useOrcamentoClasses() {
    return useQuery({
        queryKey: ORCAMENTO_KEYS.classes(),
        queryFn:  async () => {
            const data = await orcamentoService.getClasses();
            return unwrap(data);
        },
        staleTime: LOOKUP_STALE,
    });
}

// ── Mutations — Dotações ──────────────────────────────────────────────────────

export function useCreateRegisto(ano) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => orcamentoService.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.detalhe(ano) });
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.summary(ano) });
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.anos() });
        },
    });
}

export function useUpdateRegisto(ano) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ pk, data }) => orcamentoService.update(pk, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.detalhe(ano) });
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.summary(ano) });
        },
    });
}

export function useDeleteRegisto(ano) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (pk) => orcamentoService.remove(pk),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.detalhe(ano) });
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.summary(ano) });
        },
    });
}

// ── Mutations — Catálogo ──────────────────────────────────────────────────────

export function useCreateClasse() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => orcamentoService.createClasse(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.classes() });
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.subclasses() });
        },
    });
}

export function useUpdateClasse() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ pk, data }) => orcamentoService.updateClasse(pk, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.classes() });
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.subclasses() });
        },
    });
}

export function useCreateSubclasse() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => orcamentoService.createSubclasse(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.subclasses() });
        },
    });
}

export function useUpdateSubclasse() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ pk, data }) => orcamentoService.updateSubclasse(pk, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.subclasses() });
        },
    });
}
