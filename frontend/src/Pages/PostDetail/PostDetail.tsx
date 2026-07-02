import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { api, type ApiComment, type ApiPost } from "../../lib/api";
import PostCard from "../../Components/PostCard/PostCard";
import "./PostDetail.css";

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

function countNestedReplies(comment: ApiComment): number {
  return comment.replies.reduce(
    (total, reply) => total + 1 + countNestedReplies(reply),
    0,
  );
}

function renderCommentNodes(comments: ApiComment[]): React.ReactNode {
  return comments.map((comment) => {
    const nestedCount = countNestedReplies(comment);
    return (
      <article
        key={comment.id}
        id={`comment-${comment.id}`}
        className="post-detail-comment"
      >
        <header className="post-detail-comment-header">
          <span>@{comment.authorUsername}</span>
          <small>{formatDate(comment.createdAt)}</small>
        </header>
        <p className={comment.isDeleted ? "post-detail-comment-deleted" : ""}>
          {comment.isDeleted ? "Comment deleted" : comment.content}
        </p>
        {comment.replies.length > 0 ? (
          <div className="post-detail-comment-children">
            {renderCommentNodes(comment.replies)}
          </div>
        ) : null}
        {comment.isDeleted && nestedCount > 0 ? (
          <small className="post-detail-comment-thread-note">
            Replies preserved in thread
          </small>
        ) : null}
      </article>
    );
  });
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [post, setPost] = useState<ApiPost | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const postId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    async function loadDetail(): Promise<void> {
      if (!Number.isInteger(postId) || postId <= 0) {
        setError("Invalid post id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const [postResponse, commentsResponse] = await Promise.all([
          api.getPostById(postId),
          api.getPostComments(postId),
        ]);

        setPost(postResponse.post);
        setComments(commentsResponse.comments);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load post.",
        );
        setPost(null);
      } finally {
        setLoading(false);
      }
    }

    void loadDetail();
  }, [postId]);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) {
      return;
    }

    const element = document.getElementById(hash);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash, comments]);

  if (loading) {
    return (
      <main className="post-detail-page">
        <section className="post-detail-shell">
          <p className="post-detail-note">Loading post...</p>
        </section>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="post-detail-page">
        <section className="post-detail-shell">
          <Link to="/" className="post-detail-back-link">
            Back
          </Link>
          <p className="post-detail-error">{error || "Post not found."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="post-detail-page">
      <section className="post-detail-shell">
        <Link to="/" className="post-detail-back-link">
          Back
        </Link>

        <PostCard post={post} hideComments />

        <section className="post-detail-comments">
          <h3>Comments</h3>
          {comments.length === 0 ? (
            <p className="post-detail-note">No comments yet.</p>
          ) : (
            renderCommentNodes(comments)
          )}
        </section>
      </section>
    </main>
  );
}
