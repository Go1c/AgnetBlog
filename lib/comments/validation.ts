export const COMMENT_BODY_MAX_LENGTH = 1000;
export const COMMENT_DISPLAY_NAME_MAX_LENGTH = 32;

export type ValidatedCommentInput = {
  contentItemId: string | null;
  targetKey: string | null;
  body: string;
  displayName: string | null;
};

export type CommentValidationResult =
  | {
      ok: true;
      data: ValidatedCommentInput;
    }
  | {
      ok: false;
      error:
        | 'content_item_required'
        | 'comment_target_required'
        | 'body_required'
        | 'body_too_long'
        | 'display_name_too_long';
    };

export function validateCommentInput(input: {
  contentItemId?: unknown;
  targetKey?: unknown;
  body?: unknown;
  displayName?: unknown;
}): CommentValidationResult {
  const contentItemId = typeof input.contentItemId === 'string' ? input.contentItemId.trim() : '';
  const targetKey = typeof input.targetKey === 'string' ? input.targetKey.trim() : '';
  if (!contentItemId && !targetKey) {
    return {
      ok: false,
      error: 'comment_target_required',
    };
  }

  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body) {
    return {
      ok: false,
      error: 'body_required',
    };
  }

  if (body.length > COMMENT_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: 'body_too_long',
    };
  }

  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
  if (displayName.length > COMMENT_DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: 'display_name_too_long',
    };
  }

  return {
    ok: true,
    data: {
      contentItemId: contentItemId || null,
      targetKey: targetKey || null,
      body,
      displayName: displayName || null,
    },
  };
}
