// frontend/src/pages/Operation/store/filtersStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useFiltersStore = create(
    persist(
        (set, get) => ({
            // Estado dos filtros
            filters: {
                // Básicos
                urgency: false,
                dateRange: { start: null, end: null },
                associate: null,
                status: [],

                // Geográficos
                district: null,
                municipality: null,
                parish: null,

                // Operacionais
                assignedTo: [],
                serviceType: [],
                hasPhone: null, // null=todos, true=só com, false=só sem

                // Temporais
                createdToday: false,
                dueThisWeek: false,
                overdue: false
            },

            // Ordenação
            sortBy: 'urgency_date',
            sortOrder: 'desc',

            // Agrupamento
            groupBy: 'none',
            groupCollapsed: {},

            // UI
            panelOpen: false,
            activePreset: null,

            // Actions
            setFilter: (key, value) => set(state => ({
                filters: { ...state.filters, [key]: value }
            })),

            setMultipleFilters: (newFilters) => set(state => ({
                filters: { ...state.filters, ...newFilters }
            })),

            clearFilters: () => set(state => ({
                filters: {
                    urgency: false,
                    dateRange: { start: null, end: null },
                    associate: null,
                    status: [],
                    district: null,
                    municipality: null,
                    parish: null,
                    assignedTo: [],
                    serviceType: [],
                    hasPhone: null,
                    createdToday: false,
                    dueThisWeek: false,
                    overdue: false
                },
                activePreset: null
            })),

            setSortBy: (sortBy, sortOrder = 'desc') => set({ sortBy, sortOrder }),

            setGroupBy: (groupBy) => set({
                groupBy,
                groupCollapsed: {} // Reset collapsed state
            }),

            toggleGroupCollapsed: (groupKey) => set(state => ({
                groupCollapsed: {
                    ...state.groupCollapsed,
                    [groupKey]: !state.groupCollapsed[groupKey]
                }
            })),

            setPanelOpen: (open) => set({ panelOpen: open }),

            setActivePreset: (preset) => set({ activePreset: preset }),

            // Presets
            applyPreset: (presetName) => {
                const presets = {
                    urgent_today: {
                        urgency: true,
                        createdToday: true
                    },
                    my_tasks: {
                        assignedTo: [get().currentUserId]
                    },
                    overdue: {
                        overdue: true
                    },
                    no_phone: {
                        hasPhone: false
                    },
                    this_week: {
                        dueThisWeek: true
                    }
                };

                const preset = presets[presetName];
                if (preset) {
                    set(state => ({
                        filters: { ...state.filters, ...preset },
                        activePreset: presetName
                    }));
                }
            },

            // Getters
            getActiveFiltersCount: () => {
                const filters = get().filters;
                return Object.entries(filters).filter(([key, value]) => {
                    if (key === 'dateRange') return value.start || value.end;
                    if (Array.isArray(value)) return value.length > 0;
                    return Boolean(value);
                }).length;
            },

            getFilteredData: (data, currentUserId) => {
                const { filters, sortBy, sortOrder } = get();
                let filtered = [...data];

                // Aplicar filtros
                if (filters.urgency) {
                    filtered = filtered.filter(item => item.urgency === "1");
                }

                if (filters.createdToday) {
                    const today = new Date().toDateString();
                    filtered = filtered.filter(item =>
                        item.ts_created && new Date(item.ts_created).toDateString() === today
                    );
                }

                if (filters.assignedTo.length > 0) {
                    filtered = filtered.filter(item =>
                        filters.assignedTo.includes(Number(item.who))
                    );
                }

                if (filters.hasPhone !== null) {
                    filtered = filtered.filter(item =>
                        filters.hasPhone ? Boolean(item.phone) : !item.phone
                    );
                }

                if (filters.district) {
                    filtered = filtered.filter(item => item.nut1 === filters.district);
                }

                if (filters.municipality) {
                    filtered = filtered.filter(item => item.nut2 === filters.municipality);
                }

                if (filters.parish) {
                    filtered = filtered.filter(item => item.nut3 === filters.parish);
                }

                if (filters.serviceType.length > 0) {
                    filtered = filtered.filter(item =>
                        filters.serviceType.includes(item.tipo)
                    );
                }

                // Ordenar
                filtered.sort((a, b) => {
                    let aVal, bVal;

                    switch (sortBy) {
                        case 'urgency_date':
                            if (a.urgency !== b.urgency) {
                                return b.urgency === "1" ? 1 : -1;
                            }
                            aVal = new Date(a.ts_created || 0);
                            bVal = new Date(b.ts_created || 0);
                            break;

                        case 'date_newest':
                        case 'date_oldest':
                            aVal = new Date(a.ts_created || 0);
                            bVal = new Date(b.ts_created || 0);
                            break;

                        case 'location':
                            aVal = `${a.nut1 || ''}-${a.nut2 || ''}-${a.nut3 || ''}-${a.nut4 || ''}`;
                            bVal = `${b.nut1 || ''}-${b.nut2 || ''}-${b.nut3 || ''}-${b.nut4 || ''}`;
                            break;

                        case 'assignee':
                            aVal = a.who || '';
                            bVal = b.who || '';
                            break;

                        case 'type':
                            aVal = a.tipo || '';
                            bVal = b.tipo || '';
                            break;

                        default:
                            return 0;
                    }

                    if (sortBy === 'date_oldest') {
                        return aVal - bVal;
                    }

                    if (typeof aVal === 'string') {
                        return sortOrder === 'desc'
                            ? bVal.localeCompare(aVal)
                            : aVal.localeCompare(bVal);
                    }

                    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
                });

                return filtered;
            },

            getGroupedData: (data, metaData) => {
                const { groupBy } = get();

                if (!data || !Array.isArray(data)) {
                    return { 'Todos': [] }; // ← Fallback
                }

                const grouped = {};

                data.forEach(item => {
                    let groupKey;

                    switch (groupBy) {
                        case 'urgency':
                            groupKey = item.urgency === "1" ? 'Urgentes' : 'Normais';
                            break;

                        case 'assignee':
                            const user = metaData?.who?.find(u => u.pk === Number(item.who));
                            groupKey = user ? user.name : 'Não atribuído';
                            break;

                        case 'location':
                            groupKey = item.nut4 || 'Sem localização';
                            break;

                        case 'type':
                            groupKey = item.tipo || 'Sem tipo';
                            break;

                        case 'date':
                            const date = new Date(item.ts_created || 0);
                            groupKey = date.toLocaleDateString('pt-PT');
                            break;

                        default:
                            groupKey = 'Outros';
                    }

                    if (!grouped[groupKey]) {
                        grouped[groupKey] = [];
                    }
                    grouped[groupKey].push(item);
                });

                return grouped;
            }
        }),
        {
            name: 'operation-filters',
            partialize: (state) => ({
                filters: state.filters,
                sortBy: state.sortBy,
                sortOrder: state.sortOrder,
                groupBy: state.groupBy
            })
        }
    )
);

export default useFiltersStore;