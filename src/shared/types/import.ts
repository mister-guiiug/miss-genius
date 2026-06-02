import type { Grade, Subject } from './domain.ts';

/**
 * Plan d'import normalisé (issu d'une source externe : Pronote, CSV, démo…).
 * Découplé de la source : les matières sont décrites par leur nom, le store
 * résout / crée les identifiants au moment de l'application.
 */
export interface ImportPlan {
  /** Matières à garantir (créées si absentes, dédupliquées par nom). */
  subjects: Array<Omit<Subject, 'id'>>;
  /** Notes à importer, rattachées à une matière par son nom. */
  grades: Array<
    Omit<Grade, 'id' | 'subjectId' | 'periodId'> & { subjectName: string }
  >;
}
