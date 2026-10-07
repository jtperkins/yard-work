import type en from '../en/calendar';

const calendar: typeof en = {
  title: 'Calendario',
  description: 'Lo que se hizo, lo planeado para el día del jardinero y lo que está por tocar.',

  'month.previous': 'Mes anterior',
  'month.next': 'Mes siguiente',
  'month.current': 'Este mes',
  'grid.label': 'Calendario de {month}',

  'filter.label': 'Filtrar por categoría',
  'filter.all': 'Todas',

  'legend.label': 'Simbología',
  'legend.done': 'Firmado',
  'legend.due': 'Por tocar',
  'legend.planned': 'Planeado (día del jardinero)',
  'legend.dailyHint': 'Las tareas diarias, como cuidar a los gatos, no se marcan como pendientes.',

  'day.done_one': '{count} firmada',
  'day.done_other': '{count} firmadas',
  'day.due_one': '{count} por tocar',
  'day.due_other': '{count} por tocar',
  'day.planned_one': '{count} planeada',
  'day.planned_other': '{count} planeadas',

  'panel.pickTitle': 'Escoja un día',
  'panel.pickBody': 'Toque un día para ver qué se firmó y qué viene.',
  'panel.done': 'Firmado',
  'panel.due': 'Por tocar',
  'panel.planned': 'Planeado esta semana',
  'panel.openWeek': 'Abrir el plan de la semana',
  'panel.quietTitle': 'Un día tranquilo',
  'panel.quietPast': 'No se firmó nada este día.',
  'panel.quietFuture': 'No hay nada pendiente para este día.',

  'meta.doneBy': 'Lo hizo {doneBy} · firmó {loggedBy}',
  'meta.doneBySame': 'Lo hizo y firmó {name}',
  'meta.adHoc': 'Extra',
  'meta.assignee': 'Para {name}',
  'meta.unassigned': 'Sin asignar',
  'meta.lastDone': 'Última vez: {date}',
  'meta.neverDone': 'Nunca se ha firmado',

  loadError: 'No se pudo cargar el calendario.',
};

export default calendar;
