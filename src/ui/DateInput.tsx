import { CalendarDays } from 'lucide-react';
import { Input, type InputProps } from './Input';

export interface DateInputProps extends Omit<InputProps, 'type' | 'leadingIcon'> {
  /** ISO `YYYY-MM-DD`. */
  value: string;
  /** Latest selectable ISO date (e.g. today, to forbid future dates). */
  max?: string;
  /** Earliest selectable ISO date. */
  min?: string;
}

/** Native date picker (ISO `YYYY-MM-DD` values) with a calendar icon. */
export function DateInput({ className, ...rest }: DateInputProps) {
  return (
    <Input
      type="date"
      leadingIcon={CalendarDays}
      className={['tabular-nums [&::-webkit-calendar-picker-indicator]:opacity-60', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
