import { FileText, RotateCw, X } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { cx } from './cx';

export interface AttachmentItem {
  id: string;
  name: string;
  /** Pre-formatted size, e.g. "1.2 MB". */
  sizeLabel: string;
  /** Where the file opens or downloads. Without it the name is plain text. */
  href?: string;
  /** Image URL for an inline thumbnail. Other files get a file icon. */
  previewSrc?: string;
  status?: 'uploading' | 'failed' | 'done';
}

export interface AttachmentListProps {
  items: readonly AttachmentItem[];
  /** Accessible name of the list. */
  label?: string;
  /** Shows a remove button on each item. */
  onRemove?: (id: string) => void;
  /** Shows a retry button on failed items. */
  onRetry?: (id: string) => void;
  uploadingLabel?: string;
  failedLabel?: string;
  removeLabel?: string;
  retryLabel?: string;
  className?: string;
}

/**
 * A list of attached files: image thumbnails inline, a file icon plus link otherwise, with
 * upload progress, failure and retry. The caller passes every string and URL.
 */
export function AttachmentList({
  items,
  label,
  onRemove,
  onRetry,
  uploadingLabel = 'Uploading…',
  failedLabel = 'Upload failed',
  removeLabel = 'Remove',
  retryLabel = 'Try again',
  className,
}: AttachmentListProps) {
  return (
    <ul aria-label={label} className={cx('m-0 flex list-none flex-col gap-2 p-0', className)}>
      {items.map((item) => {
        const name = item.href ? (
          <a
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
          >
            {item.name}
          </a>
        ) : (
          <span className="font-medium text-ink">{item.name}</span>
        );
        return (
          <li
            key={item.id}
            data-status={item.status}
            className="flex items-center gap-3 rounded-card border border-line bg-surface p-2"
          >
            {item.previewSrc ? (
              <img
                src={item.previewSrc}
                alt=""
                loading="lazy"
                className="size-14 shrink-0 rounded-sm border border-line object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="grid size-14 shrink-0 place-items-center rounded-sm bg-surface-sunken text-ink-muted"
              >
                <FileText className="size-6" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm">{name}</p>
              <p className="m-0 text-xs text-ink-muted">
                {item.sizeLabel}
                {item.status === 'uploading' && ` · ${uploadingLabel}`}
                {item.status === 'failed' && <span className="text-danger"> · {failedLabel}</span>}
              </p>
            </div>
            {item.status === 'failed' && onRetry && (
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={RotateCw}
                onClick={() => onRetry(item.id)}
              >
                {retryLabel}
              </Button>
            )}
            {onRemove && (
              <IconButton
                size="sm"
                icon={X}
                label={`${removeLabel}: ${item.name}`}
                onClick={() => onRemove(item.id)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
