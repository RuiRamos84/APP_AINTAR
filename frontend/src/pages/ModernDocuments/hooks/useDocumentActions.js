import { useContext } from 'react';
import DocumentActionsContext from '../context/DocumentActionsContext';

/**
 * Hook para acessar o contexto de ações de documentos
 * Centraliza todas as operações relacionadas a documentos
 */
const useDocumentActions = () => {
    const context = useContext(DocumentActionsContext);

    if (!context) {
        throw new Error('useDocumentActions deve ser usado dentro de um DocumentActionsProvider');
    }

    return context;
};

export default useDocumentActions;