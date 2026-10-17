import type en from '../en/incidents';

const incidents: typeof en = {
  title: 'Incidentes',
  description:
    'Avistamientos, gente husmeando, intrusos. Solo pueden verlos quienes hayan ingresado.',
  report: 'Reportar incidente',
  list: 'Reportes de incidentes',
  files_one: '{count} archivo',
  files_other: '{count} archivos',
  emptyTitle: 'No hay incidentes reportados',
  emptyBody: 'Aquí aparecen los reportes de avistamientos, gente husmeando o intrusos.',

  'type.sighting': 'Avistamiento',
  'type.poking-around': 'Alguien husmeando',
  'type.trespassing': 'Intruso',
  'type.other': 'Otro',

  'form.title': 'Reportar un incidente',
  'form.back': 'Todos los incidentes',
  'form.when': 'Cuándo',
  'form.whenHint': 'Hora de Costa Rica. Por defecto, ahora.',
  'form.type': 'Qué tipo',
  'form.where': 'Dónde',
  'form.wherePlaceholder': 'Portón de atrás, calle, cerca del vecino…',
  'form.what': 'Qué pasó',
  'form.whatHint': 'Lo que vio u oyó, con palabras sencillas.',
  'form.people': 'Personas o nombres involucrados',
  'form.peoplePlaceholder': 'Descripciones, nombres, vehículo…',
  'form.attachments': 'Fotos, videos y archivos',
  'form.attachHint':
    'Hasta {count} archivos. Imágenes y PDF hasta {image} MB, videos hasta {video} MB.',
  'form.addFiles': 'Agregar archivos',
  'form.submit': 'Guardar reporte',
  'form.errorWhat': 'Describa qué pasó.',
  'form.errorWhen': 'Escoja cuándo pasó.',
  'form.errorFuture': 'No puede haber pasado en el futuro.',
  'form.failed': 'El reporte no se guardó.',

  'file.typeNotAllowed': '“{name}” no es un tipo de archivo permitido.',
  'file.tooLarge': '“{name}” es demasiado grande (máx. {max} MB para este tipo).',
  'file.tooMany': 'Puede adjuntar hasta {count} archivos.',
  'file.uploading': 'Subiendo…',
  'file.failed': 'No se pudo subir',
  'file.retry': 'Reintentar',
  'file.remove': 'Quitar',
  'file.list': 'Archivos adjuntos',

  'saved.title': 'Reporte guardado',
  'saved.failedBody':
    'Algunos archivos no se subieron. Reinténtelos, o abra el reporte y agréguelos después.',
  'saved.open': 'Abrir el reporte',

  'detail.back': 'Todos los incidentes',
  'detail.notFoundTitle': 'No se encontró el incidente',
  'detail.notFoundBody': 'Ese reporte no existe o fue eliminado.',
  'detail.reportedBy': 'Reportado por {name}',
  'detail.when': 'Cuándo',
  'detail.where': 'Dónde',
  'detail.people': 'Personas involucradas',
  'detail.description': 'Qué pasó',
  'detail.attachments': 'Adjuntos',
  'detail.noAttachments': 'No hay archivos adjuntos.',
  'detail.delete': 'Eliminar reporte',
  'detail.deleteTitle': '¿Eliminar este reporte?',
  'detail.deleteBody': 'Se elimina para todos, con sus archivos.',
  'detail.deleteConfirm': 'Eliminar',
  'detail.deleted': 'Reporte eliminado',
  'detail.deleteFailed': 'No se pudo eliminar el reporte. Intente de nuevo.',
};

export default incidents;
