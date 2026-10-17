import { CalendarDays } from 'lucide-react';
import { cx } from './cx';
import { Input, type InputProps } from './Input';

export interface DateInputProps extends Omit<InputProps, 'type' | 'leadingIcon'> {
  /** ISO `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` (local time) with `withTime`. */
  value: string;
  /** Latest selectable value (e.g. today, to forbid future dates), same format as `value`. */
  max?: string;
  /** Earliest selectable value. */
  min?: string;
  /** Pick a date and a time of day (a `datetime-local` input) instead of just a date. */
  withTime?: boolean;
}

/** Native date (or date and time) picker with a calendar icon. */
export function DateInput({ className, withTime = false, ...rest }: DateInputProps) {
  return (
    <Input
      type={withTime ? 'datetime-local' : 'date'}
      leadingIcon={CalendarDays}
      className={cx('tabular-nums [&::-webkit-calendar-picker-indicator]:opacity-60', className)}
      {...rest}
    />
  );
}
