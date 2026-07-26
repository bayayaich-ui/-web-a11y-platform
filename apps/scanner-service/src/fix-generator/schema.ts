import { z } from 'zod';

export const CorrectifSchema = z.object({
  rule: z.string().min(1, "La règle ne peut pas être vide"),
  code_original: z.string().min(1, "Le code original ne peut pas être vide"),
  code_corrige: z.string().min(1, "Le code corrigé ne peut pas être vide"),
  explication: z.string().min(1, "L'explication ne peut pas être vide"),
  type_correctif: z.enum(['automatique', 'manuel'], {
    error: "type_correctif doit être 'automatique' ou 'manuel'",
  }),
});

export const CorrectifResponseSchema = z.object({
  correctif: CorrectifSchema,
});
