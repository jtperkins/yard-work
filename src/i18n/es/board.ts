import type en from '../en/board';

const board: typeof en = {
  title: 'Tablero',
  'greeting.morning': 'Buenos días',
  'greeting.afternoon': 'Buenas tardes',
  'greeting.evening': 'Buenas noches',
  greetingName: '{greeting}, {name}',
  'summary.allClear': 'Todo está al día. ¡Buen trabajo!',
  'summary.attention_one': 'Hay {count} trabajo pendiente hoy.',
  'summary.attention_other': 'Hay {count} trabajos pendientes hoy.',

  'stats.label': 'De un vistazo',
  'stats.overdue': 'Atrasadas',
  'stats.overdueHint': 'incluye las nunca hechas',
  'stats.dueThisWeek': 'Tocan esta semana',
  'stats.dueThisWeekHint': 'hasta el domingo',
  'stats.doneThisWeek': 'Hechas esta semana',
  'stats.doneThisWeekHint': 'desde el lunes',
  'stats.onTrack': 'Al día',
  'stats.onTrackHint': 'de las tareas abiertas',

  'today.title': 'Hoy',
  'today.description': 'Los trabajos de todos los días. Fírmelos conforme los haga.',
  'today.list': 'Trabajos diarios de hoy',

  'attention.title': 'Requieren atención',
  'attention.description': 'Primero lo atrasado, luego lo que toca en los próximos días.',
  'attention.list': 'Trabajos que requieren atención',
  'attention.emptyTitle': 'Todo al día',
  'attention.emptyBody': 'No hay nada atrasado ni que toque en los próximos días.',

  'attention.showAll_one': 'Ver los {count} trabajos',
  'attention.showAll_other': 'Ver los {count} trabajos',

  'upcoming.title': 'Más adelante esta semana',
  'upcoming.list': 'Trabajos que tocan más adelante esta semana',

};

export default board;
