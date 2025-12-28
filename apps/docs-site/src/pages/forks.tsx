import React from "react";
import { Layout } from "../components/layout";
import { MarkdownRenderer } from "../components/markdownRenderer";

const content = `# Forks

Unit09 itself can be forked. Each fork is a variant of the AI raccoon with
different configuration, training data, or behavioral rules.

You might create a fork to:

- Focus on a specific vertical in the Solana ecosystem
- Experiment with different module scoring strategies
- Run a private instance for your team or community

Forks can be inspected and managed through the dashboard or via the CLI:

  unit09 create-fork my-experimental-raccoon

Each fork leaves an on-chain trace so its behavior can be audited.`;

const ForksPage: React.FC = () => {
  return (
    <Layout>
      <MarkdownRenderer content={content} />
    </Layout>
  );
};

export default ForksPage;
