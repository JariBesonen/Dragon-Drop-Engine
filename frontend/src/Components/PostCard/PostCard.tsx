import { useState } from "react";
import type { ApiComment, ApiPost } from "../../lib/api";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import "./PostCard.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function resolveMediaSrc(mediaUrl: string | null): string | null {
  if (!mediaUrl) {
    return null;
  }

  if (
    mediaUrl.startsWith("http://") ||
    mediaUrl.startsWith("https://") ||
    mediaUrl.startsWith("data:") ||
    mediaUrl.startsWith("blob:")
  ) {
    return mediaUrl;
  }

  return `${API_BASE_URL}${mediaUrl.startsWith("/") ? mediaUrl : `/${mediaUrl}`}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

export default function PostCard({
  post,
  hideComments = false,
}: {
  post: ApiPost;
  hideComments?: boolean;
}) {
  const { currentUser } = useAuth();
  const [isDeleted, setIsDeleted] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteMessage, setDeleteMessage] = useState<string>("");
  const [likeCount, setLikeCount] = useState<number>(post.likeCount || 0);
  const [dislikeCount, setDislikeCount] = useState<number>(
    post.dislikeCount || 0,
  );
  const [userVote, setUserVote] = useState<number | null>(
    post.userVote ?? null,
  );
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [voteMessage, setVoteMessage] = useState<string>("");
  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(false);
  const [hasLoadedComments, setHasLoadedComments] = useState<boolean>(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState<boolean>(false);
  const [commentsMessage, setCommentsMessage] = useState<string>("");
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [isCommentSubmitting, setIsCommentSubmitting] =
    useState<boolean>(false);
  const [openReplyForId, setOpenReplyForId] = useState<number | null>(null);
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState<
    Record<number, string>
  >({});
  const [isReplySubmittingForId, setIsReplySubmittingForId] = useState<
    number | null
  >(null);
  const [isCommentVotingForId, setIsCommentVotingForId] = useState<
    number | null
  >(null);
  const [isCommentDeletingForId, setIsCommentDeletingForId] = useState<
    number | null
  >(null);
  const [
    collapsedDeletedThreadByCommentId,
    setCollapsedDeletedThreadByCommentId,
  ] = useState<Record<number, boolean>>({});

  const imageSrc = resolveMediaSrc(post.imageUrl);
  const shouldRenderBody =
    post.content.trim().length > 0 && post.content !== post.title;

  async function handleDelete(): Promise<void> {
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteMessage("");
      await api.deletePost(post.id);
      setIsDeleted(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setDeleteMessage(caughtError.message);
        return;
      }

      setDeleteMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete post.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleVote(nextVote: 1 | -1): Promise<void> {
    if (!currentUser) {
      setVoteMessage("Log in to like or dislike posts.");
      return;
    }

    try {
      setIsVoting(true);
      setVoteMessage("");

      const response =
        nextVote === 1
          ? await api.likePost(post.id)
          : await api.dislikePost(post.id);

      setLikeCount(response.post.likeCount ?? 0);
      setDislikeCount(response.post.dislikeCount ?? 0);
      setUserVote(response.post.userVote ?? null);
    } catch (caughtError) {
      setVoteMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update vote.",
      );
    } finally {
      setIsVoting(false);
    }
  }

  async function loadComments(): Promise<void> {
    try {
      setIsCommentsLoading(true);
      setCommentsMessage("");
      const response = await api.getPostComments(post.id);
      setComments(response.comments);
      setHasLoadedComments(true);
    } catch (caughtError) {
      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load comments.",
      );
    } finally {
      setIsCommentsLoading(false);
    }
  }

  function addReplyToTree(
    nodes: ApiComment[],
    parentCommentId: number,
    newReply: ApiComment,
  ): ApiComment[] {
    return nodes.map((node) => {
      if (node.id === parentCommentId) {
        return {
          ...node,
          replies: [...node.replies, newReply],
        };
      }

      if (node.replies.length === 0) {
        return node;
      }

      return {
        ...node,
        replies: addReplyToTree(node.replies, parentCommentId, newReply),
      };
    });
  }

  function updateCommentInTree(
    nodes: ApiComment[],
    targetCommentId: number,
    updater: (node: ApiComment) => ApiComment,
  ): ApiComment[] {
    return nodes.map((node) => {
      if (node.id === targetCommentId) {
        return updater(node);
      }

      if (node.replies.length === 0) {
        return node;
      }

      return {
        ...node,
        replies: updateCommentInTree(node.replies, targetCommentId, updater),
      };
    });
  }

  function countNestedReplies(comment: ApiComment): number {
    return comment.replies.reduce(
      (total, reply) => total + 1 + countNestedReplies(reply),
      0,
    );
  }

  async function handleToggleComments(): Promise<void> {
    const nextOpen = !isCommentsOpen;
    setIsCommentsOpen(nextOpen);

    if (nextOpen && !hasLoadedComments) {
      await loadComments();
    }
  }

  async function handleCreateComment(): Promise<void> {
    if (!currentUser) {
      setCommentsMessage("Log in to comment.");
      return;
    }

    const content = commentDraft.trim();
    if (!content) {
      setCommentsMessage("Comment content is required.");
      return;
    }

    try {
      setIsCommentSubmitting(true);
      setCommentsMessage("");
      const response = await api.createPostComment(post.id, { content });
      setComments((current) => [response.comment, ...current]);
      setCommentDraft("");
      setHasLoadedComments(true);
      setIsCommentsOpen(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCommentsMessage(caughtError.message);
        return;
      }

      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create comment.",
      );
    } finally {
      setIsCommentSubmitting(false);
    }
  }

  async function handleCreateReply(parentCommentId: number): Promise<void> {
    if (!currentUser) {
      setCommentsMessage("Log in to reply.");
      return;
    }

    const content = (replyDraftByCommentId[parentCommentId] || "").trim();
    if (!content) {
      setCommentsMessage("Reply content is required.");
      return;
    }

    try {
      setIsReplySubmittingForId(parentCommentId);
      setCommentsMessage("");
      const response = await api.createPostComment(post.id, {
        content,
        parentCommentId,
      });
      setComments((current) =>
        addReplyToTree(current, parentCommentId, response.comment),
      );
      setReplyDraftByCommentId((current) => ({
        ...current,
        [parentCommentId]: "",
      }));
      setOpenReplyForId(null);
      setHasLoadedComments(true);
      setIsCommentsOpen(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCommentsMessage(caughtError.message);
        return;
      }

      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create reply.",
      );
    } finally {
      setIsReplySubmittingForId(null);
    }
  }

  async function handleCommentVote(
    commentId: number,
    nextVote: 1 | -1,
  ): Promise<void> {
    if (!currentUser) {
      setCommentsMessage("Log in to like or dislike comments.");
      return;
    }

    try {
      setIsCommentVotingForId(commentId);
      setCommentsMessage("");

      const response =
        nextVote === 1
          ? await api.likeComment(post.id, commentId)
          : await api.dislikeComment(post.id, commentId);

      setComments((current) =>
        updateCommentInTree(current, commentId, (node) => ({
          ...node,
          likeCount: response.comment.likeCount,
          dislikeCount: response.comment.dislikeCount,
          userVote: response.comment.userVote,
        })),
      );
    } catch (caughtError) {
      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update comment vote.",
      );
    } finally {
      setIsCommentVotingForId(null);
    }
  }

  async function handleDeleteComment(commentId: number): Promise<void> {
    if (!currentUser) {
      setCommentsMessage("Log in to delete comments.");
      return;
    }

    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) {
      return;
    }

    try {
      setIsCommentDeletingForId(commentId);
      setCommentsMessage("");
      const response = await api.deleteComment(post.id, commentId);
      setComments((current) =>
        updateCommentInTree(current, commentId, (node) => ({
          ...node,
          content: response.comment.content,
          isDeleted: response.comment.isDeleted,
          userVote: response.comment.userVote,
          likeCount: response.comment.likeCount,
          dislikeCount: response.comment.dislikeCount,
        })),
      );

      setReplyDraftByCommentId((current) => {
        const updated = { ...current };
        delete updated[commentId];
        return updated;
      });

      if (openReplyForId === commentId) {
        setOpenReplyForId(null);
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCommentsMessage(caughtError.message);
        return;
      }

      setCommentsMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete comment.",
      );
    } finally {
      setIsCommentDeletingForId(null);
    }
  }

  function renderComments(commentList: ApiComment[], depth = 0) {
    return commentList.map((comment) => {
      const replyDraft = replyDraftByCommentId[comment.id] || "";
      const isDeletedComment = comment.isDeleted;
      const nestedReplyCount = countNestedReplies(comment);
      const hasReplies = comment.replies.length > 0;
      const shouldDefaultCollapse = isDeletedComment && nestedReplyCount >= 3;
      const hasCollapsePreference =
        collapsedDeletedThreadByCommentId[comment.id] !== undefined;
      const isThreadCollapsed = hasCollapsePreference
        ? collapsedDeletedThreadByCommentId[comment.id]
        : shouldDefaultCollapse;

      return (
        <div
          key={comment.id}
          className="post-card-comment"
          style={{ marginLeft: `${Math.min(depth, 3) * 1.05}rem` }}
        >
          <div className="post-card-comment-meta">
            <span>
              {isDeletedComment ? "[deleted]" : `@${comment.authorUsername}`}
            </span>
            <div className="post-card-comment-meta-actions">
              <small>{formatDate(comment.createdAt)}</small>
              {currentUser?.id === comment.userId && !isDeletedComment ? (
                <button
                  type="button"
                  className="post-card-comment-delete-button"
                  onClick={() => {
                    void handleDeleteComment(comment.id);
                  }}
                  disabled={isCommentDeletingForId === comment.id}
                >
                  {isCommentDeletingForId === comment.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              ) : null}
            </div>
          </div>
          <p className={isDeletedComment ? "post-card-comment-deleted" : ""}>
            {isDeletedComment ? "Comment deleted" : comment.content}
          </p>
          {!isDeletedComment ? (
            <button
              type="button"
              className="post-card-comment-reply-button"
              onClick={() => {
                setOpenReplyForId((current) =>
                  current === comment.id ? null : comment.id,
                );
              }}
              disabled={!currentUser}
            >
              Reply
            </button>
          ) : null}

          {isDeletedComment && hasReplies ? (
            <button
              type="button"
              className="post-card-deleted-thread-toggle"
              onClick={() => {
                setCollapsedDeletedThreadByCommentId((current) => ({
                  ...current,
                  [comment.id]: !isThreadCollapsed,
                }));
              }}
            >
              {isThreadCollapsed
                ? `Show thread (${nestedReplyCount} replies)`
                : "Hide thread"}
            </button>
          ) : null}

          {!isDeletedComment ? (
            <div className="post-card-comment-vote-row">
              <button
                type="button"
                className={`post-card-comment-vote-button ${comment.userVote === 1 ? "active" : ""}`}
                onClick={() => {
                  void handleCommentVote(comment.id, 1);
                }}
                disabled={!currentUser || isCommentVotingForId === comment.id}
                aria-pressed={comment.userVote === 1}
              >
                Like <span>{comment.likeCount}</span>
              </button>
              <button
                type="button"
                className={`post-card-comment-vote-button ${comment.userVote === -1 ? "active" : ""}`}
                onClick={() => {
                  void handleCommentVote(comment.id, -1);
                }}
                disabled={!currentUser || isCommentVotingForId === comment.id}
                aria-pressed={comment.userVote === -1}
              >
                Dislike <span>{comment.dislikeCount}</span>
              </button>
            </div>
          ) : null}

          {openReplyForId === comment.id ? (
            <div className="post-card-reply-form">
              <textarea
                rows={2}
                value={replyDraft}
                placeholder="Write a reply"
                onChange={(event) => {
                  setReplyDraftByCommentId((current) => ({
                    ...current,
                    [comment.id]: event.target.value,
                  }));
                }}
              />
              <button
                type="button"
                onClick={() => {
                  void handleCreateReply(comment.id);
                }}
                disabled={isReplySubmittingForId === comment.id}
              >
                {isReplySubmittingForId === comment.id
                  ? "Replying..."
                  : "Reply"}
              </button>
            </div>
          ) : null}

          {hasReplies && !isThreadCollapsed
            ? renderComments(comment.replies, depth + 1)
            : null}
        </div>
      );
    });
  }

  if (isDeleted) {
    return null;
  }

  return (
    <article className="post-card">
      <header className="post-card-header">
        <span>c/{post.community}</span>
        <div className="post-card-meta-actions">
          <span className="post-card-author">@{post.authorUsername}</span>
          {currentUser?.id === post.userId ? (
            <button
              type="button"
              className="post-card-delete-button"
              onClick={() => {
                void handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </header>
      <h3>{post.title}</h3>
      {imageSrc ? (
        <img className="post-card-image" src={imageSrc} alt={post.title} />
      ) : null}
      {shouldRenderBody ? <p>{post.content}</p> : null}
      <div className="post-card-vote-row">
        <button
          type="button"
          className={`post-card-vote-button ${userVote === 1 ? "active" : ""}`}
          onClick={() => {
            void handleVote(1);
          }}
          disabled={!currentUser || isVoting}
          aria-pressed={userVote === 1}
        >
          Like <span>{likeCount}</span>
        </button>
        <button
          type="button"
          className={`post-card-vote-button ${userVote === -1 ? "active" : ""}`}
          onClick={() => {
            void handleVote(-1);
          }}
          disabled={!currentUser || isVoting}
          aria-pressed={userVote === -1}
        >
          Dislike <span>{dislikeCount}</span>
        </button>
        {hideComments ? null : (
          <button
            type="button"
            className="post-card-comment-toggle"
            onClick={() => {
              void handleToggleComments();
            }}
          >
            {isCommentsOpen ? "Hide Comments" : "Show Comments"}
          </button>
        )}
      </div>

      {hideComments ? null : (
        <>
          <div className="post-card-comment-form">
            <textarea
              rows={2}
              value={commentDraft}
              placeholder={
                currentUser ? "Write a comment" : "Log in to comment"
              }
              onChange={(event) => {
                setCommentDraft(event.target.value);
              }}
              disabled={!currentUser || isCommentSubmitting}
            />
            <button
              type="button"
              onClick={() => {
                void handleCreateComment();
              }}
              disabled={!currentUser || isCommentSubmitting}
            >
              {isCommentSubmitting ? "Posting..." : "Comment"}
            </button>
          </div>

          {isCommentsOpen ? (
            <section className="post-card-comments-section">
              {isCommentsLoading ? <p>Loading comments...</p> : null}
              {!isCommentsLoading && comments.length === 0 ? (
                <p>Be the first to comment.</p>
              ) : null}
              {!isCommentsLoading ? renderComments(comments) : null}
            </section>
          ) : null}
        </>
      )}

      <small>{formatDate(post.createdAt)}</small>
      {deleteMessage ? (
        <p className="post-card-delete-message">{deleteMessage}</p>
      ) : null}
      {voteMessage ? (
        <p className="post-card-vote-message">{voteMessage}</p>
      ) : null}
      {commentsMessage ? (
        <p className="post-card-comment-message">{commentsMessage}</p>
      ) : null}
    </article>
  );
}
