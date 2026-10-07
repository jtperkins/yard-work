import type en from '../en/auth';

const auth: typeof en = {
  title: 'Ingresar',
  eyebrow: 'Equipo de la casa',
  description:
    'Use su nombre y el código de la casa para firmar trabajos y planear la semana. Cualquiera con el enlace puede ver todo sin ingresar.',
  nameHint: 'Aparece en todo lo que firme. Escójalo de la lista o escriba el suyo.',
  codeHint: 'Pídalo al dueño o a quien cuidó la casa antes.',
  submit: 'Ingresar',
  wrongCode: 'Ese código de la casa no es correcto. Revíselo e intente de nuevo.',
  welcome: 'Bienvenido(a), {name}',
  alreadyTitle: 'Ya ingresó',
  alreadyBody: 'Ingresó como {name}. Puede firmar trabajos y planear la semana.',
  continue: 'Continuar',
  signOutInstead: 'Salir',
  readOnlyTitle: '¿Solo quiere ver?',
  readOnlyBody:
    'El tablero, el plan de la semana, el calendario, las tareas y la bitácora están abiertos para todos, sin ingresar.',
  browseBoard: 'Ir al tablero',
  'gate.title': 'Ingrese para ver esta página',
  'gate.description':
    'Esta página tiene datos privados de la casa, así que es solo para el equipo.',
  'gate.cardTitle': 'Solo para el equipo',
  'gate.cardBody': 'Ingrese con su nombre y el código de la casa para continuar.',
};

export default auth;
