import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Zustand store for managing UI state of Documents feature
 */
export const useDocumentsStore = create(
  persist(
    (set) => ({
      // UI View State
      activeTab: 0, // 0: All, 1: Assigned, 2: Created, 3: Late
      viewMode: 'list', // 'list' | 'grid'
      density: 'standard', // 'compact' | 'standard' | 'comfortable'
      
      // Filters
      filters: {
        status: '',
        associate: '',
        type: '',
        notification: '',
      },
      
      // Date Range Filter
      dateRange: {
        startDate: null,
        endDate: null,
      },
      
      // Search
      searchTerm: '',
      
      // Sorting
      sortConfig: {
        field: 'submission',
        direction: 'desc',
      },

      // Actions
      setActiveTab: (tabIndex) => set({ activeTab: tabIndex }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setDensity: (density) => set({ density }),
      
      setFilters: (newFilters) => set((state) => ({ 
        filters: { ...state.filters, ...newFilters } 
      })),
      
      resetFilters: () => set({ 
        filters: { status: '', associate: '', type: '', notification: '' },
        dateRange: { startDate: null, endDate: null }
      }),
      
      setDateRange: (range) => set({ dateRange: range }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      
      setSortConfig: (field, direction) => set({ 
        sortConfig: { field, direction } 
      }),
    }),
    {
      name: 'documents-storage',
      partialize: (state) => ({ 
        viewMode: state.viewMode, 
        density: state.density,
        activeTab: state.activeTab 
      }), // Only persist view preferences
    }
  )
);
