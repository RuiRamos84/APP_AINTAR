/**
 * usePostalCode Hook
 *
 * Hook personalizado para gestão de código postal com auto-preenchimento
 * de dados de morada através da API CTT
 *
 * Features:
 * - Formatação automática do código postal (XXXX-XXX)
 * - Busca automática de endereços quando código postal completo
 * - Debouncing para evitar chamadas excessivas
 * - Loading states e error handling
 * - Auto-preenchimento de campos administrativos (nut1-4)
 * - Lista de ruas disponíveis para seleção
 * - Fallback para entrada manual
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getAddressByPostalCode,
  formatPostalCode,
  isValidPostalCode,
  extractStreets,
  extractAdministrativeData,
} from '@/services/postalCodeService';
import { notification } from '@/core/services/notification/notificationService';

/**
 * @typedef {Object} PostalCodeState
 * @property {boolean} loading - Se está a buscar dados da API
 * @property {boolean} success - Se a última busca foi bem-sucedida
 * @property {string|null} error - Mensagem de erro, se houver
 * @property {Array<string>} streets - Lista de ruas disponíveis
 * @property {boolean} manualMode - Se está em modo de entrada manual
 * @property {Object} administrativeData - Dados de nut1-4
 */

/**
 * Hook para gestão de código postal com auto-preenchimento
 *
 * @param {Object} options - Opções de configuração
 * @param {Function} options.onAddressFound - Callback quando endereço é encontrado
 * @param {Function} options.onError - Callback quando ocorre erro
 * @param {number} options.debounceMs - Tempo de debounce em ms (padrão: 500)
 * @param {boolean} options.showNotifications - Se deve mostrar notificações (padrão: true)
 * @returns {PostalCodeState & Object} Estado e funções do hook
 */
export const usePostalCode = ({
  onAddressFound = null,
  onError = null,
  debounceMs = 500,
  showNotifications = true,
} = {}) => {
  // Estado do hook
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [streets, setStreets] = useState([]);
  const [manualMode, setManualMode] = useState(false);
  const [administrativeData, setAdministrativeData] = useState({
    nut1: '',
    nut2: '',
    nut3: '',
    nut4: '',
  });

  // Refs para debouncing e cancelamento
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Limpa os campos de endereço
   */
  const clearAddressData = useCallback(() => {
    setStreets([]);
    setAdministrativeData({
      nut1: '',
      nut2: '',
      nut3: '',
      nut4: '',
    });
    setSuccess(false);
    setError(null);
    setManualMode(false);
  }, []);

  /**
   * Busca endereços por código postal
   */
  const fetchAddressByPostalCode = useCallback(
    async (postalCode) => {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const addressData = await getAddressByPostalCode(postalCode);

        if (addressData && addressData.length > 0) {
          // Extrair ruas e dados administrativos
          const streetList = extractStreets(addressData);
          const adminData = extractAdministrativeData(addressData);

          setStreets(streetList);
          setAdministrativeData(adminData);
          setSuccess(true);
          setManualMode(false);

          if (showNotifications) {
            notification.success(
              `Código postal encontrado! ${streetList.length} rua(s) disponível(is).`
            );
          }

          // Chamar callback se fornecido
          if (onAddressFound) {
            onAddressFound({
              streets: streetList,
              administrativeData: adminData,
              rawData: addressData,
            });
          }

          if (import.meta.env.DEV) {
            console.log('[usePostalCode] Address found:', {
              streets: streetList.length,
              administrativeData: adminData,
            });
          }
        } else {
          // Nenhum endereço encontrado - modo manual
          setManualMode(true);
          clearAddressData();

          if (showNotifications) {
            notification.warning(
              'Código postal não encontrado. Preencha manualmente.',
              { duration: 4000 }
            );
          }
        }
      } catch (err) {
        console.error('[usePostalCode] Error:', err);

        setError(err.message || 'Erro ao consultar código postal');
        setManualMode(true);
        clearAddressData();

        if (showNotifications) {
          notification.error(err.message || 'Erro ao consultar código postal');
        }

        // Chamar callback de erro se fornecido
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [onAddressFound, onError, showNotifications, clearAddressData]
  );

  /**
   * Processa alteração no campo de código postal
   * Com formatação automática e debouncing
   */
  const handlePostalCodeChange = useCallback(
    (value) => {
      // Formatar código postal
      const formatted = formatPostalCode(value);

      if (import.meta.env.DEV) {
        console.log('[usePostalCode] Postal code changed:', formatted);
      }

      // Limpar debounce timer anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Se código postal não estiver completo, limpar dados
      if (!isValidPostalCode(formatted)) {
        clearAddressData();
        return formatted; // Retorna formatado para atualizar o campo
      }

      // Debounce - esperar antes de fazer requisição
      debounceTimerRef.current = setTimeout(() => {
        fetchAddressByPostalCode(formatted);
      }, debounceMs);

      return formatted; // Retorna formatado para atualizar o campo
    },
    [debounceMs, fetchAddressByPostalCode, clearAddressData]
  );

  /**
   * Força busca imediata sem debounce
   */
  const fetchImmediate = useCallback(
    (postalCode) => {
      const formatted = formatPostalCode(postalCode);

      if (isValidPostalCode(formatted)) {
        fetchAddressByPostalCode(formatted);
      } else {
        if (showNotifications) {
          notification.warning('Código postal inválido. Use o formato XXXX-XXX');
        }
      }
    },
    [fetchAddressByPostalCode, showNotifications]
  );

  /**
   * Ativa modo manual (quando utilizador seleciona "Outra" ou quer inserir manualmente)
   */
  const enableManualMode = useCallback(() => {
    setManualMode(true);
    setStreets([]);
    if (import.meta.env.DEV) {
      console.log('[usePostalCode] Manual mode enabled');
    }
  }, []);

  /**
   * Desativa modo manual
   */
  const disableManualMode = useCallback(() => {
    setManualMode(false);
    if (import.meta.env.DEV) {
      console.log('[usePostalCode] Manual mode disabled');
    }
  }, []);

  /**
   * Reset completo do hook
   */
  const reset = useCallback(() => {
    clearAddressData();
    setLoading(false);
    setError(null);
    if (import.meta.env.DEV) {
      console.log('[usePostalCode] Hook reset');
    }
  }, [clearAddressData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Estado
    loading,
    success,
    error,
    streets,
    manualMode,
    administrativeData,

    // Funções
    handlePostalCodeChange,
    fetchImmediate,
    enableManualMode,
    disableManualMode,
    clearAddressData,
    reset,

    // Helpers
    formatPostalCode,
    isValidPostalCode,
  };
};

export default usePostalCode;
