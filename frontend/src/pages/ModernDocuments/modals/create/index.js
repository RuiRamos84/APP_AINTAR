/**
 * Índice para exportação dos componentes do módulo CreateDocument
 */

// Componente principal
export { default } from './CreateDocumentModal';

// Componentes de passos
export { default as IdentificationStep } from './steps/IdentificationStep';
export { default as AddressStep } from './steps/AddressStep';
export { default as DetailsStep } from './steps/DetailsStep';
export { default as ParametersStep } from './steps/ParametersStep';
export { default as AttachmentsStep } from './steps/AttachmentsStep';
export { default as PaymentStep } from './steps/PaymentStep';
export { default as ConfirmationStep } from './steps/ConfirmationStep';

// Componentes de campos
export { default as EntitySearchField } from './fields/EntitySearchField';
export { default as FileUploadField } from './fields/FileUploadField';

// Hooks personalizados
export { useDocumentForm } from './hooks/useDocumentForm';
export { useEntityData } from './hooks/useEntityData';
export { useDocumentParams } from './hooks/useDocumentParams';
export { useFileHandling } from './hooks/useFileHandling';