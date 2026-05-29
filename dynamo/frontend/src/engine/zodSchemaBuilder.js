import { z } from 'zod'

export function buildZodSchema(fields) {
  const shape = {}
  for (const field of fields) {
    if (field.type === 'id') continue

    let v
    switch (field.type) {
      case 'number':
        v = field.required ? z.number({ required_error: 'Campo obrigatório' }) : z.number().nullable().optional()
        break
      case 'boolean':
        v = z.boolean().optional()
        break
      case 'select':
      case 'relation':
        v = field.required
          ? z.union([z.number(), z.string()]).refine((x) => x !== '' && x != null, 'Campo obrigatório')
          : z.union([z.number(), z.string(), z.null()]).optional()
        break
      default: // text, textarea, date, datetime
        v = field.required
          ? z.string().min(1, 'Campo obrigatório')
          : z.string().nullable().optional()
    }
    shape[field.key] = v
  }
  return z.object(shape)
}
