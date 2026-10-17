/**
 * Route path builders (the route table itself lives in routes.tsx and is frozen).
 * Use these instead of hand-written strings: `navigate(paths.task('chapia'))`.
 */
export const paths = {
  board: () => '/',
  tasks: () => '/tasks',
  taskNew: () => '/tasks/new',
  task: (id: string) => `/tasks/${encodeURIComponent(id)}`,
  taskEdit: (id: string) => `/tasks/${encodeURIComponent(id)}/edit`,
  log: () => '/log',
  incidents: () => '/incidents',
  incidentNew: () => '/incidents/new',
  incident: (id: string) => `/incidents/${encodeURIComponent(id)}`,
  insights: () => '/insights',
  handoff: () => '/handoff',
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : '/login'),
} as const;
