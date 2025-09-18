// frontend/src/hooks/useModalState.js - NOVO ARQUIVO

import { useState } from "react";

export const useModalState = () => {
    const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
    const [isCreateEntityModalOpen, setIsCreateEntityModalOpen] = useState(false);

    const openNewDocumentModal = () => setIsCreateDocumentModalOpen(true);
    const closeNewDocumentModal = () => setIsCreateDocumentModalOpen(false);
    const openEntityModal = () => setIsCreateEntityModalOpen(true);
    const closeEntityModal = () => setIsCreateEntityModalOpen(false);

    return {
        isCreateDocumentModalOpen,
        isCreateEntityModalOpen,
        openNewDocumentModal,
        closeNewDocumentModal,
        openEntityModal,
        closeEntityModal
    };
};