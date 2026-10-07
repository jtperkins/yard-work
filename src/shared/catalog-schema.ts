/**
 * Static catalog contract (data/tasks.json, data/supplies.json, data/house.json).
 *
 * FROZEN in Phase 1 — later phases import these, never fork them; changes must be additive.
 * Structural validation only: referential checks (dangling supply/area ids, unique ids) live
 * in src/domain/catalog.ts (`loadCatalog`).
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];

/** Bilingual text. Both languages required and non-empty. */
export const l10nSchema = z.strictObject({
  en: z.string().trim().min(1),
  es: z.string().trim().min(1),
});
export type L10n = z.infer<typeof l10nSchema>;

/** Picks the text for a language (falls back to English if a value is somehow blank). */
export function l10n(value: L10n, lang: Lang): string {
  return value[lang] || value.en;
}

/** kebab-case slug, e.g. `rust-inspection`. Stable forever (referenced by D1 rows). */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a kebab-case slug')
  .max(64);

export const taskIdSchema = slugSchema;
export type TaskId = string;
export const supplyIdSchema = slugSchema;
export type SupplyId = string;
export const areaIdSchema = slugSchema;
export type AreaId = string;

/** Month number 1–12. */
export const monthSchema = z.number().int().min(1).max(12);

export const CATEGORIES = [
  'metal-paint',
  'lawn',
  'garden',
  'trees',
  'drainage',
  'pests',
  'house',
  'water',
  'safety',
  'cats',
] as const;
export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const WHO = ['yard', 'sitter', 'anyone'] as const;
export const whoSchema = z.enum(WHO);
export type Who = z.infer<typeof whoSchema>;

export const PRIORITIES = ['high', 'normal', 'low'] as const;
export const prioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof prioritySchema>;

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const taskSupplySchema = z.strictObject({
  id: supplyIdSchema,
  note: l10nSchema.optional(),
});
export type TaskSupply = z.infer<typeof taskSupplySchema>;

export const taskSchema = z.strictObject({
  id: taskIdSchema,
  name: l10nSchema,
  category: categorySchema,
  /** key into house.areas */
  area: areaIdSchema,
  /** default cadence in days */
  frequencyDays: z.number().int().positive(),
  /** season overrides (season decided by house.rainyMonths) */
  frequencyDaysBySeason: z
    .strictObject({
      rainy: z.number().int().positive().optional(),
      dry: z.number().int().positive().optional(),
    })
    .optional(),
  /** 1–12; outside these months the task is dormant (not due) */
  activeMonths: z.array(monthSchema).min(1).max(12).optional(),
  estimatedMinutes: z.number().int().positive(),
  who: whoSchema,
  priority: prioritySchema,
  /** newline-separated steps */
  instructions: l10nSchema,
  safety: l10nSchema.optional(),
  supplies: z.array(taskSupplySchema),
  /** false = drafted, needs owner verification (UI shows a "Draft" badge) */
  confirmed: z.boolean(),
});
export type Task = z.infer<typeof taskSchema>;

export const tasksFileSchema = z.array(taskSchema);

// ---------------------------------------------------------------------------
// Supply
// ---------------------------------------------------------------------------

export const supplySchema = z.strictObject({
  id: supplyIdSchema,
  name: l10nSchema,
  whereToBuy: z.string().trim().min(1).optional(),
  notes: l10nSchema.optional(),
});
export type Supply = z.infer<typeof supplySchema>;

export const suppliesFileSchema = z.array(supplySchema);

// ---------------------------------------------------------------------------
// House
// ---------------------------------------------------------------------------

/** Label plus a colour token name, e.g. `{ en, es, color: 'cat-lawn' }` (see src/styles/tokens.css). */
export const categoryInfoSchema = z.strictObject({
  en: z.string().trim().min(1),
  es: z.string().trim().min(1),
  color: z.string().regex(/^cat-[a-z-]+$/, 'must be a category colour token name like cat-lawn'),
});
export type CategoryInfo = z.infer<typeof categoryInfoSchema>;

export const houseSchema = z.strictObject({
  timezone: z.literal('America/Costa_Rica'),
  /** months (1–12) considered rainy season */
  rainyMonths: z.array(monthSchema),
  /** yard worker's day, ISO weekday 1 = Monday … 7 = Sunday */
  yardDay: z.number().int().min(1).max(7),
  /** name suggestions for "done by" / sign-in */
  people: z.array(z.string().trim().min(1).max(40)),
  areas: z.record(areaIdSchema, l10nSchema),
  /** exhaustive: every Category must have a label + colour */
  categories: z.record(categorySchema, categoryInfoSchema),
});
export type House = z.infer<typeof houseSchema>;

export type Season = 'rainy' | 'dry';
