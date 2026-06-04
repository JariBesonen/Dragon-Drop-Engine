import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
//IMPORTED PAGES
import Home from "./Pages/Home/Home";
import Create from "./Pages/Create/module";
import Explore from "./Pages/Explore/Explore";
import HiveDetail from "./Pages/HiveDetail/HiveDetail";
import Profile from "./Pages/Profile/Profile";
import Search from "./Pages/Search/Search";
import Settings from "./Pages/Settings/Settings";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
//IMPORTED COMPONENTS
import Footer from "./Components/Footer/Footer";
import Navbar from "./Components/Navbar/Navbar";
import SideNavbar from "./Components/SideNavbar/SideNavbar";
import "../src/Global.css";

function AppLayout() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="app-shell">
      <Navbar />
      {!isAuthRoute ? <SideNavbar /> : null}
      <div className={`app-content ${isAuthRoute ? "auth-route-content" : ""}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/hive/:id" element={<HiveDetail />} />
          <Route path="/create" element={<Create />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
        {!isAuthRoute ? <Footer /> : null}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
