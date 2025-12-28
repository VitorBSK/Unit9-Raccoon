import React from "react";
import type { GetServerSideProps } from "next";
import { Layout } from "../components/layout/Layout";
import { PageHeader } from "../components/layout/PageHeader";
import { ReposTable } from "../components/tables/ReposTable";
import { createApiClient, type RepoSummary } from "../lib/apiClient";

interface ReposPageProps {
  repos: RepoSummary[];
}

const ReposPage: React.FC<ReposPageProps> = ({ repos }) => {
  return (
    <Layout currentPath="/repos">
      <PageHeader
        title="Observed repositories"
        subtitle="Every repository Unit09 has seen, tracked as a living source of modules."
      />
      <ReposTable repos={repos} />
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<ReposPageProps> = async () => {
  const api = createApiClient();
  try {
    const repos = await api.getRepos();
    return { props: { repos } };
  } catch {
    return { props: { repos: [] } };
  }
};

export default ReposPage;
