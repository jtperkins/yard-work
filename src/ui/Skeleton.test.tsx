import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton, SkeletonText } from './Skeleton';

describe('Skeleton', () => {
  it('is decorative and sized', () => {
    const { container } = render(<Skeleton shape="circle" width={32} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.style.width).toBe('32px');
    expect(el.style.height).toBe('32px');
  });

  it('SkeletonText renders N lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.querySelectorAll('[data-skeleton]')).toHaveLength(4);
  });
});
