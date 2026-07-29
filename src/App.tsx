import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Features from "@/pages/Features";
import Download from "@/pages/Download";
import About from "@/pages/About";
import Auth from "@/pages/Auth";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-brand-cream">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/download" element={<Download />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
