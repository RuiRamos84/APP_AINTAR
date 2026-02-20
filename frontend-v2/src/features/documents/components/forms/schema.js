import { z } from 'zod';

// Coerce to string - accepts string or number
const flexString = z.union([z.string(), z.number().transform(String)]).optional().or(z.literal(''));

export const createDocumentSchema = z.object({
  // Step 1: Identification
  type: z.union([
    z.number({ required_error: "Selecione o tipo de documento" }),
    z.literal('')
  ]).refine(val => val !== '', { message: "Selecione o tipo de documento" }),
  associate: z.number().nullable().optional(),
  entity: z.number().nullable().optional(),

  // Identification fields (set by IdentificationStep)
  nipc: z.union([z.string(), z.number().transform(String)]).nullable().optional(),
  ts_entity: z.union([z.number(), z.string()]).nullable().optional(),
  tb_representative: z.union([z.string(), z.number().transform(String)]).nullable().optional(),

  presentation: z.union([
    z.number({ required_error: "Selecione a forma de apresentação" }),
    z.literal('')
  ]).refine(val => val !== '', { message: "Selecione a forma de apresentação" }),

  // Step 2: Content
  text: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),

  // Step 3: Address (billing) - relaxed max for NUTs (some names are long)
  address: z.string().max(255, "Morada demasiado longa").optional().or(z.literal('')),
  postal: z.string().max(20).optional().or(z.literal('')),
  door: flexString,
  floor: flexString,
  nut1: z.string().max(100).optional().or(z.literal('')),
  nut2: z.string().max(100).optional().or(z.literal('')),
  nut3: z.string().max(100).optional().or(z.literal('')),
  nut4: z.string().max(100).optional().or(z.literal('')),

  // Address (shipping — when isDifferentAddress)
  isDifferentAddress: z.boolean().optional(),
  shipping_address: z.string().max(255).optional().or(z.literal('')),
  shipping_postal: z.string().max(20).optional().or(z.literal('')),
  shipping_door: flexString,
  shipping_floor: flexString,
  shipping_nut1: z.string().max(100).optional().or(z.literal('')),
  shipping_nut2: z.string().max(100).optional().or(z.literal('')),
  shipping_nut3: z.string().max(100).optional().or(z.literal('')),
  shipping_nut4: z.string().max(100).optional().or(z.literal('')),

  // GPS Coordinates
  glat: z.union([z.string(), z.number().transform(String)]).optional().or(z.literal('')),
  glong: z.union([z.string(), z.number().transform(String)]).optional().or(z.literal('')),

  // Step 4: Files (Separate handling)
  files: z.any().optional()
}).passthrough();  // Allow extra fields without failing validation

export const defaultValues = {
  type: '',
  presentation: '',
  associate: null,
  entity: null,
  nipc: '',
  ts_entity: null,
  tb_representative: null,
  text: '',
  // Billing address
  address: '',
  postal: '',
  door: '',
  floor: '',
  nut1: '',
  nut2: '',
  nut3: '',
  nut4: '',
  // GPS
  glat: '',
  glong: '',
  // Shipping address
  isDifferentAddress: false,
  shipping_address: '',
  shipping_postal: '',
  shipping_door: '',
  shipping_floor: '',
  shipping_nut1: '',
  shipping_nut2: '',
  shipping_nut3: '',
  shipping_nut4: '',
};
