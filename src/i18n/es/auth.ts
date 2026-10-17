import type en from '../en/auth';

const auth: typeof en = {
  title: 'Ingresar',
  eyebrow: 'Equipo de la casa',
  description:
    'Use su nombre y el código de la casa para firmar trabajos, editar tareas y reportar incidentes. Este sitio es privado, así que debe ingresar para ver cualquier cosa.',
  nameHint: 'Aparece en todo lo que firme.',
  codeHint: 'Pídalo al dueño o a quien cuidó la casa antes.',
  submit: 'Ingresar',
  wrongCode: 'Ese código de la casa no es correcto. Revíselo e intente de nuevo.',
  welcome: 'Bienvenido(a), {name}',
  alreadyTitle: 'Ya ingresó',
  alreadyBody: 'Ingresó como {name}. Puede firmar trabajos, editar tareas y reportar incidentes.',
  continue: 'Continuar',
  signOutInstead: 'Salir',
  'gate.title': 'Ingrese para ver esta página',
  'gate.description':
    'Esta página tiene datos privados de la casa, así que es solo para el equipo.',
  'gate.cardTitle': 'Solo para el equipo',
  'gate.cardBody': 'Ingrese con su nombre y el código de la casa para continuar.',
};

export default auth;
