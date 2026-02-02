import { create } from 'zustand';
import { entitiesService } from '../api/entitiesService';

export const useEntityStore = create((set, get) => ({
  entities: [],
  selectedEntity: null,
  loading: true, // Iniciar true para evitar flash de empty state antes do fetch
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
  createInitialData: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilter: (key, value) => set(state => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: { ident_type: '', nut1: '', nut2: '', nut3: '', nut4: '', contact_status: 'all' } }),
  
  openModal: (entity = null) => {
    set({ selectedEntity: entity, modalOpen: true });
  },
  
  closeModal: () => {
    set({ selectedEntity: null, modalOpen: false });
  },

  openCreateModal: (data = null) => set({ createModalOpen: true, createInitialData: data }),
  closeCreateModal: () => set({ createModalOpen: false, createInitialData: null }),

  fetchEntities: async (silent = false) => {
    if (!silent) set({ loading: true, error: null });
    try {
      const data = await entitiesService.getEntities();
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
      const data = await entitiesService.getEntityByNipc(nipc);
      // Extract entity from potentially wrapped response { entity: {...} }
      const entity = data?.entity || data;
      set({ selectedEntity: entity, loading: false });
      return entity;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchEntity: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await entitiesService.getEntityByNipc(id);
      const entity = data?.entity || data;
      set({ selectedEntity: entity, loading: false });
      return entity;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateEntity: async (pk, entityData) => {
    set({ loading: true, error: null });
    try {
      const result = await entitiesService.updateEntity(pk, entityData);
      // Extract entity from potentially wrapped response { entity: {...} }
      const entity = result?.entity || result;
      set(state => ({
        entities: state.entities.map(e => e.pk === pk ? entity : e),
        selectedEntity: entity,
        loading: false,
        modalOpen: false
      }));
      return entity;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addEntity: async (entityData) => {
    console.log('[EntityStore] addEntity called with:', entityData);
    set({ loading: true, error: null });
    try {
      const result = await entitiesService.createEntity(entityData);
      console.log('[EntityStore] Entity created, raw result:', result);

      // Backend returns only { message: '...' }, not the entity data
      // We need to fetch the created entity by NIPC to get full data (pk, name, etc.)
      let entity = result?.entity || null;

      if (!entity?.nipc && entityData.nipc) {
        console.log('[EntityStore] No entity in create response, fetching by NIPC:', entityData.nipc);
        try {
          const fetchResult = await entitiesService.getEntityByNipc(entityData.nipc);
          entity = fetchResult?.entity || fetchResult;
          console.log('[EntityStore] Fetched entity after creation:', entity?.nipc, entity?.name, entity?.pk);
        } catch (fetchErr) {
          console.warn('[EntityStore] Could not fetch created entity, using input data as fallback:', fetchErr);
          entity = { ...entityData };
        }
      }

      set(state => {
        console.log('[EntityStore] Updating state with new entity. Current entities count:', state.entities.length);
        return {
          entities: [...state.entities, entity],
          selectedEntity: entity,
          loading: false,
          createModalOpen: false
        };
      });

      console.log('[EntityStore] State updated. selectedEntity set to:', entity?.nipc, entity?.name);

      return entity;
    } catch (error) {
      console.error('[EntityStore] Error creating entity:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearSelection: () => set({ selectedEntity: null, error: null })
}));
