// Query key da tabela central de notificações — partilhada entre SocketContext
// e os hooks de mutação (tasks/documentos) que precisam de a invalidar após
// marcar como lida, para os badges por-item refletirem o estado de imediato.
export const NOTIFICATION_KEYS = { central: ['notifications', 'central'] };
