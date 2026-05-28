import { create } from 'zustand';
import { orcamentoService } from '../api/orcamentoService';

export const useOrcamentoStore = create((set) => ({
    anoSelecionado: null,
    modalOpen:      false,
    editTarget:     null,

    setAno:     (ano) => set({ anoSelecionado: ano }),
    openModal:  (registo = null) => set({ modalOpen: true,  editTarget: registo }),
    closeModal: ()               => set({ modalOpen: false, editTarget: null }),

    /* ── Dotações — apenas chamada API; React Query trata do cache ── */
    addRegisto: async (payload) => {
        await orcamentoService.create(payload);
        set({ modalOpen: false, editTarget: null });
    },

    updateRegisto: async (pk, payload) => {
        await orcamentoService.update(pk, payload);
        set({ modalOpen: false, editTarget: null });
    },

    deleteRegisto: async (pk) => {
        await orcamentoService.remove(pk);
    },

    /* ── Catálogo — apenas chamada API; React Query invalida o cache ── */
    addClasse: async (designacao) => {
        await orcamentoService.createClasse({ designacao });
    },

    updateClasse: async (pk, payload) => {
        await orcamentoService.updateClasse(pk, payload);
    },

    addSubclasse: async (payload) => {
        await orcamentoService.createSubclasse(payload);
    },

    updateSubclasse: async (pk, payload) => {
        await orcamentoService.updateSubclasse(pk, payload);
    },
}));
