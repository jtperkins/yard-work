/** 'auth' namespace — sign-in screen, sign-in gate and account controls. es/auth.ts mirrors it (tsc-enforced). */
const auth = {
  title: 'Sign in',
  eyebrow: 'House crew',
  description:
    'Use your name and the house code to sign off work, edit tasks and report incidents. Anyone with the link can look at the board without signing in.',
  nameHint: 'Shown on everything you sign.',
  codeHint: 'Ask the owner or the last house-sitter.',
  submit: 'Sign in',
  wrongCode: 'That house code isn’t right. Check it and try again.',
  welcome: 'Welcome, {name}',
  alreadyTitle: 'You’re signed in',
  alreadyBody: 'Signed in as {name}. You can sign off work, edit tasks and report incidents.',
  continue: 'Continue',
  signOutInstead: 'Sign out',
  readOnlyTitle: 'Just looking?',
  readOnlyBody: 'The board, tasks and log are open to everyone — no sign-in needed.',
  browseBoard: 'Go to the board',
  'gate.title': 'Sign in to see this page',
  'gate.description': 'This page holds private house details, so it’s only for the house crew.',
  'gate.cardTitle': 'Members only',
  'gate.cardBody': 'Sign in with your name and the house code to continue.',
};

export default auth;
