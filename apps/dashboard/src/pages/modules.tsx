import React from "react";
import type { GetServerSideProps } from "next";
import { Layout } from "../components/layout/Layout";
import { PageHeader } from "../components/layout/PageHeader";
import { ModulesTable } from "../components/tables/ModulesTable";
import { createApiClient, type ModuleSummary } from "../lib/apiClient";

interface ModulesPageProps {
  modules: ModuleSummary[];
}

const ModulesPage: React.FC<ModulesPageProps> = ({ modules }) => {
  return (
    <Layout currentPath="/modules">
      <PageHeader
        title="Module gallery"
        subtitle="Runnable modules distilled from real Solana projects by Unit09."
      />
      <ModulesTable modules={modules} />
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<ModulesPageProps> = async () => {
  const api = createApiClient();
  try {
    const modules = await api.getAllModules();
    return { props: { modules } };
  } catch {
    return { props: { modules: [] } };
  }
};

export default ModulesPage;
