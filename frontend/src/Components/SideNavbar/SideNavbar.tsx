import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api, type ApiHive } from "../../lib/api";
import {
  getRecentlyViewedHives,
  RECENTLY_VIEWED_HIVES_UPDATED_EVENT,
  type RecentlyViewedHive,
} from "../../lib/recentlyViewedHives";
import "./SideNavbar.css";

function SideNavbar() {
  const { currentUser, hiveRefreshKey } = useAuth();
  const [myHives, setMyHives] = useState<ApiHive[]>([]);
  const [hiveError, setHiveError] = useState<string>("");
  const [joinedHives, setJoinedHives] = useState<ApiHive[]>([]);
  const [joinedHiveError, setJoinedHiveError] = useState<string>("");
  const [recentlyViewedHives, setRecentlyViewedHives] = useState<
    RecentlyViewedHive[]
  >([]);

  useEffect(() => {
    async function loadMyHives(): Promise<void> {
      const activeUserId = currentUser?.id;

      if (!activeUserId) {
        setMyHives([]);
        setHiveError("");
        setJoinedHives([]);
        setJoinedHiveError("");
        setRecentlyViewedHives([]);
        return;
      }

      setRecentlyViewedHives(getRecentlyViewedHives(activeUserId, 5));

      try {
        const response = await api.getMyHives();
        setMyHives(response.hives);
        setHiveError("");
      } catch (caughtError) {
        setHiveError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load your hives.",
        );
      }

      try {
        const response = await api.getJoinedHives();
        setJoinedHives(response.hives);
        setJoinedHiveError("");
      } catch (caughtError) {
        setJoinedHiveError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load joined hives.",
        );
      }
    }

    void loadMyHives();
  }, [currentUser, hiveRefreshKey]);

  useEffect(() => {
    const userId = currentUser?.id;

    if (!userId) {
      setRecentlyViewedHives([]);
      return;
    }

    const activeUserId = userId;

    function syncRecentHives(): void {
      setRecentlyViewedHives(getRecentlyViewedHives(activeUserId, 5));
    }

    function handleRecentlyViewedUpdated(event: Event): void {
      const customEvent = event as CustomEvent<{ userId?: number }>;
      if (customEvent.detail?.userId !== activeUserId) {
        return;
      }

      syncRecentHives();
    }

    syncRecentHives();
    window.addEventListener(
      RECENTLY_VIEWED_HIVES_UPDATED_EVENT,
      handleRecentlyViewedUpdated,
    );

    return () => {
      window.removeEventListener(
        RECENTLY_VIEWED_HIVES_UPDATED_EVENT,
        handleRecentlyViewedUpdated,
      );
    };
  }, [currentUser]);

  return (
    <aside className="side-nav" aria-label="Sidebar navigation">
      <section className="side-nav-section">
        <h2>Navigate</h2>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/explore">Explore</NavLink>
      </section>

      {currentUser && recentlyViewedHives.length > 0 ? (
        <section className="side-nav-section">
          <h2>Recently Viewed</h2>
          <div className="side-hives-list">
            {recentlyViewedHives.map((hive: RecentlyViewedHive) => (
              <NavLink key={hive.id} to={`/hive/${hive.id}`}>
                {hive.name}
              </NavLink>
            ))}
          </div>
        </section>
      ) : null}

      {currentUser ? (
        <section className="side-nav-section">
          <h2>Joined Hives</h2>
          {joinedHiveError ? (
            <p className="side-error">{joinedHiveError}</p>
          ) : null}
          {!joinedHiveError && joinedHives.length === 0 ? (
            <p className="side-placeholder">Join a hive to see it here.</p>
          ) : null}
          <div className="side-hives-list">
            {joinedHives.slice(0, 5).map((hive: ApiHive) => (
              <NavLink key={hive.id} to={`/hive/${hive.id}`}>
                {hive.name}
              </NavLink>
            ))}
          </div>
          {joinedHives.length > 5 ? (
            <NavLink className="side-view-all" to="/profile">
              View all
            </NavLink>
          ) : null}
        </section>
      ) : null}

      {currentUser ? (
        <section className="side-nav-section">
          <h2>My Hives</h2>
          {hiveError ? <p className="side-error">{hiveError}</p> : null}
          {!hiveError && myHives.length === 0 ? (
            <p className="side-placeholder">Create a hive to see it here.</p>
          ) : null}
          <div className="side-hives-list">
            {myHives.slice(0, 5).map((hive: ApiHive) => (
              <NavLink key={hive.id} to={`/hive/${hive.id}`}>
                {hive.name}
              </NavLink>
            ))}
          </div>
          {myHives.length > 5 ? (
            <NavLink className="side-view-all" to="/profile">
              View all
            </NavLink>
          ) : null}
        </section>
      ) : null}

      <section className="side-nav-section side-nav-resources">
        <h2>Resources</h2>
        {currentUser ? <NavLink to="/messages">Messages</NavLink> : null}
        <NavLink to="/settings">Settings</NavLink>
      </section>
    </aside>
  );
}

export default SideNavbar;
