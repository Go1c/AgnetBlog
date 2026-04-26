import { getAdminAuthState } from '@/lib/auth/admin';
import { listContentComments } from '@/lib/db/comment-repository';
import { CommentStatus } from '@/lib/generated/prisma/client';

type CommentSectionProps = {
  contentItemId?: string;
  returnTo?: string;
  shareToken?: string;
  targetKey?: string;
};

export async function CommentSection({
  contentItemId,
  returnTo,
  shareToken,
  targetKey,
}: CommentSectionProps) {
  const [comments, authState] = await Promise.all([
    listContentComments(
      contentItemId ? { contentItemId } : { targetKey: targetKey ?? '' },
    ),
    getAdminAuthState(),
  ]);
  const activeComments = comments.filter((comment) => comment.status === CommentStatus.ACTIVE);
  const canDelete = authState.authorized;

  return (
    <section className="mt-12 border-t border-stone-900/10 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-950">评论</h2>
          <p className="mt-1 text-sm text-stone-500">{activeComments.length} 条讨论</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {activeComments.length > 0 ? (
          activeComments.map((comment) => {
            const displayName = getDisplayName(comment.displayName);

            return (
              <article
                className="flex gap-3 rounded-lg border border-stone-900/10 bg-white p-4 shadow-sm"
                key={comment.id}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white">
                  {getAvatarInitial(displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-semibold text-stone-950">{displayName}</h3>
                    <time
                      className="text-xs text-stone-500"
                      dateTime={comment.createdAt.toISOString()}
                    >
                      {formatCommentTime(comment.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
                    {comment.body}
                  </p>
                </div>

                {canDelete ? (
                  <form
                    action={`/api/admin/comments/${encodeURIComponent(comment.id)}/delete`}
                    method="post"
                  >
                    {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
                    <button
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-50"
                      type="submit"
                    >
                      删除
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-stone-900/15 bg-stone-50 px-4 py-5 text-sm text-stone-500">
            暂无评论
          </p>
        )}
      </div>

      <form
        action="/api/comments"
        className="mt-6 rounded-lg border border-stone-900/10 bg-white p-4 shadow-sm"
        method="post"
      >
        {contentItemId ? <input name="contentItemId" type="hidden" value={contentItemId} /> : null}
        {targetKey ? <input name="targetKey" type="hidden" value={targetKey} /> : null}
        {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
        {shareToken ? <input name="shareToken" type="hidden" value={shareToken} /> : null}

        <label className="block text-sm font-medium text-stone-700">
          昵称
          <input
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400"
            maxLength={32}
            name="displayName"
            placeholder="匿名"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-stone-700">
          评论
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm leading-6 text-stone-900 placeholder:text-stone-400"
            maxLength={1000}
            name="body"
            placeholder="写下你的想法"
            required
          />
        </label>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            type="submit"
          >
            发布评论
          </button>
        </div>
      </form>
    </section>
  );
}

function getDisplayName(displayName: string | null) {
  return displayName?.trim() || '匿名';
}

function getAvatarInitial(displayName: string) {
  return displayName.trim().slice(0, 1) || '匿';
}

function formatCommentTime(value: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}
