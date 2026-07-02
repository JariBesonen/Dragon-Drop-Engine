import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ApiError,
  api,
  type ApiPost,
  type ApiProfileComment,
  type ApiProfileView,
} from "../../lib/api";
import "./Profile.css";

type ProfileTab = "overview" | "posts" | "comments" | "saved";

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

function formatAccountAge(createdAt: string): string {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) {
    return "Unknown";
  }

  const diffInDays = Math.max(
    0,
    Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)),
  );

  if (diffInDays < 1) {
    return "Today";
  }

  if (diffInDays < 30) {
    return `${diffInDays} d`;
  }

  if (diffInDays < 365) {
    return `${Math.floor(diffInDays / 30)} mo`;
  }

  return `${Math.floor(diffInDays / 365)} y`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<ApiProfileView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [error, setError] = useState<string>("");
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState<boolean>(false);

  const resolvedUsername = username ?? currentUser?.username ?? "";

  const overviewItems = useMemo(() => {
    if (!profile) {
      return [] as Array<
        | { kind: "post"; createdAt: string; post: ApiPost }
        | {
            kind: "comment";
            createdAt: string;
            comment: ApiProfileComment;
          }
      >;
    }

    const postItems = profile.posts.map((post) => ({
      kind: "post" as const,
      createdAt: post.createdAt,
      post,
    }));

    const commentItems = profile.comments.map((comment) => ({
      kind: "comment" as const,
      createdAt: comment.createdAt,
      comment,
    }));

    return [...postItems, ...commentItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [profile]);

  useEffect(() => {
    async function loadProfile(): Promise<void> {
      if (!resolvedUsername) {
        setProfile(null);
        setFollowerCount(0);
        setIsFollowing(false);
        setError("");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await api.getProfileByUsername(resolvedUsername);
        setProfile(response);
        setFollowerCount(response.followerCount);
        setIsFollowing(response.isFollowing);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load profile.",
        );
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [resolvedUsername]);

  async function handleFollowToggle(): Promise<void> {
    if (!profile || !currentUser) {
      return;
    }

    if (profile.user.id === currentUser.id) {
      return;
    }

    try {
      setIsFollowSubmitting(true);
      setError("");
      const response = isFollowing
        ? await api.unfollowUser(profile.user.username)
        : await api.followUser(profile.user.username);

      setFollowerCount(response.followerCount);
      setIsFollowing(response.isFollowing);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update follow status.",
        );
      }
    } finally {
      setIsFollowSubmitting(false);
    }
  }

  function renderCommentItem(comment: ApiProfileComment) {
    return (
      <Link
        key={comment.id}
        to={`/posts/${comment.postId}#comment-${comment.id}`}
        className="profile-comment-card profile-link-card"
      >
        <header>
          <p className="profile-comment-community">c/{comment.postCommunity}</p>
          <p className="profile-comment-meta">
            {formatDate(comment.createdAt)}
          </p>
        </header>
        <h4>{comment.postTitle}</h4>
        <p className={comment.isDeleted ? "profile-comment-deleted" : ""}>
          {comment.isDeleted ? "Comment deleted" : comment.content}
        </p>
      </Link>
    );
  }

  if (!resolvedUsername && !currentUser) {
    return (
      <main className="profile-page">
        <section className="profile-shell">
          <p className="profile-note">Login to view profiles.</p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="profile-page">
        <section className="profile-shell">
          <p className="profile-note">Loading profile...</p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-page">
        <section className="profile-shell">
          <p className="profile-error">{error || "Profile not found."}</p>
        </section>
      </main>
    );
  }

  const isOwnProfile = currentUser?.id === profile.user.id;

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <header className="profile-header">
          <h2>{profile.user.displayName}</h2>
          <p>@{profile.user.username}</p>
        </header>

        <nav className="profile-tabs" aria-label="Profile sections">
          <button
            type="button"
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => {
              setActiveTab("overview");
            }}
          >
            Overview
          </button>
          <button
            type="button"
            className={activeTab === "posts" ? "active" : ""}
            onClick={() => {
              setActiveTab("posts");
            }}
          >
            Posts
          </button>
          <button
            type="button"
            className={activeTab === "comments" ? "active" : ""}
            onClick={() => {
              setActiveTab("comments");
            }}
          >
            Comments
          </button>
          <button
            type="button"
            className={activeTab === "saved" ? "active" : ""}
            onClick={() => {
              setActiveTab("saved");
            }}
          >
            Saved Posts
          </button>
        </nav>

        <div className="profile-content-grid">
          <section className="profile-main-column">
            {activeTab === "overview" ? (
              <div className="profile-feed-list">
                {overviewItems.length === 0 ? (
                  <p className="profile-note">No activity yet.</p>
                ) : null}
                {overviewItems.map((item) =>
                  item.kind === "post" ? (
                    (() => {
                      const imageSrc = resolveMediaSrc(item.post.imageUrl);
                      return (
                        <Link
                          key={`post-${item.post.id}`}
                          to={`/posts/${item.post.id}`}
                          className="profile-post-link"
                        >
                          <article className="profile-post-card profile-link-card">
                            <header>
                              <p className="profile-post-community">
                                c/{item.post.community}
                              </p>
                              <p className="profile-post-meta">
                                {formatDate(item.post.createdAt)}
                              </p>
                            </header>
                            {imageSrc ? (
                              <img
                                className="profile-post-image"
                                src={imageSrc}
                                alt={item.post.title}
                              />
                            ) : null}
                            <h4>{item.post.title}</h4>
                            {item.post.content ? (
                              <p>{item.post.content}</p>
                            ) : null}
                          </article>
                        </Link>
                      );
                    })()
                  ) : (
                    <div key={`comment-${item.comment.id}`}>
                      {renderCommentItem(item.comment)}
                    </div>
                  ),
                )}
              </div>
            ) : null}

            {activeTab === "posts" ? (
              <div className="profile-feed-list">
                {profile.posts.length === 0 ? (
                  <p className="profile-note">No posts yet.</p>
                ) : null}
                {profile.posts.map((post) =>
                  (() => {
                    const imageSrc = resolveMediaSrc(post.imageUrl);
                    return (
                      <Link
                        key={post.id}
                        to={`/posts/${post.id}`}
                        className="profile-post-link"
                      >
                        <article className="profile-post-card profile-link-card">
                          <header>
                            <p className="profile-post-community">
                              c/{post.community}
                            </p>
                            <p className="profile-post-meta">
                              {formatDate(post.createdAt)}
                            </p>
                          </header>
                          {imageSrc ? (
                            <img
                              className="profile-post-image"
                              src={imageSrc}
                              alt={post.title}
                            />
                          ) : null}
                          <h4>{post.title}</h4>
                          {post.content ? <p>{post.content}</p> : null}
                        </article>
                      </Link>
                    );
                  })(),
                )}
              </div>
            ) : null}

            {activeTab === "comments" ? (
              <div className="profile-feed-list">
                {profile.comments.length === 0 ? (
                  <p className="profile-note">No top-level comments yet.</p>
                ) : null}
                {profile.comments.map((comment) => renderCommentItem(comment))}
              </div>
            ) : null}

            {activeTab === "saved" ? (
              <article className="profile-placeholder-card">
                <h3>Saved Posts</h3>
                <p>
                  Saved posts are coming soon. You will be able to bookmark
                  posts and find them here.
                </p>
              </article>
            ) : null}
          </section>

          <aside className="profile-sidebar">
            <article className="profile-sidebar-card">
              <h3>@{profile.user.username}</h3>
              {!isOwnProfile && currentUser ? (
                <button
                  type="button"
                  className="profile-follow-button"
                  onClick={() => {
                    void handleFollowToggle();
                  }}
                  disabled={isFollowSubmitting}
                >
                  {isFollowSubmitting
                    ? "Updating..."
                    : isFollowing
                      ? "Unfollow"
                      : "Follow"}
                </button>
              ) : null}
              <p className="profile-stat-line">{followerCount} followers</p>
              <p className="profile-bio">{profile.user.bio || "No bio yet."}</p>
              <div className="profile-sidebar-meta">
                <p>
                  <span>Account age</span>
                  <strong>{formatAccountAge(profile.user.createdAt)}</strong>
                </p>
              </div>

              <div className="profile-owned-hives">
                <h4>Owned Hives</h4>
                {profile.ownedHives.length === 0 ? (
                  <p className="profile-note">No owned hives yet.</p>
                ) : (
                  <ul>
                    {profile.ownedHives.map((hive) => (
                      <li key={hive.id}>
                        <Link to={`/hive/${hive.id}`}>c/{hive.name}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </aside>
        </div>

        {error ? <p className="profile-error">{error}</p> : null}
      </section>
    </main>
  );
}
