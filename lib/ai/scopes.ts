export const AI_SCOPES = [
  'content:read',
  'content:read-private',
  'content:write-metadata',
  'sync:trigger',
  'audit:read',
] as const;

export type AiScope = (typeof AI_SCOPES)[number];

export type ScopeParseResult =
  | {
      ok: true;
      scopes: AiScope[];
    }
  | {
      ok: false;
      invalidScopes: string[];
    };

const scopeSet = new Set<string>(AI_SCOPES);

export function isAiScope(value: unknown): value is AiScope {
  return typeof value === 'string' && scopeSet.has(value);
}

export function parseAiScopes(values: Iterable<unknown>): ScopeParseResult {
  const scopes: AiScope[] = [];
  const invalidScopes: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      invalidScopes.push(String(value));
      continue;
    }

    const scope = value.trim();
    if (!isAiScope(scope)) {
      invalidScopes.push(scope);
      continue;
    }

    if (!scopes.includes(scope)) {
      scopes.push(scope);
    }
  }

  if (invalidScopes.length > 0) {
    return {
      ok: false,
      invalidScopes,
    };
  }

  return {
    ok: true,
    scopes,
  };
}

export function normalizeAiScopes(values: Iterable<unknown>): AiScope[] {
  const parsed = parseAiScopes(values);

  return parsed.ok ? parsed.scopes : [];
}

export function hasAiScope(scopes: Iterable<string>, scope: AiScope) {
  return Array.from(scopes).includes(scope);
}

export function hasAllAiScopes(scopes: Iterable<string>, requiredScopes: readonly AiScope[]) {
  const available = new Set(scopes);

  return requiredScopes.every((scope) => available.has(scope));
}

export function hasAnyAiScope(scopes: Iterable<string>, requiredScopes: readonly AiScope[]) {
  const available = new Set(scopes);

  return requiredScopes.some((scope) => available.has(scope));
}
