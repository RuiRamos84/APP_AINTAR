import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  listUsers,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
} from '@/services/userService';
import { notification } from '@/core/services/notification';

/**
 * Hook de gestão da lista de utilizadores.
 *
 * O backend retorna todos os utilizadores de uma vez (sem suporte a
 * paginação/ordenação server-side), por isso toda a filtragem, ordenação
 * e paginação é feita client-side com useMemo.
 *
 * Normaliza também o campo `interface` (singular, vindo do backend)
 * para `interfaces` (plural, padrão interno da app).
 */
export const useUserList = () => {
  // Dados em bruto vindos da API
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Ordenação
  const [sortBy, setSortBy] = useState('user_id');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pesquisa com debounce
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Filtro de estado
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'pending' | 'disabled'

  // ── Debounce da pesquisa (350ms) ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Reset de página quando filtros/ordenação mudam ───────────────────────
  useEffect(() => { setPage(0); }, [search, statusFilter, sortBy, sortOrder]);

  // ── Fetch (único, sem parâmetros — backend não suporta) ──────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await listUsers();
      const raw = response?.users ?? (Array.isArray(response) ? response : []);

      // Normalizar: garante `interfaces`, `active`, `email_validated` e `status`
      const normalized = raw.map(u => {
        const active = u.active ?? true;
        const emailValidated = u.email_validated ?? (u.validated === 0);
        // `status` pode já vir do backend; se não, calcula aqui
        let status = u.status;
        if (!status) {
          if (!active)          status = 'disabled';
          else if (!emailValidated) status = 'pending';
          else                  status = 'active';
        }
        return {
          ...u,
          interfaces: u.interfaces ?? u.interface ?? [],
          active,
          email_validated: emailValidated,
          status,
        };
      });

      setAllUsers(normalized);
    } catch (err) {
      setError(err.message || 'Erro ao carregar utilizadores');
      notification.error(err.message || 'Erro ao carregar utilizadores');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Filtrar + ordenar (client-side) ─────────────────────────────────────
  const filteredSorted = useMemo(() => {
    let result = allUsers;

    // Pesquisa
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(u =>
        u.username?.toLowerCase().includes(s) ||
        u.name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s)
      );
    }

    // Filtro de estado
    if (statusFilter !== 'all') result = result.filter(u => u.status === statusFilter);

    // Ordenação
    result = [...result].sort((a, b) => {
      if (sortBy === 'user_id') {
        const diff = (a.user_id ?? 0) - (b.user_id ?? 0);
        return sortOrder === 'asc' ? diff : -diff;
      }
      const aVal = String(a[sortBy] ?? '');
      const bVal = String(b[sortBy] ?? '');
      const cmp = aVal.localeCompare(bVal, 'pt', { sensitivity: 'base', numeric: true });
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allUsers, search, statusFilter, sortBy, sortOrder]);

  // ── Paginar (client-side) ────────────────────────────────────────────────
  const users = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredSorted.slice(start, start + rowsPerPage);
  }, [filteredSorted, page, rowsPerPage]);

  const totalCount = filteredSorted.length;

  // ── Estatísticas sobre TODOS os utilizadores filtrados (não só a página) ─
  const stats = useMemo(() => ({
    total:    filteredSorted.length,
    active:   filteredSorted.filter(u => u.status === 'active').length,
    pending:  filteredSorted.filter(u => u.status === 'pending').length,
    disabled: filteredSorted.filter(u => u.status === 'disabled').length,
  }), [filteredSorted]);

  // ── Ações ────────────────────────────────────────────────────────────────
  const handleDeleteUser = useCallback(async (userId) => {
    try {
      await deleteUser(userId);
      notification.success('Utilizador apagado com sucesso');
      await fetchUsers();
      return true;
    } catch (err) {
      notification.error(err.message || 'Erro ao apagar utilizador');
      return false;
    }
  }, [fetchUsers]);

  const handleToggleStatus = useCallback(async (userId, activate) => {
    try {
      await toggleUserStatus(userId, activate);
      notification.success(activate ? 'Utilizador ativado' : 'Utilizador desativado');
      // Atualiza localmente sem refetch: recalcula status a partir de active + email_validated
      setAllUsers(prev => prev.map(u => {
        if (u.user_id !== userId) return u;
        const newActive = activate;
        let newStatus;
        if (!newActive) newStatus = 'disabled';
        else if (!u.email_validated) newStatus = 'pending';
        else newStatus = 'active';
        return { ...u, active: newActive, status: newStatus };
      }));
      return true;
    } catch (err) {
      notification.error(err.message || 'Erro ao alterar estado do utilizador');
      return false;
    }
  }, []);

  const handleResetPassword = useCallback(async (userId) => {
    try {
      const result = await resetUserPassword(userId);
      notification.success('Password reposta com sucesso');
      return result;
    } catch (err) {
      notification.error(err.message || 'Erro ao repor password');
      return null;
    }
  }, []);

  const refetch = useCallback(() => fetchUsers(), [fetchUsers]);

  const resetFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('all');
    setSortBy('user_id');
    setSortOrder('asc');
    setPage(0);
  }, []);

  return {
    users,
    totalCount,
    stats,
    isLoading,
    error,
    page,
    rowsPerPage,
    searchInput,
    search,
    sortBy,
    sortOrder,
    statusFilter,
    setPage,
    setRowsPerPage,
    setSearchInput,
    setSortBy,
    setSortOrder,
    setStatusFilter,
    handleDeleteUser,
    handleToggleStatus,
    handleResetPassword,
    refetch,
    resetFilters,
  };
};

export default useUserList;
