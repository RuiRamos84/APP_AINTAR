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
    catalogModalOpen: false,

    setAno: (ano) => {
        set({ anoSelecionado: ano });
        get().fetchDetalhe(ano);
        get().fetchSummary(ano);
        get().fetchSubclasses();
    },

    openModal: (registo = null) => set({ modalOpen: true, editTarget: registo }),
    closeModal: () => set({ modalOpen: false, editTarget: null }),

    openCatalogModal: () => set({ catalogModalOpen: true }),
    closeCatalogModal: () => set({ catalogModalOpen: false }),

    fetchAnos: async () => {
        const currentYear = new Date().getFullYear();
        const list = [];
        for (let y = currentYear; y >= 2023; y--) list.push(y);
        set({ anos: list, anoSelecionado: get().anoSelecionado ?? list[0] });
        return list;
    },

    fetchSubclasses: async () => {
        try {
            const data = await orcamentoService.getSubclasses();
            const list = Array.isArray(data) ? data : (data?.data ?? []);
            set({ subclasses: list });
        } catch (err) {
            set({ error: err.message });
        }
    },

    fetchTipos: async () => {
        try {
            const data = await orcamentoService.getTipos();
            const list = Array.isArray(data) ? data : (data?.data ?? []);
            set({ tipos: list });
        } catch (err) {
            set({ error: err.message });
        }
    },

    fetchClasses: async () => {
        try {
            const data = await orcamentoService.getClasses();
            const list = Array.isArray(data) ? data : (data?.data ?? []);
            set({ classes: list });
        } catch (err) {
            set({ error: err.message });
        }
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

    fetchDetalhe: async (ano = null) => {
        set({ loading: true, error: null });
        try {
            const resolvedAno = ano ?? get().anoSelecionado;
            const data = await orcamentoService.getDetalhe(resolvedAno);
            const list = Array.isArray(data) ? data : (data?.data ?? []);
            set({ registos: list, loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    fetchSummary: async (ano = null) => {
        try {
            const resolvedAno = ano ?? get().anoSelecionado;
            const data = await orcamentoService.getSummary(resolvedAno);
            const list = Array.isArray(data) ? data : (data?.data ?? []);
            set({ summary: list });
        } catch (err) {
            set({ error: err.message });
        }
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
