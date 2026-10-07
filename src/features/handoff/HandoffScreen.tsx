import { useState } from 'react';
import { LockKeyhole, NotebookPen, Pin } from 'lucide-react';
import { useDeleteNote, useNotes, useSession } from '../../api';
import { useT } from '../../i18n';
import type { Note } from '../../shared/api-schemas';
import { todayCR } from '../../shared/dates';
import {
  AsideLayout,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SectionHeader,
  SkeletonText,
  Stack,
  useToast,
} from '../../ui';
import { LoadError } from '../log/LoadError';
import { SignInCta } from '../shared';
import { HouseState } from './HouseState';
import { HowItWorks } from './HowItWorks';
import { NoteCard } from './NoteCard';
import { NoteComposer } from './NoteComposer';

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Handoff (sign-in only): state of the house, pinned notes, recent notes + composer and a
 * "How this works" guide. The router gates it with RequireAuth; it also gates itself so the
 * private notes are never requested or shown without a session.
 */
export function HandoffScreen() {
  const t = useT('handoff');
  const tc = useT('common');
  const session = useSession();

  const header = <PageHeader title={t('title')} description={t('description')} />;

  if (session.isPending) {
    return (
      <Stack gap="lg">
        {header}
        <div aria-busy="true" aria-label={tc('a11y.loading')}>
          <SkeletonText lines={6} />
        </div>
      </Stack>
    );
  }

  if (!session.isSignedIn || session.name === null) {
    return (
      <Stack gap="lg">
        {header}
        <EmptyState
          icon={LockKeyhole}
          title={t('gate.title')}
          description={t('gate.body')}
          action={<SignInCta label={t('gate.cta')} />}
        />
        <HowItWorks />
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {header}
      <SignedInHandoff name={session.name} />
    </Stack>
  );
}

function SignedInHandoff({ name }: { name: string }) {
  const t = useT('handoff');
  const tc = useT('common');
  const { toast } = useToast();
  const notes = useNotes();
  const deleteNote = useDeleteNote();
  const [toDelete, setToDelete] = useState<Note | null>(null);
  const today = todayCR();

  const all = notes.data ?? [];
  const byNewest = (a: Note, b: Note) => b.createdAt.localeCompare(a.createdAt);
  const pinned = all.filter((n) => n.pinned).sort(byNewest);
  const recent = all.filter((n) => !n.pinned).sort(byNewest);

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteNote.mutate(toDelete.id, {
      onSuccess: () => toast({ title: t('delete.done'), tone: 'success' }),
      onError: () => toast({ title: t('delete.failed'), tone: 'danger' }),
    });
    setToDelete(null);
  };

  const noteList = (list: readonly Note[]) => (
    <Stack as="ul" gap="md">
      {list.map((note) => (
        <li key={note.id}>
          <NoteCard note={note} isOwn={sameName(note.author, name)} onDelete={setToDelete} />
        </li>
      ))}
    </Stack>
  );

  const notesBody = (content: () => React.ReactNode) =>
    notes.isError ? (
      <LoadError title={t('loadError')} onRetry={() => void notes.refetch()} />
    ) : !notes.data ? (
      <div aria-busy="true" aria-label={tc('a11y.loading')}>
        <SkeletonText lines={4} />
      </div>
    ) : (
      content()
    );

  return (
    <>
      <HouseState today={today} />

      <AsideLayout
        stickyAside
        main={
          <Stack as="section" gap="sm" aria-labelledby="handoff-pinned">
            <SectionHeader
              id="handoff-pinned"
              title={t('pinned.title')}
              count={notes.data ? pinned.length : undefined}
              description={t('pinned.description')}
            />
            {notesBody(() =>
              pinned.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={Pin}
                  title={t('pinned.emptyTitle')}
                  description={t('pinned.emptyBody')}
                />
              ) : (
                noteList(pinned)
              ),
            )}
          </Stack>
        }
        aside={<NoteComposer />}
        mainEnd={
          <Stack as="section" gap="sm" aria-labelledby="handoff-notes">
            <SectionHeader
              id="handoff-notes"
              title={t('notes.title')}
              count={notes.data ? recent.length : undefined}
            />
            {notesBody(() =>
              recent.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={NotebookPen}
                  title={t('notes.emptyTitle')}
                  description={t('notes.emptyBody')}
                />
              ) : (
                noteList(recent)
              ),
            )}
          </Stack>
        }
      />

      <HowItWorks />

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        tone="danger"
        title={t('delete.title')}
        description={
          toDelete
            ? sameName(toDelete.author, name)
              ? t('delete.ownBody')
              : t('delete.otherBody', { author: toDelete.author })
            : undefined
        }
        confirmLabel={t('delete.confirm')}
        cancelLabel={tc('actions.cancel')}
        closeLabel={tc('actions.close')}
      />
    </>
  );
}
