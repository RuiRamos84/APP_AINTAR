/**
 * Barrel Export - Contexts
 * Centraliza exports de todos os contexts da aplicação
 */

// Auth Context
export { AuthProvider, useAuth } from './AuthContext';

// Permission Context
export { PermissionProvider, usePermissions } from './PermissionContext';

// Socket Context
export { SocketProvider, useSocket } from './SocketContext';

// Metadata Context
export {
  MetadataProvider,
  useMetadata,
  useProfiles,
  useInterfaces,
} from './MetadataContext';
