// /context/InternalContext.js
import React, { createContext, useContext, useReducer } from "react";

const initialState = {
    selectedArea: null,
    selectedLocation: "",
    filteredEntities: [],
    selectedEntity: null,
    records: [],
    loading: false,
    error: null,
};

function reducer(state, action) {
    switch (action.type) {
        case "SET_AREA":
            return {
                ...state,
                selectedArea: action.payload,
                selectedEntity: null,
                selectedLocation: "",
                filteredEntities: [],
                records: [],
                error: null
            };
        case "SET_LOCATION":
            return { ...state, selectedLocation: action.payload };
        case "SET_FILTERED_ENTITIES":
            return { ...state, filteredEntities: action.payload };
        case "SET_ENTITY":
            return { ...state, selectedEntity: action.payload };
        case "FETCH_START":
            return { ...state, loading: true, error: null };
        case "FETCH_SUCCESS":
            return { ...state, loading: false, records: action.payload, error: null };
        case "FETCH_ERROR":
            return { ...state, loading: false, error: action.payload };
        case "RESET":
            return initialState;
        default:
            return state;
    }
}

const InternalContext = createContext();

export function InternalProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
        <InternalContext.Provider value={{ state, dispatch }}>
            {children}
        </InternalContext.Provider>
    );
}

export const useInternalContext = () => useContext(InternalContext);