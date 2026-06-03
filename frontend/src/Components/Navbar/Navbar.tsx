import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate("/explore");
      return;
    }
    navigate(`/explore?q=${encodeURIComponent(query)}`);
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
        <input
          type="search"
          placeholder="Search posts or communities"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
          }}
          aria-label="Search Hive"
        />
        <button type="submit">search</button>
      </form>
      <div className="nav-right">
        <ul>
          <li>
            <Link to="/">home</Link>
          </li>
          <li>
            <Link to="/create">create post</Link>
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
