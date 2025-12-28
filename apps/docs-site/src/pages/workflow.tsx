import React from "react";
import { Layout } from "../components/layout";
import { MarkdownRenderer } from "../components/markdownRenderer";

const content = `# Workflow

Unit09 follows a five-stage workflow:

## 1. Observe

Unit09 connects to your repository, tracks new commits, and observes how the
project evolves over time.

## 2. Analyze

Code is parsed into a language-aware graph. Unit09 identifies entry points,
program boundaries, and high-value components.

## 3. Decompose

Large systems are decomposed into small runnable modules. Each module has a
clear contract and limited surface area.

## 4. Generate

The engine generates scaffolding, tests, and deployment configuration for each
module so it can be used in isolation.

## 5. Sync on-chain

Finally, Unit09 syncs metadata to Solana so that modules, repos, and forks can
be discovered, reused, and extended on-chain.`;

const WorkflowPage: React.FC = () => {
  return (
    <Layout>
      <MarkdownRenderer content={content} />
    </Layout>
  );
};

export default WorkflowPage;
