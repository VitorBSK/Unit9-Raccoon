import React from "react";
import type { GetServerSideProps } from "next";
import { Layout } from "../components/layout/Layout";
import { PageHeader } from "../components/layout/PageHeader";
import { ForksTable } from "../components/tables/ForksTable";
import { createApiClient, type ForkSummary } from "../lib/apiClient";

interface ForksPageProps {
  forks: ForkSummary[];
}

const ForksPage: React.FC<ForksPageProps> = ({ forks }) => {
  return (
    <Layout currentPath="/forks">
      <PageHeader
        title="Fork explorer"
        subtitle="Every Unit09 fork evolves differently. This view lets you track them."
      />
      <ForksTable forks={forks} />
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<ForksPageProps> = async () => {
  const api = createApiClient();
  try {
    const forks = await api.getForks();
    return { props: { forks } };
  } catch {
    return { props: { forks: [] } };
  }
};

export default ForksPage;
