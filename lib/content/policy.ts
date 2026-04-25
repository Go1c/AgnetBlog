import { validateFrontmatter } from './frontmatter';
import type {
  ContentPipelineIssue,
  DirectoryPolicyInput,
  PublishFrontmatter,
} from './types';

type PolicySuccess = {
  success: true;
  metadata: PublishFrontmatter;
  policy?: DirectoryPolicyInput;
};

type PolicyFailure = {
  success: false;
  errors: ContentPipelineIssue[];
};

export type PolicyResolutionResult = PolicySuccess | PolicyFailure;

export function resolveDirectoryPolicy(
  sourcePath: string,
  policies: DirectoryPolicyInput[],
  fileMetadata: PublishFrontmatter,
): PolicyResolutionResult {
  const policy = findDirectoryPolicy(sourcePath, policies);

  if (!policy) {
    return {
      success: true,
      metadata: { ...fileMetadata },
    };
  }

  const validation = validateFrontmatter(policy.defaults);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors.map((error) => ({
        ...error,
        code: `invalid_directory_default.${error.code}`,
        path: policy.pathPrefix,
      })),
    };
  }

  return {
    success: true,
    policy,
    metadata: {
      ...validation.data,
      ...fileMetadata,
      tags: fileMetadata.tags ?? validation.data.tags,
    },
  };
}

export function findDirectoryPolicy(sourcePath: string, policies: DirectoryPolicyInput[]) {
  const normalizedSourcePath = normalizePolicyPath(sourcePath);

  return policies
    .filter((policy) => isPolicyMatch(normalizedSourcePath, policy.pathPrefix))
    .sort(
      (left, right) =>
        normalizePolicyPath(right.pathPrefix).length - normalizePolicyPath(left.pathPrefix).length,
    )[0];
}

function isPolicyMatch(sourcePath: string, pathPrefix: string) {
  const normalizedPrefix = normalizePolicyPath(pathPrefix);

  if (normalizedPrefix.length === 0) {
    return true;
  }

  return sourcePath === normalizedPrefix || sourcePath.startsWith(`${normalizedPrefix}/`);
}

function normalizePolicyPath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
