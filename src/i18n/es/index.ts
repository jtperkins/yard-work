import type { Dictionaries } from '../types';
import common from './common';
import board from './board';
import tasks from './tasks';
import incidents from './incidents';
import log from './log';
import insights from './insights';
import handoff from './handoff';
import auth from './auth';
import ui from './ui';

/** Spanish dictionaries — must satisfy the English shape (enforced per namespace file). */
export const es: Dictionaries = {
  common,
  board,
  tasks,
  incidents,
  log,
  insights,
  handoff,
  auth,
  ui,
};
