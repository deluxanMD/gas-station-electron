import { UserRole } from '@/features/auth/constants';
import type { AuthUser } from '@/features/auth/types';

function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

function decodeBase64Url(value: string): string {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeToken(token: string): AuthUser | null {
  try {
    const [, payloadPart] = token.split('.');
    if (!payloadPart) return null;

    const payload: unknown = JSON.parse(decodeBase64Url(payloadPart));
    if (typeof payload !== 'object' || payload === null) return null;

    const { sub, role, exp } = payload as Record<string, unknown>;
    if (typeof sub !== 'string') return null;
    if (typeof exp === 'number' && exp * 1000 <= Date.now()) return null;

    return { userId: sub, userRole: isUserRole(role) ? role : null };
  } catch {
    return null;
  }
}
