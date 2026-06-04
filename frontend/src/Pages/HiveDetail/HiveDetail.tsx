import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PostCard from "../../Components/PostCard/PostCard";
import { useAuth } from "../../context/AuthContext";
import { ApiError, api, type ApiHive, type ApiPost } from "../../lib/api";
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
  const { currentUser } = useAuth();
  const [hive, setHive] = useState<ApiHive | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
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
        setPosts(postsResponse.posts);
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load hive.",
        );
      } finally {
        setLoading(false);
        setPostsLoading(false);
      }
    }

    void loadHive();
  }, [id]);

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

  return (
    <main className="hive-page">
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
              Created by user #{hive.ownerUserId} on{" "}
              {new Date(hive.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="hive-actions">
            <button type="button" className="hive-follow-button" disabled>
              Join Hive (Soon)
            </button>
            <button
              type="button"
              className="hive-create-post-button"
              disabled={!currentUser}
              onClick={() => {
                setIsPostModalOpen(true);
              }}
            >
              Create Post
            </button>
          </div>
        </header>

        {!currentUser ? (
          <p className="hive-auth-note">Log in to create a post in this hive.</p>
        ) : null}

        {hive.tags.length > 0 ? (
          <div className="hive-tags">
            {hive.tags.map((tag: string) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}

        <article className="hive-description-card">
          <h3>About</h3>
          <p>{hive.description}</p>
        </article>

        <section className="hive-posts-placeholder">
          <h3>Posts</h3>
          {postsLoading ? <p>Loading posts...</p> : null}
          {!postsLoading && posts.length === 0 ? (
            <p>Be the first to post in this hive.</p>
          ) : null}
          <div className="hive-post-list">
            {posts.map((post: ApiPost) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      </section>

      {isPostModalOpen ? (
        <div className="hive-modal-backdrop" role="presentation">
          <div className="hive-modal" role="dialog" aria-modal="true" aria-labelledby="create-post-title">
            <div className="hive-modal-header">
              <h3 id="create-post-title">Create Post</h3>
              <button type="button" className="hive-modal-close" onClick={closePostModal}>
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
                  <img className="hive-modal-preview" src={postImagePreview} alt="Post preview" />
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
                <button type="button" className="hive-modal-secondary" onClick={closePostModal}>
                  Cancel
                </button>
                <button type="submit" className="hive-modal-primary" disabled={isSubmittingPost}>
                  {isSubmittingPost ? "Posting..." : "Post to Hive"}
                </button>
              </div>
            </form>

            {postMessage ? <p className="hive-modal-message">{postMessage}</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
