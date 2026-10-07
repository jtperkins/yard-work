import { useId } from 'react';
import { Input, type InputProps } from './Input';

export interface ComboInputProps extends Omit<InputProps, 'list' | 'type'> {
  /** Suggested values offered by the browser's autocomplete list; free text is still allowed. */
  suggestions: readonly string[];
}

/**
 * Text input with suggestions (input + `<datalist>`): pick a known value or type a new one.
 * E.g. "Done by" with names of people who usually do the work.
 */
export function ComboInput({ suggestions, autoComplete = 'off', ...rest }: ComboInputProps) {
  const listId = `combo-${useId()}`;
  const unique = Array.from(new Set(suggestions.filter((s) => s.trim() !== '')));
  return (
    <>
      <Input list={listId} autoComplete={autoComplete} {...rest} />
      <datalist id={listId}>
        {unique.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
