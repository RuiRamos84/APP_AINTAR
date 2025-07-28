// frontend/src/pages/Global/context/GlobalContext.js

import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
    selectedArea: null,
    selectedLocation: '',
    entities: [],
    selectedEntity: null,
    records: [],
    loading: false,
    error: null,
    formData: {}
};

const GlobalContext = createContext();

function globalReducer(state, action) {
    switch (action.type) {
        case 'SET_AREA':
            return {
                ...initialState,
                selectedArea: action.payload
            };

        case 'SET_LOCATION':
            return {
                ...state,
                selectedLocation: action.payload,
                selectedEntity: null
            };

        case 'SET_ENTITIES':
            return {
                ...state,
                entities: action.payload
            };

        case 'SET_ENTITY':
            return {
                ...state,
                selectedEntity: action.payload
            };

        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload
            };

        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                loading: false
            };

        case 'SET_RECORDS':
            return {
                ...state,
                records: action.payload,
                loading: false,
                error: null
            };

        case 'ADD_RECORD':
            return {
                ...state,
                records: [action.payload, ...state.records]
            };

        case 'UPDATE_FORM_DATA':
            return {
                ...state,
                formData: {
                    ...state.formData,
                    [action.field]: action.value
                }
            };

        case 'RESET_FORM':
            return {
                ...state,
                formData: action.payload || {}
            };

        case 'RESET':
            return initialState;

        default:
            return state;
    }
}

export function GlobalProvider({ children }) {
    const [state, dispatch] = useReducer(globalReducer, initialState);

    return (
        <GlobalContext.Provider value={{ state, dispatch }}>
            {children}
        </GlobalContext.Provider>
    );
}

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobal deve ser usado dentro de GlobalProvider');
    }
    return context;
};