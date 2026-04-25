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

  it('pushes the Prisma schema before starting the production server', () => {
    const metadata = packageJson as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(metadata.scripts?.start).toBe('prisma db push && next start');
    expect(metadata.dependencies?.prisma).toBeDefined();
    expect(metadata.devDependencies?.prisma).toBeUndefined();
  });
});
