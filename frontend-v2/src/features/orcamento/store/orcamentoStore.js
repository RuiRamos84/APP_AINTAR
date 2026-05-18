import { create } from 'zustand';
import { toast } from 'sonner';
import { orcamentoService } from '../api/orcamentoService';

const unwrap = (data) => Array.isArray(data) ? data : (data?.data ?? []);

export const useOrcamentoStore = create((set, get) => ({
    registos: [],
    anos: [],
    subclasses: [],
    classes: [],
    anoSelecionado: null,
    loading: true,
    error: null,
    modalOpen: false,
    editTarget: null,

    setAno: (ano) => {
        set({ anoSelecionado: ano });
        get().fetchDetalhe(ano);
        get().fetchSubclasses();
    },

    openModal:  (registo = null) => set({ modalOpen: true,  editTarget: registo }),
    closeModal: ()               => set({ modalOpen: false, editTarget: null }),

    fetchAnos: async () => {
        try {
            const data = await orcamentoService.getAnos();
            const list = [...unwrap(data)].sort((a, b) => b - a);
            set({ anos: list });
            return list;
        } catch {
            const cur  = new Date().getFullYear();
            const list = Array.from({ length: cur - 2022 }, (_, i) => cur - i);
            set({ anos: list });
            return list;
        }
    },

    fetchClasses: async () => {
        try {
            const data = await orcamentoService.getClasses();
            set({ classes: unwrap(data) });
        } catch (err) {
            toast.error('Erro ao carregar classes.');
            set({ error: err.message });
        }
    },

    fetchSubclasses: async () => {
        try {
            const data = await orcamentoService.getSubclasses();
            set({ subclasses: unwrap(data) });
        } catch (err) {
            toast.error('Erro ao carregar subclasses.');
            set({ error: err.message });
        }
    },

    fetchDetalhe: async (ano = null) => {
        set({ loading: true, error: null });
        try {
            const resolved = ano ?? get().anoSelecionado;
            const data     = await orcamentoService.getDetalhe(resolved);
            set({ registos: unwrap(data), loading: false });
        } catch (err) {
            toast.error('Erro ao carregar dotações.');
            set({ error: err.message, loading: false });
        }
    },

    // ── Orçamento ──────────────────────────────────────────────

    addRegisto: async (payload) => {
        await orcamentoService.create(payload);
        set({ modalOpen: false, editTarget: null });
        await get().fetchDetalhe(get().anoSelecionado);
    },

    updateRegisto: async (pk, payload) => {
        await orcamentoService.update(pk, payload);
        set({ modalOpen: false, editTarget: null });
        await get().fetchDetalhe(get().anoSelecionado);
    },

    deleteRegisto: async (pk) => {
        await orcamentoService.remove(pk);
        await get().fetchDetalhe(get().anoSelecionado);
    },

}));
