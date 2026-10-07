import type en from '../en/handoff';

const handoff: typeof en = {
  title: 'Entrega',
  description:
    'Todo lo que necesita la próxima persona: cómo está la casa, lo esencial fijado y las notas entre cuidadores.',

  'state.title': 'Cómo está la casa',
  'state.description':
    'Se arma con el calendario de tareas y la bitácora, así que siempre está al día.',
  'state.overdue': 'Atrasado',
  'state.overdueEmpty': 'Nada atrasado. ¡Muy bien!',
  'state.next7': 'Toca en los próximos 7 días',
  'state.next7Empty': 'No toca nada más esta semana.',
  'state.recent': 'Firmado, últimos 14 días',
  'state.recentEmpty': 'No se firmó nada en las últimas dos semanas.',
  'state.more_one': '{count} más',
  'state.more_other': '{count} más',
  'state.never': 'Nunca se ha hecho',
  'state.by': 'por {name}',
  'state.openBoard': 'Abrir el tablero',
  'state.openLog': 'Abrir la bitácora',

  'pinned.title': 'Fijadas',
  'pinned.description':
    'Lo esencial: gatos, contactos, servicios, el jardinero y las mañas de la casa.',
  'pinned.emptyTitle': 'Todavía no hay notas fijadas',
  'pinned.emptyBody': 'Empiece con la plantilla de abajo y fíjela.',

  'notes.title': 'Notas',
  'notes.emptyTitle': 'Todavía no hay notas',
  'notes.emptyBody':
    'Déjele una nota a la próxima persona: qué pasó, qué vigilar y a quién llamar.',

  'composer.title': 'Escribir una nota',
  'composer.label': 'Nota',
  'composer.placeholder': '¿Qué debería saber la próxima persona?',
  'composer.pin': 'Fijar arriba',
  'composer.pinHint': 'Las notas fijadas quedan de primeras para todos los cuidadores.',
  'composer.submit': 'Publicar nota',
  'composer.useTemplate': 'Usar la plantilla',
  'composer.posted': 'Nota publicada',
  'composer.failed': 'No se pudo publicar la nota. Su texto sigue en el cuadro.',
  'composer.privacy': 'Solo quienes ingresan con el código de la casa pueden leer estas notas.',
  'composer.template':
    'GATOS\n- Nombres:\n- Comida y cantidades:\n- Medicinas:\n- Mañas:\n- Veterinario (nombre, teléfono):\n\nCONTACTOS DE EMERGENCIA\n- \n\nSERVICIOS\n- Llave de paso del agua:\n- Caja de breakers:\n- Wifi:\n\nJARDINERO\n- Nombre:\n- Día:\n- Pago:\n- WhatsApp:\n\nMAÑAS DE LA CASA\n- ',

  'note.pinned': 'Fijada',
  'note.you': 'Usted',
  'note.delete': 'Borrar la nota de {author}',

  'delete.title': '¿Borrar esta nota?',
  'delete.ownBody':
    'Se borra para todos. Las notas no se pueden editar; para cambiar una, bórrela y publíquela de nuevo.',
  'delete.otherBody': 'Esta nota la escribió {author}. Se borra para todos los que ingresan.',
  'delete.confirm': 'Borrar nota',
  'delete.done': 'Nota borrada',
  'delete.failed': 'No se pudo borrar la nota. Intente de nuevo.',

  'gate.title': 'Las notas de entrega son privadas',
  'gate.body':
    'Pueden tener códigos del portón y números de teléfono, por eso se necesita el código de la casa para leerlas.',
  'gate.cta': 'Ingrese para leer las notas',

  'how.title': 'Cómo funciona',
  'how.description': 'Un recorrido de dos minutos para quien cuide la casa después.',
  'how.signOff.title': 'Firmar el trabajo',
  'how.signOff.body':
    'En el Tablero, la Semana o la página de una tarea, toque “Firmar”. Indique quién lo hizo (puede ser el jardinero), la fecha (se vale poner una fecha anterior) y una nota si sirve. Por unos segundos aparece el botón Deshacer.',
  'how.plan.title': 'Planear la semana',
  'how.plan.body':
    'En Semana, agregue las tareas sugeridas o las suyas, asígnelas y revise la lista de materiales. Compártala por WhatsApp (en español de una vez) o imprímala como hoja de trabajo.',
  'how.track.title': 'Revisar el calendario y la bitácora',
  'how.track.body':
    'El Calendario muestra lo que se hizo, lo planeado para el día del jardinero y lo que está por tocar. La Bitácora es la tablilla completa, con filtros y exportación a CSV.',
  'how.notes.title': 'Dejar notas de entrega',
  'how.notes.body':
    'Fije lo esencial (gatos, contactos de emergencia, servicios, jardinero, mañas de la casa) y agregue notas conforme pasan las cosas. Solo quienes ingresan pueden verlas.',
  'how.catalog.title': 'Cambiar la lista de tareas',
  'how.catalog.body':
    'Las tareas, cada cuánto se repiten y sus materiales están en la carpeta data/ del código (tasks.json, supplies.json, house.json). Se editan, se hace commit y el sitio se vuelve a publicar. Las tareas marcadas como “Borrador” todavía hay que confirmarlas.',
  'how.access.title': 'Ver e ingresar',
  'how.access.body':
    'Cualquiera con el enlace puede ver. Para firmar, planear y leer estas notas se necesita su nombre y el código de la casa. Pídaselo a quien organiza.',

  loadError: 'No se pudieron cargar las notas.',
};

export default handoff;
