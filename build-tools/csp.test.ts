import { describe, expect, it, vi } from 'vitest';
import { apiOriginFor, requireMainApiAddress } from './csp';

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

describe('apiOriginFor naming the setting', () => {
  it('says which setting is wrong', () => {
    expect(() =>
      apiOriginFor(undefined, 'production', vi.fn(), 'MAIN_VITE_API_BASE_URL'),
    ).toThrow(/MAIN_VITE_API_BASE_URL is not set/);
    expect(() =>
      apiOriginFor(
        'http://x.test/api',
        'production',
        vi.fn(),
        'MAIN_VITE_API_BASE_URL',
      ),
    ).toThrow(/MAIN_VITE_API_BASE_URL is http/);
  });

  it('tells a missing setting what to do about it', () => {
    expect(() => apiOriginFor(undefined, 'production')).toThrow(
      /\.env\.production/,
    );
  });
});

// Runs the plugin's check the way the build does, with the settings it was given.
const run = (value: string | undefined, mode: string): void => {
  const plugin = requireMainApiAddress();
  const hook = plugin.configResolved as (config: unknown) => void;
  hook({ mode, env: { MAIN_VITE_API_BASE_URL: value } });
};

describe('requireMainApiAddress', () => {
  it('fails the build when the main process has no address', () => {
    expect(() => run(undefined, 'production')).toThrow(
      /MAIN_VITE_API_BASE_URL is not set/,
    );
  });

  it('fails a production build over plain http', () => {
    expect(() => run('http://api.station.ca/api', 'production')).toThrow(
      /over https/,
    );
  });

  it('accepts a good address, and plain http while developing', () => {
    expect(() => run('https://api.station.ca/api', 'production')).not.toThrow();
    expect(() => run('http://localhost:3000/api', 'development')).not.toThrow();
  });
});
