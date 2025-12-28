import React from "react";
import { Layout } from "../components/layout";
import { MarkdownRenderer } from "../components/markdownRenderer";

const content = `# Modules

A module is the smallest runnable unit Unit09 extracts from a repository.

Each module has:

- A unique identifier derived from code structure
- A clear interface and dependency list
- A build plan that can be executed in isolation
- Optional tests and deployment scripts

You can browse modules in the dashboard or via the CLI:

  unit09 list-modules <repoKey>

Modules can be composed, forked, and retired just like any other living asset
inside the Unit09 ecosystem.`;

const ModulesPage: React.FC = () => {
  return (
    <Layout>
      <MarkdownRenderer content={content} />
    </Layout>
  );
};

export default ModulesPage;
