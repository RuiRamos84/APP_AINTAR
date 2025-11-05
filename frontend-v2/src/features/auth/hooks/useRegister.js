/**
 * useRegister Hook
 * Hook especializado para o formulário de registo com validação
 */

import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from './useAuth';

// Schema de validação para registo
const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nome é obrigatório')
      .min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z
      .string()
      .min(1, 'Email é obrigatório')
      .email('Email inválido'),
    password: z
      .string()
      .min(1, 'Password é obrigatória')
      .min(6, 'Password deve ter pelo menos 6 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password deve conter pelo menos uma letra maiúscula, uma minúscula e um número'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Confirmação de password é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As passwords não coincidem',
    path: ['confirmPassword'],
  });

export const useRegister = () => {
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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
      registerSchema.parse(formData);
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

    // Remover confirmPassword antes de enviar
    const { confirmPassword, ...userData } = formData;

    // Fazer registo
    const result = await register(userData);

    if (!result.success) {
      setSubmitError(result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  };

  /**
   * Reset do formulário
   */
  const reset = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
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
