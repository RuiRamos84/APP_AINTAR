/**
 * useLogin Hook
 * Hook especializado para o formulário de login com validação
 * Adaptado para usar AuthManager via AuthContext
 */

import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@/core/contexts/AuthContext';

// Schema de validação para login
const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username é obrigatório'),
  password: z
    .string()
    .min(1, 'Password é obrigatória'),
});

export const useLogin = () => {
  const { loginUser, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

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

    // Limpar erro de submit
    if (submitError) {
      setSubmitError(null);
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
        error.errors.forEach((err) => {
          const field = err.path[0];
          newErrors[field] = err.message;
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
      setSubmitError(errorMessage);
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
    setSubmitError(null);
  };

  return {
    // Dados do formulário
    formData,
    errors,
    submitError,
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
