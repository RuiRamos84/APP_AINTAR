import { create } from 'zustand'

export const useUiStore = create((set) => ({
  // Modal de form (criar/editar)
  formModal: { open: false, entity: null, record: null, mode: 'create' },
  openFormModal:  (entity, record = null, mode = 'create') => set({ formModal: { open: true, entity, record, mode } }),
  closeFormModal: () => set({ formModal: { open: false, entity: null, record: null, mode: 'create' } }),

  // Modal de confirmação de eliminação
  deleteModal: { open: false, entity: null, pk: null },
  openDeleteModal:  (entity, pk) => set({ deleteModal: { open: true, entity, pk } }),
  closeDeleteModal: () => set({ deleteModal: { open: false, entity: null, pk: null } }),

  // Sidebar (mobile)
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar:  () => set({ sidebarOpen: false }),
}))
