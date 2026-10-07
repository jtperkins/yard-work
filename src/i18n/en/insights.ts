/** 'insights' namespace — owned by the Insights feature agent. Add keys freely; es/insights.ts must mirror them (tsc-enforced). */
const insights = {
  title: 'Insights',
  description:
    'How the house and grounds are keeping up, from the last twelve months of sign-offs.',

  'stats.label': 'Summary',
  'stats.last30': 'Sign-offs, 30 days',
  'stats.last30Hint': '{count} in the 30 before',
  'stats.activeDays': 'Days with work done',
  'stats.activeDaysHint': 'In the last 12 months',
  'stats.onTime': 'Done on time',
  'stats.onTimeHint_one': 'Across {count} repeat sign-off',
  'stats.onTimeHint_other': 'Across {count} repeat sign-offs',
  'stats.onTimeNone': 'Not enough repeats yet',
  'stats.onTrack': 'Tasks on track',
  'stats.onTrackHint': 'Not overdue right now',

  'heatmap.title': 'Activity',
  'heatmap.description': 'Sign-offs per day over the last 12 months. Darker means busier.',
  'heatmap.cell_one': '{count} sign-off on {date}',
  'heatmap.cell_other': '{count} sign-offs on {date}',
  'heatmap.cellNone': 'No sign-offs on {date}',
  'heatmap.less': 'Less',
  'heatmap.more': 'More',
  'heatmap.dateColumn': 'Date',
  'heatmap.countColumn': 'Sign-offs',

  'onTime.title': 'On-time rate by category',
  'onTime.description':
    'Share of repeat sign-offs done by the due date, with 20% grace on the cadence.',
  'onTime.detail': '{onTime} of {total} on time',
  'onTime.none': 'No repeats yet',

  'byPerson.title': 'Who’s doing the work',
  'byPerson.description':
    'Sign-offs per person per week, last 12 weeks. “Done by”, not who signed.',
  'byPerson.weekOf': 'Week of {date}',
  'byPerson.total': 'Total',
  'byPerson.weekColumn': 'Week',
  'byPerson.other': 'Others',
  'byPerson.emptyTitle': 'No sign-offs in the last 12 weeks',
  'byPerson.emptyBody': 'Once work is signed off, you’ll see who did it, week by week.',

  'table.show': 'Show table',
  'table.hide': 'Hide table',

  loadError: 'Couldn’t load the insights.',
};

export default insights;
