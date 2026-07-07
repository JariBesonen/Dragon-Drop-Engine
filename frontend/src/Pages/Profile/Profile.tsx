import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ApiError,
  api,
  type ApiFollowRequest,
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
  const { currentUser, refreshMe } = useAuth();
  const [profile, setProfile] = useState<ApiProfileView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [error, setError] = useState<string>("");
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followRequestStatus, setFollowRequestStatus] = useState<
    "none" | "pending" | "accepted"
  >("none");
  const [isFollowSubmitting, setIsFollowSubmitting] = useState<boolean>(false);
  const [pendingFollowRequests, setPendingFollowRequests] = useState<
    ApiFollowRequest[]
  >([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [displayNameDraft, setDisplayNameDraft] = useState<string>("");
  const [bioDraft, setBioDraft] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [editMessage, setEditMessage] = useState<string>("");
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isDeletingPostId, setIsDeletingPostId] = useState<number | null>(null);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<number | null>(
    null,
  );
  const [savedPosts, setSavedPosts] = useState<ApiPost[]>([]);
  const [savedPostsLoading, setSavedPostsLoading] = useState<boolean>(false);
  const [savedPostsError, setSavedPostsError] = useState<string>("");

  const resolvedUsername = username ?? currentUser?.username ?? "";

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
      setFollowRequestStatus(response.followRequestStatus || "none");
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
    void loadProfile();
  }, [resolvedUsername]);

  useEffect(() => {
    if (!profile || currentUser?.id !== profile.user.id) {
      return;
    }

    setDisplayNameDraft(profile.user.displayName);
    setBioDraft(profile.user.bio || "");
  }, [profile, currentUser?.id]);

  useEffect(() => {
    if (!profile || !currentUser) {
      setPendingFollowRequests([]);
      return;
    }

    const isOwnPrivateProfile =
      currentUser.id === profile.user.id && profile.user.isPrivate;

    if (!isOwnPrivateProfile) {
      setPendingFollowRequests([]);
      return;
    }

    let isCancelled = false;

    async function loadRequests(): Promise<void> {
      try {
        setIsRequestsLoading(true);
        const response = await api.getFollowRequests();
        if (!isCancelled) {
          setPendingFollowRequests(response.requests);
        }
      } catch {
        if (!isCancelled) {
          setPendingFollowRequests([]);
        }
      } finally {
        if (!isCancelled) {
          setIsRequestsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      isCancelled = true;
    };
  }, [profile, currentUser]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (bannerPreview.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [avatarPreview, bannerPreview]);

  useEffect(() => {
    async function loadSavedPosts(): Promise<void> {
      if (activeTab !== "saved" || !currentUser) {
        setSavedPosts([]);
        setSavedPostsError("");
        return;
      }

      try {
        setSavedPostsLoading(true);
        setSavedPostsError("");
        const response = await api.getSavedPosts();
        setSavedPosts(response.posts);
      } catch (caughtError) {
        setSavedPostsError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load saved posts.",
        );
      } finally {
        setSavedPostsLoading(false);
      }
    }

    void loadSavedPosts();
  }, [activeTab, currentUser]);

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
      const response =
        isFollowing || followRequestStatus === "pending"
          ? await api.unfollowUser(profile.user.username)
          : await api.followUser(profile.user.username);

      setFollowerCount(response.followerCount);
      setIsFollowing(response.isFollowing);
      setFollowRequestStatus(response.requestStatus);
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

  async function handleApproveFollowRequest(requestId: number): Promise<void> {
    try {
      setError("");
      const response = await api.approveFollowRequest(requestId);
      setFollowerCount(response.followerCount);
      setPendingFollowRequests((currentRequests) =>
        currentRequests.filter((request) => request.id !== requestId),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to approve follow request.",
      );
    }
  }

  async function handleDenyFollowRequest(requestId: number): Promise<void> {
    try {
      setError("");
      await api.denyFollowRequest(requestId);
      setPendingFollowRequests((currentRequests) =>
        currentRequests.filter((request) => request.id !== requestId),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to deny follow request.",
      );
    }
  }

  function clearProfileMediaDrafts(): void {
    if (avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    if (bannerPreview.startsWith("blob:")) {
      URL.revokeObjectURL(bannerPreview);
    }

    setAvatarFile(null);
    setBannerFile(null);
    setAvatarPreview("");
    setBannerPreview("");
  }

  function closeEditModal(): void {
    setIsEditOpen(false);
    setEditMessage("");
    clearProfileMediaDrafts();
    if (profile) {
      setDisplayNameDraft(profile.user.displayName);
      setBioDraft(profile.user.bio || "");
    }
  }

  function handleSelectMedia(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: "avatar" | "banner",
  ): void {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      if (kind === "avatar") {
        if (avatarPreview.startsWith("blob:")) {
          URL.revokeObjectURL(avatarPreview);
        }
        setAvatarFile(null);
        setAvatarPreview("");
      } else {
        if (bannerPreview.startsWith("blob:")) {
          URL.revokeObjectURL(bannerPreview);
        }
        setBannerFile(null);
        setBannerPreview("");
      }
      return;
    }

    if (!file.type.startsWith("image/")) {
      setEditMessage("Profile images must be image files.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setEditMessage("Profile images must be 2MB or smaller.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setEditMessage("");

    if (kind === "avatar") {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      return;
    }

    if (bannerPreview.startsWith("blob:")) {
      URL.revokeObjectURL(bannerPreview);
    }
    setBannerFile(file);
    setBannerPreview(previewUrl);
  }

  async function handleSaveProfile(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmedDisplayName = displayNameDraft.trim();
    if (!trimmedDisplayName) {
      setEditMessage("Display name is required.");
      return;
    }

    try {
      setIsSavingProfile(true);
      setEditMessage("");
      const formData = new FormData();
      formData.append("displayName", trimmedDisplayName);
      formData.append("bio", bioDraft.trim());

      if (avatarFile) {
        formData.append("avatarImage", avatarFile);
      }

      if (bannerFile) {
        formData.append("bannerImage", bannerFile);
      }

      await api.updateSettings(formData);
      await refreshMe();
      await loadProfile();
      closeEditModal();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setEditMessage(caughtError.message);
      } else {
        setEditMessage(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update profile.",
        );
      }
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleDeletePost(postId: number): Promise<void> {
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingPostId(postId);
      setError("");
      await api.deletePost(postId);
      setProfile((currentProfile) => {
        if (!currentProfile) {
          return currentProfile;
        }

        return {
          ...currentProfile,
          posts: currentProfile.posts.filter((post) => post.id !== postId),
        };
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete post.",
      );
    } finally {
      setIsDeletingPostId(null);
    }
  }

  async function handleDeleteComment(
    comment: ApiProfileComment,
  ): Promise<void> {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingCommentId(comment.id);
      setError("");
      await api.deleteComment(comment.postId, comment.id);
      setProfile((currentProfile) => {
        if (!currentProfile) {
          return currentProfile;
        }

        return {
          ...currentProfile,
          comments: currentProfile.comments.filter(
            (currentComment) => currentComment.id !== comment.id,
          ),
        };
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete comment.",
      );
    } finally {
      setIsDeletingCommentId(null);
    }
  }

  function renderCommentItem(comment: ApiProfileComment) {
    const isDeletingThisComment = isDeletingCommentId === comment.id;

    if (!isOwnProfile) {
      return (
        <Link
          key={comment.id}
          to={`/posts/${comment.postId}#comment-${comment.id}`}
          className="profile-comment-card profile-link-card"
        >
          <header>
            <p className="profile-comment-community">
              c/{comment.postCommunity}
            </p>
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

    return (
      <article key={comment.id} className="profile-comment-card">
        <header>
          <div>
            <p className="profile-comment-community">
              c/{comment.postCommunity}
            </p>
            <p className="profile-comment-meta">
              {formatDate(comment.createdAt)}
            </p>
          </div>
          {!comment.isDeleted ? (
            <button
              type="button"
              className="profile-inline-delete-button"
              disabled={isDeletingThisComment}
              onClick={() => {
                void handleDeleteComment(comment);
              }}
            >
              {isDeletingThisComment ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </header>
        <Link
          to={`/posts/${comment.postId}#comment-${comment.id}`}
          className="profile-link-card-inner"
        >
          <h4>{comment.postTitle}</h4>
          <p className={comment.isDeleted ? "profile-comment-deleted" : ""}>
            {comment.isDeleted ? "Comment deleted" : comment.content}
          </p>
        </Link>
      </article>
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
  const bannerSrc = resolveMediaSrc(profile.user.bannerUrl);
  const avatarSrc = resolveMediaSrc(profile.user.avatarUrl);
  const editAvatarSrc = avatarPreview || avatarSrc;
  const editBannerSrc = bannerPreview || bannerSrc;

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <header className="profile-header">
          <div
            className="profile-banner"
            style={
              bannerSrc
                ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)), url(${bannerSrc})`,
                  }
                : undefined
            }
          />
          <div className="profile-header-body">
            <div className="profile-header-identity">
              <div className="profile-avatar-shell">
                {avatarSrc ? (
                  <img
                    className="profile-avatar"
                    src={avatarSrc}
                    alt={`${profile.user.displayName} avatar`}
                  />
                ) : (
                  <div className="profile-avatar profile-avatar--placeholder">
                    {profile.user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h2>{profile.user.displayName}</h2>
                <p>@{profile.user.username}</p>
              </div>
            </div>
            {isOwnProfile ? (
              <button
                type="button"
                className="profile-edit-button"
                onClick={() => {
                  setEditMessage("");
                  setIsEditOpen(true);
                }}
              >
                Edit Profile
              </button>
            ) : null}
          </div>
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
            {profile.isLimitedProfile ? (
              <article className="profile-placeholder-card profile-private-lock-card">
                <h3>This account is private</h3>
                <p>Follow this account to view their posts and comments.</p>
              </article>
            ) : null}

            {!profile.isLimitedProfile && activeTab === "overview" ? (
              <div className="profile-feed-list">
                {overviewItems.length === 0 ? (
                  <p className="profile-note">No activity yet.</p>
                ) : null}
                {overviewItems.map((item) =>
                  item.kind === "post" ? (
                    (() => {
                      const imageSrc = resolveMediaSrc(item.post.imageUrl);
                      const isDeletingThisPost =
                        isDeletingPostId === item.post.id;

                      if (!isOwnProfile) {
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
                      }

                      return (
                        <article
                          key={`post-${item.post.id}`}
                          className="profile-post-card"
                        >
                          <header>
                            <div>
                              <p className="profile-post-community">
                                c/{item.post.community}
                              </p>
                              <p className="profile-post-meta">
                                {formatDate(item.post.createdAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="profile-inline-delete-button"
                              disabled={isDeletingThisPost}
                              onClick={() => {
                                void handleDeletePost(item.post.id);
                              }}
                            >
                              {isDeletingThisPost ? "Deleting..." : "Delete"}
                            </button>
                          </header>
                          <Link
                            to={`/posts/${item.post.id}`}
                            className="profile-link-card-inner"
                          >
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
                          </Link>
                        </article>
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

            {!profile.isLimitedProfile && activeTab === "posts" ? (
              <div className="profile-feed-list">
                {profile.posts.length === 0 ? (
                  <p className="profile-note">No posts yet.</p>
                ) : null}
                {profile.posts.map((post) =>
                  (() => {
                    const imageSrc = resolveMediaSrc(post.imageUrl);
                    const isDeletingThisPost = isDeletingPostId === post.id;

                    if (!isOwnProfile) {
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
                    }

                    return (
                      <article key={post.id} className="profile-post-card">
                        <header>
                          <div>
                            <p className="profile-post-community">
                              c/{post.community}
                            </p>
                            <p className="profile-post-meta">
                              {formatDate(post.createdAt)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="profile-inline-delete-button"
                            disabled={isDeletingThisPost}
                            onClick={() => {
                              void handleDeletePost(post.id);
                            }}
                          >
                            {isDeletingThisPost ? "Deleting..." : "Delete"}
                          </button>
                        </header>
                        <Link
                          to={`/posts/${post.id}`}
                          className="profile-link-card-inner"
                        >
                          {imageSrc ? (
                            <img
                              className="profile-post-image"
                              src={imageSrc}
                              alt={post.title}
                            />
                          ) : null}
                          <h4>{post.title}</h4>
                          {post.content ? <p>{post.content}</p> : null}
                        </Link>
                      </article>
                    );
                  })(),
                )}
              </div>
            ) : null}

            {!profile.isLimitedProfile && activeTab === "comments" ? (
              <div className="profile-feed-list">
                {profile.comments.length === 0 ? (
                  <p className="profile-note">No top-level comments yet.</p>
                ) : null}
                {profile.comments.map((comment) => renderCommentItem(comment))}
              </div>
            ) : null}

            {!profile.isLimitedProfile && activeTab === "saved" ? (
              <div className="profile-feed-list">
                {savedPostsLoading ? (
                  <p className="profile-note">Loading saved posts...</p>
                ) : null}
                {savedPostsError ? (
                  <p className="profile-error">{savedPostsError}</p>
                ) : null}
                {!savedPostsLoading && savedPosts.length === 0 ? (
                  <p className="profile-note">No saved posts yet.</p>
                ) : null}
                {savedPosts.map((post) =>
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
          </section>

          <aside className="profile-sidebar">
            <article className="profile-sidebar-card">
              <h3>@{profile.user.username}</h3>
              {!isOwnProfile && currentUser ? (
                <>
                  <button
                    type="button"
                    className={`profile-follow-button ${
                      followRequestStatus === "pending"
                        ? "profile-follow-button--pending"
                        : ""
                    }`}
                    onClick={() => {
                      void handleFollowToggle();
                    }}
                    disabled={isFollowSubmitting}
                  >
                    {isFollowSubmitting
                      ? "Updating..."
                      : followRequestStatus === "pending"
                        ? "Cancel Request"
                        : isFollowing
                          ? "Unfollow"
                          : profile.user.isPrivate
                            ? "Request to Follow"
                            : "Follow"}
                  </button>
                  <Link
                    to={`/messages/${profile.user.id}`}
                    className="profile-message-button"
                  >
                    Message
                  </Link>
                </>
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

              {isOwnProfile && profile.user.isPrivate ? (
                <div className="profile-follow-requests">
                  <h4>Follow Requests</h4>
                  {isRequestsLoading ? (
                    <p className="profile-note">Loading requests...</p>
                  ) : pendingFollowRequests.length === 0 ? (
                    <p className="profile-note">No pending requests.</p>
                  ) : (
                    <ul>
                      {pendingFollowRequests.map((request) => {
                        const requestAvatarSrc = resolveMediaSrc(
                          request.requesterAvatarUrl,
                        );

                        return (
                          <li
                            key={request.id}
                            className="profile-follow-request-item"
                          >
                            <div className="profile-follow-request-header">
                              {requestAvatarSrc ? (
                                <img
                                  src={requestAvatarSrc}
                                  alt={`${request.requesterDisplayName} avatar`}
                                />
                              ) : null}
                              <div>
                                <strong>{request.requesterDisplayName}</strong>
                                <p>@{request.requesterUsername}</p>
                              </div>
                            </div>
                            <div className="profile-follow-request-actions">
                              <button
                                type="button"
                                className="profile-follow-request-approve"
                                onClick={() => {
                                  void handleApproveFollowRequest(request.id);
                                }}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="profile-follow-request-deny"
                                onClick={() => {
                                  void handleDenyFollowRequest(request.id);
                                }}
                              >
                                Deny
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </article>
          </aside>
        </div>

        {error ? <p className="profile-error">{error}</p> : null}

        {isEditOpen ? (
          <div className="profile-edit-backdrop" role="presentation">
            <div
              className="profile-edit-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-edit-title"
            >
              <div className="profile-edit-header">
                <h3 id="profile-edit-title">Edit Profile</h3>
                <button
                  type="button"
                  className="profile-edit-close"
                  onClick={closeEditModal}
                >
                  ×
                </button>
              </div>

              <form
                className="profile-edit-form"
                onSubmit={(event) => {
                  void handleSaveProfile(event);
                }}
              >
                <label htmlFor="profile-display-name">Display Name</label>
                <input
                  id="profile-display-name"
                  value={displayNameDraft}
                  onChange={(event) => {
                    setDisplayNameDraft(event.target.value);
                  }}
                />

                <label htmlFor="profile-bio">Description</label>
                <textarea
                  id="profile-bio"
                  rows={4}
                  value={bioDraft}
                  onChange={(event) => {
                    setBioDraft(event.target.value);
                  }}
                />

                <label htmlFor="profile-avatar-image">Profile Image</label>
                <input
                  id="profile-avatar-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    handleSelectMedia(event, "avatar");
                  }}
                />
                {editAvatarSrc ? (
                  <img
                    className="profile-edit-avatar-preview"
                    src={editAvatarSrc}
                    alt="Avatar preview"
                  />
                ) : null}

                <label htmlFor="profile-banner-image">Banner Image</label>
                <input
                  id="profile-banner-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    handleSelectMedia(event, "banner");
                  }}
                />
                {editBannerSrc ? (
                  <img
                    className="profile-edit-banner-preview"
                    src={editBannerSrc}
                    alt="Banner preview"
                  />
                ) : null}

                <div className="profile-edit-actions">
                  <button
                    type="button"
                    className="profile-edit-secondary"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="profile-edit-primary"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>

              {editMessage ? (
                <p className="profile-edit-message">{editMessage}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
