import React from "react";
import { C } from "../data/colors.js";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        background: C.sand,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Nunito, sans-serif",
      }}>
        <div style={{
          maxWidth: 420,
          width: "100%",
          background: C.white,
          borderRadius: 24,
          padding: "32px 28px",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌴</div>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 22,
            color: C.dark,
            marginBottom: 8,
          }}>
            Something went sideways
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: C.textBody,
            lineHeight: 1.6,
            marginBottom: 20,
          }}>
            The app hit an unexpected error. Reload to keep going — if it keeps happening, let Khari know.
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: C.white,
              background: C.coral,
              border: "none",
              borderRadius: 14,
              padding: "12px 24px",
              cursor: "pointer",
              boxShadow: `0 6px 18px ${C.coral}55`,
            }}
          >
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
