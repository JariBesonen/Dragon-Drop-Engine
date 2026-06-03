import { useEffect, useState } from "react";
import PostCard from "../../Components/PostCard/PostCard";
import { api, type ApiPost } from "../../lib/api";
import "./Explore.css";

export default function Explore() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadExplore(): Promise<void> {
      try {
        const response = await api.getExplorePosts();
        setPosts(response.posts);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load posts.",
        );
      }
    }

    void loadExplore();
  }, []);

  return (
    <main className="feed-page">
      <section className="feed-shell">
        <h2>Explore</h2>
        <p className="feed-description">
          Discover the latest conversations across Hive.
        </p>
        {error ? <p className="feed-error">{error}</p> : null}
        <div className="feed-list">
          {posts.map((post: ApiPost) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </main>
  );
}
