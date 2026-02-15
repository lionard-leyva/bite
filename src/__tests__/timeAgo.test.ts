import { timeAgo } from '../utils/timeAgo';

describe('timeAgo', () => {
  it('returns "Justo ahora" for dates less than 60 seconds ago', () => {
    const now = new Date();
    expect(timeAgo(now)).toBe('Justo ahora');
  });

  it('returns minutes for dates less than 1 hour ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(date)).toBe('Hace 5 min');
  });

  it('returns hours for dates less than 24 hours ago', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(date)).toBe('Hace 3h');
  });

  it('returns days for dates less than 7 days ago', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(date)).toBe('Hace 2 dias');
  });

  it('returns singular day correctly', () => {
    const date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    expect(timeAgo(date)).toBe('Hace 1 dia');
  });

  it('returns weeks for dates less than 5 weeks ago', () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(timeAgo(date)).toBe('Hace 2 semanas');
  });

  it('returns months for dates less than 12 months ago', () => {
    const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    expect(timeAgo(date)).toBe('Hace 2 meses');
  });

  it('returns years for dates more than 12 months ago', () => {
    const date = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    expect(timeAgo(date)).toBe('Hace 1 año');
  });

  it('handles null gracefully', () => {
    expect(timeAgo(null)).toBe('Justo ahora');
  });

  it('handles undefined gracefully', () => {
    expect(timeAgo(undefined)).toBe('Justo ahora');
  });

  it('handles ISO string from JSON.parse', () => {
    const iso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(iso)).toBe('Hace 2h');
  });

  it('handles invalid date string', () => {
    expect(timeAgo('not-a-date')).toBe('Justo ahora');
  });
});
