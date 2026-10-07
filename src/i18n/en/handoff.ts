/** 'handoff' namespace — owned by the Handoff feature agent. Add keys freely; es/handoff.ts must mirror them (tsc-enforced). */
const handoff = {
  title: 'Handoff',
  description:
    'Everything the next person needs: the state of the house, the pinned essentials and notes between sitters.',

  'state.title': 'State of the house',
  'state.description': 'Built from the schedule and the log, so it’s always current.',
  'state.overdue': 'Overdue',
  'state.overdueEmpty': 'Nothing overdue. Nice work.',
  'state.next7': 'Due in the next 7 days',
  'state.next7Empty': 'Nothing else comes due this week.',
  'state.recent': 'Signed off, last 14 days',
  'state.recentEmpty': 'Nothing signed off in the last two weeks.',
  'state.more_one': '+{count} more',
  'state.more_other': '+{count} more',
  'state.never': 'Never done',
  'state.by': 'by {name}',
  'state.openBoard': 'Open the board',
  'state.openLog': 'Open the log',

  'pinned.title': 'Pinned',
  'pinned.description':
    'The essentials: cats, contacts, utilities, the yard worker and house quirks.',
  'pinned.emptyTitle': 'Nothing pinned yet',
  'pinned.emptyBody': 'Start from the template in the composer below and pin it.',

  'notes.title': 'Notes',
  'notes.emptyTitle': 'No notes yet',
  'notes.emptyBody': 'Leave the next person a note: what happened, what to watch, who to call.',

  'composer.title': 'Write a note',
  'composer.label': 'Note',
  'composer.placeholder': 'What should the next person know?',
  'composer.pin': 'Pin to top',
  'composer.pinHint': 'Pinned notes stay at the top for every sitter.',
  'composer.submit': 'Post note',
  'composer.useTemplate': 'Start from the template',
  'composer.posted': 'Note posted',
  'composer.failed': 'Couldn’t post the note. Your text is back in the box.',
  'composer.privacy': 'Only people signed in with the house code can read these notes.',
  'composer.template':
    'CATS\n- Names:\n- Food and amounts:\n- Medicines:\n- Quirks:\n- Vet (name, phone):\n\nEMERGENCY CONTACTS\n- \n\nUTILITIES\n- Water shut-off:\n- Breaker box:\n- Wi-Fi:\n\nYARD WORKER\n- Name:\n- Day:\n- Pay:\n- WhatsApp:\n\nHOUSE QUIRKS\n- ',

  'note.pinned': 'Pinned',
  'note.you': 'You',
  'note.delete': 'Delete note by {author}',

  'delete.title': 'Delete this note?',
  'delete.ownBody':
    'It’s removed for everyone. Notes can’t be edited, so to change one, delete it and post it again.',
  'delete.otherBody': 'This note was written by {author}. It’s removed for everyone signed in.',
  'delete.confirm': 'Delete note',
  'delete.done': 'Note deleted',
  'delete.failed': 'Couldn’t delete the note. Please try again.',

  'gate.title': 'Handoff notes are private',
  'gate.body':
    'They can hold gate codes and phone numbers, so you need the house code to read them.',
  'gate.cta': 'Sign in to read the notes',

  'how.title': 'How this works',
  'how.description': 'A two-minute tour for whoever’s looking after the place next.',
  'how.signOff.title': 'Sign off work',
  'how.signOff.body':
    'On the Board, the Week or a task’s page, tap “Sign off”. Choose who did it (it can be the yard worker), the date (backdating is fine) and add a note if useful. An Undo button shows for a few seconds.',
  'how.plan.title': 'Plan the week',
  'how.plan.body':
    'On Week, add the suggested tasks or your own, assign them and check the supplies list. Share it on WhatsApp (in Spanish by default) or print it as a clipboard sheet.',
  'how.track.title': 'Check the calendar and the log',
  'how.track.body':
    'The Calendar shows what got done, what’s planned for yard day and what’s coming due. The Log is the full clipboard, with filters and a CSV export.',
  'how.notes.title': 'Leave handoff notes',
  'how.notes.body':
    'Pin the essentials (cats, emergency contacts, utilities, yard worker, house quirks) and add notes as things happen. Only signed-in people can see them.',
  'how.catalog.title': 'Change the task list',
  'how.catalog.body':
    'Tasks, how often they repeat and their supplies live in the data/ folder of the code (tasks.json, supplies.json, house.json). Edit, commit and the site redeploys. Tasks marked “Draft” still need confirming.',
  'how.access.title': 'Viewing and signing in',
  'how.access.body':
    'Anyone with the link can look around. Signing off, planning and these notes need your name and the shared house code. Ask the organizer for it.',

  loadError: 'Couldn’t load the notes.',
};

export default handoff;
