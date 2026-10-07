import type { Dictionaries } from '../types';
import common from './common';
import board from './board';
import week from './week';
import calendar from './calendar';
import tasks from './tasks';
import log from './log';
import insights from './insights';
import handoff from './handoff';
import auth from './auth';
import ui from './ui';

/** Spanish dictionaries — must satisfy the English shape (enforced per namespace file). */
export const es: Dictionaries = {
  common,
  board,
  week,
  calendar,
  tasks,
  log,
  insights,
  handoff,
  auth,
  ui,
};
