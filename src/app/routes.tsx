import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { BoardScreen } from '../features/board';
import { TasksScreen, TaskDetailScreen, TaskFormScreen } from '../features/tasks';
import { IncidentDetailScreen, IncidentsScreen, NewIncidentScreen } from '../features/incidents';
import { LogScreen } from '../features/log';
import { InsightsScreen } from '../features/insights';
import { HandoffScreen } from '../features/handoff';
import { LoginScreen } from '../features/auth';
import { SignedInOnly } from '../features/shared/SignedInOnly';
import { AppLayout } from './AppLayout';
import { NotFoundScreen } from './NotFoundScreen';

/** Dev-only component kitchen sink; tree-shaken out of production builds. */
const KitchenSink = import.meta.env.DEV ? lazy(() => import('../ui/KitchenSink')) : null;

/**
 * Route table. Every screen except /login is sign-in only (SignedInOnly redirects to /login?next=…).
 *
 *   /                      Board
 *   /tasks                 Task list
 *   /tasks/new             New task
 *   /tasks/:id             Task detail
 *   /tasks/:id/edit        Edit task
 *   /incidents             Incident reports
 *   /incidents/new         Report an incident
 *   /incidents/:id         Incident detail
 *   /log                   Sign-off log
 *   /insights              Charts
 *   /handoff               Handoff notes
 *   /login                 Sign in (?next=/path)
 *   /ui                    Kitchen sink (dev only)
 *   /week/*, /calendar/*   Old screens, redirect to the Board
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="login" element={<LoginScreen />} />
        {/* Everything else is private: signed-out visitors are sent to /login?next=… */}
        <Route element={<SignedInOnly />}>
          <Route index element={<BoardScreen />} />
          <Route path="week/*" element={<Navigate to="/" replace />} />
          <Route path="calendar/*" element={<Navigate to="/" replace />} />
          <Route path="tasks" element={<TasksScreen />} />
          <Route path="tasks/new" element={<TaskFormScreen />} />
          <Route path="tasks/:id" element={<TaskDetailScreen />} />
          <Route path="tasks/:id/edit" element={<TaskFormScreen />} />
          <Route path="incidents" element={<IncidentsScreen />} />
          <Route path="incidents/new" element={<NewIncidentScreen />} />
          <Route path="incidents/:id" element={<IncidentDetailScreen />} />
          <Route path="log" element={<LogScreen />} />
          <Route path="insights" element={<InsightsScreen />} />
          <Route path="handoff" element={<HandoffScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
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
