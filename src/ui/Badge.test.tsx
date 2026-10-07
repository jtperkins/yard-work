import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its text with the tone recipe', () => {
    render(<Badge tone="warning">Draft</Badge>);
    expect(screen.getByText('Draft').className).toContain('bg-warning-soft');
  });

  it('stamp variant is uppercase and dashed', () => {
    render(
      <Badge tone="accent" variant="stamp">
        Draft
      </Badge>,
    );
    const el = screen.getByText('Draft');
    expect(el.className).toContain('border-dashed');
    expect(el.className).toContain('uppercase');
  });
});
