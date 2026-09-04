import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PostCard from "../../Components/PostCard/PostCard";
import LoginPrompt from "../../Components/LoginPrompt/LoginPrompt";
import { useAuth } from "../../context/AuthContext";
import {
  ApiError,
  api,
  type ApiHive,
  type ApiHiveFollowRequest,
  type ApiPost,
} from "../../lib/api";
import "./HiveDetail.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function resolveBannerSrc(bannerImage: string | null): string | null {
  if (!bannerImage) {
    return null;
  }

  if (
    bannerImage.startsWith("http://") ||
    bannerImage.startsWith("https://") ||
    bannerImage.startsWith("data:") ||
    bannerImage.startsWith("blob:")
  ) {
    return bannerImage;
  }

  const normalizedPath = bannerImage.startsWith("/")
    ? bannerImage
    : `/${bannerImage}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default function HiveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, incrementHiveRefreshKey } = useAuth();
  const [hive, setHive] = useState<ApiHive | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [canViewPosts, setCanViewPosts] = useState<boolean>(true);
  const [followRequestStatus, setFollowRequestStatus] = useState<
    "none" | "pending" | "accepted"
  >("none");
  const [joinMessage, setJoinMessage] = useState<string>("");
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isLoginPromptVisible, setIsLoginPromptVisible] =
    useState<boolean>(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string>(
    "to join this hive",
  );
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState<boolean>(false);
  const [isDeletingHive, setIsDeletingHive] = useState<boolean>(false);
  const [followRequests, setFollowRequests] = useState<ApiHiveFollowRequest[]>(
    [],
  );
  const [requestsLoading, setRequestsLoading] = useState<boolean>(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState<boolean>(false);
  const [postCaption, setPostCaption] = useState<string>("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string>("");
  const [postMessage, setPostMessage] = useState<string>("");
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  useEffect(() => {
    async function loadHive(): Promise<void> {
      const hiveId = Number(id);
      if (!Number.isInteger(hiveId) || hiveId <= 0) {
        setError("Invalid hive id.");
        setLoading(false);
        setPostsLoading(false);
        return;
      }

      try {
        const [hiveResponse, postsResponse] = await Promise.all([
          api.getHive(hiveId),
          api.getHivePosts(hiveId),
        ]);

        setHive(hiveResponse.hive);
        setIsJoined(hiveResponse.joined);
        setCanViewPosts(hiveResponse.canViewPosts ?? true);
        setFollowRequestStatus(hiveResponse.requestStatus ?? "none");
        setPosts(postsResponse.posts);
        setError("");
      } catch (caughtError) {
        if (caughtError instanceof ApiError && caughtError.status === 403) {
          try {
            const hiveResponse = await api.getHive(hiveId);
            setHive(hiveResponse.hive);
            setIsJoined(hiveResponse.joined);
            setCanViewPosts(false);
            setFollowRequestStatus(hiveResponse.requestStatus ?? "none");
            setPosts([]);
            setError("");
          } catch (fallbackError) {
            setError(
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unable to load hive.",
            );
          }
        } else {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load hive.",
          );
        }
      } finally {
        setLoading(false);
        setPostsLoading(false);
      }
    }

    void loadHive();
  }, [id]);

  useEffect(() => {
    if (!hive || !currentUser || currentUser.id !== hive.ownerUserId) {
      setFollowRequests([]);
      return;
    }

    const hiveId = hive.id;

    let cancelled = false;

    async function loadRequests(): Promise<void> {
      try {
        setRequestsLoading(true);
        const response = await api.getHiveFollowRequests(hiveId);
        if (!cancelled) {
          setFollowRequests(response.requests);
        }
      } catch {
        if (!cancelled) {
          setFollowRequests([]);
        }
      } finally {
        if (!cancelled) {
          setRequestsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, [hive, currentUser]);

  async function handleJoinHive(): Promise<void> {
    const hiveId = Number(id);
    if (!currentUser) {
      setLoginPromptMessage("to join this hive");
      setIsLoginPromptVisible(true);
      return;
    }

    if (!Number.isInteger(hiveId) || hiveId <= 0) {
      setJoinMessage("Invalid hive id.");
      return;
    }

    try {
      setIsJoining(true);
      setJoinMessage("");
      const response = await api.joinHive(hiveId);
      setIsJoined(response.joined);
      const requestStatus = response.requestStatus ?? "none";
      setFollowRequestStatus(requestStatus);

      if (response.joined) {
        setCanViewPosts(true);
        setJoinMessage(
          "You joined this hive. Posts from this hive now appear in Home feed.",
        );
        const postsResponse = await api.getHivePosts(hiveId);
        setPosts(postsResponse.posts);
      } else if (requestStatus === "pending") {
        setCanViewPosts(false);
        setJoinMessage(
          "Follow request sent. You can view posts after the hive owner accepts it.",
        );
      } else {
        setJoinMessage(response.message);
      }
    } catch (caughtError) {
      setJoinMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to join hive.",
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function handleUnjoinHive(): Promise<void> {
    const hiveId = Number(id);
    if (!Number.isInteger(hiveId) || hiveId <= 0) {
      return;
    }

    try {
      setIsJoining(true);
      setJoinMessage("");
      await api.unjoinHive(hiveId);
      setIsJoined(false);
      setJoinMessage("You left this hive.");
    } catch (caughtError) {
      setJoinMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to leave hive.",
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function handleTogglePrivacy(): Promise<void> {
    if (!hive) {
      return;
    }

    try {
      setIsUpdatingPrivacy(true);
      setJoinMessage("");
      const response = await api.updateHivePrivacy(hive.id, !hive.isPrivate);
      setHive(response.hive);
      setJoinMessage(
        response.hive.isPrivate
          ? "Hive is now private. Only joined members can view posts."
          : "Hive is now public.",
      );
    } catch (caughtError) {
      setJoinMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update hive privacy.",
      );
    } finally {
      setIsUpdatingPrivacy(false);
    }
  }

  async function handleDeleteHive(): Promise<void> {
    if (!hive || !currentUser || currentUser.id !== hive.ownerUserId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${hive.name}" and all of its posts? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingHive(true);
      setJoinMessage("");
      await api.deleteHive(hive.id);
      incrementHiveRefreshKey();
      navigate("/explore", { replace: true });
    } catch (caughtError) {
      setJoinMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete hive.",
      );
    } finally {
      setIsDeletingHive(false);
    }
  }

  async function handleApproveRequest(requestId: number): Promise<void> {
    if (!hive) {
      return;
    }

    try {
      await api.approveHiveFollowRequest(hive.id, requestId);
      setFollowRequests((current) =>
        current.filter((request) => request.id !== requestId),
      );
    } catch (caughtError) {
      setJoinMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to approve follow request.",
      );
    }
  }

  async function handleDenyRequest(requestId: number): Promise<void> {
    if (!hive) {
      return;
    }

    try {
      await api.denyHiveFollowRequest(hive.id, requestId);
      setFollowRequests((current) =>
        current.filter((request) => request.id !== requestId),
      );
    } catch (caughtError) {
      setJoinMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to deny follow request.",
      );
    }
  }

  useEffect(() => {
    return () => {
      if (postImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(postImagePreview);
      }
    };
  }, [postImagePreview]);

  function clearPostImage(): void {
    if (postImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(postImagePreview);
    }

    setPostImageFile(null);
    setPostImagePreview("");
  }

  function closePostModal(): void {
    setIsPostModalOpen(false);
    setPostCaption("");
    setPostMessage("");
    clearPostImage();
  }

  async function handleCreatePost(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const hiveId = Number(id);
    if (!currentUser) {
      setPostMessage("Log in to create a post in this hive.");
      return;
    }

    if (!Number.isInteger(hiveId) || hiveId <= 0) {
      setPostMessage("Invalid hive id.");
      return;
    }

    if (!postCaption.trim()) {
      setPostMessage("Caption is required.");
      return;
    }

    try {
      setIsSubmittingPost(true);
      const formData = new FormData();
      formData.append("caption", postCaption.trim());

      if (postImageFile) {
        formData.append("image", postImageFile);
      }

      const response = await api.createHivePost(hiveId, formData);
      setPosts((currentPosts) => [response.post, ...currentPosts]);
      closePostModal();
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 413) {
        setPostMessage("Post image must be 2MB or smaller.");
        return;
      }

      if (caughtError instanceof ApiError && caughtError.status === 400) {
        setPostMessage(caughtError.message);
        return;
      }

      setPostMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create post.",
      );
    } finally {
      setIsSubmittingPost(false);
    }
  }

  if (loading) {
    return (
      <main className="hive-page">
        <section className="hive-shell">
          <p>Loading hive...</p>
        </section>
      </main>
    );
  }

  if (error || !hive) {
    return (
      <main className="hive-page">
        <section className="hive-shell">
          <h2>Hive</h2>
          <p className="hive-error">{error || "Hive not found."}</p>
          <Link className="hive-back-link" to="/explore">
            Back to Explore
          </Link>
        </section>
      </main>
    );
  }

  const bannerSrc = resolveBannerSrc(hive.bannerImage);
  const isOwner = currentUser?.id === hive.ownerUserId;

  return (
    <main className="hive-page">
      <LoginPrompt
        isVisible={isLoginPromptVisible}
        onClose={() => setIsLoginPromptVisible(false)}
        message={loginPromptMessage}
      />
      <section className="hive-shell">
        {bannerSrc ? (
          <img
            className="hive-banner"
            src={bannerSrc}
            alt={`${hive.name} banner`}
          />
        ) : null}

        <header className="hive-header">
          <div>
            <h2>{hive.name}</h2>
            <p className="hive-meta">
              Created by{" "}
              {hive.ownerUsername ? (
                <Link
                  to={`/profile/${hive.ownerUsername}`}
                  className="hive-owner-link"
                >
                  {hive.ownerUsername}
                </Link>
              ) : (
                `user #${hive.ownerUserId}`
              )}{" "}
              on {new Date(hive.createdAt).toLocaleDateString()}
            </p>
            <p className="hive-privacy-pill">
              {hive.isPrivate ? "Private Hive" : "Public Hive"}
            </p>
          </div>
          <div className="hive-actions">
            {!isOwner ? (
              <button
                type="button"
                className="hive-follow-button"
                disabled={isJoining || followRequestStatus === "pending"}
                onClick={() => {
                  if (isJoined) {
                    void handleUnjoinHive();
                  } else {
                    void handleJoinHive();
                  }
                }}
              >
                {isJoined
                  ? isJoining
                    ? "Leaving..."
                    : "Leave Hive"
                  : isJoining
                    ? "Submitting..."
                    : followRequestStatus === "pending"
                      ? "Request Pending"
                      : hive.isPrivate
                        ? "Request to Join"
                        : "Join Hive"}
              </button>
            ) : null}
            <button
              type="button"
              className="hive-create-post-button"
              disabled={!!currentUser && !canViewPosts}
              onClick={() => {
                if (!currentUser) {
                  setLoginPromptMessage("to create a post");
                  setIsLoginPromptVisible(true);
                  return;
                }

                setIsPostModalOpen(true);
              }}
            >
              Create Post
            </button>
            {isOwner ? (
              <>
                <button
                  type="button"
                  className="hive-delete-button"
                  disabled={isDeletingHive}
                  onClick={() => {
                    void handleDeleteHive();
                  }}
                >
                  {isDeletingHive ? "Deleting..." : "Delete Hive"}
                </button>
                <button
                  type="button"
                  className="hive-privacy-toggle-button"
                  disabled={isUpdatingPrivacy}
                  onClick={() => {
                    void handleTogglePrivacy();
                  }}
                >
                  {isUpdatingPrivacy
                    ? "Updating..."
                    : hive.isPrivate
                      ? "Set Public"
                      : "Set Private"}
                </button>
              </>
            ) : null}
          </div>
        </header>

        {!currentUser ? (
          <p className="hive-auth-note">
            Log in to join this hive and create posts.
          </p>
        ) : null}

        {joinMessage ? (
          <p className="hive-join-message">{joinMessage}</p>
        ) : null}

        <div className="hive-content-grid">
          <section className="hive-posts-placeholder hive-main-column">
            <h3>Posts</h3>
            {!canViewPosts ? (
              <p className="hive-private-note">
                This hive is private. Join to view posts.
              </p>
            ) : null}
            {postsLoading ? <p>Loading posts...</p> : null}
            {!postsLoading && canViewPosts && posts.length === 0 ? (
              <p>Be the first to post in this hive.</p>
            ) : null}
            {canViewPosts ? (
              <div className="hive-post-list">
                {posts.map((post: ApiPost) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : null}
          </section>

          <aside className="hive-sidebar">
            <article className="hive-description-card hive-description-card--sidebar">
              <h3>About</h3>
              <p>{hive.description}</p>

              {isOwner && hive.isPrivate ? (
                <div className="hive-follow-requests">
                  <h4>Follow Requests</h4>
                  {requestsLoading ? (
                    <p>Loading requests...</p>
                  ) : followRequests.length === 0 ? (
                    <p>No pending requests.</p>
                  ) : (
                    <ul>
                      {followRequests.map((request) => (
                        <li key={request.id}>
                          <div>
                            <strong>{request.requesterDisplayName}</strong>
                            <p>@{request.requesterUsername}</p>
                          </div>
                          <div className="hive-follow-request-actions">
                            <button
                              type="button"
                              className="hive-follow-request-approve"
                              onClick={() => {
                                void handleApproveRequest(request.id);
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="hive-follow-request-deny"
                              onClick={() => {
                                void handleDenyRequest(request.id);
                              }}
                            >
                              Deny
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </article>
          </aside>
        </div>
      </section>

      {isPostModalOpen ? (
        <div className="hive-modal-backdrop" role="presentation">
          <div
            className="hive-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-post-title"
          >
            <div className="hive-modal-header">
              <h3 id="create-post-title">Create Post</h3>
              <button
                type="button"
                className="hive-modal-close"
                onClick={closePostModal}
              >
                ×
              </button>
            </div>

            <form
              className="hive-modal-form"
              onSubmit={(event) => {
                void handleCreatePost(event);
              }}
            >
              <label htmlFor="hive-post-caption">Caption</label>
              <textarea
                id="hive-post-caption"
                rows={5}
                value={postCaption}
                onChange={(event) => {
                  setPostCaption(event.target.value);
                }}
                required
              />

              <label htmlFor="hive-post-image">Post Image</label>
              <input
                id="hive-post-image"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    clearPostImage();
                    return;
                  }

                  if (file.size > 2 * 1024 * 1024) {
                    setPostMessage("Post image must be 2MB or smaller.");
                    clearPostImage();
                    return;
                  }

                  if (!file.type.startsWith("image/")) {
                    setPostMessage("Post image must be an image file.");
                    clearPostImage();
                    return;
                  }

                  setPostMessage("");
                  if (postImagePreview.startsWith("blob:")) {
                    URL.revokeObjectURL(postImagePreview);
                  }
                  setPostImageFile(file);
                  setPostImagePreview(URL.createObjectURL(file));
                }}
              />

              {postImagePreview ? (
                <>
                  <img
                    className="hive-modal-preview"
                    src={postImagePreview}
                    alt="Post preview"
                  />
                  <button
                    type="button"
                    className="hive-modal-remove-image"
                    onClick={clearPostImage}
                  >
                    Remove Image
                  </button>
                </>
              ) : null}

              <div className="hive-modal-actions">
                <button
                  type="button"
                  className="hive-modal-secondary"
                  onClick={closePostModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hive-modal-primary"
                  disabled={isSubmittingPost}
                >
                  {isSubmittingPost ? "Posting..." : "Post to Hive"}
                </button>
              </div>
            </form>

            {postMessage ? (
              <p className="hive-modal-message">{postMessage}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
