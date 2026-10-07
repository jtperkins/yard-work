/**
 * Dev-only `/ui` route (lazy-loaded under `import.meta.env.DEV`): every src/ui component with
 * sample props. Must stay a default export (the router lazy-imports it). Demo copy is plain
 * English on purpose — this page is a workbench, not a product screen.
 */
import { useEffect, useState, type ReactNode } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  CircleAlert,
  ClipboardList,
  Clock,
  Leaf,
  ListChecks,
  Palette,
  Plus,
  Search,
  ShoppingBasket,
  SquareCheckBig,
  Stamp,
  Trash,
} from 'lucide-react';
import {
  AppShell,
  AsideLayout,
  Avatar,
  Badge,
  BrandMark,
  Button,
  CalendarMonth,
  Card,
  CardFooter,
  CardHeader,
  Callout,
  CategoryChip,
  CategoryDot,
  Checkbox,
  Checklist,
  ChecklistRow,
  ClipboardSheet,
  ComboInput,
  ConfirmDialog,
  DateInput,
  DayMarkLegend,
  DetailList,
  Dialog,
  EmptyState,
  EntryHeader,
  Field,
  Grid,
  HBarList,
  Heatmap,
  IconButton,
  Input,
  LanguageToggle,
  LinkButton,
  ListRow,
  LogRow,
  PageHeader,
  SectionHeader,
  SegmentedControl,
  Select,
  Sheet,
  Skeleton,
  SkeletonText,
  Stack,
  StackedBarChart,
  StatTile,
  StatusPill,
  StepList,
  SummaryList,
  Text,
  Textarea,
  TextLink,
  Timeline,
  TimelineGroup,
  ToastProvider,
  ToggleChip,
  useToast,
  WeekStrip,
  type NavItem,
} from './index';
import { addDaysISO } from './internal/isoDate';

const TODAY = '2026-10-07';

const CATEGORIES = [
  ['metal-paint', 'Metal & paint'],
  ['lawn', 'Lawn'],
  ['garden', 'Garden'],
  ['trees', 'Trees'],
  ['drainage', 'Drainage'],
  ['pests', 'Pests'],
  ['house', 'House'],
  ['water', 'Water'],
  ['safety', 'Safety'],
  ['cats', 'Cats'],
] as const;

const SECTIONS: { id: string; label: string; icon: NavItem['icon']; primary?: boolean }[] = [
  { id: 'tokens', label: 'Tokens', icon: Palette },
  { id: 'actions', label: 'Actions', icon: SquareCheckBig },
  { id: 'checklist', label: 'Checklist', icon: ClipboardList },
  { id: 'forms', label: 'Forms', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, primary: false },
  { id: 'charts', label: 'Charts', icon: ChartColumn, primary: false },
  { id: 'log', label: 'Log', icon: BookOpen, primary: false },
  { id: 'content', label: 'Content', icon: ListChecks, primary: false },
];

/** Deterministic pseudo-random numbers so the demo renders the same every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function demoActivity(): Record<string, number> {
  const rand = seeded(7);
  const out: Record<string, number> = {};
  for (let i = 0; i < 365; i += 1) {
    const date = addDaysISO(TODAY, -i);
    const r = rand();
    const n = r < 0.35 ? 0 : Math.round(r * 5 + (i < 60 ? 1 : 0));
    if (n > 0) out[date] = n;
  }
  return out;
}

const ACTIVITY = demoActivity();

const PEOPLE = [
  { key: 'jt', label: 'JT' },
  { key: 'neighbor', label: 'Neighbor' },
  { key: 'yard', label: 'Yard worker' },
];

const WEEKS = Array.from({ length: 12 }, (_, i) => {
  const rand = seeded(100 + i);
  const monday = addDaysISO('2026-10-05', (i - 11) * 7);
  const [, m, d] = monday.split('-');
  return {
    key: monday,
    label: `${Number(d)}/${Number(m)}`,
    fullLabel: `Week of ${monday}`,
    values: {
      jt: Math.round(rand() * 6 + 2),
      neighbor: Math.round(rand() * 3),
      yard: Math.round(rand() * 4 + 1),
    },
  };
});

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 py-6">
      <SectionHeader id={`${id}-title`} title={title} description={description} />
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Swatch({ token, label }: { token: string; label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-md border border-line"
        style={{ background: `var(--${token})` }}
      />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{label ?? token}</span>
        <code className="text-ink-subtle">--{token}</code>
      </span>
    </div>
  );
}

function ChecklistDemo() {
  const { toast } = useToast();
  const [done, setDone] = useState<Record<string, boolean>>({ litter: true });
  const rows = [
    {
      id: 'mow',
      title: 'Mow the lawn (chapia)',
      meta: 'Every 7 days in rainy season · Yard worker',
      color: 'cat-lawn',
      status: <StatusPill status="critical" label="3 days overdue" />,
    },
    {
      id: 'ants',
      title: 'Leaf-cutter ant check & bait',
      meta: 'Every 14 days · Anyone',
      color: 'cat-pests',
      status: <StatusPill status="warning" label="Due in 2 days" />,
    },
    {
      id: 'litter',
      title: 'Feed cats, fresh water, scoop litter',
      meta: 'Daily · Sitter',
      color: 'cat-cats',
      status: <StatusPill status="good" label="Done today" />,
    },
  ];
  const signOff = (id: string, title: string) => {
    setDone((d) => ({ ...d, [id]: true }));
    toast({
      title: 'Signed off',
      description: title,
      tone: 'success',
      action: { label: 'Undo', onAction: () => setDone((d) => ({ ...d, [id]: false })) },
    });
  };
  return (
    <Checklist label="Due soon">
      {rows.map((r) => (
        <ChecklistRow
          key={r.id}
          title={r.title}
          meta={r.meta}
          color={r.color}
          status={done[r.id] ? undefined : r.status}
          done={!!done[r.id]}
          onSignOff={() => signOff(r.id, r.title)}
        />
      ))}
      <ChecklistRow
        title="Repaint rust-prone gate"
        meta="Every 180 days · Draft"
        color="cat-metal-paint"
        status={
          <Badge tone="warning" variant="stamp">
            Draft
          </Badge>
        }
        action={
          <LinkButton href="#checklist" size="sm" variant="secondary">
            Sign in to sign off
          </LinkButton>
        }
      />
    </Checklist>
  );
}

function OverlayDemo() {
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [doneBy, setDoneBy] = useState('JT');
  const [date, setDate] = useState(TODAY);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => setDialog(true)}>
        Open dialog
      </Button>
      <Button leadingIcon={Stamp} onClick={() => setSheet(true)}>
        Open sign-off sheet
      </Button>
      <Button variant="danger" leadingIcon={Trash} onClick={() => setConfirm(true)}>
        Delete…
      </Button>
      <Button
        variant="ghost"
        onClick={() => toast({ title: 'Plan shared', description: 'Copied to WhatsApp' })}
      >
        Toast
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast({ title: 'Could not save', description: 'Check your connection', tone: 'danger' })
        }
      >
        Error toast
      </Button>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="How sign-off works"
        description="A quick explainer in a dialog."
        footer={<Button onClick={() => setDialog(false)}>Got it</Button>}
      >
        <p className="text-sm text-ink-muted">
          Pick who did the work and when. The log keeps who signed it, so anyone can sign on behalf
          of the yard worker.
        </p>
      </Dialog>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Sign off: Mow the lawn"
        description="Every 7 days in rainy season"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSheet(false)}>
              Cancel
            </Button>
            <Button
              leadingIcon={Stamp}
              onClick={() => {
                setSheet(false);
                toast({
                  title: 'Signed off',
                  tone: 'success',
                  action: { label: 'Undo', onAction: () => {} },
                });
              }}
            >
              Sign off
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Done by" hint="Who did the work">
            <ComboInput
              value={doneBy}
              onValueChange={setDoneBy}
              suggestions={['JT', 'Neighbor', 'Yard worker']}
            />
          </Field>
          <Field label="Date">
            <DateInput value={date} max={TODAY} onValueChange={setDate} />
          </Field>
          <Field label="Note" optionalLabel="optional">
            <Textarea placeholder="Anything worth knowing next time" />
          </Field>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          toast({ title: 'Sign-off deleted', action: { label: 'Undo', onAction: () => {} } });
        }}
        title="Delete this sign-off?"
        description="It stays in the audit trail but no longer counts."
        confirmLabel="Delete"
      />
    </div>
  );
}

function FormsDemo() {
  const [name, setName] = useState('');
  const [person, setPerson] = useState('');
  const [view, setView] = useState<'list' | 'calendar' | 'table'>('list');
  const [have, setHave] = useState({ bait: true, gloves: false });
  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          hint="Shown on your sign-offs"
          required
          error={name.length > 40 ? 'Keep it under 40 characters' : undefined}
        >
          <Input value={name} onValueChange={setName} placeholder="e.g. JT" autoComplete="name" />
        </Field>
        <Field label="Search tasks">
          <Input type="search" leadingIcon={Search} placeholder="Mow, gutters, litter…" />
        </Field>
        <Field label="Person">
          <Select
            value={person}
            onValueChange={setPerson}
            placeholder="Everyone"
            options={PEOPLE.map((p) => ({ value: p.key, label: p.label }))}
          />
        </Field>
        <Field label="From">
          <DateInput value="2026-09-01" max={TODAY} onValueChange={() => {}} />
        </Field>
        <Field label="House code" error="That code didn't work">
          <Input type="password" defaultValue="hunter22" />
        </Field>
        <Field label="Note" optionalLabel="optional" className="sm:col-span-2">
          <Textarea placeholder="Gate code changed, ask the owner" />
        </Field>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-dashed border-line pt-4">
        <SegmentedControl
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List', icon: ListChecks },
            { value: 'calendar', label: 'Calendar', icon: CalendarDays },
            { value: 'table', label: 'Table', disabled: true },
          ]}
        />
        <Checkbox
          checked={have.bait}
          onCheckedChange={(c) => setHave((h) => ({ ...h, bait: c }))}
          label="Ant bait"
          description="Ferretería · for: leaf-cutter ant check"
          strikeWhenChecked
        />
        <Checkbox
          checked={have.gloves}
          onCheckedChange={(c) => setHave((h) => ({ ...h, gloves: c }))}
          label="Work gloves"
          description="Any hardware store"
          strikeWhenChecked
        />
      </div>
    </Card>
  );
}

function CalendarDemo() {
  const [selected, setSelected] = useState<string | null>('2026-10-05');
  const marks: Record<string, string[]> = {
    '2026-10-01': ['cat-cats', 'cat-lawn'],
    '2026-10-03': ['cat-cats', 'cat-drainage', 'cat-pests'],
    '2026-10-05': ['cat-cats', 'cat-garden'],
    '2026-10-07': ['cat-cats'],
    '2026-10-14': ['cat-house'],
    '2026-10-21': ['cat-safety'],
  };
  return (
    <Card padding="sm">
      <CalendarMonth
        month="2026-10"
        label="October 2026"
        today={TODAY}
        selected={selected}
        onSelect={setSelected}
        renderDay={(d) => {
          const dots = marks[d.date];
          if (!dots) return null;
          const projected = d.date > TODAY;
          return (
            <span className="flex flex-wrap gap-0.5">
              {dots.map((c, i) => (
                <CategoryDot key={i} color={c} size="sm" hollow={projected} />
              ))}
            </span>
          );
        }}
      />
    </Card>
  );
}

/** The `#section` currently in the URL (drives the nav's active item). */
function useActiveHash(fallback: string): string {
  const read = () => (typeof window === 'undefined' ? '' : window.location.hash.slice(1));
  const [hash, setHash] = useState(read);
  useEffect(() => {
    const onChange = () => setHash(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash || fallback;
}

function Showcase() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const active = useActiveHash('tokens');
  const [filters, setFilters] = useState<Record<string, boolean>>({ lawn: true });

  const nav: NavItem[] = SECTIONS.map((s) => ({
    key: s.id,
    href: `#${s.id}`,
    label: s.label,
    icon: s.icon,
    active: active === s.id,
    primary: s.primary,
  }));

  return (
    <AppShell
      brand={<BrandMark name="Yard Work" tagline="Component kit" icon={Leaf} />}
      navItems={nav}
      headerActions={
        <>
          <LanguageToggle value={lang} onChange={setLang} />
          <Avatar name="JT" labelled />
        </>
      }
      sidebarFooter={<p className="px-1 text-xs text-ink-subtle">Dev-only · /ui</p>}
      moreContent={<LanguageToggle value={lang} onChange={setLang} size="md" />}
    >
      <PageHeader
        eyebrow="Wednesday, October 7"
        title="Field journal kit"
        description="Every component in src/ui with sample props. Resize to see the tab bar, switch your OS theme to see dark mode."
        actions={
          <>
            <Button variant="secondary" leadingIcon={Plus}>
              Add ad-hoc task
            </Button>
            <Button leadingIcon={Stamp}>Sign off</Button>
          </>
        }
        meta={
          <>
            <Badge tone="primary">Rainy season</Badge>
            <Badge tone="warning" variant="stamp">
              Draft
            </Badge>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Overdue"
          value="3"
          hint="Oldest: 9 days"
          tone="danger"
          icon={CircleAlert}
        />
        <StatTile
          label="Due this week"
          value="11"
          hint="Yard day: Wednesday"
          tone="warning"
          icon={Clock}
        />
        <StatTile label="Done this week" value="7" tone="success" icon={SquareCheckBig} />
        <StatTile label="On track" value="86%" hint="25 of 29 tasks" tone="primary" icon={Leaf} />
      </div>

      <Section
        id="tokens"
        title="Tokens"
        description="Paper, ink, brand, status, category and chart colours."
      >
        <Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              'paper',
              'surface',
              'surface-sunken',
              'ink',
              'ink-muted',
              'line-strong',
              'primary',
              'primary-soft',
              'accent',
              'accent-soft',
              'success',
              'warning',
              'danger',
              'info',
            ].map((t) => (
              <Swatch key={t} token={t} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.map(([key, label]) => (
              <CategoryChip key={key} label={label} color={`cat-${key}`} />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {Array.from({ length: 8 }, (_, i) => (
              <Swatch key={i} token={`chart-${i + 1}`} label={`Slot ${i + 1}`} />
            ))}
          </div>
          <div className="mt-4 flex gap-1" aria-label="Sequential scale">
            {[0, 1, 2, 3, 4, 5].map((l) => (
              <span
                key={l}
                className="h-4 flex-1 rounded-sm"
                style={{ background: `var(--seq-${l})` }}
              />
            ))}
          </div>
        </Card>
      </Section>

      <Section id="actions" title="Actions & labels">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" leadingIcon={Stamp}>
              Small
            </Button>
            <Button size="md" leadingIcon={Stamp}>
              Medium
            </Button>
            <Button size="lg" leadingIcon={Stamp}>
              Large
            </Button>
            <LinkButton href="#actions" variant="secondary" trailingIcon={ShoppingBasket}>
              LinkButton
            </LinkButton>
            <IconButton label="Delete" icon={Trash} variant="danger" />
            <IconButton label="Add" icon={Plus} variant="secondary" />
            <TextLink href="#actions">Text link</TextLink>
            <TextLink href="#actions" tone="muted">
              Muted link
            </TextLink>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <StatusPill status="critical" label="Overdue" />
            <StatusPill status="warning" label="Due soon" />
            <StatusPill status="good" label="On track" />
            <StatusPill status="info" label="Planned" />
            <StatusPill status="pending" label="Never done" />
            <StatusPill status="inactive" label="Dormant" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(
              ['neutral', 'primary', 'accent', 'success', 'warning', 'danger', 'info'] as const
            ).map((t) => (
              <Badge key={t} tone={t}>
                {t}
              </Badge>
            ))}
            <Badge tone="info" variant="outline">
              outline
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CATEGORIES.slice(0, 5).map(([key, label]) => (
              <ToggleChip
                key={key}
                label={label}
                color={`cat-${key}`}
                pressed={!!filters[key]}
                onPressedChange={(p) => setFilters((f) => ({ ...f, [key]: p }))}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {['JT', 'Neighbor', 'Yard worker', 'Ana Sofía'].map((n) => (
              <Avatar key={n} name={n} labelled />
            ))}
            <Avatar name="Yard worker" size="lg" />
            <Avatar name="JT" size="sm" />
          </div>
        </Card>
      </Section>

      <Section
        id="checklist"
        title="Checklist"
        description="Sign off a row to see the stamp; Undo in the toast reverts it."
      >
        <ChecklistDemo />
        <OverlayDemo />
      </Section>

      <Section id="forms" title="Forms">
        <FormsDemo />
      </Section>

      <Section
        id="calendar"
        title="Calendar month"
        description="Filled dots = done; hollow = projected due."
      >
        <CalendarDemo />
      </Section>

      <Section id="charts" title="Charts">
        <Card>
          <Heatmap
            title="Activity, last 12 months"
            description="Sign-offs per day"
            start={addDaysISO(TODAY, -364)}
            end={TODAY}
            values={ACTIVITY}
            formatCell={(d, n) => `${n} sign-off${n === 1 ? '' : 's'} on ${d}`}
          />
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <HBarList
              title="On-time rate by category"
              description="Done within the cadence + 20%"
              max={1}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              items={CATEGORIES.slice(0, 6).map(([key, label], i) => ({
                key,
                label,
                value: i === 4 ? null : [0.92, 0.78, 0.64, 1, 0, 0.55][i]!,
                leading: <CategoryDot color={`cat-${key}`} />,
              }))}
              emptyLabel="No repeats yet"
            />
          </Card>
          <Card>
            <StackedBarChart
              title="Sign-offs by person"
              description="Per week, last 12 weeks"
              series={PEOPLE}
              rows={WEEKS}
              categoryColumnLabel="Week"
            />
          </Card>
        </div>
      </Section>

      <Section id="log" title="Log & states">
        <Card>
          <Timeline label="Sign-off log">
            <TimelineGroup label="Wednesday, Oct 7" aside="2 sign-offs">
              <LogRow
                title="Mow the lawn"
                color="cat-lawn"
                meta="Done by Yard worker · logged by JT · 9:40"
                note="Back slope left for next week — too wet."
                actions={
                  <IconButton label="Delete sign-off" icon={Trash} size="sm" variant="danger" />
                }
              />
              <LogRow
                title="Feed cats, scoop litter"
                color="cat-cats"
                meta="Done by JT"
                badges={<Badge tone="info">Planned</Badge>}
              />
            </TimelineGroup>
            <TimelineGroup label="Monday, Oct 5" aside="1 sign-off">
              <LogRow
                title="Clear the culvert by the gate"
                color="cat-drainage"
                meta="Done by Neighbor · logged by JT"
                muted
              />
            </TimelineGroup>
          </Timeline>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Empty state" subtitle="Inside a card" />
            <EmptyState
              size="compact"
              title="Nothing planned yet"
              description="Add suggestions or an ad-hoc task to build this week's plan."
              action={
                <Button size="sm" leadingIcon={Plus}>
                  Add task
                </Button>
              }
            />
          </Card>
          <Card aria-busy="true" aria-label="Loading">
            <CardHeader title="Loading" subtitle="Skeletons" />
            <div className="flex items-center gap-3">
              <Skeleton shape="circle" />
              <SkeletonText lines={2} className="flex-1" />
            </div>
            <Skeleton shape="block" className="mt-4" />
          </Card>
        </div>
        <EmptyState
          title="All caught up"
          description="No overdue work. The garden thanks you."
          action={
            <LinkButton href="#checklist" variant="secondary">
              Plan next week
            </LinkButton>
          }
        />
      </Section>

      <Section id="content" title="Layout, content & print">
        <Grid cols={1} mdCols={2} gap="md">
          <Card>
            <CardHeader title="StepList + Callout" />
            <Stack gap="md">
              <StepList
                label="How to"
                steps={[
                  'Wire-brush every rust spot down to bright metal.',
                  'Degrease with a rag and thinner.',
                  'Dab on anticorrosive primer.',
                ]}
              />
              <Callout tone="warning" title="Safety first">
                Gloves and a mask when brushing rust.
              </Callout>
            </Stack>
          </Card>
          <Card>
            <CardHeader title="DetailList + Text" />
            <Stack gap="md">
              <DetailList
                columns={2}
                items={[
                  { key: 'a', label: 'How often', value: 'Every 30 days' },
                  { key: 'b', label: 'Where', value: 'Gates & railings' },
                  { key: 'c', label: 'Takes about', value: '45 min' },
                  { key: 'd', label: 'Next due', value: 'Due in 3 days' },
                ]}
              />
              <Text size="sm" tone="muted">
                Muted body copy for supporting text.
              </Text>
            </Stack>
          </Card>
        </Grid>
        <AsideLayout
          main={
            <Card as="article">
              <EntryHeader
                author="Ana"
                badges={
                  <Badge size="sm" tone="accent">
                    Pinned
                  </Badge>
                }
                meta={<time dateTime="2026-10-07T14:00:00Z">Oct 7, 8:00</time>}
                actions={<IconButton icon={Trash} label="Delete note" size="sm" variant="danger" />}
              />
              <Text preWrap breakWords>
                {'CATS\n- Names: Mía, Tigre\n    (Tigre hides under the bed)'}
              </Text>
            </Card>
          }
          aside={
            <Card>
              <CardHeader title="Overdue" />
              <SummaryList
                label="Overdue"
                max={2}
                items={[
                  { key: 'a', color: 'cat-lawn', content: 'Mow the lawn', aside: '3 days' },
                  { key: 'b', color: 'cat-drainage', content: 'Clear ditches', aside: 'Never' },
                  { key: 'c', content: 'Hidden by max', aside: '—' },
                ]}
              />
              <CardFooter>
                <DayMarkLegend
                  label="Legend"
                  items={[
                    { kind: 'done', label: 'Signed off' },
                    { kind: 'planned', label: 'Planned' },
                    { kind: 'due', label: 'Comes due' },
                  ]}
                />
                <Text size="xs" tone="subtle" icon={Clock}>
                  Legend in a CardFooter
                </Text>
              </CardFooter>
            </Card>
          }
          mainEnd={
            <Card>
              <CardHeader title="StepList (titled, two columns)" />
              <StepList
                headingLevel="h3"
                columns={2}
                steps={[
                  { title: 'Sign off', description: 'Tap Sign off on any job.' },
                  { title: 'Plan the week', description: 'Add suggestions to the plan.' },
                  { title: 'Leave notes', description: 'Pin the house essentials.' },
                ]}
              />
            </Card>
          }
        />
        <WeekStrip
          label="This week"
          highlightLabel="Yard day"
          days={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday, i) => ({
            key: weekday,
            weekday,
            day: String(5 + i),
            label: `${weekday} ${5 + i}`,
            isToday: i === 2,
            highlighted: i === 3,
          }))}
        />
        <Checklist label="Catalog rows">
          <ListRow
            href="#content"
            title="Mow the lawn"
            meta="Every 7 days in rainy season · last done yesterday"
            color="cat-lawn"
            trailing={<StatusPill status="good" label="On track" size="sm" />}
          />
          <ListRow
            href="#content"
            title="Clear ditches & culverts"
            meta="Every 14 days in rainy season · never done"
            color="cat-drainage"
            trailing={
              <Badge variant="stamp" tone="accent" size="sm">
                Draft
              </Badge>
            }
          />
        </Checklist>
        <Card padding="sm" variant="sunken">
          <ClipboardSheet
            brand="Yard Work"
            title="Sign-off sheet · Oct 5–11"
            subtitle="Yard day: Thursday 8"
            columns={{
              task: 'Job',
              assignee: 'For',
              doneBy: 'Done by',
              date: 'Date',
              initials: 'Initials',
            }}
            rows={[
              {
                key: 'a',
                title: 'Mow the lawn',
                detail: 'Lawn · 120 min',
                assignee: 'Yard worker',
              },
              { key: 'b', title: 'Rust inspection', done: { by: 'JT', date: 'Oct 6' } },
            ]}
            blankRows={1}
            signatures={['Checked by', 'Date']}
          />
        </Card>
      </Section>
    </AppShell>
  );
}

export default function KitchenSink() {
  return (
    <ToastProvider>
      <Showcase />
    </ToastProvider>
  );
}
