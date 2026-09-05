import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PostCard from "../../Components/PostCard/PostCard";
import {
  api,
  resolveMediaUrl as resolveAvatarSrc,
  type ApiHive,
  type ApiPost,
} from "../../lib/api";
import "./Search.css";

interface SearchUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}

type SearchFilter = "all" | "hives" | "users" | "posts";

function getAvatarInitials(displayName: string, username: string): string {
  const source = displayName.trim() || username.trim() || "?";
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [allPosts, setAllPosts] = useState<ApiPost[]>([]);
  const [hives, setHives] = useState<ApiHive[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [brokenAvatarByUserId, setBrokenAvatarByUserId] = useState<
    Record<number, boolean>
  >({});
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("all");

  function toggleFilter(nextFilter: Exclude<SearchFilter, "all">): void {
    setActiveFilter((current) => (current === nextFilter ? "all" : nextFilter));
  }

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

  useEffect(() => {
    setActiveFilter("all");
    setBrokenAvatarByUserId({});
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

  const totalResults = postResults.length + hives.length + users.length;
  const resultsLabel = totalResults === 1 ? "result" : "results";

  const showUsers = activeFilter === "all" || activeFilter === "users";
  const showHives = activeFilter === "all" || activeFilter === "hives";
  const showPosts = activeFilter === "all" || activeFilter === "posts";

  return (
    <main className="search-page">
      <section className="search-shell">
        <div className="search-header-row">
          <h2>Search</h2>
          {query ? (
            <div className="search-filter-wrap">
              <p className="search-filter-label">Filter results</p>
              <div
                className="search-filter-nav"
                role="navigation"
                aria-label="Filter search results"
              >
                <button
                  type="button"
                  className={`search-filter-button ${
                    activeFilter === "posts" ? "active" : ""
                  }`}
                  onClick={() => {
                    toggleFilter("posts");
                  }}
                  aria-pressed={activeFilter === "posts"}
                >
                  Posts
                </button>
                <button
                  type="button"
                  className={`search-filter-button ${
                    activeFilter === "hives" ? "active" : ""
                  }`}
                  onClick={() => {
                    toggleFilter("hives");
                  }}
                  aria-pressed={activeFilter === "hives"}
                >
                  Hives
                </button>
                <button
                  type="button"
                  className={`search-filter-button ${
                    activeFilter === "users" ? "active" : ""
                  }`}
                  onClick={() => {
                    toggleFilter("users");
                  }}
                  aria-pressed={activeFilter === "users"}
                >
                  Users
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {query ? (
          <p className="search-query">
            {totalResults} {resultsLabel} for "{query}"
          </p>
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
            {showUsers && (users.length > 0 || activeFilter === "users") ? (
              <section className="search-section">
                <h3>Users</h3>
                {users.length === 0 ? (
                  <p className="search-state">No users matched.</p>
                ) : (
                  <div className="search-user-list">
                    {users.map((user: SearchUser) => (
                      <Link
                        key={user.id}
                        className="search-user-card"
                        to={`/profile/${user.username}`}
                      >
                        {user.avatarUrl && !brokenAvatarByUserId[user.id] ? (
                          <img
                            src={resolveAvatarSrc(user.avatarUrl) || ""}
                            alt={user.displayName}
                            className="search-user-avatar"
                            onError={() => {
                              setBrokenAvatarByUserId((current) => {
                                if (current[user.id]) {
                                  return current;
                                }

                                return {
                                  ...current,
                                  [user.id]: true,
                                };
                              });
                            }}
                          />
                        ) : (
                          <div
                            className="search-user-avatar search-user-avatar-fallback"
                            aria-hidden="true"
                          >
                            {getAvatarInitials(user.displayName, user.username)}
                          </div>
                        )}
                        <div className="search-user-info">
                          <h4>{user.displayName}</h4>
                          <p className="search-user-username">
                            @{user.username}
                          </p>
                          {user.bio && (
                            <p className="search-user-bio">{user.bio}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {showHives ? (
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
            ) : null}

            {showPosts ? (
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
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
