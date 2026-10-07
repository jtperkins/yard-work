import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KitchenSink from './KitchenSink';

describe('KitchenSink', () => {
  it('renders the whole kit without crashing', () => {
    render(<KitchenSink />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Field journal kit' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Activity, last 12 months' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
  });
});
