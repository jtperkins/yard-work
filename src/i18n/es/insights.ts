import type en from '../en/insights';

const insights: typeof en = {
  title: 'Estadísticas',
  description:
    'Cómo va el mantenimiento de la casa y el terreno, según las firmas de los últimos doce meses.',

  'stats.label': 'Resumen',
  'stats.last30': 'Firmas en 30 días',
  'stats.last30Hint': '{count} en los 30 anteriores',
  'stats.activeDays': 'Días con trabajo',
  'stats.activeDaysHint': 'En los últimos 12 meses',
  'stats.onTrack': 'Tareas al día',
  'stats.onTrackHint': 'Sin atraso en este momento',

  'heatmap.title': 'Actividad',
  'heatmap.description': 'Firmas por día en los últimos 12 meses. Más oscuro, más trabajo.',
  'heatmap.cell_one': '{count} firma el {date}',
  'heatmap.cell_other': '{count} firmas el {date}',
  'heatmap.cellNone': 'Sin firmas el {date}',
  'heatmap.less': 'Menos',
  'heatmap.more': 'Más',
  'heatmap.dateColumn': 'Fecha',
  'heatmap.countColumn': 'Firmas',

  'byPerson.title': 'Quién hace el trabajo',
  'byPerson.description':
    'Firmas por persona y por semana, últimas 12 semanas. Cuenta quién lo hizo, no quién firmó.',
  'byPerson.weekOf': 'Semana del {date}',
  'byPerson.total': 'Total',
  'byPerson.weekColumn': 'Semana',
  'byPerson.other': 'Otros',
  'byPerson.emptyTitle': 'No hay firmas en las últimas 12 semanas',
  'byPerson.emptyBody': 'Cuando se firme trabajo, aquí verá quién lo hizo, semana a semana.',

  'table.show': 'Ver tabla',
  'table.hide': 'Ocultar tabla',

  loadError: 'No se pudieron cargar las estadísticas.',
};

export default insights;
