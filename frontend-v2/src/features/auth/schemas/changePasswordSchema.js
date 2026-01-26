/**
 * Change Password Form Validation Schema
 * Schema Zod para validação do formulário de alteração de password
 */

import { z } from 'zod';

/**
 * Validação custom para password forte
 */
const strongPasswordSchema = z
  .string()
  .min(8, 'A password deve ter pelo menos 8 caracteres')
  .max(128, 'A password não pode ter mais de 128 caracteres')
  .refine(
    (password) => /[a-zA-Z]/.test(password),
    'A password deve conter pelo menos uma letra'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'A password deve conter pelo menos um número'
  )
  .refine(
    (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    'A password deve conter pelo menos um caractere especial (!@#$%^&*(),.?":{}|<>)'
  );

/**
 * Schema de validação para change password
 */
export const changePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, 'A password atual é obrigatória')
      .max(128, 'Password inválida'),

    newPassword: strongPasswordSchema,

    confirmPassword: z
      .string()
      .min(1, 'Por favor, confirme a nova password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As passwords não coincidem',
    path: ['confirmPassword'], // Define qual campo deve mostrar o erro
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: 'A nova password deve ser diferente da password atual',
    path: ['newPassword'],
  });

/**
 * Tipo TypeScript inferido do schema (para uso futuro)
 * @typedef {z.infer<typeof changePasswordSchema>} ChangePasswordFormData
 */

export default changePasswordSchema;
