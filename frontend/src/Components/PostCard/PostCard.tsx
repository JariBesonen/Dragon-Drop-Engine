import { useState } from "react";
import type { ApiPost } from "../../lib/api";
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

export default function PostCard({ post }: { post: ApiPost }) {
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
      </div>
      <small>{formatDate(post.createdAt)}</small>
      {deleteMessage ? (
        <p className="post-card-delete-message">{deleteMessage}</p>
      ) : null}
      {voteMessage ? (
        <p className="post-card-vote-message">{voteMessage}</p>
      ) : null}
    </article>
  );
}
