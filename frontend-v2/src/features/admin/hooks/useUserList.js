/**
 * useUserList Hook
 * Hook especializado para gestão de listagem de utilizadores (Admin)
 *
 * Features:
 * - Paginação
 * - Pesquisa
 * - Ordenação
 * - Ações CRUD (delete, toggle status, reset password)
 * - Auto-refresh
 * - Error handling
 * - Loading states
 */

import { useState, useEffect, useCallback } from 'react';
import {
  listUsers,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
} from '@/services/userService';
import { notification } from '@/core/services/notification';

/**
 * Hook para gestão da lista de utilizadores
 *
 * @returns {Object} State and handlers
 *
 * @example
 * const {
 *   users,
 *   totalCount,
 *   isLoading,
 *   page,
 *   setPage,
 *   handleDeleteUser,
 * } = useUserList();
 */
export const useUserList = () => {
  // Dados
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Parâmetros de listagem
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('user_id');
  const [sortOrder, setSortOrder] = useState('asc');

  /**
   * Carregar lista de utilizadores
   */
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {
        page: page + 1, // API usa 1-based indexing
        limit: rowsPerPage,
        search: search || undefined,
        sortBy,
        sortOrder,
      };

      const response = await listUsers(params);

      // A resposta pode vir em diferentes formatos
      if (response?.users) {
        setUsers(response.users);
        setTotalCount(response.total || response.users.length);
      } else if (Array.isArray(response)) {
        setUsers(response);
        setTotalCount(response.length);
      } else {
        setUsers([]);
        setTotalCount(0);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[useUserList] Error fetching users:', err);
      }
      setError(err.message || 'Erro ao carregar utilizadores');
      notification.error(err.message || 'Erro ao carregar utilizadores');
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, search, sortBy, sortOrder]);

  /**
   * Auto-fetch quando parâmetros mudam
   */
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Apagar utilizador
   */
  const handleDeleteUser = useCallback(async (userId) => {
    try {
      await deleteUser(userId);
      notification.success('Utilizador apagado com sucesso');

      // Refresh da lista
      await fetchUsers();
      return true;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[useUserList] Error deleting user:', err);
      }
      notification.error(err.message || 'Erro ao apagar utilizador');
      return false;
    }
  }, [fetchUsers]);

  /**
   * Ativar/Desativar utilizador
   */
  const handleToggleStatus = useCallback(async (userId, active) => {
    try {
      await toggleUserStatus(userId, active);
      notification.success(
        active ? 'Utilizador ativado com sucesso' : 'Utilizador desativado com sucesso'
      );

      // Atualizar na lista local para feedback imediato
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.user_id === userId ? { ...user, active } : user
        )
      );

      return true;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[useUserList] Error toggling user status:', err);
      }
      notification.error(err.message || 'Erro ao alterar status do utilizador');
      return false;
    }
  }, []);

  /**
   * Reset password do utilizador
   */
  const handleResetPassword = useCallback(async (userId) => {
    try {
      const result = await resetUserPassword(userId);
      notification.success('Password resetada com sucesso');
      return result;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[useUserList] Error resetting password:', err);
      }
      notification.error(err.message || 'Erro ao resetar password');
      return null;
    }
  }, []);

  /**
   * Refetch manual
   */
  const refetch = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Reset de filtros
   */
  const resetFilters = useCallback(() => {
    setSearch('');
    setSortBy('user_id');
    setSortOrder('asc');
    setPage(0);
  }, []);

  return {
    // Dados
    users,
    totalCount,

    // Estados
    isLoading,
    error,

    // Parâmetros
    page,
    rowsPerPage,
    search,
    sortBy,
    sortOrder,

    // Setters
    setPage,
    setRowsPerPage,
    setSearch,
    setSortBy,
    setSortOrder,

    // Ações
    handleDeleteUser,
    handleToggleStatus,
    handleResetPassword,
    refetch,
    resetFilters,
  };
};

export default useUserList;
