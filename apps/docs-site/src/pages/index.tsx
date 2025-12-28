import React from "react";
import { Layout } from "../components/layout";
import { MarkdownRenderer } from "../components/markdownRenderer";

const content = `# Unit09 — Story-driven on-chain AI raccoon

Unit09 is an on-chain AI lifeform deployed on Solana. It consumes real code,
learns from running projects, and emits runnable modules that make it easier for
teams to build.

This documentation site explains how to work with Unit09, from connecting your
first repository to exploring forks of the Unit09 raccoon itself.`;

const IndexPage: React.FC = () => {
  return (
    <Layout>
      <MarkdownRenderer content={content} />
    </Layout>
  );
};

export default IndexPage;
