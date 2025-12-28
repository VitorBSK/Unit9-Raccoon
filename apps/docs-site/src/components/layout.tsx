import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  { href: "/", label: "Intro" },
  { href: "/getting-started", label: "Getting started" },
  { href: "/workflow", label: "Workflow" },
  { href: "/modules", label: "Modules" },
  { href: "/forks", label: "Forks" },
  { href: "/api", label: "API" }
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#020617", color: "#e5e7eb" }}>
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #1f2937",
          padding: "18px 14px",
          background:
            "radial-gradient(circle at top left, rgba(15,23,42,0.96), rgba(15,23,42,0.98))"
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background:
                  "radial-gradient(circle at 30% 20%, #4ade80, #16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#020617"
              }}
            >
              U9
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Unit09 Docs</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>On-chain AI raccoon</div>
            </div>
          </div>
        </div>
        <nav>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#9ca3af",
              marginBottom: 6
            }}
          >
            Guides
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {navItems.map((item) => {
              const active = router.pathname === item.href;
              return (
                <li key={item.href} style={{ marginBottom: 3 }}>
                  <Link href={item.href} legacyBehavior>
                    <a
                      style={{
                        display: "block",
                        padding: "7px 10px",
                        borderRadius: 999,
                        fontSize: 13,
                        color: active ? "#ecfeff" : "#9ca3af",
                        background: active
                          ? "radial-gradient(circle at 0 0, rgba(34,197,94,0.4), rgba(15,23,42,0.96))"
                          : "transparent",
                        border: active
                          ? "1px solid rgba(34,197,94,0.6)"
                          : "1px solid transparent"
                      }}
                    >
                      {item.label}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "22px 24px 32px" }}>{children}</main>
    </div>
  );
};
