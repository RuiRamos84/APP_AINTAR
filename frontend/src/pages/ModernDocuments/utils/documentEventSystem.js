// utils/documentEventSystem.js
import { useEffect, useState, useCallback } from 'react';

export const DOCUMENT_EVENTS = {
    STEP_ADDED: 'document:step-added',
    ANNEX_ADDED: 'document:annex-added',
    DOCUMENT_UPDATED: 'document:updated',
    PERMISSIONS_CHANGED: 'document:permissions-changed'
};

export class DocumentEventManager {
    static emit(eventType, documentId, data = {}) {
        const event = new CustomEvent(eventType, {
            detail: {
                documentId,
                timestamp: new Date().toISOString(),
                ...data
            }
        });
        window.dispatchEvent(event);
    }

    static subscribe(eventType, callback) {
        window.addEventListener(eventType, callback);
        return () => window.removeEventListener(eventType, callback);
    }
}

// Hook para usar nos componentes
export const useDocumentEvents = (documentId, onUpdate) => {
    useEffect(() => {
        const unsubscribers = Object.values(DOCUMENT_EVENTS).map(eventType =>
            DocumentEventManager.subscribe(eventType, (event) => {
                if (event.detail.documentId === documentId) {
                    onUpdate(event.detail);
                }
            })
        );

        return () => unsubscribers.forEach(unsub => unsub());
    }, [documentId, onUpdate]);
};

// Hook para actualizar documento específico
export const useDocumentRefresh = (documentId) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    useDocumentEvents(documentId, triggerRefresh);

    return { refreshTrigger, triggerRefresh };
};