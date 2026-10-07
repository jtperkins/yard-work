import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LanguageToggle } from './LanguageToggle';

describe('LanguageToggle', () => {
  it('offers English / Español by default with lang attributes', async () => {
    const onChange = vi.fn();
    render(<LanguageToggle value="en" onChange={onChange} label="Idioma" />);
    expect(screen.getByRole('radiogroup', { name: 'Idioma' })).toBeInTheDocument();
    const es = screen.getByRole('radio', { name: 'Español' });
    expect(es).toHaveAttribute('lang', 'es');
    expect(es).toHaveTextContent('ES');
    await userEvent.click(es);
    expect(onChange).toHaveBeenCalledWith('es');
  });

  it('accepts custom languages', () => {
    render(
      <LanguageToggle
        value="fr"
        onChange={() => {}}
        languages={[
          { value: 'fr', label: 'FR', name: 'Français' },
          { value: 'de', label: 'DE', name: 'Deutsch' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Français' })).toHaveAttribute('aria-checked', 'true');
  });
});
