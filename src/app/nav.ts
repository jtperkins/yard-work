import {
  ChartColumn,
  ClipboardList,
  LayoutList,
  NotebookPen,
  ScrollText,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type { TKey } from '../i18n';
import { paths } from './paths';

export interface NavItem {
  to: string;
  /** common-namespace label key */
  labelKey: TKey<'common'>;
  icon: LucideIcon;
  /** shown in the mobile bottom tab bar (others live under "More") */
  primary: boolean;
  /** exact match for active state (the board is `/`) */
  end?: boolean;
}

/** App navigation, in display order. Consumed by the layout's NavBar/TabBar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: paths.board(), labelKey: 'nav.board', icon: ClipboardList, primary: true, end: true },
  { to: paths.tasks(), labelKey: 'nav.tasks', icon: LayoutList, primary: true },
  { to: paths.incidents(), labelKey: 'nav.incidents', icon: ShieldAlert, primary: true },
  { to: paths.log(), labelKey: 'nav.log', icon: ScrollText, primary: false },
  { to: paths.insights(), labelKey: 'nav.insights', icon: ChartColumn, primary: false },
  { to: paths.handoff(), labelKey: 'nav.handoff', icon: NotebookPen, primary: false },
];
