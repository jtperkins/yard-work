import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { BoardScreen } from '../features/board';
import { TasksScreen, TaskDetailScreen, TaskFormScreen } from '../features/tasks';
import { IncidentDetailScreen, IncidentsScreen, NewIncidentScreen } from '../features/incidents';
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
 *   /tasks                 Task list
 *   /tasks/new             New task (sign-in only)
 *   /tasks/:id             Task detail
 *   /tasks/:id/edit        Edit task (sign-in only)
 *   /incidents             Incident reports (sign-in only)
 *   /incidents/new         Report an incident (sign-in only)
 *   /incidents/:id         Incident detail (sign-in only)
 *   /log                   Sign-off log
 *   /insights              Charts
 *   /handoff               Handoff notes (sign-in only, gated by RequireAuth)
 *   /login                 Sign in (?next=/path)
 *   /ui                    Kitchen sink (dev only)
 *   /week/*, /calendar/*   Old screens, redirect to the Board
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<BoardScreen />} />
        <Route path="week/*" element={<Navigate to="/" replace />} />
        <Route path="calendar/*" element={<Navigate to="/" replace />} />
        <Route path="tasks" element={<TasksScreen />} />
        <Route
          path="tasks/new"
          element={
            <RequireAuth>
              <TaskFormScreen />
            </RequireAuth>
          }
        />
        <Route path="tasks/:id" element={<TaskDetailScreen />} />
        <Route
          path="tasks/:id/edit"
          element={
            <RequireAuth>
              <TaskFormScreen />
            </RequireAuth>
          }
        />
        <Route
          path="incidents"
          element={
            <RequireAuth>
              <IncidentsScreen />
            </RequireAuth>
          }
        />
        <Route
          path="incidents/new"
          element={
            <RequireAuth>
              <NewIncidentScreen />
            </RequireAuth>
          }
        />
        <Route
          path="incidents/:id"
          element={
            <RequireAuth>
              <IncidentDetailScreen />
            </RequireAuth>
          }
        />
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
