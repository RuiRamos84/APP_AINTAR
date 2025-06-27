// frontend/src/pages/Operation/store/filtersStore.js - ORDENAÇÃO CORRIGIDA
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const parsePortugueseDate = (dateStr) => {
    if (!dateStr) return 0;

    // "2025-03-25 às 21:54" -> "2025-03-25T21:54:00"
    const cleaned = dateStr.replace(' às ', 'T') + ':00';
    return new Date(cleaned).getTime();
};
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

            // Ordenação - CONSOLIDADA
            sortBy: 'urgency_date',
            sortOrder: 'desc', // 'asc' | 'desc'

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

            // ORDENAÇÃO - SIMPLIFICADA
            setSortBy: (sortBy) => set(state => ({
                sortBy,
                // Manter a ordem actual quando se muda critério
                sortOrder: state.sortOrder
            })),

            setSortOrder: (order) => set({ sortOrder: order }),

            // Toggle da ordem (para clicks nos headers)
            toggleSortOrder: () => set(state => ({
                sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc'
            })),

            // AGRUPAMENTO
            setGroupBy: (groupBy) => set({
                groupBy,
                groupCollapsed: {}
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

            // FUNÇÃO DE ORDENAÇÃO PRINCIPAL
            sortData: (data, customSortBy = null, customSortOrder = null) => {
                const { sortBy: storeSortBy, sortOrder: storeSortOrder } = get();
                const sortBy = customSortBy || storeSortBy;
                const sortOrder = customSortOrder || storeSortOrder;

                // console.log('sortData executada:', { sortBy, sortOrder, dataLength: data.length });

                if (!data || !Array.isArray(data) || data.length === 0) return data;

                return [...data].sort((a, b) => {
                    let aVal, bVal;

                    switch (sortBy) {
                        case 'urgency_date':
                            if (a.urgency !== b.urgency) {
                                return b.urgency === "1" ? 1 : -1;
                            }
                            aVal = parsePortugueseDate(a.submission);
                            bVal = parsePortugueseDate(b.submission);
                            break;

                        case 'date':
                            aVal = parsePortugueseDate(a.submission);
                            bVal = parsePortugueseDate(b.submission);
                            break;

                        case 'location':
                            const getLocationKey = (item) =>
                                `${item.nut1 || 'ZZZ'}-${item.nut2 || 'ZZZ'}-${item.nut3 || 'ZZZ'}-${item.nut4 || 'ZZZ'}`;
                            aVal = getLocationKey(a);
                            bVal = getLocationKey(b);
                            break;

                        case 'assignee':
                            aVal = Number(a.who) || 999999;
                            bVal = Number(b.who) || 999999;
                            break;

                        case 'type':
                            aVal = a.tipo || 'ZZZ';
                            bVal = b.tipo || 'ZZZ';
                            break;

                        case 'entity':
                            aVal = a.ts_entity || 'ZZZ';
                            bVal = b.ts_entity || 'ZZZ';
                            break;

                        case 'phone':
                            const aHasPhone = Boolean(a.phone);
                            const bHasPhone = Boolean(b.phone);
                            if (aHasPhone !== bHasPhone) {
                                return sortOrder === 'desc' ? (bHasPhone ? 1 : -1) : (aHasPhone ? -1 : 1);
                            }
                            aVal = a.phone || '';
                            bVal = b.phone || '';
                            break;

                        case 'restdays':
                            aVal = Number(a.restdays) || 9999;
                            bVal = Number(b.restdays) || 9999;
                            break;

                        default:
                            return 0;
                    }

                    const result = sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
                    // console.log(`Comparação: ${a.regnumber} vs ${b.regnumber} = ${result}`);
                    return result;
                });
            },

            getFilteredData: (data, currentUserId) => {
                const { filters, sortBy, sortOrder } = get();
                // console.log('STORE getFilteredData:', { sortBy, sortOrder });

                let filtered = [...data];
                

                // Aplicar filtros
                if (filters.urgency) {
                    filtered = filtered.filter(item => item.urgency === "1");
                }
                if (filters.createdToday) {
                    const today = new Date().toDateString();
                    filtered = filtered.filter(item =>
                        item.submission && new Date(item.submission).toDateString() === today
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

                return get().sortData(filtered, sortBy, sortOrder);
            },

            getGroupedData: (data, metaData) => {
                const { groupBy, sortBy, sortOrder } = get();

                // Função interna de ordenação
                const sortItems = (items) => {
                    return [...items].sort((a, b) => {
                        let aVal, bVal;

                        switch (sortBy) {
                            case 'urgency_date':
                                if (a.urgency !== b.urgency) {
                                    return b.urgency === "1" ? 1 : -1;
                                }
                                aVal = parsePortugueseDate(a.submission);
                                bVal = parsePortugueseDate(b.submission);
                                break;

                            case 'date':
                                aVal = parsePortugueseDate(a.submission);
                                bVal = parsePortugueseDate(b.submission);
                                break;

                            case 'location':
                                const getLocationKey = (item) =>
                                    `${item.nut1 || 'ZZZ'}-${item.nut2 || 'ZZZ'}-${item.nut3 || 'ZZZ'}-${item.nut4 || 'ZZZ'}`;
                                aVal = getLocationKey(a);
                                bVal = getLocationKey(b);
                                break;

                            case 'assignee':
                                aVal = Number(a.who) || 999999;
                                bVal = Number(b.who) || 999999;
                                break;

                            case 'type':
                                aVal = a.tipo || 'ZZZ';
                                bVal = b.tipo || 'ZZZ';
                                break;

                            case 'entity':
                                aVal = a.ts_entity || 'ZZZ';
                                bVal = b.ts_entity || 'ZZZ';
                                break;

                            case 'phone':
                                const aHasPhone = Boolean(a.phone);
                                const bHasPhone = Boolean(b.phone);
                                if (aHasPhone !== bHasPhone) {
                                    return sortOrder === 'desc' ? (bHasPhone ? 1 : -1) : (aHasPhone ? -1 : 1);
                                }
                                aVal = a.phone || '';
                                bVal = b.phone || '';
                                break;

                            case 'restdays':
                                aVal = Number(a.restdays) || 9999;
                                bVal = Number(b.restdays) || 9999;
                                break;

                            default:
                                return 0;
                        }

                        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
                    });
                };

                if (!data || !Array.isArray(data)) {
                    return { 'Todos': [] };
                }

                if (groupBy === 'none') {
                    return { 'Todos': sortItems(data) };
                }

                const grouped = {};
                data.forEach(item => {
                    let groupKey = 'Outros';

                    switch (groupBy) {
                        case 'assignee':
                            const user = metaData?.who?.find(u => u.pk === Number(item.who));
                            groupKey = user ? user.name : 'Não atribuído';
                            break;
                        // ... outros casos
                    }

                    if (!grouped[groupKey]) grouped[groupKey] = [];
                    grouped[groupKey].push(item);
                });

                // Ordenar cada grupo
                Object.keys(grouped).forEach(key => {
                    grouped[key] = sortItems(grouped[key]);
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