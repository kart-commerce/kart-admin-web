import { describe, expect, it, afterEach } from 'vitest';

import { readSessionId, serializeClearedSessionCookie, serializeSessionCookie, SESSION_COOKIE_NAME } from './cookie';

describe('cookie', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  describe('serializeSessionCookie', () => {
    it('sets HttpOnly/SameSite=Strict and the given max-age', () => {
      const header = serializeSessionCookie('abc123', 3600);
      expect(header).toContain(`${SESSION_COOKIE_NAME}=abc123`);
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
      expect(header).toContain('Max-Age=3600');
    });

    it('is not marked Secure outside production (local http:// dev)', () => {
      process.env['NODE_ENV'] = 'development';
      const header = serializeSessionCookie('abc123', 3600);
      expect(header).not.toContain('Secure');
    });

    it('is marked Secure in production', () => {
      process.env['NODE_ENV'] = 'production';
      const header = serializeSessionCookie('abc123', 3600);
      expect(header).toContain('Secure');
    });
  });

  describe('serializeClearedSessionCookie', () => {
    it('clears the cookie with Max-Age=0 and an empty value', () => {
      const header = serializeClearedSessionCookie();
      expect(header).toContain(`${SESSION_COOKIE_NAME}=;`);
      expect(header).toContain('Max-Age=0');
    });
  });

  describe('readSessionId', () => {
    it('extracts the session id from a cookie header', () => {
      expect(readSessionId(`${SESSION_COOKIE_NAME}=abc123; other=value`)).toBe('abc123');
    });

    it('returns undefined when the cookie is absent', () => {
      expect(readSessionId('other=value')).toBeUndefined();
    });

    it('returns undefined when there is no cookie header at all', () => {
      expect(readSessionId(undefined)).toBeUndefined();
    });
  });
});
