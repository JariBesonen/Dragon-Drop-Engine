import { NavLink } from "react-router-dom";
import "./SideNavbar.css";

function SideNavbar() {
  return (
    <aside className="side-nav" aria-label="Sidebar navigation">
      <section className="side-nav-section">
        <h2>Navigate</h2>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/explore">Explore</NavLink>
      </section>

      <section className="side-nav-section">
        <h2>Added Hives</h2>
        <p className="side-placeholder">
          Communities you follow will appear here.
        </p>
      </section>

      <section className="side-nav-section side-nav-resources">
        <h2>Resources</h2>
        <NavLink to="/settings">Settings</NavLink>
      </section>
    </aside>
  );
}

export default SideNavbar;
