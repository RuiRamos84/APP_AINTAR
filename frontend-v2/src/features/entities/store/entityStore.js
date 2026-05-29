import { create } from 'zustand';

export const useEntityStore = create((set) => ({
  // UI state — modals
  selectedEntity: null,
  modalOpen: false,
  createModalOpen: false,
  createInitialData: null,

  // UI state — pesquisa e filtros
  searchQuery: '',
  filters: {
    ident_type: '',
    nut1: '',
    nut2: '',
    nut3: '',
    nut4: '',
    contact_status: 'all',
  },

  // Modal actions
  openModal: (entity = null) => set({ selectedEntity: entity, modalOpen: true }),
  closeModal: () => set({ selectedEntity: null, modalOpen: false }),
  openCreateModal: (data = null) => set({ createModalOpen: true, createInitialData: data }),
  closeCreateModal: () => set({ createModalOpen: false, createInitialData: null }),

  // Pesquisa e filtros
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () =>
    set({ filters: { ident_type: '', nut1: '', nut2: '', nut3: '', nut4: '', contact_status: 'all' } }),
}));
