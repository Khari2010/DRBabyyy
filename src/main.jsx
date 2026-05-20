import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider } from "convex/react";
import App from "./App.jsx";
import { convex } from "./lib/convex.js";
import ToastContainer from "./components/primitives/Toast.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <style>{`
      button[data-pill]:focus-visible,
      button[data-claim]:focus-visible {
        outline: 2px solid #00CEC9;
        outline-offset: 2px;
      }
    `}</style>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
    <ToastContainer />
  </React.StrictMode>,
);
