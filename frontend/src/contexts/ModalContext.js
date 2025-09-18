import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children }) => {
    const [modalType, setModalType] = useState(null); // e.g., 'CREATE_DOCUMENT', 'CREATE_ENTITY'
    const [modalProps, setModalProps] = useState({});

    const openModal = useCallback((type, props = {}) => {
        setModalType(type);
        setModalProps(props);
    }, []);

    const closeModal = useCallback(() => {
        setModalType(null);
        setModalProps({});
    }, []);

    const value = {
        modalType,
        modalProps,
        openModal,
        closeModal,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    );
};