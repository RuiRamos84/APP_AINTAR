// frontend/src/components/modals/AppModals.js - NOVO ARQUIVO

import React from "react";
import CreateDocumentModal from "../../pages/Documents/DocumentCreate/CreateDocumentModal";
import CreateEntity from "../../pages/Entity/CreateEntity/CreateEntity";
import { useModal } from "../../contexts/ModalContext";

const AppModals = () => {
    const { modalType, closeModal, modalProps } = useModal();

    return (
        <>
            <CreateDocumentModal 
                open={modalType === 'CREATE_DOCUMENT'} 
                onClose={closeModal} 
                {...modalProps} />
            <CreateEntity 
                open={modalType === 'CREATE_ENTITY'} 
                onClose={closeModal} 
                {...modalProps} />
        </>
    );
};

export default AppModals;