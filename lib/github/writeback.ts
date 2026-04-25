import {
  patchMarkdownFrontmatter,
  type FrontmatterPatchResult,
} from '@/lib/content/frontmatter-patch';
import { getGitHubConfigFromEnv, type GitHubConfig } from '@/lib/github/client';

export type GitHubWritebackErrorCode =
  | 'missing_config'
  | 'not_found'
  | 'unauthorized'
  | 'rate_limited'
  | 'conflict'
  | 'github_error'
  | 'network_error'
  | 'decode_error'
  | 'validation_error';

export type GitHubWritebackError = {
  code: GitHubWritebackErrorCode;
  message: string;
  status?: number;
  details?: unknown;
};

export type GitHubWritebackResult =
  | {
      ok: true;
      path: string;
      branch: string;
      fileShaBefore: string;
      fileShaAfter?: string;
      commitSha: string;
      parentCommitSha?: string;
      patch: Extract<FrontmatterPatchResult, { ok: true }>;
    }
  | {
      ok: false;
      error: GitHubWritebackError;
    };

type GitHubFilePayload = {
  content?: string;
  encoding?: string;
  sha?: string;
  type?: string;
};

type GitHubUpdatePayload = {
  content?: {
    sha?: string;
  };
  commit?: {
    sha?: string;
    parents?: Array<{ sha?: string }>;
  };
};

export async function writebackFrontmatterPatch(options: {
  path: string;
  patch: Record<string, unknown>;
  actorId: string;
  contentId: string;
  relativePath?: string;
}): Promise<GitHubWritebackResult> {
  const configResult = getGitHubConfigFromEnv();
  if (!configResult.ok) {
    return {
      ok: false,
      error: {
        code: configResult.error.code,
        message: configResult.error.message,
        status: configResult.error.status,
      },
    };
  }

  const config = configResult.data;
  const current = await fetchCurrentFile(config, options.path);
  if (!current.ok) {
    return current;
  }

  const patched = patchMarkdownFrontmatter({
    markdown: current.data.content,
    patch: options.patch,
    sourcePath: options.path,
    relativePath: options.relativePath,
  });

  if (!patched.ok) {
    return {
      ok: false,
      error: {
        code: 'validation_error',
        message: patched.error,
        details: {
          issues: patched.issues,
          unknownFields: patched.unknownFields,
        },
      },
    };
  }

  const updated = await updateFile(config, {
    path: options.path,
    content: patched.markdown,
    sha: current.data.sha,
    message: `chore(content): update metadata for ${options.contentId} by ${options.actorId}`,
  });
  if (!updated.ok) {
    return updated;
  }

  return {
    ok: true,
    path: options.path,
    branch: config.branch,
    fileShaBefore: current.data.sha,
    fileShaAfter: updated.data.fileSha,
    commitSha: updated.data.commitSha,
    parentCommitSha: updated.data.parentCommitSha,
    patch: patched,
  };
}

async function fetchCurrentFile(
  config: GitHubConfig,
  path: string,
): Promise<
  | { ok: true; data: { content: string; sha: string } }
  | { ok: false; error: GitHubWritebackError }
> {
  const response = await githubFetch(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodePath(path)}?${new URLSearchParams({
      ref: config.branch,
    }).toString()}`,
    'GET',
  );

  if (!response.ok) {
    return response;
  }

  const payload = response.data as GitHubFilePayload;
  if (payload.type !== 'file' || typeof payload.sha !== 'string') {
    return {
      ok: false,
      error: {
        code: 'not_found',
        message: `GitHub path is not a file: ${path}.`,
      },
    };
  }

  if (payload.encoding !== 'base64' || typeof payload.content !== 'string') {
    return {
      ok: false,
      error: {
        code: 'decode_error',
        message: `Unable to decode GitHub file content for ${path}.`,
      },
    };
  }

  return {
    ok: true,
    data: {
      content: Buffer.from(payload.content.replace(/\s/g, ''), 'base64').toString('utf8'),
      sha: payload.sha,
    },
  };
}

async function updateFile(
  config: GitHubConfig,
  options: {
    path: string;
    content: string;
    sha: string;
    message: string;
  },
): Promise<
  | { ok: true; data: { fileSha?: string; commitSha: string; parentCommitSha?: string } }
  | { ok: false; error: GitHubWritebackError }
> {
  const response = await githubFetch(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodePath(options.path)}`,
    'PUT',
    {
      message: options.message,
      content: Buffer.from(options.content, 'utf8').toString('base64'),
      sha: options.sha,
      branch: config.branch,
      committer: {
        name: 'Agnet Blog Admin',
        email: 'noreply@agnet-blog.local',
      },
    },
  );

  if (!response.ok) {
    return response;
  }

  const payload = response.data as GitHubUpdatePayload;
  const commitSha = payload.commit?.sha;
  if (!commitSha) {
    return {
      ok: false,
      error: {
        code: 'github_error',
        message: 'GitHub writeback completed without a commit SHA.',
      },
    };
  }

  return {
    ok: true,
    data: {
      fileSha: payload.content?.sha,
      commitSha,
      parentCommitSha: payload.commit?.parents?.[0]?.sha,
    },
  };
}

async function githubFetch(
  config: GitHubConfig,
  path: string,
  method: 'GET' | 'PUT',
  body?: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; error: GitHubWritebackError }> {
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'agnet-blog-writeback',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: mapGitHubStatus(response.status),
          message:
            response.status === 409
              ? 'GitHub rejected the write because the file changed upstream. Reload and retry.'
              : `GitHub writeback request failed with status ${response.status}.`,
          status: response.status,
        },
      };
    }

    return {
      ok: true,
      data: (await response.json()) as unknown,
    };
  } catch {
    return {
      ok: false,
      error: {
        code: 'network_error',
        message: 'GitHub writeback request could not be completed.',
      },
    };
  }
}

function mapGitHubStatus(status: number): GitHubWritebackErrorCode {
  if (status === 409) {
    return 'conflict';
  }

  if (status === 401 || status === 403) {
    return status === 403 ? 'rate_limited' : 'unauthorized';
  }

  if (status === 404) {
    return 'not_found';
  }

  return 'github_error';
}

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}
