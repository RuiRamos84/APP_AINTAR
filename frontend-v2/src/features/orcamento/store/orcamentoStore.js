import { create } from 'zustand';
import { orcamentoService } from '../api/orcamentoService';

export const useOrcamentoStore = create((set, get) => ({
    registos: [],
    summary: [],
    anos: [],
    subclasses: [],
    tipos: [],
    classes: [],
    anoSelecionado: null,
    loading: true,
    error: null,
    modalOpen: false,
    editTarget: null,

    setAno: (ano) => {
        set({ anoSelecionado: ano });
        get().fetchDetalhe(ano);
        get().fetchSummary(ano);
        get().fetchSubclasses();
    },

    openModal:  (registo = null) => set({ modalOpen: true,  editTarget: registo }),
    closeModal: ()               => set({ modalOpen: false, editTarget: null }),

    fetchAnos: async () => {
        try {
            const data = await orcamentoService.getAnos();
            const raw  = Array.isArray(data) ? data : (data?.data ?? data?.anos ?? []);
            const list = [...raw].sort((a, b) => b - a); // descendente
            set({ anos: list });
            return list;
        } catch {
            // fallback — lista local se o endpoint falhar
            const cur  = new Date().getFullYear();
            const list = Array.from({ length: cur - 2022 }, (_, i) => cur - i);
            set({ anos: list });
            return list;
        }
    },

    fetchSubclasses: async () => {
        try {
            const data = await orcamentoService.getSubclasses();
            set({ subclasses: Array.isArray(data) ? data : (data?.data ?? []) });
        } catch (err) { set({ error: err.message }); }
    },

    fetchTipos: async () => {
        try {
            const data = await orcamentoService.getTipos();
            set({ tipos: Array.isArray(data) ? data : (data?.data ?? []) });
        } catch (err) { set({ error: err.message }); }
    },

    fetchClasses: async () => {
        try {
            const data = await orcamentoService.getClasses();
            set({ classes: Array.isArray(data) ? data : (data?.data ?? []) });
        } catch (err) { set({ error: err.message }); }
    },

    fetchDetalhe: async (ano = null) => {
        set({ loading: true, error: null });
        try {
            const resolved = ano ?? get().anoSelecionado;
            const data     = await orcamentoService.getDetalhe(resolved);
            set({ registos: Array.isArray(data) ? data : (data?.data ?? []), loading: false });
        } catch (err) { set({ error: err.message, loading: false }); }
    },

    fetchSummary: async (ano = null) => {
        try {
            const resolved = ano ?? get().anoSelecionado;
            const data     = await orcamentoService.getSummary(resolved);
            set({ summary: Array.isArray(data) ? data : (data?.data ?? []) });
        } catch (err) { set({ error: err.message }); }
    },

    addClasse: async (designacao) => {
        await orcamentoService.createClasse({ designacao });
        await get().fetchSubclasses();
        await get().fetchClasses();
    },

    addSubclasse: async (payload) => {
        await orcamentoService.createSubclasse(payload);
        await get().fetchSubclasses();
    },

    addRegisto: async (payload) => {
        const data = await orcamentoService.create(payload);
        set({ modalOpen: false, editTarget: null });
        const ano = get().anoSelecionado;
        await get().fetchDetalhe(ano);
        await get().fetchSummary(ano);
        return data;
    },

    updateRegisto: async (pk, payload) => {
        await orcamentoService.update(pk, payload);
        set({ modalOpen: false, editTarget: null });
        const ano = get().anoSelecionado;
        await get().fetchDetalhe(ano);
        await get().fetchSummary(ano);
    },

    deleteRegisto: async (pk) => {
        await orcamentoService.remove(pk);
        const ano = get().anoSelecionado;
        await get().fetchDetalhe(ano);
        await get().fetchSummary(ano);
    },
}));
