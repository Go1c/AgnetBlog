'use client';

import { useActionState, useState } from 'react';

import { AI_SCOPES } from '@/lib/ai/scopes';

const aiTokenPrefix = 'agnet_ai_';

export type CreateTokenState =
  | {
      ok: true;
      token: string;
      name: string;
      scopes: string[];
    }
  | {
      ok: false;
      error?: string;
    };

type CreateTokenAction = (
  state: CreateTokenState,
  formData: FormData,
) => Promise<CreateTokenState>;

export function TokenCreationForm({ action }: { action: CreateTokenAction }) {
  const [state, formAction, isPending] = useActionState(action, { ok: false });
  const [hiddenToken, setHiddenToken] = useState<string | null>(null);
  const isTokenHidden = state.ok && hiddenToken === state.token;

  return (
    <div className="mt-6">
      {!state.ok && state.error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Token action failed: {state.error.replace(/_/g, ' ')}
        </div>
      ) : null}

      {state.ok && !isTokenHidden ? (
        <div className="mb-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
          <div className="font-semibold">New token for {state.name}</div>
          <code className="mt-2 block break-all rounded border border-teal-200 bg-white px-3 py-2 text-xs text-stone-950">
            {state.token}
          </code>
          <div className="mt-2 text-xs text-teal-900">
            This value is available only in this browser response and is not stored in plaintext.
          </div>
          <button
            className="mt-3 rounded-md border border-teal-700/30 bg-white px-3 py-2 text-sm font-semibold text-teal-900"
            onClick={() => setHiddenToken(state.token)}
            type="button"
          >
            Hide token
          </button>
        </div>
      ) : null}

      <form action={formAction} className="grid gap-4">
        <label className="grid gap-1 text-sm font-semibold text-stone-900">
          Token name
          <input
            className="rounded-md border border-stone-900/15 px-3 py-2 text-sm font-normal"
            maxLength={120}
            name="name"
            placeholder="Publishing assistant"
            required
            type="text"
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-stone-900">Scopes</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {AI_SCOPES.map((scope) => (
              <label
                className="flex items-center gap-2 rounded-md border border-stone-900/10 px-3 py-2 text-sm text-stone-800"
                key={scope}
              >
                <input name="scopes" type="checkbox" value={scope} />
                <span>{scope}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <button
            className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Creating...' : 'Create token'}
          </button>
        </div>
        <div className="text-sm font-medium text-stone-600">Format: {aiTokenPrefix}...</div>
      </form>
    </div>
  );
}
