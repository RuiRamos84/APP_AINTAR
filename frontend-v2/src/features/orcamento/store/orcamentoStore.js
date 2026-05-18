import { create } from 'zustand';

// Estado puramente de UI — dados vivem no React Query (useOrcamentoQueries)
export const useOrcamentoStore = create((set) => ({
    anoSelecionado: null,
    modalOpen:      false,
    editTarget:     null,

    setAno:     (ano)           => set({ anoSelecionado: ano }),
    openModal:  (registo = null) => set({ modalOpen: true,  editTarget: registo }),
    closeModal: ()               => set({ modalOpen: false, editTarget: null }),
}));
