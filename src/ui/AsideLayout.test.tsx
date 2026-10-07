import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AsideLayout } from './AsideLayout';

describe('AsideLayout', () => {
  it('orders main, aside, mainEnd in the DOM (phone reading order)', () => {
    render(<AsideLayout main={<p>Pinned</p>} aside={<p>Composer</p>} mainEnd={<p>Recent</p>} />);
    const texts = screen.getAllByText(/Pinned|Composer|Recent/).map((el) => el.textContent);
    expect(texts).toEqual(['Pinned', 'Composer', 'Recent']);
  });

  it('places the aside in the side column, sticky when asked', () => {
    render(<AsideLayout main="m" aside={<p>Side</p>} stickyAside />);
    const cell = screen.getByText('Side').parentElement;
    expect(cell).toHaveClass('lg:col-start-2', 'lg:sticky');
  });
});
