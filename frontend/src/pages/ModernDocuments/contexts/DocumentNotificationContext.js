// Compatibility wrapper para useDocumentNotifications
// Este arquivo mantém compatibilidade com componentes que ainda usam useDocumentNotifications
import { useSocket } from '../../../contexts/SocketContext';

/**
 * Hook de compatibilidade para useDocumentNotifications
 * Mapeia para o novo sistema unificado no SocketContext
 */
export const useDocumentNotifications = () => {
    const socketContext = useSocket();

    return {
        // Notificações de documentos
        documentNotifications: socketContext.documentNotifications || [],
        unreadCount: socketContext.unreadCount || 0,
        lastNotificationId: socketContext.lastNotificationId,

        // Ações
        markNotificationAsRead: socketContext.markNotificationAsRead,
        markAllAsRead: socketContext.markAllAsRead,
        clearOldNotifications: socketContext.clearOldNotifications,
        handleViewDocument: socketContext.handleViewDocument,

        // Emissores
        notifyDocumentTransfer: socketContext.notifyDocumentTransfer,

        // Utilitários
        formatTimestamp: socketContext.formatTimestamp,

        // Controlo de visibilidade (mock - não implementado no novo sistema)
        isVisible: false,
        setIsVisible: () => {},

        // Compatibilidade com propriedades legacy
        documentNotificationsLength: socketContext.documentNotificationsLength || 0
    };
};

// Provider vazio para compatibilidade (o estado está agora no SocketContext)
export const DocumentNotificationProvider = ({ children }) => {
    return children;
};

// Export do contexto para compatibilidade
export default null;