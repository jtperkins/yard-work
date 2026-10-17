/**
 * Design-system library — dumb components, tokens only (see README.md).
 * Screens import from here: `import { Button, Card } from '../../ui'`.
 */
export { cx } from './cx';
export type {
  IconComponent,
  LinkComponent,
  LinkComponentProps,
  PolymorphicProps,
  Tone,
} from './types';

// Layout & navigation
export { AppShell, BrandMark, NavBar, TabBar } from './AppShell';
export type { AppShellProps, BrandMarkProps, NavBarProps, NavItem, TabBarProps } from './AppShell';
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';
export { Card, CardFooter, CardHeader } from './Card';
export type { CardFooterProps, CardHeaderProps, CardPadding, CardProps } from './Card';

// Actions
export { Button, LinkButton, buttonClasses } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant, LinkButtonProps } from './Button';
export { IconButton } from './IconButton';
export type { IconButtonProps, IconButtonVariant } from './IconButton';
export { TextLink } from './TextLink';
export type { TextLinkProps } from './TextLink';
export { PeriodNav } from './PeriodNav';
export type { PeriodNavProps } from './PeriodNav';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './SegmentedControl';
export { LanguageToggle, DEFAULT_LANGUAGES } from './LanguageToggle';
export type { LanguageOption, LanguageToggleProps } from './LanguageToggle';
export { ToggleChip } from './ToggleChip';
export type { ToggleChipProps } from './ToggleChip';

// Display
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
export { CategoryChip, CategoryDot, swatchStyle } from './CategoryChip';
export type { CategoryChipProps, CategoryDotProps } from './CategoryChip';
export { StatusPill } from './StatusPill';
export type { Status, StatusPillProps } from './StatusPill';
export { StatTile } from './StatTile';
export type { StatTileProps } from './StatTile';
export { Avatar, initialsOf, slotForName } from './Avatar';
export type { AvatarProps } from './Avatar';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Skeleton, SkeletonText } from './Skeleton';
export type { SkeletonProps, SkeletonTextProps } from './Skeleton';
export { VisuallyHidden } from './VisuallyHidden';
export type { VisuallyHiddenProps } from './VisuallyHidden';

// Lists
export { Checklist, ChecklistRow } from './ChecklistRow';
export type { ChecklistProps, ChecklistRowProps } from './ChecklistRow';
export { Timeline, TimelineGroup, LogRow } from './Timeline';
export type { LogRowProps, TimelineGroupProps, TimelineProps } from './Timeline';
export { CalendarMonth } from './CalendarMonth';
export type { CalendarDayInfo, CalendarMonthProps } from './CalendarMonth';
export { DayMark, DayMarkLegend, DayMarks } from './DayMarks';
export type {
  DayMarkItem,
  DayMarkKind,
  DayMarkLegendProps,
  DayMarkProps,
  DayMarksProps,
} from './DayMarks';

// Forms
export { Field, useFieldControl } from './Field';
export type { FieldProps } from './Field';
export { Input } from './Input';
export type { InputProps } from './Input';
export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';
export { Select } from './Select';
export type { SelectOption, SelectProps } from './Select';
export { DateInput } from './DateInput';
export type { DateInputProps } from './DateInput';
export { ComboInput } from './ComboInput';
export type { ComboInputProps } from './ComboInput';
export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';
export { FileInput } from './FileInput';
export type { FileInputProps } from './FileInput';

// Attachments & disclosure
export { AttachmentList } from './AttachmentList';
export type { AttachmentItem, AttachmentListProps } from './AttachmentList';
export { Disclosure } from './Disclosure';
export type { DisclosureProps } from './Disclosure';

// Overlays & feedback
export { Dialog, Sheet, ConfirmDialog } from './Dialog';
export type { ConfirmDialogProps, DialogProps } from './Dialog';
export { ToastProvider, useToast } from './Toast';
export type { ToastAction, ToastApi, ToastOptions, ToastProviderProps, ToastTone } from './Toast';

// Charts
export { ChartFigure, ChartLegend } from './charts/ChartFigure';
export type { ChartFigureProps, ChartTable, LegendItem } from './charts/ChartFigure';
export { Heatmap, heatLevel } from './charts/Heatmap';
export type { HeatmapProps } from './charts/Heatmap';
export { StackedBarChart } from './charts/StackedBarChart';
export type { StackedBarChartProps, StackedRow, StackedSeries } from './charts/StackedBarChart';
export { HBarList } from './charts/HBarList';
export type { HBarItem, HBarListProps } from './charts/HBarList';

// Layout primitives, content & print (added with the Board/Week/Tasks screens)
export { Stack, Grid } from './Stack';
export { AsideLayout } from './AsideLayout';
export type { AsideLayoutProps } from './AsideLayout';
export type { GridProps, StackGap, StackProps } from './Stack';
export { Text } from './Text';
export type { TextProps } from './Text';
export { StepList } from './StepList';
export type { StepListProps, TitledStep } from './StepList';
export { SummaryList } from './SummaryList';
export type { SummaryItem, SummaryListProps } from './SummaryList';
export { EntryHeader } from './EntryHeader';
export type { EntryHeaderProps } from './EntryHeader';
export { Callout } from './Callout';
export type { CalloutProps, CalloutTone } from './Callout';
export { DetailList } from './DetailList';
export type { DetailItem, DetailListProps } from './DetailList';
export { ListRow } from './ListRow';
export type { ListRowProps } from './ListRow';
export { WeekStrip } from './WeekStrip';
export type { WeekStripDay, WeekStripProps } from './WeekStrip';
export { MediaOnly } from './MediaOnly';
export type { MediaOnlyProps } from './MediaOnly';
export { ClipboardSheet } from './ClipboardSheet';
export type {
  ClipboardSheetColumns,
  ClipboardSheetProps,
  ClipboardSheetRow,
} from './ClipboardSheet';
