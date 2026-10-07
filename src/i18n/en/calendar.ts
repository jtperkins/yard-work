/** 'calendar' namespace — owned by the Calendar feature agent. Add keys freely; es/calendar.ts must mirror them (tsc-enforced). */
const calendar = {
  title: 'Calendar',
  description: 'What got done, what’s planned for yard day and what’s coming due.',

  'month.previous': 'Previous month',
  'month.next': 'Next month',
  'month.current': 'This month',
  'grid.label': 'Calendar for {month}',

  'filter.label': 'Filter by category',
  'filter.all': 'All',

  'legend.label': 'Key',
  'legend.done': 'Signed off',
  'legend.due': 'Coming due',
  'legend.planned': 'Planned (yard day)',
  'legend.dailyHint': 'Daily jobs like cat care aren’t marked as coming due.',

  'day.done_one': '{count} signed off',
  'day.done_other': '{count} signed off',
  'day.due_one': '{count} coming due',
  'day.due_other': '{count} coming due',
  'day.planned_one': '{count} planned',
  'day.planned_other': '{count} planned',

  'panel.pickTitle': 'Pick a day',
  'panel.pickBody': 'Tap a day to see what was signed off and what’s coming up.',
  'panel.done': 'Signed off',
  'panel.due': 'Coming due',
  'panel.planned': 'Planned this week',
  'panel.openWeek': 'Open the week plan',
  'panel.quietTitle': 'A quiet day',
  'panel.quietPast': 'Nothing was signed off this day.',
  'panel.quietFuture': 'Nothing is due this day.',

  'meta.doneBy': 'Done by {doneBy} · signed by {loggedBy}',
  'meta.doneBySame': 'Done and signed by {name}',
  'meta.adHoc': 'Ad-hoc',
  'meta.assignee': 'For {name}',
  'meta.unassigned': 'Not assigned yet',
  'meta.lastDone': 'Last done {date}',
  'meta.neverDone': 'Never signed off',

  loadError: 'Couldn’t load the calendar.',
};

export default calendar;
