import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill, type Status } from './StatusPill';

describe('StatusPill', () => {
  it.each<Status>(['critical', 'warning', 'good', 'info', 'pending', 'inactive'])(
    '%s shows a label and a decorative icon',
    (status) => {
      render(<StatusPill status={status} label={`label-${status}`} />);
      const pill = screen.getByText(`label-${status}`);
      expect(pill).toHaveAttribute('data-status', status);
      expect(pill.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    },
  );
});
