// src/ModernDocuments/reducers/DocumentManagerReducer.js

// Definição de tipos de ação
export const ACTIONS = {
    SET_VIEW_MODE: 'SET_VIEW_MODE',
    SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
    SET_SEARCH_TERM: 'SET_SEARCH_TERM',
    SET_FILTER: 'SET_FILTER',
    RESET_FILTERS: 'RESET_FILTERS',
    SET_SORT: 'SET_SORT',
    SET_DENSITY: 'SET_DENSITY',
    SET_PAGE: 'SET_PAGE',
    SET_ITEMS_PER_PAGE: 'SET_ITEMS_PER_PAGE',
    TOGGLE_DRAWER: 'TOGGLE_DRAWER',
    TOGGLE_FILTERS: 'TOGGLE_FILTERS',
    SET_SELECTED_DOCUMENT: 'SET_SELECTED_DOCUMENT',
    TOGGLE_MODAL: 'TOGGLE_MODAL',
    SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
    HIDE_NOTIFICATION: 'HIDE_NOTIFICATION',
};

// Estado inicial
export const initialState = {
    // Estados de UI
    viewMode: 'grid', // 'grid', 'list', ou 'kanban'
    activeTab: 0, // 0: todos, 1: para tratamento, 2: criados por mim
    searchTerm: '',
    filters: {
        status: '',
        associate: '',
        type: ''
    },
    showFilters: false,
    sortBy: 'regnumber',
    sortDirection: 'desc',
    density: 'standard', // 'compact', 'standard', ou 'comfortable'

    // Paginação
    page: 0,
    itemsPerPage: 10,

    // Estado do drawer (mobile)
    drawerOpen: false,

    // Estado de seleção e modais
    selectedDocument: null,
    modal: {
        document: false,
        step: false,
        annex: false,
        replicate: false,
        create: false
    },

    // Notificações
    notification: {
        open: false,
        message: '',
        severity: 'info'
    }
};

// Reducer
const documentManagerReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.SET_VIEW_MODE:
            return {
                ...state,
                viewMode: action.payload
            };

        case ACTIONS.SET_ACTIVE_TAB:
            return {
                ...state,
                activeTab: action.payload
            };

        case ACTIONS.SET_SEARCH_TERM:
            return {
                ...state,
                searchTerm: action.payload,
                page: 0 // Resetar para primeira página ao buscar
            };

        case ACTIONS.SET_FILTER:
            return {
                ...state,
                filters: {
                    ...state.filters,
                    [action.payload.name]: action.payload.value
                },
                page: 0 // Resetar para primeira página ao filtrar
            };

        case ACTIONS.RESET_FILTERS:
            return {
                ...state,
                filters: {
                    status: '',
                    associate: '',
                    type: ''
                },
                searchTerm: '',
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

        case ACTIONS.SET_DENSITY:
            return {
                ...state,
                density: action.payload
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
                page: 0 // Resetar página ao mudar itens por página
            };

        case ACTIONS.TOGGLE_DRAWER:
            return {
                ...state,
                drawerOpen: action.payload !== undefined ? action.payload : !state.drawerOpen
            };

        case ACTIONS.TOGGLE_FILTERS:
            return {
                ...state,
                showFilters: action.payload !== undefined ? action.payload : !state.showFilters
            };

        case ACTIONS.SET_SELECTED_DOCUMENT:
            return {
                ...state,
                selectedDocument: action.payload
            };

        case ACTIONS.TOGGLE_MODAL:
            return {
                ...state,
                modal: {
                    ...state.modal,
                    [action.payload.modalName]: action.payload.isOpen
                },
                // Fechar drawer ao abrir qualquer modal em telas pequenas
                drawerOpen: action.payload.isOpen ? false : state.drawerOpen
            };

        case ACTIONS.SHOW_NOTIFICATION:
            return {
                ...state,
                notification: {
                    open: true,
                    message: action.payload.message,
                    severity: action.payload.severity || 'info'
                }
            };

        case ACTIONS.HIDE_NOTIFICATION:
            return {
                ...state,
                notification: {
                    ...state.notification,
                    open: false
                }
            };

        default:
            return state;
    }
};

export default documentManagerReducer;