/**
 * Route path builders (the route table itself lives in routes.tsx and is frozen).
 * Use these instead of hand-written strings: `navigate(paths.week('2026-10-05'))`.
 */
export const paths = {
  board: () => '/',
  week: (weekStart?: string) => (weekStart ? `/week/${weekStart}` : '/week'),
  calendar: (yearMonth?: string) => (yearMonth ? `/calendar/${yearMonth}` : '/calendar'),
  tasks: () => '/tasks',
  task: (id: string) => `/tasks/${encodeURIComponent(id)}`,
  log: () => '/log',
  insights: () => '/insights',
  handoff: () => '/handoff',
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : '/login'),
} as const;
