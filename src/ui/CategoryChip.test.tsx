import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryChip, CategoryDot, swatchStyle } from './CategoryChip';

describe('CategoryChip', () => {
  it('shows the label and exposes the colour token as CSS vars', () => {
    render(<CategoryChip label="Lawn" color="cat-lawn" />);
    const chip = screen.getByText('Lawn').parentElement!;
    expect(chip.style.getPropertyValue('--swatch')).toBe('var(--cat-lawn)');
  });

  it('swatchStyle references the token and its soft tint', () => {
    const s = swatchStyle('cat-cats') as Record<string, string>;
    expect(s['--swatch']).toBe('var(--cat-cats)');
    expect(s['--swatch-soft']).toContain('var(--cat-cats-soft');
  });
});

describe('CategoryDot', () => {
  it('is decorative without a label', () => {
    const { container } = render(<CategoryDot color="cat-lawn" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('is an image with a label', () => {
    render(<CategoryDot color="cat-lawn" label="Lawn" hollow />);
    expect(screen.getByRole('img', { name: 'Lawn' })).toBeInTheDocument();
  });
});
