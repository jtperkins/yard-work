import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PeriodNav } from './PeriodNav';

describe('PeriodNav', () => {
  it('renders the label as a heading and steps both ways', async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <PeriodNav
        label="October 2026"
        onPrevious={onPrevious}
        onNext={onNext}
        previousLabel="Previous month"
        nextLabel="Next month"
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'October 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
  });

  it('offers a jump to today, disabled when already current', async () => {
    const onToday = vi.fn();
    const { rerender } = render(
      <PeriodNav label="Sep" onPrevious={() => {}} onNext={() => {}} onToday={onToday} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalledTimes(1);
    rerender(
      <PeriodNav label="Oct" onPrevious={() => {}} onNext={() => {}} onToday={onToday} isCurrent />,
    );
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();
  });

  it('can render the label without a heading and disable stepping', () => {
    render(
      <PeriodNav label="Week 41" as="p" onPrevious={() => {}} onNext={() => {}} nextDisabled />,
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Week 41')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
