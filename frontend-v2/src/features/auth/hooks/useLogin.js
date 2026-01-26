/**
 * useLogin Hook
 * Hook especializado para o formulário de login com validação
 * Adaptado para usar AuthManager via AuthContext
 */

import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@/core/contexts/AuthContext';
import { notification } from '@/core/services/notification';
import { loginSchema } from '../schemas';

export const useLogin = () => {
  const { loginUser, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({});

  /**
   * Atualiza campo do formulário
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
   * Valida o formulário
   */
  const validate = () => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        // ZodError usa 'issues', não 'errors'
        error.issues.forEach((issue) => {
          const field = issue.path[0];
          if (field) {
            newErrors[field] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  /**
   * Submete o formulário
   */
  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Validar
    if (!validate()) {
      return { success: false };
    }

    // Fazer login
    try {
      await loginUser(formData.username, formData.password);
      return { success: true };
    } catch (error) {
      const errorMessage = error.message || 'Erro ao fazer login';
      notification.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Reset do formulário
   */
  const reset = () => {
    setFormData({
      username: '',
      password: '',
    });
    setErrors({});
  };

  return {
    // Dados do formulário
    formData,
    errors,
    isLoading,

    // Ações
    updateField,
    handleSubmit,
    reset,
    validate,

    // Helpers
    getFieldError: (field) => errors[field],
    hasError: (field) => !!errors[field],
  };
};
