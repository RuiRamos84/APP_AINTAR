import { create } from 'zustand';
import { entityService } from '../services/entityService';

export const useEntityStore = create((set, get) => ({
  entities: [],
  selectedEntity: null,
  loading: false,
  error: null,

  searchQuery: '',
  filters: {
      ident_type: '',
      nut1: '',
      nut2: '',
      nut3: '',
      nut4: '',
      contact_status: 'all', // all, with_email, without_email, with_phone, without_phone
  },
  modalOpen: false,
  createModalOpen: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilter: (key, value) => set(state => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: { ident_type: '', nut1: '', nut2: '', nut3: '', nut4: '', contact_status: 'all' } }),
  
  openModal: (entity = null) => {
    set({ selectedEntity: entity, modalOpen: true });
  },
  
  closeModal: () => {
    set({ selectedEntity: null, modalOpen: false });
  },

  openCreateModal: () => set({ createModalOpen: true }),
  closeCreateModal: () => set({ createModalOpen: false }),

  fetchEntities: async (silent = false) => {
    if (!silent) set({ loading: true, error: null });
    try {
      const data = await entityService.getEntities();
      // Backend returns { entities: [...] } or just [...] depending on endpoint
      // Adjusting to handle wrapping object
      // O backend pode retornar { entities: [], total: ... } ou array direto
      // Vamos tentar garantir que pegamos o array
      const rawData = data.entities || data.data || data; 
      const entityList = Array.isArray(rawData) ? rawData : (Array.isArray(data) ? data : []);
      
      set({ entities: entityList, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchEntityByNIF: async (nipc) => {
    set({ loading: true, error: null });
    try {
      const data = await entityService.getEntityByNIF(nipc);
      set({ selectedEntity: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchEntity: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await entityService.getEntity(id);
      set({ selectedEntity: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateEntity: async (pk, entityData) => {
    set({ loading: true, error: null });
    try {
      const result = await entityService.updateEntity(pk, entityData);
      set(state => ({
        // Optimistic update (backup)
        entities: state.entities.map(e => e.pk === pk ? result.data : e),
        selectedEntity: result.data,
        loading: false,
        modalOpen: false
      }));
      
      // Silent Refresh para garantir consistência total (ex: campos calculados no server)
      get().fetchEntities(true);
      
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addEntity: async (entityData) => {
    set({ loading: true, error: null });
    try {
      const result = await entityService.addEntity(entityData);
      set(state => ({
        // Optimistic update
        entities: [...state.entities, result.data],
        loading: false,
        createModalOpen: false
      }));
      
      // Silent Refresh
      get().fetchEntities(true);

      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearSelection: () => set({ selectedEntity: null, error: null })
}));
