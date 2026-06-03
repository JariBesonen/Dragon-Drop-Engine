import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { currentUser, login, logout, register } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [identity, setIdentity] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [authMessage, setAuthMessage] = useState<string>("");

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate("/explore");
      return;
    }
    navigate(`/explore?q=${encodeURIComponent(query)}`);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      await login(identity, password);
      setAuthMessage("Logged in.");
      setPassword("");
    } catch (caughtError) {
      setAuthMessage(
        caughtError instanceof Error ? caughtError.message : "Unable to login.",
      );
    }
  }

  async function handleRegister(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    try {
      await register(identity, email, password);
      setAuthMessage("Account created.");
      setPassword("");
    } catch (caughtError) {
      setAuthMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to register.",
      );
    }
  }

  async function handleLogout(): Promise<void> {
    await logout();
    setAuthMessage("Logged out.");
  }

  return (
    <nav>
      <Link to="/">
        <h1>Hive</h1>
      </Link>
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
      <div className="auth-controls">
        {currentUser ? (
          <>
            <span>@{currentUser.username}</span>
            <button type="button" onClick={handleLogout}>
              logout
            </button>
          </>
        ) : (
          <>
            <form
              onSubmit={(event) => {
                void handleLogin(event);
              }}
            >
              <input
                placeholder="username or email"
                value={identity}
                onChange={(event) => {
                  setIdentity(event.target.value);
                }}
              />
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
              <button type="submit">login</button>
            </form>
            <form
              onSubmit={(event) => {
                void handleRegister(event);
              }}
            >
              <input
                placeholder="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
              />
              <button type="submit">register</button>
            </form>
          </>
        )}
        {authMessage ? <small>{authMessage}</small> : null}
      </div>
    </nav>
  );
}
export default Navbar;
