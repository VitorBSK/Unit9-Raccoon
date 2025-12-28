import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  { href: "/", label: "Overview", icon: "◎" },
  { href: "/repos", label: "Repos", icon: "R" },
  { href: "/modules", label: "Modules", icon: "M" },
  { href: "/forks", label: "Forks", icon: "F" },
  { href: "/stats", label: "Stats", icon: "S" }
];

interface SidebarProps {
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const router = useRouter();
  const path = currentPath || router.pathname;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">U9</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">Unit09</div>
          <div className="sidebar-logo-subtitle">On-chain AI raccoon</div>
        </div>
      </div>

      <div className="nav-section-label">Monitor</div>
      <ul className="nav-list">
        {navItems.map((item) => {
          const active = path === item.href;
          return (
            <li key={item.href} className="nav-item">
              <Link href={item.href} legacyBehavior>
                <a className={`nav-link ${active ? "active" : ""}`}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
