import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./routes/HomePage.jsx";
import PlayerPage from "./routes/PlayerPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/player/:slug" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
