import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//IMPORTED PAGES
import Home from "./Pages/Home/Home.jsx";
import Create from "./Pages/Create/Create.jsx";
import Learn from "./Pages/Learn/Learn.jsx";
import News from "./Pages/News/News.jsx";
import Pricing from "./Pages/Pricing/Pricing.jsx";
import Profile from "./Pages/Profile/Profile.jsx";
//IMPORTED COMPONENTS
import Footer from "./Components/Footer/Footer.jsx";
import Navbar from "./Components/Navbar/Navbar.jsx";
import "../src/Global.css";
function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/news" element={<News />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
