import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, initialsOf, slotForName } from './Avatar';

describe('Avatar', () => {
  it('derives initials', () => {
    expect(initialsOf('Yard worker')).toBe('YW');
    expect(initialsOf('JT')).toBe('JT');
    expect(initialsOf('neighbor')).toBe('N');
    expect(initialsOf('  ')).toBe('?');
    expect(initialsOf('José María López')).toBe('JM');
    expect(initialsOf('Vecino / Neighbor')).toBe('VN');
    expect(initialsOf('/ /')).toBe('/');
  });

  it('maps a name to a stable slot 1–8', () => {
    const s = slotForName('JT');
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(8);
    expect(slotForName(' jt ')).toBe(s);
  });

  it('is decorative by default and labelled on request', () => {
    const { container, rerender } = render(<Avatar name="Neighbor" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    rerender(<Avatar name="Neighbor" labelled colorSlot={3} />);
    expect(screen.getByRole('img', { name: 'Neighbor' })).toHaveTextContent('N');
  });
});
