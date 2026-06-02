/**
 * Validation runtime (zod) des données importées / relues depuis le stockage.
 * Garantit qu'un JSON externe ou un schéma corrompu ne casse pas l'app.
 */
import { z } from 'zod';
import { GRADE_SORTS, GRADE_TYPES, SUBJECT_COLORS } from '../types/domain.ts';

const gradeSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  value: z.number(),
  max: z.number().positive(),
  weight: z.number().positive(),
  date: z.string().optional(),
  type: z.enum(GRADE_TYPES).optional(),
  label: z.string().optional(),
});

const subjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number().positive(),
  color: z.enum(SUBJECT_COLORS),
  icon: z.string().optional(),
});

const goalSchema = z
  .object({
    id: z.string(),
    scope: z.union([
      z.object({ kind: z.literal('general') }),
      z.object({ kind: z.literal('subject'), subjectId: z.string() }),
    ]),
    target: z.number(),
    nextWeight: z.number().positive(),
  })
  .nullable();

const scenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  subjects: z.array(subjectSchema),
  grades: z.array(gradeSchema),
  goal: goalSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

const settingsSchema = z.object({
  referenceBase: z.number().positive(),
  rounding: z.object({
    mode: z.enum(['none', 'nearest', 'floor', 'ceil']),
    decimals: z.number().int().min(0).max(3),
  }),
  normalizeBases: z.boolean(),
  theme: z.enum(['light', 'dark']),
  // Champ ajouté en 1.x : `.catch(true)` -> les données existantes sans ce
  // champ (ou avec une valeur invalide) ne sont pas rejetées, elles héritent
  // du défaut « verrouillé » au lieu de provoquer une réinitialisation.
  lockSubjectOrder: z.boolean().catch(true),
  // Idem : champ ajouté en 1.x, défaut tolérant pour les données héritées.
  gradeSort: z.enum(GRADE_SORTS).catch('date-desc'),
});

export const appDataSchema = z.object({
  version: z.number().int().positive(),
  scenarios: z.array(scenarioSchema).min(1),
  activeScenarioId: z.string(),
  settings: settingsSchema,
  onboarded: z.boolean(),
});

export type AppDataInput = z.infer<typeof appDataSchema>;
