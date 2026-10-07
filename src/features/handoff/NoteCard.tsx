import { Pin, Trash2 } from 'lucide-react';
import { useLang, useT } from '../../i18n';
import type { Note } from '../../shared/api-schemas';
import { formatTimestamp } from '../../shared/dates';
import { Badge, Card, EntryHeader, IconButton, Text } from '../../ui';

export interface NoteCardProps {
  note: Note;
  /** Written by the signed-in person. */
  isOwn: boolean;
  onDelete: (note: Note) => void;
}

/** One handoff note: author, time, pinned marker, body (line breaks kept) and delete. */
export function NoteCard({ note, isOwn, onDelete }: NoteCardProps) {
  const t = useT('handoff');
  const { lang } = useLang();
  return (
    <Card as="article" padding="md">
      <EntryHeader
        author={note.author}
        badges={
          <>
            {isOwn && (
              <Badge size="sm" tone="neutral" variant="outline">
                {t('note.you')}
              </Badge>
            )}
            {note.pinned && (
              <Badge size="sm" tone="accent" icon={Pin}>
                {t('note.pinned')}
              </Badge>
            )}
          </>
        }
        meta={<time dateTime={note.createdAt}>{formatTimestamp(note.createdAt, lang)}</time>}
        actions={
          <IconButton
            icon={Trash2}
            variant="danger"
            size="sm"
            label={t('note.delete', { author: note.author })}
            onClick={() => onDelete(note)}
          />
        }
      />
      <Text preWrap breakWords>
        {note.body}
      </Text>
    </Card>
  );
}
