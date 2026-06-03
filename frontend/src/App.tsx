import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//IMPORTED PAGES
import Home from "./Pages/Home/Home";
import Create from "./Pages/Create/module";
import Explore from "./Pages/Explore/Explore";
import Profile from "./Pages/Profile/Profile";
import Settings from "./Pages/Settings/Settings";
//IMPORTED COMPONENTS
import Footer from "./Components/Footer/Footer";
import Navbar from "./Components/Navbar/Navbar";
import SideNavbar from "./Components/SideNavbar/SideNavbar";
import "../src/Global.css";
function App() {
  return (
    <Router>
      <div className="app-shell">
        <Navbar />
        <SideNavbar />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/create" element={<Create />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <Footer />
        </div>
      </div>
    </Router>
  );
}

export default App;
