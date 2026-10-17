import { Paperclip } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { Button, type ButtonProps } from './Button';
import type { IconComponent } from './types';

export interface FileInputProps {
  /** Visible text of the trigger button (also the accessible name of the file input). */
  label: string;
  /** Called with the chosen files (an empty pick is ignored). */
  onFiles: (files: File[]) => void;
  /** Native `accept` list, e.g. `image/*,video/*,application/pdf`. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  variant?: ButtonProps['variant'];
  leadingIcon?: IconComponent;
}

/**
 * A button that opens the native file picker. Wraps a hidden `<input type="file">`; the same file
 * can be picked twice in a row because the input is reset after every pick.
 */
export function FileInput({
  label,
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  variant = 'secondary',
  leadingIcon = Paperclip,
}: FileInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length > 0) onFiles(files);
  };
  return (
    <>
      <input
        ref={ref}
        type="file"
        hidden
        tabIndex={-1}
        aria-label={label}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handle}
      />
      <Button
        variant={variant}
        leadingIcon={leadingIcon}
        disabled={disabled}
        onClick={() => ref.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}
