import { useEffect, useState } from "react";
import PostCard from "../../Components/PostCard/PostCard";
import { useAuth } from "../../context/AuthContext";
import { api, type ApiPost } from "../../lib/api";
import "./Profile.css";

export default function Profile() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadProfile(): Promise<void> {
      if (!currentUser) {
        setPosts([]);
        return;
      }

      try {
        const response = await api.getMyProfile();
        setPosts(response.posts);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load profile.",
        );
      }
    }

    void loadProfile();
  }, [currentUser]);

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <h2>Profile</h2>
        {!currentUser ? (
          <p className="profile-note">Login to view your profile details.</p>
        ) : (
          <>
            <div className="profile-meta">
              <h3>{currentUser.displayName}</h3>
              <p>@{currentUser.username}</p>
              <p>{currentUser.bio || "No bio yet."}</p>
            </div>
            {error ? <p className="profile-error">{error}</p> : null}
            <div className="profile-posts">
              {posts.map((post: ApiPost) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
