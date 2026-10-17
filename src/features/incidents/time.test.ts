import { describe, expect, it } from 'vitest';
import { formatWhen, fromCrLocalInput, toCrLocalInput } from './time';

describe('Costa Rica time', () => {
  it('shows a UTC instant as local CR time and back', () => {
    expect(toCrLocalInput(new Date('2026-10-07T20:30:00Z'))).toBe('2026-10-07T14:30');
    expect(fromCrLocalInput('2026-10-07T14:30')).toBe('2026-10-07T20:30:00.000Z');
  });

  it('rolls over midnight', () => {
    expect(toCrLocalInput(new Date('2026-10-08T03:00:00Z'))).toBe('2026-10-07T21:00');
    expect(fromCrLocalInput('2026-10-07T21:00')).toBe('2026-10-08T03:00:00.000Z');
  });

  it('rejects an empty or malformed value', () => {
    expect(fromCrLocalInput('')).toBeNull();
    expect(fromCrLocalInput('2026-10-07')).toBeNull();
  });

  it('formats in CR time and the chosen language', () => {
    expect(formatWhen('2026-10-07T20:30:00Z', 'en')).toMatch(/Oct 7, 2026.*2:30\s?PM/);
    expect(formatWhen('2026-10-07T20:30:00Z', 'es')).toMatch(/oct.*2026/);
  });
});
