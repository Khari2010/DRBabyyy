import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./routes/HomePage.jsx";
import PlayerPage from "./routes/PlayerPage.jsx";
import StyleGuide from "./routes/StyleGuide.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/player/:slug" element={<PlayerPage />} />
        <Route path="/styleguide" element={<StyleGuide />} />
      </Routes>
    </BrowserRouter>
  );
}
