import React from "react";
import type { GetServerSideProps } from "next";
import { Layout } from "../components/layout/Layout";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCards } from "../components/charts/StatCards";
import { createApiClient, type GlobalStats } from "../lib/apiClient";

interface StatsPageProps {
  stats: GlobalStats;
}

const StatsPage: React.FC<StatsPageProps> = ({ stats }) => {
  const cards = [
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
      delta: "+7%",
      deltaDirection: "up" as const
    },
    {
      label: "Active forks",
      value: String(stats.activeForks),
      tag: "Variants",
      delta: "+1",
      deltaDirection: "up" as const
    },
    {
      label: "Tracked repos",
      value: String(stats.reposTracked),
      tag: "Sources",
      delta: "+4",
      deltaDirection: "up" as const
    }
  ];

  return (
    <Layout currentPath="/stats">
      <PageHeader
        title="Metrics dashboard"
        subtitle="Signals that describe how alive Unit09 is: activity, coverage, and module output."
      />
      <StatCards stats={cards} />
      <div style={{ marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
        Last sync: {stats.lastSyncAt || "not available"}
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<StatsPageProps> = async () => {
  const api = createApiClient();
  try {
    const stats = await api.getStats();
    return { props: { stats } };
  } catch {
    const fallback: GlobalStats = {
      observedLines: 0,
      modulesGenerated: 0,
      activeForks: 0,
      reposTracked: 0,
      lastSyncAt: ""
    };
    return { props: { stats: fallback } };
  }
};

export default StatsPage;
