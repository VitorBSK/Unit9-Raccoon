import React from "react";
import type { GetServerSideProps } from "next";
import { Layout } from "../components/layout/Layout";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCards } from "../components/charts/StatCards";
import { OverviewChart, type OverviewPoint } from "../components/charts/OverviewChart";
import { ReposTable } from "../components/tables/ReposTable";
import { createApiClient, type RepoSummary, type GlobalStats } from "../lib/apiClient";

interface OverviewPageProps {
  stats: GlobalStats;
  repos: RepoSummary[];
}

const OverviewPage: React.FC<OverviewPageProps> = ({ stats, repos }) => {
  const overviewData: OverviewPoint[] = [
    { label: "T-4", linesObserved: Math.round(stats.observedLines * 0.4), modulesGenerated: Math.round(stats.modulesGenerated * 0.3) },
    { label: "T-3", linesObserved: Math.round(stats.observedLines * 0.55), modulesGenerated: Math.round(stats.modulesGenerated * 0.45) },
    { label: "T-2", linesObserved: Math.round(stats.observedLines * 0.7), modulesGenerated: Math.round(stats.modulesGenerated * 0.6) },
    { label: "T-1", linesObserved: Math.round(stats.observedLines * 0.85), modulesGenerated: Math.round(stats.modulesGenerated * 0.8) },
    { label: "Now", linesObserved: stats.observedLines, modulesGenerated: stats.modulesGenerated }
  ];

  const statCards = [
    {
      label: "Observed lines of code",
      value: stats.observedLines.toLocaleString(),
      tag: "Lifetime",
      delta: "+12%",
      deltaDirection: "up" as const
    },
    {
      label: "Modules generated",
      value: stats.modulesGenerated.toLocaleString(),
      tag: "Runnable units",
      delta: "+8%",
      deltaDirection: "up" as const
    },
    {
      label: "Active forks",
      value: String(stats.activeForks),
      tag: "Unit09 variants",
      delta: "+2",
      deltaDirection: "up" as const
    },
    {
      label: "Tracked repos",
      value: String(stats.reposTracked),
      tag: "Solana ecosystem",
      delta: "+5",
      deltaDirection: "up" as const
    }
  ];

  return (
    <Layout currentPath="/">
      <PageHeader
        title="Overview"
        subtitle="High-level view of Unit09 as it ingests repos, generates modules, and evolves through forks."
      />
      <StatCards stats={statCards} />
      <div className="section" style={{ display: "grid", gridTemplateColumns: "minmax(0, 2.1fr) minmax(0, 1.4fr)", gap: 14, marginTop: 18 }}>
        <OverviewChart data={overviewData} />
        <div className="card">
          <div className="section-header" style={{ marginBottom: 6 }}>
            <div className="section-title">Recently observed repos</div>
            <div className="section-subtitle">Latest five entries</div>
          </div>
          <div className="table-shell" style={{ borderRadius: 14, border: "1px solid rgba(31,41,55,0.7)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Repo</th>
                  <th>Modules</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {repos.slice(0, 5).map((repo) => (
                  <tr key={repo.key}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{repo.name}</span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>{repo.provider}</span>
                      </div>
                    </td>
                    <td>{repo.moduleCount}</td>
                    <td>
                      <span className={repo.active ? "badge badge-green" : "badge badge-soft"}>
                        {repo.active ? "Active" : "Idle"}
                      </span>
                    </td>
                  </tr>
                ))}
                {repos.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ fontSize: 12, color: "#9ca3af" }}>
                      No repositories observed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
            Last sync: {stats.lastSyncAt || "not available"}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<OverviewPageProps> = async () => {
  const api = createApiClient();
  try {
    const [stats, repos] = await Promise.all([api.getStats(), api.getRepos()]);
    return { props: { stats, repos } };
  } catch {
    const fallbackStats: GlobalStats = {
      observedLines: 0,
      modulesGenerated: 0,
      activeForks: 0,
      reposTracked: 0,
      lastSyncAt: ""
    };
    return { props: { stats: fallbackStats, repos: [] } };
  }
};

export default OverviewPage;
