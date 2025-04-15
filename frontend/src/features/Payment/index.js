// Exportar componentes principais
export { default as PaymentModule } from './components/PaymentModule';
export { default as PaymentDialog } from './modals/PaymentDialog';

// Exportar contexto
export { PaymentContext, PaymentProvider } from './context/PaymentContext';

// Exportar hooks
// export { usePayment } from './hooks/usePayment';

// Exportar serviço para uso direto
export { default as paymentService } from './services/paymentService';
export * from './services/paymentTypes';