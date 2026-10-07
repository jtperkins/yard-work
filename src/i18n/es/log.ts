import type en from '../en/log';

const log: typeof en = {
  title: 'Bitácora',
  description: 'La tablilla: cada trabajo firmado, del más reciente al más viejo.',

  'filters.label': 'Filtrar la bitácora',
  'filters.everyone': 'Todos',
  'filters.adHoc': 'Trabajos extra',
  'filters.rangeError': 'La fecha final es anterior a la inicial.',

  summary_one: '{count} firma',
  summary_other: '{count} firmas',
  'list.label': 'Trabajos firmados',
  'group.count_one': '{count} firma',
  'group.count_other': '{count} firmas',

  'row.meta': 'Lo hizo {doneBy} · firmó {loggedBy}',
  'row.metaSame': 'Lo hizo y firmó {name}',
  'row.adHoc': 'Extra',
  'row.delete': 'Borrar la firma: {task}',

  'delete.title': '¿Borrar esta firma?',
  'delete.body':
    '“{task}” del {date}, hecho por {doneBy}. Sale de la bitácora y del calendario de tareas; queda un registro para el historial.',
  'delete.confirm': 'Borrar',
  'delete.done': 'Firma borrada',
  'delete.failed': 'No se pudo borrar. Intente de nuevo.',
  signInToDelete: 'Ingrese para borrar firmas',

  'empty.title': 'Todavía no hay firmas',
  'empty.body': 'Aquí aparece el trabajo firmado, como en la tablilla de una obra.',
  'empty.filteredTitle': 'No hay resultados',
  'empty.filteredBody': 'Pruebe con más días o quite los filtros.',

  'csv.date': 'Fecha',
  'csv.task': 'Tarea',
  'csv.category': 'Categoría',
  'csv.doneBy': 'Lo hizo',
  'csv.signedBy': 'Firmó',
  'csv.note': 'Nota',
  'csv.taskId': 'ID de tarea',
  'csv.loggedAt': 'Registrado (UTC)',
  'csv.adHoc': 'Extra',

  loadError: 'No se pudo cargar la bitácora.',
};

export default log;
