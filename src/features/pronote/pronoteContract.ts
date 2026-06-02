import { z } from 'zod';

/**
 * Contrat **stable** entre le PWA et le proxy Pronote (Cloudflare Worker).
 * Le Worker encapsule `pawnote` et renvoie ce format normalisé ; le PWA ne
 * connaît jamais l'API Pronote directement.
 */
export const pronoteGradeSchema = z.object({
  subject: z.string(),
  value: z.number(),
  max: z.number().positive(),
  coefficient: z.number().positive().optional(),
  date: z.string().optional(),
  label: z.string().optional(),
});

export const pronoteResponseSchema = z.object({
  ok: z.literal(true),
  /** Nom de la période côté Pronote (information). */
  period: z.string().optional(),
  grades: z.array(pronoteGradeSchema),
});

export type PronoteGrade = z.infer<typeof pronoteGradeSchema>;
export type PronoteResponse = z.infer<typeof pronoteResponseSchema>;

/** Identifiants envoyés au proxy (jamais persistés côté app). */
export interface PronoteCredentials {
  url: string;
  username: string;
  password: string;
  /** Identifiant ENT éventuel (cas connexion via ENT). */
  ent?: string;
}
