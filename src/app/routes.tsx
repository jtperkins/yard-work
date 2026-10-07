import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { BoardScreen } from '../features/board';
import { WeekScreen } from '../features/week';
import { CalendarScreen } from '../features/calendar';
import { TasksScreen, TaskDetailScreen } from '../features/tasks';
import { LogScreen } from '../features/log';
import { InsightsScreen } from '../features/insights';
import { HandoffScreen } from '../features/handoff';
import { LoginScreen } from '../features/auth';
import { RequireAuth } from '../features/shared/RequireAuth';
import { AppLayout } from './AppLayout';
import { NotFoundScreen } from './NotFoundScreen';

/** Dev-only component kitchen sink; tree-shaken out of production builds. */
const KitchenSink = import.meta.env.DEV ? lazy(() => import('../ui/KitchenSink')) : null;

/**
 * FINAL route table (plan §6.3). Frozen after Phase 1 — features own their screens, not routes.
 *
 *   /                      Board
 *   /week/:weekStart?      Week plan (weekStart = Monday YYYY-MM-DD; default this week)
 *   /calendar/:ym?         Calendar (ym = YYYY-MM; default this month)
 *   /tasks                 Task catalog
 *   /tasks/:id             Task detail
 *   /log                   Sign-off log
 *   /insights              Charts
 *   /handoff               Handoff notes (sign-in only, gated by RequireAuth)
 *   /login                 Sign in (?next=/path)
 *   /ui                    Kitchen sink (dev only)
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<BoardScreen />} />
        <Route path="week/:weekStart?" element={<WeekScreen />} />
        <Route path="calendar/:ym?" element={<CalendarScreen />} />
        <Route path="tasks" element={<TasksScreen />} />
        <Route path="tasks/:id" element={<TaskDetailScreen />} />
        <Route path="log" element={<LogScreen />} />
        <Route path="insights" element={<InsightsScreen />} />
        <Route
          path="handoff"
          element={
            <RequireAuth>
              <HandoffScreen />
            </RequireAuth>
          }
        />
        <Route path="login" element={<LoginScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
      {KitchenSink && (
        <Route
          path="ui"
          element={
            <Suspense fallback={null}>
              <KitchenSink />
            </Suspense>
          }
        />
      )}
    </Routes>
  );
}
