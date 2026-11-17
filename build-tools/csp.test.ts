import { describe, expect, it, vi } from 'vitest';
import { apiOriginFor } from './csp';

describe('apiOriginFor', () => {
  it('keeps only the origin of the address, not its path', () => {
    expect(apiOriginFor('https://api.station.ca/api', 'production')).toBe(
      'https://api.station.ca',
    );
    expect(
      apiOriginFor('https://api.station.ca:8443/api/v1', 'production'),
    ).toBe('https://api.station.ca:8443');
  });

  it('lets a development build use plain http, such as the local API', () => {
    expect(apiOriginFor('http://localhost:3000/api', 'development')).toBe(
      'http://localhost:3000',
    );
  });

  it('refuses a production build that would reach the API without https', () => {
    expect(() =>
      apiOriginFor('http://api.station.ca/api', 'production'),
    ).toThrow(/over https/);
    expect(() =>
      apiOriginFor('http://localhost:3000/api', 'production'),
    ).toThrow(/over https/);
  });

  it('warns, but still builds, while the address is the stand-in the repository ships', () => {
    const warn = vi.fn();

    expect(
      apiOriginFor('https://api.example.com/api', 'production', warn),
    ).toBe('https://api.example.com');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('stand-in'));
  });

  it('does not warn about a real address', () => {
    const warn = vi.fn();

    apiOriginFor('https://api.station.ca/api', 'production', warn);

    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    '',
    'not a url',
    'ftp://api.station.ca',
    'javascript:alert(1)',
  ])(
    'rejects %j instead of writing a policy that blocks or allows the wrong thing',
    (value) => {
      expect(() => apiOriginFor(value, 'development')).toThrow(
        /RENDERER_VITE_API_BASE_URL/,
      );
    },
  );
});
