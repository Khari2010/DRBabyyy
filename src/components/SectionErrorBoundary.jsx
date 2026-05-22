import React from "react";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

export default class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(
      `[SectionErrorBoundary:${this.props.label ?? "unknown"}]`,
      error,
      info?.componentStack,
    );
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error?.message ?? String(this.state.error);
    return (
      <div
        role="alert"
        style={{
          padding: "14px 16px",
          margin: "8px 0",
          borderRadius: RADIUS.md,
          background: C.white,
          border: `1.5px solid ${C.coralDeep}`,
          fontFamily: "Nunito, sans-serif",
          fontSize: 13,
          color: C.dark,
        }}
      >
        <div style={{ fontWeight: 800, color: C.coralDeep, marginBottom: 4 }}>
          {this.props.label ?? "Section"} couldn't load
        </div>
        <div style={{ color: C.textBody, wordBreak: "break-word" }}>{msg}</div>
      </div>
    );
  }
}
