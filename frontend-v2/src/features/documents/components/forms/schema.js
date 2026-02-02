import { z } from 'zod';

export const createDocumentSchema = z.object({
  // Step 1: Basic Info
  type: z.union([
    z.number({ required_error: "Selecione o tipo de documento" }),
    z.literal('')
  ]).refine(val => val !== '', { message: "Selecione o tipo de documento" }),
  associate: z.number().nullable().optional(), // Can be null if generic
  entity: z.number().nullable().optional(),   // Representative entity

  // Identification fields (set by IdentificationStep)
  nipc: z.string().optional().or(z.literal('')),
  ts_entity: z.number().nullable().optional(),
  tb_representative: z.string().nullable().optional(),
  
  presentation: z.union([
    z.number({ required_error: "Selecione a forma de apresentação" }),
    z.literal('')
  ]).refine(val => val !== '', { message: "Selecione a forma de apresentação" }),

  // Step 2: Content
  text: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  
  // Step 3: Address (Optional but structured)
  address: z.string().max(255, "Morada demasiado longa").optional().or(z.literal('')),
  postal: z.string().max(20).optional().or(z.literal('')),
  door: z.string().max(10).optional().or(z.literal('')),
  floor: z.string().max(10).optional().or(z.literal('')),
  
  // Step 4: Files (Separate handling usually, but checking count here if needed)
  files: z.any().optional()
});

export const defaultValues = {
  type: '',
  presentation: '',
  associate: null,
  entity: null,
  nipc: '',
  ts_entity: null,
  tb_representative: null,
  text: '',
  address: '',
  postal: '',
  door: '',
  floor: '',
  notifications: false
};
