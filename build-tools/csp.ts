import type { Plugin } from 'vite';

const PLACEHOLDER = '__API_ORIGIN__';
// The address the repository ships as a stand-in until the real server is known.
const STAND_IN_HOST = /(^|\.)example\.com$/;

/**
 * The origin (scheme, host, port) the app may talk to, taken from the API address it is built with. Only the origin
 * goes in the policy: a path in it would match that exact address and nothing else.
 *
 * A production build must use https: the packaged app carries money and stock records, and a plain http address would
 * send them in the clear. A development build may use any address, such as http://localhost:3000.
 */
export function apiOriginFor(
  apiBaseUrl: string | undefined,
  mode: string,
  warn: (message: string) => void = console.warn,
  name = 'RENDERER_VITE_API_BASE_URL',
): string {
  if (!apiBaseUrl) {
    throw new Error(
      `${name} is not set: the built app would have no API address to reach. Set it in .env.production (or the environment of the build).`,
    );
  }
  let url: URL;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    throw new Error(
      `RENDERER_VITE_API_BASE_URL is not a valid address: ${apiBaseUrl}`,
    );
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(
      `RENDERER_VITE_API_BASE_URL must be an http(s) address: ${apiBaseUrl}`,
    );
  }
  if (mode === 'production') {
    if (url.protocol !== 'https:') {
      throw new Error(
        `A production build must reach the API over https, but ${name} is ${apiBaseUrl}.`,
      );
    }
    if (STAND_IN_HOST.test(url.hostname)) {
      warn(
        `${name} is still the stand-in ${url.origin}: set the real API address before shipping.`,
      );
    }
  }
  return url.origin;
}

/** Puts the API's origin into the page's Content-Security-Policy, so the policy follows the address the app is built for. */
export function cspApiOrigin(): Plugin {
  let origin = '';
  return {
    name: 'gsp-csp-api-origin',
    configResolved(config) {
      origin = apiOriginFor(config.env.RENDERER_VITE_API_BASE_URL, config.mode);
    },
    transformIndexHtml: (html) => html.replaceAll(PLACEHOLDER, origin),
  };
}

/**
 * Fails the main-process build when it has no usable API address. The background sync runs there and reads the address
 * the build was made with, so a missing one would otherwise only show up as an app that silently never syncs.
 */
export function requireMainApiAddress(): Plugin {
  const name = 'MAIN_VITE_API_BASE_URL';
  return {
    name: 'gsp-require-main-api-address',
    configResolved(config) {
      apiOriginFor(config.env[name], config.mode, console.warn, name);
    },
  };
}
