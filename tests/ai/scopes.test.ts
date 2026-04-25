import { describe, expect, it } from 'vitest';

import {
  hasAiScope,
  hasAllAiScopes,
  hasAnyAiScope,
  parseAiScopes,
} from '@/lib/ai/scopes';

describe('AI scope helpers', () => {
  it('deduplicates and trims valid scopes', () => {
    expect(parseAiScopes([' content:read ', 'content:read', 'audit:read'])).toEqual({
      ok: true,
      scopes: ['content:read', 'audit:read'],
    });
  });

  it('reports invalid scopes', () => {
    expect(parseAiScopes(['content:read', 'admin:all'])).toEqual({
      ok: false,
      invalidScopes: ['admin:all'],
    });
  });

  it('checks one, all, or any required scopes', () => {
    const scopes = ['content:read', 'sync:trigger'];

    expect(hasAiScope(scopes, 'content:read')).toBe(true);
    expect(hasAllAiScopes(scopes, ['content:read', 'sync:trigger'])).toBe(true);
    expect(hasAllAiScopes(scopes, ['content:read', 'audit:read'])).toBe(false);
    expect(hasAnyAiScope(scopes, ['audit:read', 'sync:trigger'])).toBe(true);
  });
});
