import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PostCard from "../../Components/PostCard/PostCard";
import { api, type ApiHive, type ApiPost } from "../../lib/api";
import "./Search.css";

interface SearchUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [allPosts, setAllPosts] = useState<ApiPost[]>([]);
  const [hives, setHives] = useState<ApiHive[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);

  useEffect(() => {
    async function loadResults(): Promise<void> {
      if (!query) {
        setAllPosts([]);
        setHives([]);
        setUsers([]);
        setError("");
        return;
      }

      try {
        setLoading(true);
        const [searchResponse, exploreResponse] = await Promise.all([
          api.search(query),
          api.getExplorePosts(),
        ]);

        setHives(searchResponse.hives);
        setUsers(searchResponse.users || []);
        setAllPosts(exploreResponse.posts);
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load search results.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadResults();
  }, [query]);

  const normalizedQuery = query.toLowerCase();

  const postResults = useMemo(() => {
    if (!normalizedQuery) {
      return [] as ApiPost[];
    }

    return allPosts
      .filter((post: ApiPost) => {
        return (
          post.title.toLowerCase().includes(normalizedQuery) ||
          post.content.toLowerCase().includes(normalizedQuery) ||
          post.community.toLowerCase().includes(normalizedQuery) ||
          post.authorUsername.toLowerCase().includes(normalizedQuery) ||
          post.authorDisplayName.toLowerCase().includes(normalizedQuery)
        );
      })
      .slice(0, 25);
  }, [allPosts, normalizedQuery]);

  const noResults =
    !loading &&
    !error &&
    query.length > 0 &&
    postResults.length === 0 &&
    hives.length === 0 &&
    users.length === 0;

  return (
    <main className="search-page">
      <section className="search-shell">
        <h2>Search</h2>
        {query ? (
          <p className="search-query">Results for "{query}"</p>
        ) : (
          <p className="search-query">
            Type in the search bar to find posts, communities, and users.
          </p>
        )}

        {loading ? <p className="search-state">Searching...</p> : null}
        {error ? <p className="search-error">{error}</p> : null}
        {noResults ? (
          <p className="search-empty">No results for this search.</p>
        ) : null}

        {!error && query ? (
          <>
            {users.length > 0 ? (
              <section className="search-section">
                <h3>Users</h3>
                <div className="search-user-list">
                  {users.map((user: SearchUser) => (
                    <Link
                      key={user.id}
                      className="search-user-card"
                      to={`/profile/${user.username}`}
                    >
                      {user.avatarUrl && (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="search-user-avatar"
                        />
                      )}
                      <div className="search-user-info">
                        <h4>{user.displayName}</h4>
                        <p className="search-user-username">@{user.username}</p>
                        {user.bio && (
                          <p className="search-user-bio">{user.bio}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="search-section">
              <h3>Hives</h3>
              {hives.length === 0 ? (
                <p className="search-state">No hives matched.</p>
              ) : (
                <div className="search-hive-list">
                  {hives.map((hive: ApiHive) => (
                    <Link
                      key={hive.id}
                      className="search-hive-card"
                      to={`/hive/${hive.id}`}
                    >
                      <h4>{hive.name}</h4>
                      <p>{hive.description}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="search-section">
              <h3>Posts</h3>
              {postResults.length === 0 ? (
                <p className="search-state">No posts matched.</p>
              ) : (
                <div className="search-post-list">
                  {postResults.map((post: ApiPost) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
