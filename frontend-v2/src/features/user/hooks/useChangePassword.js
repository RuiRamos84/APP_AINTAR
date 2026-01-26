/**
 * useChangePassword Hook
 * Hook especializado para o formulário de alteração de password com validação Zod
 *
 * Features:
 * - Validação com Zod schema
 * - Gestão de estado do formulário
 * - Indicador de força da password
 * - Verificação de requisitos em tempo real
 * - Error handling
 */

import { useState, useMemo } from 'react';
import { z } from 'zod';
import { changePasswordSchema } from '@/features/auth/schemas';
import { changePassword } from '@/services/userService';
import { notification } from '@/core/services/notification';

/**
 * Hook para gestão do formulário de alteração de password
 *
 * @returns {Object} Form state and handlers
 *
 * @example
 * const {
 *   formData,
 *   errors,
 *   isLoading,
 *   passwordStrength,
 *   passwordRequirements,
 *   updateField,
 *   handleSubmit
 * } = useChangePassword();
 */
export const useChangePassword = () => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Validação de requisitos de password em tempo real
   */
  const passwordRequirements = useMemo(() => ({
    minLength: formData.newPassword.length >= 8,
    hasLetter: /[a-zA-Z]/.test(formData.newPassword),
    hasNumber: /[0-9]/.test(formData.newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword),
  }), [formData.newPassword]);

  /**
   * Calcular força da password (0-4)
   */
  const passwordStrength = useMemo(() => {
    return Object.values(passwordRequirements).filter(Boolean).length;
  }, [passwordRequirements]);

  /**
   * Verificar se a password cumpre todos os requisitos
   */
  const isPasswordValid = useMemo(() => {
    return Object.values(passwordRequirements).every(Boolean);
  }, [passwordRequirements]);

  /**
   * Verificar se as passwords coincidem
   */
  const passwordsMatch = useMemo(() => {
    return formData.newPassword === formData.confirmPassword &&
           formData.newPassword.length > 0;
  }, [formData.newPassword, formData.confirmPassword]);

  /**
   * Atualizar campo do formulário
   */
  const updateField = (field, value) => {
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
  };

  /**
   * Validar o formulário
   */
  const validate = () => {
    try {
      changePasswordSchema.parse(formData);
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
  };

  /**
   * Submeter o formulário
   */
  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Validar
    if (!validate()) {
      return { success: false };
    }

    // Alterar password
    try {
      setIsLoading(true);

      // O userService já faz a validação Zod e conversão para API format
      await changePassword(formData);

      // Limpar formulário após sucesso
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      notification.success('Password alterada com sucesso!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.message || 'Erro ao alterar password';
      notification.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset do formulário
   */
  const reset = () => {
    setFormData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  /**
   * Obter cor do indicador de força
   */
  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'error';
    if (passwordStrength === 2) return 'warning';
    if (passwordStrength === 3) return 'info';
    return 'success';
  };

  /**
   * Obter texto do indicador de força
   */
  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Fraca';
    if (passwordStrength === 2) return 'Média';
    if (passwordStrength === 3) return 'Boa';
    return 'Forte';
  };

  return {
    // Dados do formulário
    formData,
    errors,
    isLoading,

    // Validação de password
    passwordRequirements,
    passwordStrength,
    isPasswordValid,
    passwordsMatch,

    // Ações
    updateField,
    handleSubmit,
    reset,
    validate,

    // Helpers
    getFieldError: (field) => errors[field],
    hasError: (field) => !!errors[field],
    getStrengthColor,
    getStrengthText,
  };
};

export default useChangePassword;
