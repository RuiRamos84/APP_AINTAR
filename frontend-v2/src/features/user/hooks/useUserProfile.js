/**
 * useUserProfile Hook
 * Hook especializado para o formulário de perfil de utilizador com validação Zod
 *
 * Features:
 * - Validação com Zod schema
 * - Gestão de estado do formulário
 * - Modo de edição
 * - Integração com postal code service
 * - Error handling
 * - Loading states
 */

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { userProfileSchema, userProfileRequiredSchema } from '@/features/auth/schemas';
import { getUserInfo, updateUserInfo } from '@/services/userService';
import { notification } from '@/core/services/notification';

/**
 * Hook para gestão do formulário de perfil de utilizador
 *
 * @param {Object} user - Current authenticated user from useAuth
 * @returns {Object} Form state and handlers
 *
 * @example
 * const {
 *   formData,
 *   errors,
 *   isLoading,
 *   isSaving,
 *   isEditing,
 *   hasChanges,
 *   updateField,
 *   handleEdit,
 *   handleCancel,
 *   handleSave
 * } = useUserProfile(user);
 */
export const useUserProfile = (user) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    nipc: '',
    ident_type: '',
    ident_value: '',
    address: '',
    door: '',
    floor: '',
    postal: '',
    nut1: '', // Distrito
    nut2: '', // Concelho
    nut3: '', // Freguesia
    nut4: '', // Localidade
    descr: '',
  });

  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  /**
   * Carregar dados do utilizador
   */
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const response = await getUserInfo();

        // A resposta pode vir como {user_info: {...}} ou diretamente como {...}
        const userData = response?.user_info || response;

        const mappedData = {
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          nipc: userData.nipc || '',
          ident_type: userData.ident_type || '',
          ident_value: userData.ident_value || '',
          address: userData.address || '',
          door: userData.door || '',
          floor: userData.floor || '',
          postal: userData.postal || '',
          nut1: userData.nut1 || '',
          nut2: userData.nut2 || '',
          nut3: userData.nut3 || '',
          nut4: userData.nut4 || '',
          descr: userData.descr || '',
        };

        setFormData(mappedData);
        setOriginalData(mappedData);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[useUserProfile] Error loading user data:', err);
        }
        notification.error(
          err.response?.data?.message || err.message || 'Erro ao carregar dados do utilizador'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  /**
   * Verificar se houve alterações
   */
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  /**
   * Atualizar campo do formulário
   */
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Limpar erro deste campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Atualizar múltiplos campos de uma vez
   * Útil para auto-preenchimento de código postal
   */
  const updateFields = useCallback((fields) => {
    setFormData((prev) => ({
      ...prev,
      ...fields,
    }));
  }, []);

  /**
   * Validar o formulário
   */
  const validate = useCallback(() => {
    try {
      // Validar apenas os campos obrigatórios
      userProfileRequiredSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        // ZodError usa 'issues', não 'errors'
        error.issues.forEach((issue) => {
          const field = issue.path[0];
          newErrors[field] = issue.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [formData]);

  /**
   * Iniciar edição
   */
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  /**
   * Cancelar edição
   */
  const handleCancel = useCallback(() => {
    setFormData(originalData);
    setErrors({});
    setIsEditing(false);
  }, [originalData]);

  /**
   * Guardar alterações
   */
  const handleSave = useCallback(async () => {
    // Validar
    if (!validate()) {
      return { success: false };
    }

    try {
      setIsSaving(true);

      // O userService já faz a validação Zod completa
      await updateUserInfo(formData);

      setOriginalData(formData);
      setIsEditing(false);
      notification.success('Perfil atualizado com sucesso!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.message || 'Erro ao guardar perfil';
      notification.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, [formData, validate]);

  /**
   * Reset do formulário
   */
  const reset = useCallback(() => {
    setFormData(originalData);
    setErrors({});
    setIsEditing(false);
  }, [originalData]);

  return {
    // Dados do formulário
    formData,
    originalData,
    errors,
    isLoading,
    isSaving,
    isEditing,
    hasChanges,

    // Ações
    updateField,
    updateFields,
    handleEdit,
    handleCancel,
    handleSave,
    reset,
    validate,

    // Helpers
    getFieldError: (field) => errors[field],
    hasError: (field) => !!errors[field],
  };
};

export default useUserProfile;
