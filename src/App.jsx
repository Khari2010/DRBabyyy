import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./routes/HomePage.jsx";
import PlayerPage from "./routes/PlayerPage.jsx";
import LeaderboardPage from "./routes/LeaderboardPage.jsx";
import AdminPage from "./routes/AdminPage.jsx";
import StyleGuide from "./routes/StyleGuide.jsx";
import PlayerGamesPage from "./routes/PlayerGamesPage.jsx";
import WallPage from "./routes/WallPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/player/:slug" element={<PlayerPage />} />
        <Route path="/player/:slug/games" element={<PlayerGamesPage />} />
        <Route path="/wall" element={<WallPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/styleguide" element={<StyleGuide />} />
      </Routes>
    </BrowserRouter>
  );
}
