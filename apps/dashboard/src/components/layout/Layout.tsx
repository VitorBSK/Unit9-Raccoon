import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPath }) => {
  return (
    <div className="layout-root">
      <Sidebar currentPath={currentPath} />
      <div className="layout-main">
        <Topbar />
        <main className="main-scroll">{children}</main>
      </div>
    </div>
  );
};
