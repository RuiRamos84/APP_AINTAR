import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
    const { user } = useAuth();

    const hasAccess = (requiredInterface) => {
        if (user?.profil === '0') return true;
        if (!user?.interfaces || !Array.isArray(user.interfaces)) return false;
        return user.interfaces.includes(requiredInterface);
    };

    const hasPermission = (config) => {
        if (!user) return false;
        if (user.profil === '0') return true;

        // 1. Perfil + Interface
        if (config.requiredProfil && config.requiredInterface) {
            return user.profil === config.requiredProfil &&
                hasAccess(config.requiredInterface);
        }

        // 2. Só Perfil
        if (config.requiredProfil) {
            return user.profil === config.requiredProfil;
        }

        // 3. Só Interface  
        if (config.requiredInterface) {
            return hasAccess(config.requiredInterface);
        }

        // 4. Legacy (rolesAllowed)
        if (config.rolesAllowed) {
            const hasRole = config.rolesAllowed.includes(user.profil);
            const hasUserId = !config.allowedUserIds ||
                config.allowedUserIds.includes(user.user_id);
            return hasRole && hasUserId;
        }

        return true;
    };

    return { hasAccess, hasPermission };
};