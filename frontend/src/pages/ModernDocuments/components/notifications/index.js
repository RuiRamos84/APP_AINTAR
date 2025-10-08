/**
 * Sistema de Notificações de Documentos - Exports principais
 *
 * Sistema completo de notificações em tempo real para transferência de documentos
 * usando Socket.IO, com componentes visuais elegantes e integração com ThemedToaster.
 */

// Context e Hooks
export { DocumentNotificationProvider, useDocumentNotifications } from '../../contexts/DocumentNotificationContext';

// Componentes Visuais
export { default as DocumentNotificationCenter } from './DocumentNotificationCenter';
export { default as DocumentNotificationButton } from './DocumentNotificationButton';

/**
 * INSTRUÇÕES DE USO:
 *
 * 1. Envolver a aplicação com DocumentNotificationProvider:
 * ```jsx
 * <DocumentNotificationProvider>
 *   <SuaAplicacao />
 * </DocumentNotificationProvider>
 * ```
 *
 * 2. Adicionar botão de notificações:
 * ```jsx
 * import { DocumentNotificationButton } from './components/notifications';
 *
 * <DocumentNotificationButton
 *   size="medium"
 *   color="primary"
 *   animate={true}
 * />
 * ```
 *
 * 3. Emitir notificações de transferência:
 * ```jsx
 * const { notifyDocumentTransfer } = useDocumentNotifications();
 *
 * notifyDocumentTransfer({
 *   documentId: 123,
 *   documentNumber: 'DOC-2024-001',
 *   toUser: 456,
 *   toUserName: 'João Silva',
 *   stepName: 'Aprovação',
 *   stepType: 'approval',
 *   currentStatus: 'Pendente',
 *   metadata: { memo: 'Urgente' }
 * });
 * ```
 *
 * EVENTOS SOCKET.IO SUPORTADOS:
 * - document_transferred: Documento transferido para outro utilizador
 * - document_status_updated: Status do documento actualizado
 * - document_rejected: Documento rejeitado/devolvido
 *
 * FUNCIONALIDADES:
 * ✅ Notificações em tempo real via Socket.IO
 * ✅ Feedback visual com ThemedToaster
 * ✅ Sons de notificação suaves
 * ✅ Centro de notificações com histórico
 * ✅ Filtragem e categorização
 * ✅ Marcação como lido/não lido
 * ✅ Animações elegantes
 * ✅ Totalmente responsivo
 * ✅ Integração perfeita com sistema existente
 */

// Default export não é necessário pois já exportamos tudo individualmente
// export default {
//     DocumentNotificationProvider,
//     useDocumentNotifications,
//     DocumentNotificationCenter,
//     DocumentNotificationButton
// };