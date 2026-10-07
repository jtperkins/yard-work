import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Callout } from './Callout';

describe('Callout', () => {
  it('is a note with title, body and action', () => {
    render(
      <Callout tone="warning" title="Safety" action={<span>act</span>}>
        Wear gloves
      </Callout>,
    );
    const note = screen.getByRole('note');
    expect(note).toHaveAttribute('data-tone', 'warning');
    expect(note).toHaveTextContent('Safety');
    expect(note).toHaveTextContent('Wear gloves');
    expect(note).toHaveTextContent('act');
    expect(note.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
