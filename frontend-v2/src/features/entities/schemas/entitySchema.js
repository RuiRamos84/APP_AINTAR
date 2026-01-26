import { z } from 'zod';

// Algoritmo de validação de NIF
const validateNIF = (nif) => {
  if (!nif) return false;
  const nifStr = String(nif);
  if (!/^[0-9]{9}$/.test(nifStr)) return false;

  const added =
    parseInt(nifStr[0]) * 9 +
    parseInt(nifStr[1]) * 8 +
    parseInt(nifStr[2]) * 7 +
    parseInt(nifStr[3]) * 6 +
    parseInt(nifStr[4]) * 5 +
    parseInt(nifStr[5]) * 4 +
    parseInt(nifStr[6]) * 3 +
    parseInt(nifStr[7]) * 2;

  const remainder = added % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(nifStr[8]) === checkDigit;
};

export const entitySchema = z.object({
  // Identificação
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  nipc: z.string()
    .length(9, 'O NIPC deve ter exatamente 9 dígitos')
    .regex(/^\d+$/, 'O NIPC deve conter apenas números')
    .refine(validateNIF, 'NIPC inválido (Check-digit incorreto)'),
  
  ident_type: z.union([z.number(), z.string().length(0), z.null()]).optional().transform(v => v === '' ? null : v),
  ident_value: z.string().nullable().optional().or(z.literal('')),

  // Contactos
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(9, 'Telefone deve ter pelo menos 9 dígitos')
    .refine((val) => {
      // Se tiver extamente 9 dígitos, valida prefixo PT usual
      if (val && val.length === 9) {
        return val.startsWith('9') || val.startsWith('2');
      }
      return true; // Se for internacional (>9), assume válido
    }, 'Número nacional (9 dígitos) deve começar por 2 ou 9'),

  // Morada completa
  address: z.string().min(3, 'Morada é obrigatória'),
  door: z.string().nullable().optional().or(z.literal('')),
  floor: z.string().nullable().optional().or(z.literal('')),
  postal: z.string().regex(/^\d{4}-\d{3}$/, 'Código postal inválido (0000-000)'),
  
  // Regiões (NUTs) - Obrigatórios se morada existir, o que agora é verdade
  nut1: z.string().min(1, 'Distrito obrigatório'), 
  nut2: z.string().min(1, 'Concelho obrigatório'),
  nut3: z.string().min(1, 'Freguesia obrigatória'),
  nut4: z.string().min(1, 'Localidade obrigatória'),

  descr: z.string().nullable().optional().or(z.literal('')),
}).refine((data) => {
  // Validação cruzada: Se escolheu tipo de identificação, o valor é obrigatório
  if (data.ident_type && !data.ident_value) {
    return false;
  }
  return true;
}, {
  message: "Nº de Identificação é obrigatório quando o Tipo está selecionado",
  path: ["ident_value"]
});
