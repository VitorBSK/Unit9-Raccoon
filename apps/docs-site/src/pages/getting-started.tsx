import React from "react";
import { Layout } from "../components/layout";
import { MarkdownRenderer } from "../components/markdownRenderer";

const content = `# Getting started

This guide walks you through bringing your first repository into Unit09.

## 1. Install the CLI

Run:

  npm install -g unit09-cli

Once installed, confirm that the binary is available:

  unit09 --help

## 2. Initialize configuration

Use the \`init\` command to configure the API endpoint, Solana RPC URL,
and program id:

  unit09 init

The CLI stores its configuration under \`~/.unit09/config.json\`.

## 3. Link a repository

You can link any Solana project that is publicly accessible:

  unit09 link-repo https://github.com/your-org/your-project

Unit09 will observe the repository, analyze its modules, and start generating
runnable units over time.`;

const GettingStartedPage: React.FC = () => {
  return (
    <Layout>
      <MarkdownRenderer content={content} />
    </Layout>
  );
};

export default GettingStartedPage;
