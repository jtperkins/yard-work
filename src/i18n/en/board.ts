/** 'board' namespace — the Board screen. es/board.ts mirrors it (tsc-enforced). */
const board = {
  title: 'Board',
  'greeting.morning': 'Good morning',
  'greeting.afternoon': 'Good afternoon',
  'greeting.evening': 'Good evening',
  greetingName: '{greeting}, {name}',
  'summary.allClear': 'Everything’s on track. Nice work.',
  'summary.attention_one': '{count} job needs attention today.',
  'summary.attention_other': '{count} jobs need attention today.',
  planWeek: 'Plan the week',

  'stats.label': 'At a glance',
  'stats.overdue': 'Overdue',
  'stats.overdueHint': 'incl. never done',
  'stats.dueThisWeek': 'Due this week',
  'stats.dueThisWeekHint': 'through Sunday',
  'stats.doneThisWeek': 'Done this week',
  'stats.doneThisWeekHint': 'since Monday',
  'stats.onTrack': 'On track',
  'stats.onTrackHint': 'of in-season tasks',

  'today.title': 'Today',
  'today.description': 'Every-day jobs. Tick them off as you go.',
  'today.list': 'Today’s daily jobs',

  'attention.title': 'Needs attention',
  'attention.description': 'Overdue first, then what’s due in the next few days.',
  'attention.list': 'Jobs that need attention',
  'attention.emptyTitle': 'All caught up',
  'attention.emptyBody': 'Nothing is overdue or due in the next few days.',

  'attention.showAll_one': 'Show all {count} jobs',
  'attention.showAll_other': 'Show all {count} jobs',

  'upcoming.title': 'Later this week',
  'upcoming.list': 'Jobs due later this week',
  'upcoming.openWeek': 'Open the week plan',

  'readOnly.title': 'You’re looking around read-only',
  'readOnly.body': 'Sign in with the house code to sign off work.',
};

export default board;
