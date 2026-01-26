/**
 * Login Form Validation Schema
 * Schema Zod para validação do formulário de login
 */

import { z } from 'zod';

/**
 * Schema de validação para login
 */
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'O nome de utilizador é obrigatório')
    .min(3, 'O nome de utilizador deve ter pelo menos 3 caracteres')
    .max(50, 'O nome de utilizador não pode ter mais de 50 caracteres')
    .trim(),

  password: z
    .string()
    .min(1, 'A password é obrigatória')
    .min(6, 'A password deve ter pelo menos 6 caracteres')
    .max(100, 'A password não pode ter mais de 100 caracteres'),
});

/**
 * Tipo TypeScript inferido do schema (para uso futuro)
 * @typedef {z.infer<typeof loginSchema>} LoginFormData
 */

export default loginSchema;
