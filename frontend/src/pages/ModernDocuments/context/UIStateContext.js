import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Reducer para gerenciar o estado de UI
const initialState = {
    viewMode: 'grid', // 'grid', 'list', ou 'kanban'
    density: 'standard', // 'compact', 'standard', ou 'comfortable'
    showFilters: false,
    showSorting: false, // Novo: controla a visibilidade da ordenação separadamente
    searchTerm: '',
    filters: {
        status: '',
        associate: '',
        type: '',
        notification: ''
    },
    dateRange: { // Novo: filtro por data
        startDate: null,
        endDate: null
    },
    sortBy: 'submission', // Mudei para submission como default
    sortDirection: 'desc',
    page: 0,
    itemsPerPage: 12,
    drawerOpen: false
};

// Tipos de ações para o reducer
const ACTIONS = {
    SET_VIEW_MODE: 'SET_VIEW_MODE',
    SET_DENSITY: 'SET_DENSITY',
    TOGGLE_FILTERS: 'TOGGLE_FILTERS',
    TOGGLE_SORTING: 'TOGGLE_SORTING', // Novo
    SET_SEARCH_TERM: 'SET_SEARCH_TERM',
    SET_FILTER: 'SET_FILTER',
    RESET_FILTERS: 'RESET_FILTERS',
    SET_DATE_RANGE: 'SET_DATE_RANGE', // Novo
    SET_SORT: 'SET_SORT',
    SET_PAGE: 'SET_PAGE',
    SET_ITEMS_PER_PAGE: 'SET_ITEMS_PER_PAGE',
    TOGGLE_DRAWER: 'TOGGLE_DRAWER',
};

// Reducer
const uiReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.SET_VIEW_MODE:
            return {
                ...state,
                viewMode: action.payload
            };
        case ACTIONS.SET_DENSITY:
            return {
                ...state,
                density: action.payload
            };
        case ACTIONS.TOGGLE_FILTERS:
            return {
                ...state,
                showFilters: action.payload !== undefined ? action.payload : !state.showFilters
            };
        case ACTIONS.TOGGLE_SORTING: // Novo
            return {
                ...state,
                showSorting: action.payload !== undefined ? action.payload : !state.showSorting
            };
        case ACTIONS.SET_SEARCH_TERM:
            return {
                ...state,
                searchTerm: action.payload,
                page: 0
            };
        case ACTIONS.SET_FILTER:
            return {
                ...state,
                filters: {
                    ...state.filters,
                    [action.payload.name]: action.payload.value
                },
                page: 0
            };
        case ACTIONS.RESET_FILTERS:
            return {
                ...state,
                filters: initialState.filters,
                dateRange: initialState.dateRange, // Resetar também filtros de data
                searchTerm: '',
                page: 0
            };
        case ACTIONS.SET_DATE_RANGE: // Novo
            return {
                ...state,
                dateRange: action.payload,
                page: 0
            };
        case ACTIONS.SET_SORT:
            return {
                ...state,
                sortBy: action.payload.field,
                sortDirection: action.payload.direction ||
                    (state.sortBy === action.payload.field
                        ? (state.sortDirection === 'asc' ? 'desc' : 'asc')
                        : 'asc'),
                page: 0
            };
        case ACTIONS.SET_PAGE:
            return {
                ...state,
                page: action.payload
            };
        case ACTIONS.SET_ITEMS_PER_PAGE:
            return {
                ...state,
                itemsPerPage: action.payload,
                page: 0 // Reset to first page on items per page change
            };
        case ACTIONS.TOGGLE_DRAWER:
            return {
                ...state,
                drawerOpen: action.payload !== undefined ? action.payload : !state.drawerOpen
            };
        default:
            return state;
    }
};

// Criar contexto
const UIContext = createContext();

// Provider do contexto
export const UIProvider = ({ children }) => {
    // Inicializar o reducer com preferências salvas
    const [state, dispatch] = useReducer(uiReducer, initialState, () => {
        try {
            const savedPrefs = localStorage.getItem('documentUIPrefs');
            if (savedPrefs) {
                const prefs = JSON.parse(savedPrefs);
                return {
                    ...initialState,
                    viewMode: prefs.viewMode || initialState.viewMode,
                    density: prefs.density || initialState.density
                };
            }
        } catch (e) {
            console.error('Erro ao carregar preferências:', e);
        }
        return initialState;
    });

    // Salvar preferências quando mudam
    useEffect(() => {
        try {
            localStorage.setItem('documentUIPrefs', JSON.stringify({
                viewMode: state.viewMode,
                density: state.density
            }));
        } catch (e) {
            console.error('Erro ao salvar preferências:', e);
        }
    }, [state.viewMode, state.density]);

    // Action creators
    const setViewMode = (mode) => dispatch({ type: ACTIONS.SET_VIEW_MODE, payload: mode });
    const setDensity = (density) => dispatch({ type: ACTIONS.SET_DENSITY, payload: density });
    const toggleFilters = (isOpen) => {
        console.log("toggleFilters called with:", isOpen);
        dispatch({
            type: ACTIONS.TOGGLE_FILTERS,
            payload: isOpen !== undefined ? isOpen : !state.showFilters
        });
    };
    const toggleSorting = (isOpen) => { // Novo
        dispatch({
            type: ACTIONS.TOGGLE_SORTING,
            payload: isOpen !== undefined ? isOpen : !state.showSorting
        });
    };
    const setSearchTerm = (term) => dispatch({ type: ACTIONS.SET_SEARCH_TERM, payload: term });
    const setFilter = (name, value) => dispatch({ type: ACTIONS.SET_FILTER, payload: { name, value } });
    const resetFilters = () => dispatch({ type: ACTIONS.RESET_FILTERS });
    const setDateRange = (newDateRange) => dispatch({ type: ACTIONS.SET_DATE_RANGE, payload: newDateRange }); // Novo
    const setSort = (field, direction) => dispatch({
        type: ACTIONS.SET_SORT,
        payload: { field, direction }
    });
    const setPage = (page) => dispatch({ type: ACTIONS.SET_PAGE, payload: page });
    const setItemsPerPage = (count) => dispatch({ type: ACTIONS.SET_ITEMS_PER_PAGE, payload: count });
    const toggleDrawer = (isOpen) => dispatch({ type: ACTIONS.TOGGLE_DRAWER, payload: isOpen });

    // Valor do contexto
    const value = {
        // Estado
        ...state,

        // Actions
        setViewMode,
        setDensity,
        toggleFilters,
        toggleSorting, // Novo
        setSearchTerm,
        setFilter,
        resetFilters,
        setDateRange, // Novo
        setSort,
        setPage,
        setItemsPerPage,
        toggleDrawer
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

// Hook para usar o contexto
export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI deve ser usado dentro de um UIProvider');
    }
    return context;
};