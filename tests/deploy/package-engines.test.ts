import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';

describe('deployment package metadata', () => {
  it('declares Node and npm engines for auto-detected hosting builds', () => {
    const metadata = packageJson as {
      engines?: {
        node?: string;
        npm?: string;
      };
    };

    expect(metadata.engines).toEqual({
      node: '>=20.9.0',
      npm: '>=10',
    });
  });
});
