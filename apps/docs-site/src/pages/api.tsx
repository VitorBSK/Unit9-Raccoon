import React from "react";
import { Layout } from "../components/layout";
import { MarkdownRenderer } from "../components/markdownRenderer";

const content = `# API

The HTTP API exposes a small surface area for integrating with Unit09.

## Base URL

In local development the default base URL is:

  http://localhost:8080/api

In production you should set a public endpoint and configure the dashboard and
CLI to use it.

## Core endpoints

- \`GET /health\` — liveness probe
- \`GET /repos\` — list observed repositories
- \`GET /repos/:repoKey/modules\` — list modules for a repo
- \`GET /forks\` — list Unit09 forks
- \`POST /pipeline/jobs\` — enqueue a pipeline job
- \`GET /stats\` — global statistics

The API is designed to remain small. Most complexity lives in the on-chain
program and the core engine, not in the HTTP layer.`;

const ApiPage: React.FC = () => {
  return (
    <Layout>
      <MarkdownRenderer content={content} />
    </Layout>
  );
};

export default ApiPage;
