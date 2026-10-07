import { SegmentedControl } from './SegmentedControl';

export interface LanguageOption<T extends string = string> {
  /** Language code, e.g. "en". */
  value: T;
  /** Short visible label, e.g. "EN". */
  label: string;
  /** Full name in that language, e.g. "Español" (accessible name). */
  name: string;
}

export const DEFAULT_LANGUAGES = [
  { value: 'en', label: 'EN', name: 'English' },
  { value: 'es', label: 'ES', name: 'Español' },
] as const satisfies readonly LanguageOption[];

export interface LanguageToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  /** Languages offered (defaults to English / Español). */
  languages?: readonly LanguageOption<T>[];
  /** Accessible name of the control. */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Compact language switcher (a SegmentedControl whose options carry `lang`). */
export function LanguageToggle<T extends string>({
  value,
  onChange,
  languages = DEFAULT_LANGUAGES as unknown as readonly LanguageOption<T>[],
  label = 'Language',
  size = 'sm',
  className,
}: LanguageToggleProps<T>) {
  return (
    <SegmentedControl
      label={label}
      value={value}
      onChange={onChange}
      size={size}
      className={className}
      options={languages.map((l) => ({
        value: l.value,
        label: l.label,
        ariaLabel: l.name,
        lang: l.value,
      }))}
    />
  );
}
