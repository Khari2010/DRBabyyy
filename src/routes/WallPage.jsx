import BottomNav from "../components/BottomNav.jsx";
import PostComposer from "../components/wall/PostComposer.jsx";
import { C } from "../data/colors.js";

export default function WallPage() {
  return (
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 24 }}>
      <header style={{ padding: "20px 20px 12px" }}>
        <h1 style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 28, color: C.dark, margin: 0 }}>
          The Wall
        </h1>
      </header>
      <main style={{ padding: "0 20px" }}>
        <PostComposer />
        {/* Feed of PostCards goes here in Tasks 17 + 19 */}
      </main>
      <BottomNav />
    </div>
  );
}
