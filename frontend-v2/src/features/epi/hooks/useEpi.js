/**
 * useEpi - Hook para gestão de EPIs e Fardamento
 *
 * Integra Zustand store + API service
 * Facilita o uso de EPIs em qualquer componente
 *
 * @example
 * const {
 *   employees,
 *   selectedEmployee,
 *   deliveries,
 *   loading,
 *   fetchEpiData,
 *   createDelivery,
 *   updatePreferences,
 * } = useEpi();
 */

import { useCallback, useEffect } from 'react';
import { useEpiStore } from '../store/epiStore';
import epiService from '../services/epiService';
import { toast } from 'sonner';

export const useEpi = (options = {}) => {
  const { autoFetch = true, fetchOnMount = true, onSuccess, onError } = options;

  // Estado do store
  const {
    employees,
    equipmentTypes,
    epiTypes,
    uniformTypes,
    shoeTypes,
    selectedEmployee,
    deliveries,
    totalDeliveries,
    activeSection,
    page,
    rowsPerPage,
    filters,
    orderBy,
    order,
    selectedYear,
    loading,
    loadingDeliveries,
    error,

    // Actions
    setEpiData,
    setEmployees,
    addEmployee,
    updateEmployeePreferences,
    setSelectedEmployee,
    clearSelectedEmployee,
    setActiveSection,
    setDeliveries,
    addDelivery,
    updateDelivery: updateDeliveryInStore,
    removeDelivery,
    markDeliveryReturned,
    setPage,
    setRowsPerPage,
    setSort,
    setFilters,
    resetFilters,
    setSelectedYear,
    setLoading,
    setLoadingDeliveries,
    setError,
    clearError,
    isCacheValid,
    invalidateCache,

    // Selectors
    getFilteredDeliveries,
    getEmployeeById,
    getEquipmentTypeById,
    getDeliveryStats,
  } = useEpiStore();

  // ==================== FETCH EPI DATA ====================

  /**
   * Carregar dados base (colaboradores e tipos)
   */
  const fetchEpiData = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && isCacheValid()) {
        return;
      }

      setLoading(true);
      clearError();

      try {
        const data = await epiService.getEpiData();

        // Verificar se resposta é válida
        if (!data || typeof data !== 'object') {
          throw new Error('Resposta inválida da API');
        }

        setEpiData(data);
        onSuccess?.('Dados carregados com sucesso');
      } catch (err) {
        console.error('[useEpi] Erro ao carregar dados:', err);
        const errorMsg = err.message || 'Erro ao carregar dados EPI';
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
        onError?.(err);
      }
    },
    [isCacheValid, setLoading, clearError, setEpiData, setError, onSuccess, onError]
  );

  // ==================== FETCH DELIVERIES ====================

  /**
   * Carregar entregas de um colaborador
   */
  const fetchDeliveries = useCallback(
    async (employeeId, type = 'all') => {
      if (!employeeId) return;

      setLoadingDeliveries(true);
      clearError();

      try {
        const result = await epiService.getDeliveries({
          employeeId,
          type,
          page,
          pageSize: rowsPerPage,
        });
        setDeliveries(result.deliveries, result.total);
      } catch (err) {
        const errorMsg = err.message || 'Erro ao carregar entregas';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    },
    [page, rowsPerPage, setLoadingDeliveries, clearError, setDeliveries, setError]
  );

  /**
   * Carregar todas as entregas (para resumo)
   */
  const fetchAllDeliveries = useCallback(async () => {
    setLoadingDeliveries(true);
    clearError();

    try {
      const result = await epiService.getDeliveries({ type: 'all' });
      return result.deliveries;
    } catch (err) {
      const errorMsg = err.message || 'Erro ao carregar entregas';
      setError(errorMsg);
      toast.error(errorMsg);
      return [];
    } finally {
      setLoadingDeliveries(false);
    }
  }, [setLoadingDeliveries, clearError, setError]);

  // ==================== CREATE DELIVERY ====================

  /**
   * Criar nova entrega
   */
  const createDelivery = useCallback(
    async (deliveryData) => {
      setLoading(true);
      clearError();

      try {
        const newDelivery = await epiService.createDelivery(deliveryData);
        addDelivery(newDelivery);
        invalidateCache();

        toast.success('Entrega registada com sucesso!');
        onSuccess?.('Entrega criada');

        return newDelivery;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao criar entrega';
        setError(errorMsg);
        toast.error(errorMsg);
        onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, addDelivery, invalidateCache, setError, onSuccess, onError]
  );

  /**
   * Criar múltiplas entregas (bulk)
   */
  const createBulkDeliveries = useCallback(
    async (deliveries) => {
      setLoading(true);
      clearError();

      let successCount = 0;
      const errors = [];

      try {
        for (const delivery of deliveries) {
          try {
            await epiService.createDelivery(delivery);
            successCount++;
          } catch (err) {
            errors.push({ delivery, error: err.message });
          }
        }

        invalidateCache();

        if (successCount === deliveries.length) {
          toast.success('Todas as entregas foram registadas com sucesso!');
          onSuccess?.('Entregas criadas');
        } else if (successCount > 0) {
          toast.warning(`${successCount} de ${deliveries.length} entregas registadas`);
        } else {
          toast.error('Nenhuma entrega foi registada');
        }

        return { successCount, errors };
      } catch (err) {
        const errorMsg = err.message || 'Erro ao processar entregas';
        setError(errorMsg);
        toast.error(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, invalidateCache, setError, onSuccess]
  );

  // ==================== UPDATE DELIVERY ====================

  /**
   * Atualizar entrega
   */
  const updateDelivery = useCallback(
    async (pk, deliveryData) => {
      setLoading(true);
      clearError();

      try {
        const updatedDelivery = await epiService.updateDelivery(pk, deliveryData);
        updateDeliveryInStore(pk, updatedDelivery);
        invalidateCache();

        toast.success('Entrega atualizada com sucesso!');
        onSuccess?.('Entrega atualizada');

        return updatedDelivery;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao atualizar entrega';
        setError(errorMsg);
        toast.error(errorMsg);
        onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, updateDeliveryInStore, invalidateCache, setError, onSuccess, onError]
  );

  /**
   * Anular/Devolver entrega
   */
  const returnDelivery = useCallback(
    async (pk, data) => {
      setLoading(true);
      clearError();

      try {
        await epiService.returnDelivery(pk, data);
        markDeliveryReturned(pk, data.pndata, data.pnmemo);
        invalidateCache();

        toast.success('Entrega anulada com sucesso!');
        onSuccess?.('Entrega anulada');
      } catch (err) {
        const errorMsg = err.message || 'Erro ao anular entrega';
        setError(errorMsg);
        toast.error(errorMsg);
        onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, markDeliveryReturned, invalidateCache, setError, onSuccess, onError]
  );

  // ==================== PREFERENCES ====================

  /**
   * Atualizar preferências de tamanhos
   */
  const updatePreferences = useCallback(
    async (employeeId, preferencesData) => {
      setLoading(true);
      clearError();

      try {
        const result = await epiService.updatePreferences(employeeId, preferencesData);
        updateEmployeePreferences(employeeId, preferencesData);
        invalidateCache();

        toast.success('Preferências atualizadas com sucesso!');
        onSuccess?.('Preferências atualizadas');

        return result;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao atualizar preferências';
        setError(errorMsg);
        toast.error(errorMsg);
        onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, updateEmployeePreferences, invalidateCache, setError, onSuccess, onError]
  );

  // ==================== CREATE EMPLOYEE ====================

  /**
   * Criar novo colaborador EPI
   */
  const createEmployee = useCallback(
    async (employeeData) => {
      setLoading(true);
      clearError();

      try {
        const newEmployee = await epiService.createEmployee(employeeData);
        addEmployee(newEmployee);
        invalidateCache();

        toast.success('Colaborador criado com sucesso!');
        onSuccess?.('Colaborador criado');

        return newEmployee;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao criar colaborador';
        setError(errorMsg);
        toast.error(errorMsg);
        onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, addEmployee, invalidateCache, setError, onSuccess, onError]
  );

  // ==================== HELPERS ====================

  /**
   * Selecionar colaborador e carregar entregas
   */
  const selectEmployee = useCallback(
    (employee, section = null) => {
      setSelectedEmployee(employee);
      if (section) {
        setActiveSection(section);
      }
    },
    [setSelectedEmployee, setActiveSection]
  );

  /**
   * Obter tamanho preferido para um tipo de equipamento
   */
  const getPreferredSize = useCallback(
    (itemTypeName) => {
      if (!selectedEmployee) return '';
      return epiService.getPreferredSize(selectedEmployee, itemTypeName);
    },
    [selectedEmployee]
  );

  /**
   * Obter tipo de equipamento por nome
   */
  const getTypeByName = useCallback(
    (name) => {
      return equipmentTypes.find((t) => t.value === name);
    },
    [equipmentTypes]
  );

  // ==================== EFFECTS ====================

  // Auto-fetch dados base on mount
  useEffect(() => {
    if (fetchOnMount && autoFetch) {
      fetchEpiData();
    }
  }, [fetchOnMount, autoFetch]);

  // Fetch entregas quando colaborador ou secção mudam
  useEffect(() => {
    if (selectedEmployee && (activeSection === 'epis' || activeSection === 'uniforms')) {
      const type = activeSection === 'epis' ? 'epi' : 'uniform';
      fetchDeliveries(selectedEmployee.pk, type);
    }
  }, [selectedEmployee?.pk, activeSection]);

  // ==================== RETURN ====================

  return {
    // Estado
    employees,
    equipmentTypes,
    epiTypes,
    uniformTypes,
    shoeTypes,
    selectedEmployee,
    deliveries,
    totalDeliveries,
    activeSection,
    page,
    rowsPerPage,
    filters,
    orderBy,
    order,
    selectedYear,
    loading,
    loadingDeliveries,
    error,

    // Fetch
    fetchEpiData,
    fetchDeliveries,
    fetchAllDeliveries,

    // CRUD Entregas
    createDelivery,
    createBulkDeliveries,
    updateDelivery,
    returnDelivery,

    // Preferências
    updatePreferences,

    // Colaboradores
    createEmployee,
    selectEmployee,

    // Store actions
    setSelectedEmployee,
    clearSelectedEmployee,
    setActiveSection,
    setPage,
    setRowsPerPage,
    setSort,
    setFilters,
    resetFilters,
    setSelectedYear,
    clearError,
    invalidateCache,

    // Selectors
    getFilteredDeliveries,
    getEmployeeById,
    getEquipmentTypeById,
    getDeliveryStats,
    getPreferredSize,
    getTypeByName,

    // Utilities
    refresh: () => fetchEpiData(true),
    refreshDeliveries: () =>
      selectedEmployee && fetchDeliveries(selectedEmployee.pk, filters.type),
  };
};

export default useEpi;
