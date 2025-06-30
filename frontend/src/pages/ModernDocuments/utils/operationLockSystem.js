// utils/operationLockSystem.js
export class OperationLockManager {
    static locks = new Map();

    static lock(documentId, operation) {
        const key = `${documentId}-${operation}`;
        if (this.locks.has(key)) return false;

        this.locks.set(key, Date.now());

        // Auto-unlock após 30 segundos
        setTimeout(() => {
            this.locks.delete(key);
        }, 30000);

        return true;
    }

    static unlock(documentId, operation) {
        const key = `${documentId}-${operation}`;
        this.locks.delete(key);
    }

    static isLocked(documentId, operation) {
        const key = `${documentId}-${operation}`;
        return this.locks.has(key);
    }
}

// Modificar DocumentModal.js - adicionar ao início
import { OperationLockManager } from '../utils/operationLockSystem';

// No DocumentModal, actualizar os handlers:
const handleAddStepClick = () => {
    if (OperationLockManager.isLocked(document.pk, 'step')) {
        showGlobalNotification('Operação já em curso...', 'warning');
        return;
    }

    if (!OperationLockManager.lock(document.pk, 'step')) {
        showGlobalNotification('Não é possível adicionar passo neste momento', 'warning');
        return;
    }

    if (onAddStep) {
        onAddStep(document, (success) => {
            OperationLockManager.unlock(document.pk, 'step');
            if (success) {
                handleAddStepSuccess();
            }
        });
    }
};

const handleAddAnnexClick = () => {
    if (OperationLockManager.isLocked(document.pk, 'annex')) {
        showGlobalNotification('Operação já em curso...', 'warning');
        return;
    }

    if (!OperationLockManager.lock(document.pk, 'annex')) {
        showGlobalNotification('Não é possível adicionar anexo neste momento', 'warning');
        return;
    }

    if (onAddAnnex) {
        onAddAnnex(document, (success) => {
            OperationLockManager.unlock(document.pk, 'annex');
            if (success) {
                handleAddAnnexSuccess();
            }
        });
    }
};