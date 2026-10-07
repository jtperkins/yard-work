import type { en } from './en';
export type { Lang } from '../shared/catalog-schema';

/** Shape of all dictionaries (English is the source of truth). */
export type Dictionaries = typeof en;
export type Namespace = keyof Dictionaries;

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type PluralBase<K extends string> = K extends `${infer B}_${PluralSuffix}` ? B : never;
type RawKey<NS extends Namespace> = keyof Dictionaries[NS] & string;

/**
 * Keys accepted by `t()` for a namespace: every literal key, plus the base of plural keys
 * (`'time.daysAgo'` for `'time.daysAgo_one'` / `'time.daysAgo_other'`).
 */
export type TKey<NS extends Namespace> = RawKey<NS> | PluralBase<RawKey<NS>>;

/** Interpolation values for `{var}` placeholders. A numeric `count` selects the plural form. */
export type TVars = Record<string, string | number>;

export type TFunction<NS extends Namespace> = (key: TKey<NS>, vars?: TVars) => string;
