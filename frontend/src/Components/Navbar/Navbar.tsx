import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api, type ApiHive } from "../../lib/api";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{
    searches: string[];
    hives: ApiHive[];
  }>({ searches: [], hives: [] });

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults({ searches: [], hives: [] });
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await api.search(query);
        if (!cancelled) {
          setSearchResults(response);
        }
      } catch {
        if (!cancelled) {
          setSearchResults({ searches: [], hives: [] });
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  const trimmedQuery = searchQuery.trim();
  const showSearchDropdown = searchOpen && trimmedQuery.length > 0;

  function clearSearch(): void {
    setSearchQuery("");
    setSearchResults({ searches: [], hives: [] });
    setSearchOpen(false);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate("/search");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
  }

  async function handleLogout(): Promise<void> {
    await logout();
  }

  return (
    <nav>
      <Link className="brand-link" to="/">
        <h1>Hive</h1>
      </Link>
      <form className="nav-search" onSubmit={handleSearch}>
        <div className="nav-search-field">
          <input
            type="search"
            placeholder="Search Hive"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              setSearchOpen(true);
            }}
            aria-label="Search Hive"
          />
          {searchQuery ? (
            <button
              type="button"
              className="nav-search-clear"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              ×
            </button>
          ) : null}
        </div>
        <button type="submit" className="nav-search-submit">
          search
        </button>
        {showSearchDropdown ? (
          <div className="nav-search-dropdown">
            <section className="nav-search-dropdown-section">
              <h2>Search</h2>
              {searchLoading ? (
                <p className="nav-search-state">Searching...</p>
              ) : null}
              {!searchLoading && searchResults.searches.length === 0 ? (
                <p className="nav-search-state">No search suggestions.</p>
              ) : null}
              <div className="nav-search-results-list">
                {searchResults.searches
                  .slice(0, 5)
                  .map((suggestion: string) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="nav-search-result"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        navigate(`/search?q=${encodeURIComponent(suggestion)}`);
                        clearSearch();
                      }}
                    >
                      <span className="nav-search-icon">⌕</span>
                      <span>{suggestion}</span>
                    </button>
                  ))}
              </div>
            </section>

            <section className="nav-search-dropdown-section">
              <h2>Communities</h2>
              {!searchLoading && searchResults.hives.length === 0 ? (
                <p className="nav-search-state">No matching communities yet.</p>
              ) : null}
              <div className="nav-search-results-list">
                {searchResults.hives.slice(0, 5).map((hive: ApiHive) => (
                  <Link
                    key={hive.id}
                    className="nav-search-result nav-search-community"
                    to={`/hive/${hive.id}`}
                    onClick={() => {
                      clearSearch();
                    }}
                  >
                    <span className="nav-search-avatar">r/</span>
                    <span>
                      <strong>{hive.name}</strong>
                      <small>{hive.description}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </form>
      <div className="nav-right">
        <ul>
          <li>
            <Link to="/">home</Link>
          </li>
          <li>
            <Link to="/create">create hive</Link>
          </li>
          <li>
            <Link to="/profile">profile</Link>
          </li>
        </ul>
        <div className="auth-controls">
          {currentUser ? (
            <>
              <span>@{currentUser.username}</span>
              <button type="button" onClick={handleLogout}>
                logout
              </button>
            </>
          ) : (
            <div className="auth-links">
              <Link className="login-link" to="/login">
                login
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
