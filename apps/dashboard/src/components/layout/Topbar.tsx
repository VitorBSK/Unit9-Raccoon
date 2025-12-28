import React from "react";

export const Topbar: React.FC = () => {
  return (
    <header className="topbar">
      <div className="topbar-title">Unit09 Control Plane</div>
      <div className="topbar-right">
        <div className="topbar-pill">
          <span className="topbar-pill-accent-dot" />
          <span>Engine online</span>
        </div>
        <a
          href="https://unit09.org"
          target="_blank"
          rel="noreferrer"
          className="chip"
        >
          unit09.org
        </a>
      </div>
    </header>
  );
};
