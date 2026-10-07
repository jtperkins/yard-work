/** 'log' namespace — owned by the Log feature agent. Add keys freely; es/log.ts must mirror them (tsc-enforced). */
const log = {
  title: 'Log',
  description: 'The clipboard: every sign-off, newest first.',

  'filters.label': 'Filter the log',
  'filters.everyone': 'Everyone',
  'filters.adHoc': 'Ad-hoc work',
  'filters.rangeError': 'The end date is before the start date.',

  summary_one: '{count} sign-off',
  summary_other: '{count} sign-offs',
  'list.label': 'Sign-offs',
  'group.count_one': '{count} sign-off',
  'group.count_other': '{count} sign-offs',

  'row.meta': 'Done by {doneBy} · signed by {loggedBy}',
  'row.metaSame': 'Done and signed by {name}',
  'row.adHoc': 'Ad-hoc',
  'row.delete': 'Delete sign-off: {task}',

  'delete.title': 'Delete this sign-off?',
  'delete.body':
    '“{task}” on {date}, done by {doneBy}. It leaves the log and the schedule; a record is kept for the audit trail.',
  'delete.confirm': 'Delete',
  'delete.done': 'Sign-off deleted',
  'delete.failed': 'Couldn’t delete it. Please try again.',
  signInToDelete: 'Sign in to remove entries',

  'empty.title': 'No sign-offs yet',
  'empty.body': 'Signed-off work shows up here, like a job-site clipboard.',
  'empty.filteredTitle': 'Nothing matches',
  'empty.filteredBody': 'Try a wider date range or clear the filters.',

  'csv.date': 'Date',
  'csv.task': 'Task',
  'csv.category': 'Category',
  'csv.doneBy': 'Done by',
  'csv.signedBy': 'Signed by',
  'csv.note': 'Note',
  'csv.taskId': 'Task ID',
  'csv.loggedAt': 'Logged at (UTC)',
  'csv.adHoc': 'Ad-hoc',

  loadError: 'Couldn’t load the log.',
};

export default log;
