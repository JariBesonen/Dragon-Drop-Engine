import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//IMPORTED PAGES
import Home from "./Pages/Home/Home";
import Create from "./Pages/Create/Create";
import Learn from "./Pages/Learn/Learn";
import News from "./Pages/News/News";
import Pricing from "./Pages/Pricing/Pricing";
import Profile from "./Pages/Profile/Profile";
//IMPORTED COMPONENTS
import Footer from "./Components/Footer/Footer";
import Navbar from "./Components/Navbar/Navbar";
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
