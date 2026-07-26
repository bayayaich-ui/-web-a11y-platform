import { z } from 'zod';

export const DiagnosticSchema = z.object({
  titre: z.string().min(1, "Le titre ne peut pas être vide"),
  severite: z.enum(['Critique', 'Majeur', 'Mineur', 'Info'], {
    error: "severite doit être 'Critique', 'Majeur', 'Mineur' ou 'Info'",
  }),
  explication_simple: z.string().min(1, "L'explication ne peut pas être vide"),
  impact_utilisateur: z.string().min(1, "L'impact utilisateur ne peut pas être vide"),
  recommandation: z.string().min(1, "La recommandation ne peut pas être vide"),
  code_corrige: z.string().min(1, "Le code corrigé ne peut pas être vide"),
  ressources: z.array(z.string()),
});

export const DiagnosticResponseSchema = z.object({
  diagnostic: DiagnosticSchema,
});
