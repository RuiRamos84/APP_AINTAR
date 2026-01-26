/**
 * User Profile Form Validation Schema
 * Schema Zod para validação do formulário de perfil de utilizador
 */

import { z } from 'zod';

/**
 * Regex para validação de código postal português (XXXX-XXX)
 */
const postalCodeRegex = /^\d{4}-\d{3}$/;

/**
 * Regex para validação de telefone português
 * Aceita: +351 XXX XXX XXX, 9XX XXX XXX, etc.
 */
const phoneRegex = /^(\+351\s?)?[29]\d{2}\s?\d{3}\s?\d{3}$/;

/**
 * Schema de validação para user profile
 */
export const userProfileSchema = z.object({
  // === Informações Pessoais ===
  nipc: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{9}$/.test(val),
      'O NIPC deve ter exatamente 9 dígitos'
    ),

  name: z
    .string()
    .min(1, 'O nome é obrigatório')
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(200, 'O nome não pode ter mais de 200 caracteres')
    .trim(),

  ident_type: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d+$/.test(val),
      'Tipo de identificação inválido'
    ),

  ident_value: z
    .string()
    .max(50, 'O número de identificação não pode ter mais de 50 caracteres')
    .optional(),

  // === Contactos ===
  email: z
    .string()
    .min(1, 'O email é obrigatório')
    .email('Email inválido')
    .max(200, 'O email não pode ter mais de 200 caracteres')
    .trim()
    .toLowerCase(),

  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val.replace(/\s/g, '')),
      'Telefone inválido. Formato esperado: 9XX XXX XXX ou +351 9XX XXX XXX'
    ),

  // === Morada ===
  postal: z
    .string()
    .optional()
    .refine(
      (val) => !val || postalCodeRegex.test(val),
      'Código postal inválido. Formato esperado: XXXX-XXX'
    ),

  address: z
    .string()
    .min(1, 'A morada é obrigatória')
    .max(255, 'A morada não pode ter mais de 255 caracteres')
    .trim(),

  door: z
    .string()
    .max(10, 'A porta não pode ter mais de 10 caracteres')
    .optional(),

  floor: z
    .string()
    .max(10, 'O andar não pode ter mais de 10 caracteres')
    .optional(),

  // === Dados Administrativos (NUT) ===
  nut1: z
    .string()
    .max(100, 'Distrito inválido')
    .optional(),

  nut2: z
    .string()
    .max(100, 'Concelho inválido')
    .optional(),

  nut3: z
    .string()
    .max(100, 'Freguesia inválida')
    .optional(),

  nut4: z
    .string()
    .max(100, 'Localidade inválida')
    .optional(),

  // === Outros ===
  descr: z
    .string()
    .max(1000, 'A descrição não pode ter mais de 1000 caracteres')
    .optional(),
});

/**
 * Schema parcial para validação durante a edição (permite campos incompletos)
 * Útil para validação em tempo real enquanto o utilizador está a editar
 */
export const userProfilePartialSchema = userProfileSchema.partial();

/**
 * Validação apenas dos campos obrigatórios
 * Útil para validação rápida antes de submeter
 */
export const userProfileRequiredSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  email: z.string().email('Email inválido'),
  address: z.string().min(1, 'A morada é obrigatória'),
});

/**
 * Tipo TypeScript inferido do schema (para uso futuro)
 * @typedef {z.infer<typeof userProfileSchema>} UserProfileFormData
 */

export default userProfileSchema;
