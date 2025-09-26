import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '../../../contexts/SocketContext';
import { useAuth } from '../../../contexts/AuthContext';
import { notifySuccess, notifyInfo, notifyWarning } from '../../../components/common/Toaster/ThemedToaster';
import permissionService from '../../../services/permissionService';

const DocumentNotificationContext = createContext();

/**
 * Contexto avançado para notificações de documentos em tempo real
 * - Eventos Socket.IO específicos para documentos
 * - Sistema de notificações com histórico
 * - Integração com ThemedToaster
 * - Sons e feedback visual
 */
export const DocumentNotificationProvider = ({ children }) => {
    const { socket, isConnected, emit } = useSocket();
    const { user } = useAuth();

    // Estados das notificações
    const [documentNotifications, setDocumentNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [lastNotificationId, setLastNotificationId] = useState(null);

    // Referências para controlo de áudio e estado
    const audioRef = useRef(null);
    const notificationQueueRef = useRef([]);

    // =========================================================================
    // UTILITÁRIOS DE NOTIFICAÇÃO
    // =========================================================================

    /**
     * Reproduzir som de notificação (suave)
     */
    const playNotificationSound = useCallback(() => {
        try {
            if (!audioRef.current) {
                // Criar elemento de áudio dinâmico com som suave
                audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhC1mf4PK3aRgCJn/K8duILgUke8v25ooxB2Kw5uGpXxIC");
                audioRef.current.volume = 0.3;
            }
            audioRef.current.play().catch(() => {
                // Ignorar erros de reprodução (algumas políticas de browser)
            });
        } catch (error) {
            console.debug('Não foi possível reproduzir som de notificação:', error);
        }
    }, []);

    /**
     * Gerar ID único para notificação
     */
    const generateNotificationId = useCallback(() => {
        return `doc_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    /**
     * Formatar timestamp legível
     */
    const formatTimestamp = useCallback((timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `há ${diffMins}m`;
        if (diffMins < 1440) return `há ${Math.floor(diffMins / 60)}h`;
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }, []);

    // =========================================================================
    // HANDLERS DE EVENTOS SOCKET.IO
    // =========================================================================

    /**
     * Handler principal para transferência de documento
     */
    const handleDocumentTransferred = useCallback((data) => {
        console.group('📬 Notificação de Documento Recebida');
        console.log('Dados recebidos:', data);
        console.log('Utilizador actual:', user?.user_id);
        const {
            documentId,
            documentNumber,
            fromUser,
            fromUserName,
            toUser,
            toUserName,
            stepName,
            stepType,
            currentStatus,
            timestamp = new Date().toISOString(),
            metadata = {}
        } = data;

        // Verificar se é relevante para o utilizador actual
        const isReceiver = toUser === user?.user_id;
        const isSender = fromUser === user?.user_id;

        if (!isReceiver && !isSender) return;

        const notificationId = generateNotificationId();

        // Criar objecto de notificação
        const notification = {
            id: notificationId,
            type: 'document_transfer',
            documentId,
            documentNumber,
            fromUser,
            fromUserName: fromUserName || 'Utilizador',
            toUser,
            toUserName: toUserName || 'Utilizador',
            stepName,
            stepType,
            currentStatus,
            timestamp,
            isReceiver,
            isSender,
            read: false,
            metadata,
            // Propriedades calculadas
            title: isReceiver ? 'Novo documento atribuído' : 'Documento transferido',
            message: isReceiver
                ? `Recebeu o documento ${documentNumber} de ${fromUserName}`
                : `Documento ${documentNumber} transferido para ${toUserName}`,
            priority: isReceiver ? 'high' : 'medium',
            icon: isReceiver ? '📬' : '📤'
        };

        // Adicionar à lista de notificações
        setDocumentNotifications(prev => [notification, ...prev.slice(0, 99)]); // Max 100 notificações

        if (isReceiver) {
            setUnreadCount(prev => prev + 1);
            setLastNotificationId(notificationId);
        }

        // Feedback visual e sonoro
        if (isReceiver) {
            playNotificationSound();
            notifyInfo(`📬 ${notification.message}`, {
                duration: 6000,
                action: {
                    label: 'Ver',
                    onClick: () => handleViewDocument(documentId)
                }
            });
        } else if (isSender) {
            notifySuccess(`📤 ${notification.message}`, { duration: 4000 });
        }

        // Disparar evento para actualizar listas
        window.dispatchEvent(new CustomEvent('document-notification', {
            detail: notification
        }));

        console.log(`📋 Notificação de documento processada:`, notification);
        console.log('✅ Notificação adicionada às notificações locais');
        console.groupEnd();

    }, [user?.user_id, generateNotificationId, playNotificationSound]);

    /**
     * Handler para actualização de status de documento
     */
    const handleDocumentStatusUpdate = useCallback((data) => {
        const {
            documentId,
            documentNumber,
            oldStatus,
            newStatus,
            updatedBy,
            updatedByName,
            timestamp = new Date().toISOString()
        } = data;

        const notificationId = generateNotificationId();

        const notification = {
            id: notificationId,
            type: 'document_status_update',
            documentId,
            documentNumber,
            oldStatus,
            newStatus,
            updatedBy,
            updatedByName: updatedByName || 'Utilizador',
            timestamp,
            read: false,
            title: 'Status de documento actualizado',
            message: `Documento ${documentNumber} actualizado para "${newStatus}"`,
            priority: 'medium',
            icon: '📋'
        };

        setDocumentNotifications(prev => [notification, ...prev.slice(0, 99)]);

        // Feedback mais subtil para updates de status
        notifyInfo(`📋 ${notification.message}`, { duration: 3000 });

        window.dispatchEvent(new CustomEvent('document-status-update', {
            detail: notification
        }));

    }, [generateNotificationId]);

    /**
     * Handler para documento rejeitado/devolvido
     */
    const handleDocumentRejected = useCallback((data) => {
        const {
            documentId,
            documentNumber,
            rejectedBy,
            rejectedByName,
            reason,
            returnedToUser,
            timestamp = new Date().toISOString()
        } = data;

        // Verificar se é o utilizador que vai receber de volta
        const isReceiver = returnedToUser === user?.user_id;
        if (!isReceiver) return;

        const notificationId = generateNotificationId();

        const notification = {
            id: notificationId,
            type: 'document_rejected',
            documentId,
            documentNumber,
            rejectedBy,
            rejectedByName: rejectedByName || 'Utilizador',
            reason,
            returnedToUser,
            timestamp,
            read: false,
            title: 'Documento devolvido',
            message: `Documento ${documentNumber} foi devolvido por ${rejectedByName}`,
            priority: 'high',
            icon: '🔄'
        };

        setDocumentNotifications(prev => [notification, ...prev.slice(0, 99)]);
        setUnreadCount(prev => prev + 1);
        setLastNotificationId(notificationId);

        // Feedback mais chamativo para rejeições
        playNotificationSound();
        notifyWarning(`🔄 ${notification.message}${reason ? `\nMotivo: ${reason}` : ''}`, {
            duration: 8000,
            action: {
                label: 'Ver documento',
                onClick: () => handleViewDocument(documentId)
            }
        });

        window.dispatchEvent(new CustomEvent('document-rejected', {
            detail: notification
        }));

    }, [user?.user_id, generateNotificationId, playNotificationSound]);

    // =========================================================================
    // ACÇÕES E UTILITÁRIOS
    // =========================================================================

    /**
     * Visualizar documento específico
     */
    const handleViewDocument = useCallback((documentId) => {
        // Disparar evento para abrir modal de documento
        window.dispatchEvent(new CustomEvent('open-document-modal', {
            detail: { documentId }
        }));
    }, []);

    /**
     * Marcar notificação como lida
     */
    const markNotificationAsRead = useCallback((notificationId) => {
        setDocumentNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId ? { ...notif, read: true } : notif
            )
        );

        setUnreadCount(prev => Math.max(0, prev - 1));

        // Emitir evento para servidor se necessário
        if (socket && isConnected) {
            emit('mark_document_notification_read', {
                notificationId,
                userId: user?.user_id
            });
        }

    }, [socket, isConnected, emit, user?.user_id]);

    /**
     * Marcar todas como lidas
     */
    const markAllAsRead = useCallback(() => {
        const unreadIds = documentNotifications
            .filter(notif => !notif.read)
            .map(notif => notif.id);

        setDocumentNotifications(prev =>
            prev.map(notif => ({ ...notif, read: true }))
        );

        setUnreadCount(0);

        // Emitir para servidor
        if (socket && isConnected && unreadIds.length > 0) {
            emit('mark_all_document_notifications_read', {
                notificationIds: unreadIds,
                userId: user?.user_id
            });
        }

        notifySuccess(`✅ ${unreadIds.length} notificações marcadas como lidas`);

    }, [documentNotifications, socket, isConnected, emit, user?.user_id]);

    /**
     * Limpar notificações antigas (mais de 7 dias)
     */
    const clearOldNotifications = useCallback(() => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        setDocumentNotifications(prev =>
            prev.filter(notif => new Date(notif.timestamp) > weekAgo)
        );

    }, []);

    /**
     * Emitir evento de transferência de documento
     */
    const notifyDocumentTransfer = useCallback((transferData) => {
        if (socket && isConnected) {
            emit('document_transferred', {
                ...transferData,
                fromUser: user?.user_id,
                fromUserName: user?.name || user?.username,
                timestamp: new Date().toISOString()
            });
        }
    }, [socket, isConnected, emit, user]);

    // =========================================================================
    // EFEITOS E CONFIGURAÇÃO
    // =========================================================================

    // Registar event listeners do Socket.IO
    useEffect(() => {
        if (socket && isConnected) {
            console.group('🔌 Configurando listeners Socket.IO para DocumentNotifications');
            console.log('Socket conectado:', !!socket);
            console.log('Utilizador ID:', user?.user_id);

            // Eventos de documento
            socket.on('document_transferred', handleDocumentTransferred);
            socket.on('document_status_updated', handleDocumentStatusUpdate);
            socket.on('document_rejected', handleDocumentRejected);

            console.log('✅ Event listeners registados:', [
                'document_transferred',
                'document_status_updated',
                'document_rejected'
            ]);

            // Solicitar notificações iniciais
            emit('get_document_notifications', {
                userId: user?.user_id,
                limit: 50
            });

            console.log('📡 Solicitação de notificações iniciais enviada');
            console.groupEnd();

            return () => {
                console.log('🧹 Removendo listeners de documentos Socket.IO');
                socket.off('document_transferred');
                socket.off('document_status_updated');
                socket.off('document_rejected');
            };
        }
    }, [socket, isConnected, handleDocumentTransferred, handleDocumentStatusUpdate, handleDocumentRejected, emit, user?.user_id]);

    // Limpeza automática de notificações antigas
    useEffect(() => {
        const interval = setInterval(clearOldNotifications, 1000 * 60 * 60); // A cada hora
        return () => clearInterval(interval);
    }, [clearOldNotifications]);

    // Controlo de visibilidade da página
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Marcar como lidas as notificações visualizadas
                if (isVisible && unreadCount > 0) {
                    // Pequeno delay para permitir que o utilizador veja
                    setTimeout(() => {
                        if (documentNotifications.some(n => !n.read && n.isReceiver)) {
                            // Auto-marcar como lidas após alguns segundos de visualização
                        }
                    }, 3000);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isVisible, unreadCount, documentNotifications]);

    // =========================================================================
    // CONTEXT VALUE
    // =========================================================================

    const contextValue = {
        // Estado das notificações
        documentNotifications,
        unreadCount,
        isVisible,
        lastNotificationId,

        // Acções
        markNotificationAsRead,
        markAllAsRead,
        clearOldNotifications,
        handleViewDocument,

        // Emissores
        notifyDocumentTransfer,

        // Utilitários
        formatTimestamp,

        // Controlo de visibilidade
        setIsVisible
    };

    return (
        <DocumentNotificationContext.Provider value={contextValue}>
            {children}
        </DocumentNotificationContext.Provider>
    );
};

/**
 * Hook para utilizar o contexto de notificações de documentos
 */
export const useDocumentNotifications = () => {
    const context = useContext(DocumentNotificationContext);
    if (!context) {
        throw new Error('useDocumentNotifications deve ser usado dentro de DocumentNotificationProvider');
    }
    return context;
};

export default DocumentNotificationContext;