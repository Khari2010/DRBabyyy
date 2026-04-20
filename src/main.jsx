import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider } from "convex/react";
import App from "./App.jsx";
import { convex } from "./lib/convex.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>,
);
