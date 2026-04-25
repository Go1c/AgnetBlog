export type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
};

export type GitHubClientErrorCode =
  | 'missing_config'
  | 'not_found'
  | 'unauthorized'
  | 'rate_limited'
  | 'github_error'
  | 'network_error'
  | 'decode_error';

export type GitHubClientError = {
  code: GitHubClientErrorCode;
  message: string;
  status?: number;
};

export type GitHubResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: GitHubClientError;
    };

export type GitHubCompareFile = {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'changed' | string;
  sha?: string;
  previousFilename?: string;
};

export type GitHubCompareResult = {
  baseCommit: string;
  headCommit: string;
  filesComplete: boolean;
  incompleteReason?: string;
  files: GitHubCompareFile[];
};

export type GitHubTreeItem = {
  path: string;
  type: 'blob' | 'tree' | string;
  sha: string;
  size?: number;
};

export function getGitHubConfigFromEnv(): GitHubResult<GitHubConfig> {
  const owner = process.env.GITHUB_NOTES_OWNER?.trim();
  const repo = process.env.GITHUB_NOTES_REPO?.trim();
  const branch = process.env.GITHUB_NOTES_BRANCH?.trim() || 'main';
  const token = process.env.GITHUB_WRITE_TOKEN?.trim();

  const missing = [
    ['GITHUB_NOTES_OWNER', owner],
    ['GITHUB_NOTES_REPO', repo],
    ['GITHUB_WRITE_TOKEN', token],
  ].filter(([, value]) => !value);

  if (missing.length > 0 || !owner || !repo || !token) {
    return {
      ok: false,
      error: {
        code: 'missing_config',
        message: `Missing GitHub sync configuration: ${missing
          .map(([name]) => name)
          .join(', ')}.`,
      },
    };
  }

  return {
    ok: true,
    data: {
      owner,
      repo,
      branch,
      token,
    },
  };
}

export function getConfiguredGitHubBranch() {
  return process.env.GITHUB_NOTES_BRANCH?.trim() || 'main';
}

export async function compareCommits(
  base: string,
  head: string,
  configResult = getGitHubConfigFromEnv(),
): Promise<GitHubResult<GitHubCompareResult>> {
  if (!configResult.ok) {
    return configResult;
  }

  const config = configResult.data;
  const response = await githubFetch(
    config,
    `/repos/${config.owner}/${config.repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
  );

  if (!response.ok) {
    return response;
  }

  const data = response.data as {
    base_commit?: { sha?: string };
    merge_base_commit?: { sha?: string };
    commits?: Array<{ sha?: string }>;
    files?: Array<{
      filename?: string;
      status?: string;
      sha?: string;
      previous_filename?: string;
    }>;
  };

  const rawFiles = Array.isArray(data.files) ? data.files : undefined;
  const files = (rawFiles ?? [])
    .filter((file) => typeof file.filename === 'string')
    .map((file) => ({
      filename: file.filename as string,
      status: file.status ?? 'changed',
      sha: file.sha,
      previousFilename: file.previous_filename,
    }));
  const filesComplete = rawFiles !== undefined && rawFiles.length < 300;

  return {
    ok: true,
    data: {
      baseCommit: data.base_commit?.sha ?? data.merge_base_commit?.sha ?? base,
      headCommit: data.commits?.at(-1)?.sha ?? head,
      filesComplete,
      incompleteReason: filesComplete
        ? undefined
        : rawFiles
          ? 'GitHub compare returned the maximum file list size.'
          : 'GitHub compare did not include a file list.',
      files,
    },
  };
}

export async function fetchFileContent(
  path: string,
  ref?: string,
  configResult = getGitHubConfigFromEnv(),
): Promise<GitHubResult<string>> {
  if (!configResult.ok) {
    return configResult;
  }

  const config = configResult.data;
  const query = new URLSearchParams({ ref: ref ?? config.branch });
  const response = await githubFetch(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodePath(path)}?${query.toString()}`,
    { accept: 'application/vnd.github.raw+json' },
  );

  if (!response.ok) {
    return response;
  }

  if (typeof response.data === 'string') {
    return {
      ok: true,
      data: response.data,
    };
  }

  const file = response.data as { content?: string; encoding?: string };
  if (file.encoding === 'base64' && typeof file.content === 'string') {
    return {
      ok: true,
      data: Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8'),
    };
  }

  return {
    ok: false,
    error: {
      code: 'decode_error',
      message: `Unable to decode GitHub file content for ${path}.`,
    },
  };
}

export async function listRepoTree(
  ref?: string,
  configResult = getGitHubConfigFromEnv(),
): Promise<GitHubResult<GitHubTreeItem[]>> {
  if (!configResult.ok) {
    return configResult;
  }

  const config = configResult.data;
  const response = await githubFetch(
    config,
    `/repos/${config.owner}/${config.repo}/git/trees/${encodeURIComponent(ref ?? config.branch)}?recursive=1`,
  );

  if (!response.ok) {
    return response;
  }

  const data = response.data as {
    tree?: Array<{ path?: string; type?: string; sha?: string; size?: number }>;
  };

  return {
    ok: true,
    data: (data.tree ?? [])
      .filter((item) => typeof item.path === 'string' && typeof item.sha === 'string')
      .map((item) => ({
        path: item.path as string,
        type: item.type ?? 'blob',
        sha: item.sha as string,
        size: item.size,
      })),
  };
}

async function githubFetch(
  config: GitHubConfig,
  path: string,
  options: { accept?: string } = {},
): Promise<GitHubResult<unknown>> {
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: options.accept ?? 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'User-Agent': 'agnet-blog-sync',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: mapGitHubStatus(response.status),
          message: `GitHub API request failed with status ${response.status}.`,
          status: response.status,
        },
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return {
        ok: true,
        data: await response.json(),
      };
    }

    return {
      ok: true,
      data: await response.text(),
    };
  } catch {
    return {
      ok: false,
      error: {
        code: 'network_error',
        message: 'GitHub API request could not be completed.',
      },
    };
  }
}

function mapGitHubStatus(status: number): GitHubClientErrorCode {
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
